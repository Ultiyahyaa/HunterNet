const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");

module.exports = (io) => {

    const router = express.Router();

    /* =========================
       GET USERS / DM CONTACTS
    ========================= */

    router.get(
        "/",
        authRequired,

        async (req, res) => {

            try {

                const result =
                    await pool.query(`

                        SELECT id,
                               username

                        FROM users

                        WHERE id != $1

                        ORDER BY username ASC

                    `, [req.session.user.id]);

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

    router.post(
        "/start",
        authRequired,

        async (req, res) => {

            const { username } = req.body;

            if (!username || !username.trim()) {
                return res.status(400).json({
                    success: false,
                    message: "Username is required"
                });
            }

            try {

                const result = await pool.query(`
                    SELECT id, username
                    FROM users
                    WHERE username = $1
                      AND id != $2
                `, [
                    username.trim(),
                    req.session.user.id
                ]);

                if (!result.rows.length) {
                    return res.status(404).json({
                        success: false,
                        message: "User not found"
                    });
                }

                const user = result.rows[0];

                const roomId = [
                    req.session.user.id,
                    user.id
                ]
                    .sort()
                    .join("-");

                res.json({
                    success: true,
                    id: user.id,
                    username: user.username,
                    roomId
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
       GET DM THREAD
    ========================= */

    router.get(
        "/:userId",
        authRequired,

        async (req, res) => {

            try {

                const result =
                    await pool.query(`

                        SELECT dm.id,
                               dm.sender_id       AS user_id,
                               dm.sender_username AS username,
                               dm.content,
                               dm.created_at,

                               false              AS pinned

                        FROM direct_messages dm

                        WHERE (
                            dm.sender_id = $1
                                AND
                            dm.receiver_id = $2
                            )

                           OR (
                            dm.sender_id = $2
                                AND
                            dm.receiver_id = $1
                            )

                        ORDER BY dm.created_at ASC

                    `, [

                        req.session.user.id,

                        req.params.userId
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
       SEND DM
    ========================= */

    router.post(
        "/:userId/send",
        authRequired,

        async (req, res) => {

            const {content} =
                req.body;

            try {

                const result =
                    await pool.query(`

                        INSERT INTO direct_messages
                        (sender_id,
                         receiver_id,
                         sender_username,
                         content)

                        VALUES ($1, $2, $3, $4)

                        RETURNING *

                    `, [

                        req.session.user.id,

                        req.params.userId,

                        req.session.user.username,

                        content
                    ]);

                const users = [

                    req.session.user.id,

                    req.params.userId
                ]
                    .sort()
                    .join("-");

                const message = {

                    ...result.rows[0],

                    user_id:
                    result.rows[0]
                        .sender_id,

                    username:
                    result.rows[0]
                        .sender_username,

                    roomId: users,

                    pinned: false
                };

                io.to(
                    `dm:${users}`
                ).emit(
                    "dm:message:new",
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
