const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");
const adminOnly = require("../middleware/admin");
const upload = require("../middleware/threadImages");
const fs = require("fs").promises;
const path = require("path");

const router = express.Router();

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
                t.username,
                t.created_at,
                t.is_pinned,
                t.is_locked,
                t.members
            ORDER BY t.created_at DESC
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
            RETURNING id, title, content, username, created_at, is_pinned, is_locked, members
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

            const result = await pool.query(`
                SELECT
                    m.id,
                    m.thread_id,
                    m.user_id,
                    m.username,
                    m.content,
                    m.created_at,

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

        await pool.query(`
            DELETE FROM threads
            WHERE id = $1
        `, [req.params.id]);

        res.json({ success: true });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

module.exports = router;
