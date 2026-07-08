const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");
const adminOnly = require("../middleware/admin");
const upload = require("../middleware/threadImages");
const fs = require("fs").promises;
const path = require("path");

const router = express.Router();

async function ensureThreadPinnedMessagesTable() {
    await pool.query(`
        CREATE TABLE IF NOT EXISTS thread_pinned_messages (
            message_id INTEGER PRIMARY KEY,
            thread_id INTEGER NOT NULL,
            pinned_by INTEGER NOT NULL,
            content TEXT,
            username TEXT,
            pinned_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
        )
    `);
}

function getThreadUploadPath(imageUrl) {
    return path.join(
        __dirname,
        "..",
        "..",
        "public",
        imageUrl.replace(/^\//, "")
    );
}

/* =========================
GET ALL THREADS
========================= */

router.get("/",
    authRequired,
    async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                t.id,
                t.title,
                t.content,
                t.user_id,
                t.username,
                t.created_at,
                t.is_pinned,
                t.is_locked,
                t.members,
                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', a.id,
                            'image_url', a.image_url,
                            'uploaded_by', a.uploaded_by
                        )
                    ) FILTER (WHERE a.id IS NOT NULL),
                    '[]'
                ) AS attachments
            FROM threads t
                     LEFT JOIN thread_attachments a
                               ON t.id = a.thread_id
                              AND a.message_id IS NULL
            GROUP BY
                t.id,
                t.title,
                t.content,
                t.user_id,
                t.username,
                t.created_at,
                t.is_pinned,
                t.is_locked,
                t.members
            ORDER BY t.is_pinned DESC, t.created_at DESC
        `);

        res.json(result.rows);

    } catch (err) {

        console.log(err);
        res.status(500).json({ success: false });
    }
});

/* =========================
CREATE THREAD
========================= */

router.post("/create",
    authRequired,
    upload.array("images", 8),
    async (req, res) => {


    const { title, content } = req.body;

    try {

        const result = await pool.query(`
            INSERT INTO threads
            (title, content, user_id, username)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, content, user_id, username, created_at, is_pinned, is_locked, members
        `, [
            title,
            content,
            req.session.user.id,
            req.session.user.username
        ]);

        const thread = result.rows[0];
        const attachments = [];

        for (const file of req.files || []) {

            const imageUrl =
                `/uploads/threads/${file.filename}`;

            const attachmentResult = await pool.query(`
                INSERT INTO thread_attachments
                (
                    thread_id,
                    image_url,
                    uploaded_by
                )
                VALUES ($1,$2,$3)
                RETURNING *
            `, [
                thread.id,
                imageUrl,
                req.session.user.id
            ]);

            attachments.push(
                attachmentResult.rows[0]
            );
        }

        thread.attachments = attachments;

        const io = req.app.get("io");
        if (io && typeof io.emit === "function") {
            io.emit("threads:new", thread);
        }

        res.json({ success: true, thread });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});


/* =========================
JOIN THREAD
========================= */

router.post("/:threadId/join",
    authRequired,
    async (req, res) => {

    const { threadId } = req.params;

    try {



        const result = await pool.query(`
            INSERT INTO thread_members
            (thread_id, user_id, joined_at)
            VALUES ($1, $2)
            RETURNING user_id
        `, [
            threadId,
            req.session.user.id
        ]);

        res.json(result.rows);

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
})

/* =========================
GET THREAD MESSAGES
========================= */

router.get("/:threadId/messages",
    authRequired,
    async (req, res) => {

        const { threadId } = req.params;

        try {
            await ensureThreadPinnedMessagesTable();

            const result = await pool.query(`
                SELECT
                    m.id,
                    m.thread_id,
                    m.user_id,
                    m.username,
                    m.content,
                    m.created_at,
                    EXISTS (
                        SELECT 1
                        FROM thread_pinned_messages pm
                        WHERE pm.message_id = m.id
                          AND pm.thread_id = m.thread_id
                    ) AS pinned,

                    COALESCE(
                                    json_agg(
                                    json_build_object(
                                            'id', a.id,
                                            'image_url', a.image_url,
                                            'uploaded_by', a.uploaded_by
                                    )
                                            ) FILTER (WHERE a.id IS NOT NULL),
                                    '[]'
                    ) AS attachments

                FROM thread_messages m
                         LEFT JOIN thread_attachments a
                                   ON m.id = a.message_id

                WHERE m.thread_id = $1

                GROUP BY m.id, m.thread_id, m.user_id, m.username, m.content, m.created_at

                ORDER BY m.created_at ASC
            `, [threadId]);

            res.json(result.rows);

        } catch (err) {
            console.log(err);
            res.status(500).json({ success: false });
        }
    });

/* =========================
SEND MESSAGE
========================= */

router.post(
    "/:threadId/send",
    authRequired,
    upload.array("images", 8),
    async (req, res) => {

        const { threadId } = req.params;
        const content = req.body?.content || "";

        try {
            const threadResult = await pool.query(`
                SELECT is_locked
                FROM threads
                WHERE id = $1
            `, [threadId]);

            if (!threadResult.rows[0]) {
                return res.status(404).json({
                    success: false,
                    message: "Thread not found"
                });
            }

            if (threadResult.rows[0].is_locked && !req.session.user?.is_admin) {
                return res.status(403).json({
                    success: false,
                    message: "Thread is locked"
                });
            }

            const result = await pool.query(`
                INSERT INTO thread_messages
                (
                    thread_id,
                    user_id,
                    username,
                    content
                )
                VALUES ($1,$2,$3,$4)
                RETURNING *
            `, [
                threadId,
                req.session.user.id,
                req.session.user.username,
                content
            ]);

            const message = result.rows[0];

            const attachments = [];

            for (const file of req.files || []) {

                const imageUrl =
                    `/uploads/threads/${file.filename}`;

                const attachmentResult = await pool.query(`
                    INSERT INTO thread_attachments
                    (
                        thread_id,
                        message_id,
                        image_url,
                        uploaded_by
                    )
                    VALUES ($1,$2,$3,$4)
                    RETURNING *
                `, [
                    threadId,
                    message.id,
                    imageUrl,
                    req.session.user.id
                ]);

                attachments.push(
                    attachmentResult.rows[0]
                );
            }

            const finalMessage = {
                ...message,
                attachments
            };

            const io = req.app.get("io");

            if (
                io &&
                typeof io.threadEmit === "function"
            ) {
                io.threadEmit(
                    threadId,
                    "thread:message:new",
                    finalMessage
                );
            }

            res.json(finalMessage);

        } catch (err) {

            console.log(err);

            res.status(500).json({
                success: false
            });
        }
    }
);

/* =========================
DELETE THREAD (ADMIN)
========================= */

router.delete("/admin/thread/:id",
    authRequired,
    adminOnly,
    async (req, res) => {

    try {
        await ensureThreadPinnedMessagesTable();

        const attachments = await pool.query(`
            SELECT image_url
            FROM thread_attachments
            WHERE thread_id = $1
        `, [req.params.id]);

        for (const { image_url } of attachments.rows) {
            await fs.unlink(getThreadUploadPath(image_url))
                .catch(() => null);
        }

        await pool.query(`
            DELETE FROM thread_pinned_messages
            WHERE thread_id = $1
        `, [req.params.id]);

        await pool.query(`
            DELETE FROM thread_attachments
            WHERE thread_id = $1
        `, [req.params.id]);

        await pool.query(`
            DELETE FROM thread_messages
            WHERE thread_id = $1
        `, [req.params.id]);

        await pool.query(`
            DELETE FROM thread_members
            WHERE thread_id = $1
        `, [req.params.id]);

        await pool.query(`
            DELETE FROM threads
            WHERE id = $1
        `, [req.params.id]);

        const io = req.app.get("io");
        if (io && typeof io.emit === "function") {
            io.emit("threads:deleted", {
                threadId: Number(req.params.id)
            });
        }

        res.json({ success: true });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

/* =========================
PIN THREAD (ADMIN)
========================= */

router.patch("/admin/thread/:id/pin",
    authRequired,
    adminOnly,
    async (req, res) => {

    try {

        const result = await pool.query(`
            UPDATE threads
            SET is_pinned = NOT is_pinned
            WHERE id = $1
            RETURNING id, is_pinned
        `, [req.params.id]);

        const updatedThread = result.rows[0];
        const io = req.app.get("io");
        if (io && typeof io.emit === "function") {
            io.emit("thread:updated", {
                threadId: Number(req.params.id),
                is_pinned: updatedThread.is_pinned
            });
        }

        res.json({
            success: true,
            thread: updatedThread
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

/* =========================
LOCK THREAD (ADMIN)
========================= */

router.patch("/admin/thread/:id/lock",
    authRequired,
    adminOnly,
    async (req, res) => {

    try {

        const result = await pool.query(`
            UPDATE threads
            SET is_locked = NOT is_locked
            WHERE id = $1
            RETURNING id, is_locked
        `, [req.params.id]);

        const updatedThread = result.rows[0];
        const io = req.app.get("io");
        if (io && typeof io.emit === "function") {
            io.emit("thread:updated", {
                threadId: Number(req.params.id),
                is_locked: updatedThread.is_locked
            });
        }

        res.json({
            success: true,
            thread: updatedThread
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

/* =========================
GET THREAD PINS
========================= */

router.get("/:threadId/pins",
    authRequired,
    async (req, res) => {

    try {

        await ensureThreadPinnedMessagesTable();

        const result = await pool.query(`
            SELECT *
            FROM thread_pinned_messages
            WHERE thread_id = $1
            ORDER BY pinned_at DESC
        `, [req.params.threadId]);

        res.json(result.rows);

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

/* =========================
PIN THREAD MESSAGE (ADMIN)
========================= */

router.post("/admin/message/:messageId/pin",
    authRequired,
    adminOnly,
    async (req, res) => {

    const messageId = Number(req.params.messageId);
    const { thread_id, content, username } = req.body || {};

    if (!messageId || !thread_id) {
        return res.status(400).json({ success: false });
    }

    try {

        await ensureThreadPinnedMessagesTable();

        await pool.query(`
            INSERT INTO thread_pinned_messages
                (message_id, thread_id, pinned_by, content, username)
            VALUES ($1, $2, $3, $4, $5)
            ON CONFLICT (message_id)
            DO NOTHING
        `, [
            messageId,
            Number(thread_id),
            Number(req.session.user.id),
            content || "",
            username || ""
        ]);

        const io = req.app.get("io");

        if (io && typeof io.threadEmit === "function") {
            io.threadEmit(thread_id, "thread:message:pin", {
                messageId,
                threadId: Number(thread_id)
            });
        }

        res.json({ success: true });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

/* =========================
UNPIN THREAD MESSAGE (ADMIN)
========================= */

router.delete("/admin/message/:messageId/pin",
    authRequired,
    adminOnly,
    async (req, res) => {

    const messageId = Number(req.params.messageId);
    const { thread_id } = req.body || {};

    if (!messageId || !thread_id) {
        return res.status(400).json({ success: false });
    }

    try {

        await ensureThreadPinnedMessagesTable();

        await pool.query(`
            DELETE FROM thread_pinned_messages
            WHERE message_id = $1
              AND thread_id = $2
        `, [
            messageId,
            Number(thread_id)
        ]);

        const io = req.app.get("io");

        if (io && typeof io.threadEmit === "function") {
            io.threadEmit(thread_id, "thread:message:unpin", {
                messageId,
                threadId: Number(thread_id)
            });
        }

        res.json({ success: true });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

/* =========================
DELETE THREAD MESSAGE (ADMIN)
========================= */

router.delete("/admin/message/:id",
    authRequired,
    adminOnly,
    async (req, res) => {

    const messageId = Number(req.params.id);

    try {

        const messageResult = await pool.query(`
            SELECT thread_id
            FROM thread_messages
            WHERE id = $1
        `, [messageId]);

        const threadId = messageResult.rows[0]?.thread_id;

        if (!threadId) {
            return res.status(404).json({ success: false });
        }

        const attachments = await pool.query(`
            SELECT image_url
            FROM thread_attachments
            WHERE message_id = $1
        `, [messageId]);

        for (const { image_url } of attachments.rows) {
            await fs.unlink(getThreadUploadPath(image_url))
                .catch(() => null);
        }

        await pool.query(`
            DELETE FROM thread_attachments
            WHERE message_id = $1
        `, [messageId]);

        await ensureThreadPinnedMessagesTable();

        await pool.query(`
            DELETE FROM thread_pinned_messages
            WHERE message_id = $1
        `, [messageId]);

        await pool.query(`
            DELETE FROM thread_messages
            WHERE id = $1
        `, [messageId]);

        const io = req.app.get("io");

        if (io && typeof io.threadEmit === "function") {
            io.threadEmit(threadId, "thread:message:delete", messageId);
        }

        res.json({ success: true });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

/* =========================
DELETE THREAD ATTACHMENT (ADMIN)
========================= */

router.delete("/admin/attachment/:id",
    authRequired,
    adminOnly,
    async (req, res) => {

    try {

        const attachmentResult = await pool.query(`
            SELECT id, thread_id, message_id, image_url
            FROM thread_attachments
            WHERE id = $1
        `, [req.params.id]);

        const attachment = attachmentResult.rows[0];

        if (!attachment) {
            return res.status(404).json({ success: false });
        }

        await fs.unlink(getThreadUploadPath(attachment.image_url))
            .catch(() => null);

        await pool.query(`
            DELETE FROM thread_attachments
            WHERE id = $1
        `, [req.params.id]);

        const io = req.app.get("io");
        if (io && typeof io.threadEmit === "function") {
            io.threadEmit(attachment.thread_id, "thread:attachment:deleted", {
                threadId: attachment.thread_id,
                messageId: attachment.message_id,
                attachmentId: attachment.id
            });
        }

        res.json({
            success: true,
            attachment
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

module.exports = router;
