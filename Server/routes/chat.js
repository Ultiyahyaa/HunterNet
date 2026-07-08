const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");
const adminOnly = require("../middleware/admin");
const upload = require("../middleware/chatImages");
const fs = require("fs").promises;
const path = require("path");

module.exports = (io) => {

    const router = express.Router();

/* =========================
   GLOBAL MESSAGES
========================= */

router.get("/api/global", authRequired, async (req, res) => {

    try {

        const result = await pool.query(`
            SELECT
                gm.id,
                gm.user_id,
                gm.username,
                gm.content,
                gm.created_at,

                EXISTS (
                    SELECT 1
                    FROM pinned_messages pm
                    WHERE pm.message_id = gm.id
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

            FROM global_messages gm

            LEFT JOIN message_attachments ma
                ON ma.message_id = gm.id
                AND ma.chat_type = 'global'

            GROUP BY gm.id, gm.user_id, gm.username, gm.content, gm.created_at

            ORDER BY gm.created_at ASC
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
   SEND GLOBAL MESSAGE
========================= */

router.post("/api/global/send", authRequired, upload.array("images", 8), async (req, res) => {

    const { content } = req.body;
    const userId = Number(req.session.user.id);

    try {

        if (
            (!content || !content.trim())
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

        const result = await pool.query(`
            INSERT INTO global_messages
            (user_id, username, content)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [
            userId,
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

                        "global",

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

        io.to("global").emit("global:message:new", finalMessage);

        res.json({
            success: true
        });

    } catch (err) {

        console.log(err);

        res.status(500).json({
            success: false
        });
    }
});

/* =========================
GET PINS
========================= */

router.get(
    "/api/pins",
    authRequired,

    async (req, res) => {

        const {
            type,
            target
        } = req.query;

        try {

            let result;

            if (type === "global") {

                result = await pool.query(`
                    SELECT *
                    FROM pinned_messages
                    WHERE chat_type = 'global'
                    ORDER BY pinned_at DESC
                `);

            } else {

                result = await pool.query(`
                    SELECT *
                    FROM pinned_messages
                    WHERE
                        chat_type = $1
                        AND
                        chat_target = $2
                    ORDER BY pinned_at DESC
                `, [
                    type,
                    target
                ]);
            }

            res.json(result.rows);

        } catch (err) {

            console.log(err);

            res.status(500).json({
                success: false
            });
        }
    }
);

/* =========================
ADMIN GLOBAL MESSAGES
========================= */

router.get(
    "/api/admin/global",
    authRequired,
    adminOnly,

    async (req, res) => {

        try {

            const result = await pool.query(`
                SELECT
                    gm.id,
                    gm.user_id,
                    gm.username,
                    gm.content,
                    gm.created_at,

                    EXISTS (
                        SELECT 1
                        FROM pinned_messages pm
                        WHERE pm.message_id = gm.id
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

                FROM global_messages gm

                LEFT JOIN message_attachments ma
                    ON ma.message_id = gm.id
                    AND ma.chat_type = 'global'

                GROUP BY gm.id, gm.user_id, gm.username, gm.content, gm.created_at

                ORDER BY gm.created_at ASC
            `);

            /* IMPORTANT:
               RETURN ARRAY ONLY
            */

            res.json(result.rows);

        } catch (err) {

            console.log(err);

            res.status(500).json({
                success: false
            });
        }
    }
);

/* =========================
ADMIN ROOMS
========================= */

router.get(
    "/api/admin/rooms",
    authRequired,
    adminOnly,

    async (req, res) => {

        try {

            const result = await pool.query(`
                SELECT
                    r.id,
                    r.name
                FROM rooms r
                ORDER BY r.id ASC
            `);

            res.json(result.rows);

        } catch (err) {

            console.log(err);

            res.status(500).json({
                success: false
            });
        }
    }
);

/* =========================
ADMIN ROOM MESSAGES
========================= */

router.get(
    "/api/admin/rooms/:roomId/messages",
    authRequired,
    adminOnly,

    async (req, res) => {

        try {

            const result = await pool.query(`
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
            `, [req.params.roomId]);

            res.json(result.rows);

        } catch (err) {

            console.log(err);

            res.status(500).json({
                success: false
            });
        }
    }
);

/* =========================
ADMIN USER CONTACTS
========================= */

router.get(
    "/api/admin/user/:id/contacts",
    authRequired,
    adminOnly,

    async (req, res) => {

        const userId = Number(req.params.id);

        try {

            const result = await pool.query(`
                SELECT DISTINCT
                    other.id,
                    other.username
                FROM direct_messages dm
                JOIN users other ON (
                    CASE
                        WHEN dm.sender_id = $1 THEN dm.receiver_id
                        ELSE dm.sender_id
                    END
                ) = other.id
                WHERE dm.sender_id = $1
                   OR dm.receiver_id = $1
                ORDER BY other.username ASC
            `, [userId]);

            res.json(result.rows);

        } catch (err) {

            console.log(err);

            res.status(500).json({
                success: false
            });
        }
    }
);

/* =========================
ADMIN DM THREAD
========================= */

router.get(
    "/api/admin/dms/:userId/:contactId",
    authRequired,
    adminOnly,

    async (req, res) => {

        const userId = Number(req.params.userId);
        const contactId = Number(req.params.contactId);

        try {

            const result = await pool.query(`
                SELECT dm.id,
                       dm.sender_id AS user_id,
                       dm.sender_username AS username,
                       dm.content,
                       dm.created_at,
                       false AS pinned,
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
                    AND dm.receiver_id = $2
                )
                OR (
                    dm.sender_id = $2
                    AND dm.receiver_id = $1
                )
                GROUP BY dm.id, dm.sender_id, dm.sender_username, dm.content, dm.created_at
                ORDER BY dm.created_at ASC
            `, [userId, contactId]);

            res.json(result.rows);

        } catch (err) {

            console.log(err);

            res.status(500).json({
                success: false
            });
        }
    }
);

/* =========================
DELETE MESSAGE
========================= */

    router.delete(
        "/api/admin/message/:id",
        authRequired,
        adminOnly,

        async (req, res) => {

            const { id } = req.params;
            const { chatType } = req.body;

            try {

                const attachments = await pool.query(`
                    SELECT image_url
                    FROM message_attachments
                    WHERE chat_type = $1
                      AND message_id = $2
                `, [chatType, id]);

                for (const { image_url } of attachments.rows) {

                    const filePath = path.join(
                        __dirname,
                        "..",
                        "public",
                        image_url.replace(/^\//, "")
                    );

                    await fs.unlink(filePath)
                        .catch(() => null);
                }

                await pool.query(`
                    DELETE FROM message_attachments
                    WHERE chat_type = $1
                      AND message_id = $2
                `, [chatType, id]);

                await pool.query(`
                    DELETE FROM pinned_messages
                    WHERE message_id = $1
                `, [id]);

                switch (chatType) {

                    case "global":

                        await pool.query(`
                        DELETE FROM global_messages
                        WHERE id = $1
                    `, [id]);

                        break;

                    case "room":

                        await pool.query(`
                        DELETE FROM room_messages
                        WHERE id = $1
                    `, [id]);

                        break;

                    case "dm":

                        await pool.query(`
                        DELETE FROM direct_messages
                        WHERE id = $1
                    `, [id]);

                        break;
                }

                io.emit("message:delete", id);

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
GET USER INFO
========================= */

router.get(
    "/api/admin/user/:id",
    authRequired,
    adminOnly,

    async (req, res) => {

        const { id } = req.params;

        try {

            const result = await pool.query(`
                SELECT
                    id,
                    username,
                    is_admin
                FROM users
                WHERE id = $1
            `, [id]);

            res.json(result.rows[0]);

        } catch (err) {

            console.log(err);

            res.status(500).json({
                success: false
            });
        }
    }
);

    /* =========================
    PIN MESSAGE
    ========================= */

    router.post(
        "/api/admin/pin",
        authRequired,
        adminOnly,
        async (req, res) => {

            const {
                message_id,
                chat_type,
                chat_target,
                content,
                username
            } = req.body;

            if (!message_id || !chat_type) {
                return res.status(400).json({ success: false });
            }

            try {

                await pool.query(`
                INSERT INTO pinned_messages
                    (message_id, chat_type, chat_target, pinned_by, content, username)
                VALUES ($1, $2, $3, $4, $5, $6)
                ON CONFLICT (message_id)
                DO NOTHING
            `, [
                    message_id,
                    chat_type,
                    chat_target || null,
                    Number(req.session.user.id),
                    content,
                    username
                ]);

                io.emit("message:pin", {
                    messageId: message_id,
                    chat_type,
                    chat_target
                });

                res.json({ success: true });

            } catch (err) {
                console.error("PIN ERROR:", err);
                res.status(500).json({ success: false });
            }
        }
    );

    /* =========================
    UNPIN MESSAGE
    ========================= */

    router.delete(
        "/api/admin/pin/:messageId",
        authRequired,
        adminOnly,
        async (req, res) => {

            const messageId = Number(req.params.messageId);
            const {chat_type, chat_target} = req.body || {};

            if (!messageId || !chat_type) {
                return res.status(400).json({success: false});
            }

            try {

                await pool.query(`
                    DELETE
                    FROM pinned_messages
                    WHERE message_id = $1
                      AND chat_type = $2
                      AND ($3::text IS NULL OR chat_target = $3)
                `, [
                    messageId,
                    chat_type,
                    chat_target || null
                ]);

                io.emit("message:unpin", {
                    messageId,
                    chat_type,
                    chat_target
                });

                res.json({success: true});

            } catch (err) {
                console.error("UNPIN ERROR:", err);
                res.status(500).json({success: false});
            }
        }
    )

    return router;
}
