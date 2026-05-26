const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");
const upload = require("../middleware/uploadChatImages");

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

                               false              AS pinned,

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

                        FROM direct_messages dm

                        LEFT JOIN message_attachments ma
                            ON ma.message_id = dm.id
                            AND ma.chat_type = 'dm'

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

                        GROUP BY dm.id, dm.sender_id, dm.sender_username, dm.content, dm.created_at

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

        upload.array("images", 8),

        async (req, res) => {

            const {content} =
                req.body;

            const userId =
                Number(req.session.user.id);

            const receiverId =
                Number(req.params.userId);

            try {

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

                        INSERT INTO direct_messages
                        (sender_id,
                         receiver_id,
                         sender_username,
                         content)

                        VALUES ($1, $2, $3, $4)

                        RETURNING *

                    `, [

                        userId,

                        receiverId,

                        req.session.user.username,

                        content
                    ]);

                const message = result.rows[0];

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

                                "dm",

                                message.id,

                                imageUrl,

                                userId
                            ]);

                        attachments.push(
                            attachment.rows[0]
                        );
                    }
                }

                const users = [

                    userId,

                    receiverId
                ]
                    .sort()
                    .join("-");

                const finalMessage = {

                    ...message,

                    user_id:
                    message
                        .sender_id,

                    username:
                    message
                        .sender_username,

                    roomId: users,

                    attachments,

                    pinned: false
                };

                io.to(
                    `dm:${users}`
                ).emit(
                    "dm:message:new",
                    finalMessage
                );

                res.json({
                    success: true,
                    message: finalMessage
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
