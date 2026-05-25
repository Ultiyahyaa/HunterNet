const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");

module.exports = (io) => {

    const router =
        express.Router();

    /* =========================
       GET ROOMS
    ========================= */

    router.get(
        "/",
        authRequired,

        async (req, res) => {

            try {

                const result =
                    await pool.query(`

                        SELECT
                            r.id,
                            r.name

                        FROM rooms r

                        WHERE $1 = ANY(r.members)

                        ORDER BY r.id ASC

                    `, [
                        req.session.user.id
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
       ROOM MESSAGES
    ========================= */

    router.get(
        "/:roomId/messages",
        authRequired,

        async (req, res) => {

            try {

                const memberCheck =
                    await pool.query(`
                        SELECT 1
                        FROM rooms
                        WHERE id = $1
                          AND $2 = ANY(members)
                    `, [

                        req.params.roomId,

                        req.session.user.id
                    ]);

                if (
                    !memberCheck.rows.length
                ) {

                    return res.status(403).json({
                        success: false,
                        message:
                            "Access denied"
                    });
                }

                const result =
                    await pool.query(`

                        SELECT rm.id,
                               rm.room_id,
                               rm.user_id,
                               rm.username,
                               rm.content,
                               rm.created_at,

                               EXISTS (
                                   SELECT 1
                                   FROM pinned_messages pm
                                   WHERE pm.message_id = rm.id
                                   AND pm.chat_type = 'room'
                                   AND pm.chat_target = rm.room_id::text
                               ) AS pinned

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
       CREATE ROOM
    ========================= */

    router.post(
        "/create",
        authRequired,

        async (req, res) => {

            const { name } =
                req.body;

            if (
                !name ||
                !name.trim()
            ) {

                return res.status(400).json({
                    success: false,
                    message:
                        "Room name is required"
                });
            }

            try {

                const userId =
                    Number(req.session.user.id);

                const result =
                    await pool.query(`
                        INSERT INTO rooms
                        (
                            name,
                            owner_id,
                            created_by,
                            members
                        )

                        VALUES ($1, $2, $3, ARRAY[$4::INTEGER])

                        RETURNING id, name, members
                    `, [

                        name.trim(),

                        userId,
                        userId,
                        userId,
                    ]);

                res.json({

                    success: true,

                    room:
                        result.rows[0]
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
       INVITE USER
    ========================= */

    router.post(
        "/:roomId/invite",
        authRequired,

        async (req, res) => {

            const { username } =
                req.body;

            try {

                const memberCheck =
                    await pool.query(`
                        SELECT 1
                        FROM rooms
                        WHERE id = $1
                          AND $2 = ANY(members)
                    `, [

                        req.params.roomId,

                        req.session.user.id
                    ]);

                if (
                    !memberCheck.rows.length
                ) {

                    return res.status(403).json({
                        success: false,
                        message:
                            "Access denied"
                    });
                }

                const userResult =
                    await pool.query(`
                        SELECT id,
                               username

                        FROM users

                        WHERE LOWER(username)
                        = LOWER($1)
                    `, [
                        username.trim()
                    ]);

                if (
                    !userResult.rows.length
                ) {

                    return res.status(404).json({
                        success: false,
                        message:
                            "User not found"
                    });
                }

                const targetUser =
                    userResult.rows[0];

                await pool.query(`
                    UPDATE rooms

                    SET members = array_append(
                            members,
                            $1
                                  )

                    WHERE id = $2
                    AND NOT ($1 = ANY(members))
                `, [

                    targetUser.id,

                    req.params.roomId
                ]);

                res.json({

                    success: true,

                    username:
                    targetUser.username
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

            const { content } =
                req.body;

            const roomId =
                Number(req.params.roomId);

            const userId =
                Number(req.session.user.id);

            try {

                /* =========================
                   VALIDATE MEMBERSHIP
                ========================= */

                const memberCheck =
                    await pool.query(`
                        SELECT id

                        FROM rooms

                        WHERE id = $1
                          AND $2 = ANY(members)
                    `, [

                        roomId,

                        userId
                    ]);

                if (
                    !memberCheck.rows.length
                ) {

                    return res.status(403).json({
                        success: false,
                        message:
                            "Access denied"
                    });
                }

                /* =========================
                   INSERT MESSAGE
                ========================= */

                const result =
                    await pool.query(`

                        INSERT INTO room_messages
                        (
                            room_id,
                            user_id,
                            username,
                            content
                        )

                        VALUES ($1, $2, $3, $4)

                        RETURNING *

                    `, [

                        roomId,

                        userId,

                        req.session.user.username,

                        content
                    ]);

                const message = {

                    ...result.rows[0],

                    pinned: false
                };

                /* =========================
                   EMIT
                ========================= */

                io.to(
                    `room:${roomId}`
                ).emit(
                    "room:message:new",
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