const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");
const upload = require("../middleware/chatImages");

module.exports = (io) => {

    const router =
        express.Router();

    /* =========================
       GET ROOMS
    ========================= */

    router.get("/", authRequired, async (req, res) => {
            try {

                const result = await pool.query(`
                    SELECT
                        r.id,
                        r.name
                    FROM rooms r
                    WHERE $1 = ANY(r.members)
                    ORDER BY r.id ASC
                    `,
                    [
                        req.session.user.id
                    ]
                );

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

    router.get("/:roomId/messages", authRequired, async (req, res) => {

            try {

                const memberCheck =
                    await pool.query(`
                        SELECT 1
                        FROM rooms
                        WHERE id = $1
                          AND members @> ARRAY[$2]::INTEGER[]
                    `, [

                        Number(req.params.roomId),

                        Number(req.session.user.id)
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
                               ) AS pinned,

                               COALESCE(
                                   json_agg(
                                       json_build_object(
                                           'id', ma.id,
                                           'image_url', ma.image_url,
                                           'uploaded_by', ma.uploaded_by
                                       )
                                       ORDER BY ma.id
                                   ) FILTER (WHERE ma.id IS NOT NULL),
                                   '[]'::json
                               ) AS attachments

                        FROM room_messages rm

                        LEFT JOIN message_attachments ma
                            ON ma.message_id = rm.id
                            AND ma.chat_type = 'room'

                        WHERE rm.room_id = $1

                        GROUP BY rm.id, rm.room_id, rm.user_id, rm.username, rm.content, rm.created_at

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

    router.post("/create", authRequired, async (req, res) => {

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

    router.post("/:roomId/invite", authRequired, async (req, res) => {

            const { username } =
                req.body;

            try {

                const memberCheck =
                    await pool.query(`
                        SELECT 1
                        FROM rooms
                        WHERE id = $1
                          AND members @> ARRAY[$2]::INTEGER[]
                    `, [

                        Number(req.params.roomId),

                        Number(req.session.user.id)
                    ]);

                if (!memberCheck.rows.length) {

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
       ROOM NAME CHANGE
    ========================= */

    router.patch("/:roomId/changeName", authRequired, async (req, res) => {

            try {

                const roomId = Number(req.params.roomId);
                const userId = Number(req.session.user.id);
                const { name } = req.body;

                const roomName = String(name || "").trim();

                if (!roomName) {
                    return res.status(400).json({
                        success: false,
                        message: "Room name is required"
                    });
                }

                if (roomName.length > 100) {
                    return res.status(400).json({
                        success: false,
                        message: "Room name is too long"
                    });
                }

                const memberCheck = await pool.query(`
                SELECT 1
                FROM rooms
                WHERE id = $1
                  AND members @> ARRAY[$2]::INTEGER[]
            `, [
                    roomId,
                    userId
                ]);

                if (!memberCheck.rows.length) {
                    return res.status(403).json({
                        success: false,
                        message: "Access denied"
                    });
                }

                const updated = await pool.query(`
                UPDATE rooms
                SET name = $1
                WHERE id = $2
                RETURNING id, name
            `, [
                    roomName,
                    roomId
                ]);

                if (!updated.rows.length) {
                    return res.status(404).json({
                        success: false,
                        message: "Room not found"
                    });
                }

                res.json({
                    success: true,
                    room: updated.rows[0]
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
       ROOM MEMBERS
    ========================= */

    router.get("/:roomId/members", authRequired, async (req, res) => {
            try {
                const roomId = Number(req.params.roomId);
                const userId = Number(req.session.user.id);

                const memberCheck =
                    await pool.query(`
                        SELECT 1
                        FROM rooms
                        WHERE id = $1
                          AND members @> ARRAY[$2]::INTEGER[]
                    `, [
                        roomId,
                        userId
                    ]);

                if (!memberCheck.rows.length) {
                    return res.status(403).json({
                        success: false,
                        message: "Access denied"
                    });
                }

                const members =
                    await pool.query(`
                        SELECT u.id,
                               u.username
                        FROM users u
                        JOIN rooms r
                          ON u.id = ANY(r.members)
                        WHERE r.id = $1
                        ORDER BY u.username ASC
                    `, [
                        roomId
                    ]);

                res.json({
                    success: true,
                    members: members.rows
                });
            } catch (err) {
                console.log(err);
                res.status(500).json({
                    success: false,
                    message: "Server error"
                });
            }
        }
    );

    router.delete("/:roomId/members/:memberId", authRequired, async (req, res) => {
            try {
                const roomId = Number(req.params.roomId);
                const userId = Number(req.session.user.id);

                const memberCheck =
                    await pool.query(`
                        SELECT 1
                        FROM rooms
                        WHERE id = $1
                          AND members @> ARRAY[$2]::INTEGER[]
                    `, [
                        roomId,
                        userId
                    ]);

                if (!memberCheck.rows.length) {
                    return res.status(403).json({
                        success: false,
                        message: "Access denied"
                    });
                }

                const removed = await pool.query(`
                    UPDATE rooms
                    SET members = array_remove(members, $1)
                    WHERE id = $2
                    RETURNING id
                `, [
                    Number(req.params.memberId),
                    roomId
                ]);

                if (!removed.rows.length) {
                    return res.status(404).json({
                        success: false,
                        message: "Member not found"
                    });
                }

                res.json({
                    success: true
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

    router.post("/:roomId/send", authRequired,

        upload.array(
            "images",
            8
        ),

        async (req, res) => {

            const roomId =
                Number(req.params.roomId);

            const userId =
                Number(req.session.user.id);

            const content =
                req.body.content || "";

            try {

                const memberCheck =
                    await pool.query(`
                        SELECT id

                        FROM rooms

                        WHERE id = $1
                          AND members @> ARRAY[$2]::INTEGER[]
                    `, [

                        roomId,

                        userId
                    ]);

                if (
                    !memberCheck.rows.length
                ) {

                    return res.status(403).json({
                        success: false
                    });
                }

                if (
                    !content.trim()
                    &&
                    (!req.files ||
                        !req.files.length)
                ) {

                    return res.status(400).json({
                        success: false,
                        message:
                            "Message cannot be empty"
                    });
                }

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

                        roomId,

                        userId,

                        req.session.user.username,

                        content
                    ]);

                const message =
                    result.rows[0];

                let attachments = [];

                if (
                    req.files &&
                    req.files.length
                ) {

                    for (const file of req.files) {

                        const imageUrl =
                            `/uploads/chat/${file.filename}`;

                        const attachment =
                            await pool.query(`
                                INSERT INTO message_attachments
                                (chat_type,
                                 message_id,
                                 image_url,
                                 uploaded_by)

                                VALUES ($1, $2, $3, $4)

                                RETURNING *
                            `, [

                                "room",

                                message.id,

                                imageUrl,

                                userId
                            ]);

                        attachments.push(
                            attachment.rows[0]
                        );
                    }
                }

                const finalMessage = {

                    ...message,

                    attachments,

                    pinned: false
                };

                io.roomEmit(
                    `room:${roomId}`,
                    "room:message:new",
                    finalMessage
                );

                res.json({
                    success: true,
                    message:
                    finalMessage
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