const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");

const router = express.Router();

/* =========================
   GET USERS
========================= */

router.get("/api/users", authRequired, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT id, username
            FROM users
            ORDER BY username ASC
        `);

        res.json(result.rows);

    } catch (err) {
        console.log(err);
        res.status(500).json({ success: false });
    }

});

/* =========================
   GET DM THREAD
========================= */

router.get("/api/:userId", authRequired, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                id,
                sender_id AS user_id,
                sender_username AS username,
                content AS message,
                created_at
            FROM direct_messages
            WHERE
                (sender_id = $1 AND receiver_id = $2)
                OR
                (sender_id = $2 AND receiver_id = $1)
            ORDER BY created_at ASC
        `, [
            req.session.user.id,
            req.params.userId
        ]);

        res.json(result.rows);

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false
        });
    }
});

/* =========================
   SEND DM
========================= */

router.post("/api/:userId/send", authRequired, async (req, res) => {

    const { content } = req.body;

    try {

        await pool.query(`
            INSERT INTO direct_messages
            (sender_id, receiver_id, sender_username, content)
            VALUES ($1, $2, $3, $4)
        `, [
            req.session.user.id,
            req.params.userId,
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