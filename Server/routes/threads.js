const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

const router = express.Router();

/* =========================
GET ALL THREADS
========================= */

router.post("/api", authRequired, async (req, res) => {

    const { title, content } = req.body;

    try {

        const result = await pool.query(`
            INSERT INTO threads
            (title, content, user_id, username)
            VALUES ($1, $2, $3, $4)
            RETURNING id, title, content, username, created_at
        `, [
            title,
            content,
            req.session.user.id,
            req.session.user.username
        ]);

        // 🔥 IMPORTANT: return full object
        res.json(result.rows[0]);

    } catch (err) {

        console.log(err);
        res.status(500).json({ success: false });
    }
});

/* =========================
CREATE THREAD
========================= */

router.post("/api", authRequired, async (req, res) => {

    const { title, content } = req.body;

    try {

        await pool.query(`
            INSERT INTO threads
            (title, content, user_id, username)
            VALUES ($1, $2, $3, $4)
        `, [
            title,
            content,
            req.session.user.id,
            req.session.user.username
        ]);

        res.json({ success: true });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

/* =========================
GET THREAD MESSAGES
========================= */

router.get("/api/:threadId/messages", authRequired, async (req, res) => {

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

router.post("/api/:threadId/messages", authRequired, async (req, res) => {

    const { threadId } = req.params;
    const { content } = req.body;

    try {

        await pool.query(`
            INSERT INTO thread_messages
            (thread_id, user_id, username, content)
            VALUES ($1, $2, $3, $4)
        `, [
            threadId,
            req.session.user.id,
            req.session.user.username,
            content
        ]);

        res.json({ success: true });

    } catch (err) {

        console.log(err);

        res.status(500).json({ success: false });
    }
});

/* =========================
DELETE THREAD (ADMIN)
========================= */

router.delete("/api/admin/thread/:id", authRequired, adminOnly, async (req, res) => {

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