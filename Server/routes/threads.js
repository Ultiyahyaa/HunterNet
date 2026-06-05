const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();

/* =========================
GET ALL THREADS
========================= */

router.get("/", authRequired, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT id, title, content, username, created_at, is_pinned, is_locked, members
            FROM threads
            ORDER BY created_at DESC
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

router.post("/", authRequired, async (req, res) => {

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

        const io = req.app.get("io");
        if (io && typeof io.emit === "function") {
            io.emit("threads:new", thread);
        }

        res.json(thread);

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

router.post("/create", authRequired, async (req, res) => {

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
GET THREAD MESSAGES
========================= */

router.get("/:threadId/messages", authRequired, async (req, res) => {

    const { threadId } = req.params;

    try {

        const result = await pool.query(`
            SELECT *
            FROM thread_messages
            WHERE thread_id = $1
            ORDER BY created_at ASC
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

router.post("/:threadId/messages", authRequired, async (req, res) => {

    const { threadId } = req.params;
    const { content } = req.body;

    try {

        const result = await pool.query(`
            INSERT INTO thread_messages
            (thread_id, user_id, username, content)
            VALUES ($1, $2, $3, $4)
            RETURNING id, thread_id, user_id, username, content, created_at, last_activity
        `, [
            threadId,
            req.session.user.id,
            req.session.user.username,
            content
        ]);

        const message = result.rows[0];
        const io = req.app.get("io");

        if (io && typeof io.threadEmit === "function") {
            io.threadEmit(threadId, "thread:message:new", message);
        }

        res.json(message);

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

/* =========================
GET THREAD ATTACHMENTS
========================= */

router.get("/:threadId/attachments", authRequired, async (req, res) => {

    const { threadId } = req.params;

    try {

        const result = await pool.query(`
            SELECT id, thread_id, message_id, user_id, filename, file_url, mime_type, file_size, uploaded_at
            FROM thread_attachments
            WHERE thread_id = $1
            ORDER BY uploaded_at ASC
        `, [threadId]);

        res.json(result.rows);

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

/* =========================
DELETE THREAD (ADMIN)
========================= */

router.delete("/admin/thread/:id", authRequired, adminOnly, async (req, res) => {

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