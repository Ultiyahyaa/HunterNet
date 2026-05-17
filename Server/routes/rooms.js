const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");

module.exports = (io) => {

    const router = express.Router();

    /* =========================
       GET ROOMS
    ========================= */

    router.get("/", authRequired, async (req, res) => {

        try {

            const result = await pool.query(`
                SELECT id,
                       name
                FROM rooms
                ORDER BY id ASC
            `);

            res.json(result.rows);

        } catch (err) {

            console.log(err);

            res.status(500).json({
                success: false
            });
        }
    });

    /* =========================
       ROOM MESSAGES
    ========================= */

    router.get(
        "/:roomId/messages",
        authRequired,

        async (req, res) => {

            try {

                const result =
                    await pool.query(`

                        SELECT rm.id,
                               rm.room_id,
                               rm.user_id,
                               rm.username,
                               rm.content,
                               rm.created_at,

                               EXISTS (SELECT 1
                                       FROM pinned_messages pm
                                       WHERE pm.message_id = rm.id
                                         AND pm.chat_type = 'room'
                                         AND pm.chat_target = rm.room_id::text) AS pinned
                    
                        FROM room_messages rm

                        WHERE rm.room_id = $1

                        ORDER BY rm.created_at ASC

                    `, [
                        req.params.roomId
                    ]);

                res.json(
                    result.rows
                );

            } catch (err) {

                console.log(err);

                res.status(500).json({
                    success: false
                });
            }
        }
    );

    /* =========================
       CREATE NEW ROOM
    ========================= */

    router.post(
        "/create",
        authRequired,

        async (req, res) => {

            const { name } = req.body;

            if (!name || !name.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Room name is required"
                });
            }

            try {

                const result = await pool.query(`
                    INSERT INTO rooms (name)
                    VALUES ($1)
                    RETURNING id, name
                `, [
                    name.trim()
                ]);

                res.json({
                    success: true,
                    room: result.rows[0]
                });

            } catch (err) {

                console.log(err);

                res.status(500).json({
                    success: false
                });
            }
        }
    );

    /* =========================
       SEND ROOM MESSAGE
    ========================= */

    router.post(
        "/:roomId/send",
        authRequired,

        async (req, res) => {

            const {content} =
                req.body;

            try {

                const result =
                    await pool.query(`

                        INSERT INTO room_messages
                        (room_id,
                         user_id,
                         username,
                         content)

                        VALUES ($1, $2, $3, $4)

                        RETURNING *

                    `, [

                        req.params.roomId,

                        req.session.user.id,

                        req.session.user.username,

                        content
                    ]);

                const message =
                    {
                        ...result.rows[0],
                        pinned: false
                    };

                io.to(
                    `room:${req.params.roomId}`
                ).emit(
                    "message:new",
                    message
                );

                res.json({
                    success: true,
                    message
                });

            } catch (err) {

                console.log(err);

                res.status(500).json({
                    success: false
                });
            }
        }
    );

    return router;
};
