const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");

const router = express.Router();

/* =========================
   GET ROOMS
========================= */

router.get("/", authRequired, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT id, name
            FROM rooms
            ORDER BY id ASC
        `);

        res.json(result.rows);

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false });
    }

});

/* =========================
   ROOM MESSAGES
========================= */

router.get("/:roomId/messages", authRequired, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                id,
                user_id,
                username,
                content AS message,
                created_at
            FROM room_messages
            WHERE room_id = $1
            ORDER BY created_at ASC
        `, [req.params.roomId]);

        res.json(result.rows);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false
        });
    }
});

/* =========================
   SEND ROOM MESSAGE
========================= */

router.post("/api/:roomId/send", authRequired, async (req, res) => {

    const { content } = req.body;

    try {

        await pool.query(`
            INSERT INTO room_messages
            (room_id, user_id, username, content)
            VALUES ($1, $2, $3, $4)
        `, [
            req.params.roomId,
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

module.exports = router;