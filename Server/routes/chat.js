const express = require("express");
const pool = require("../database/database");
const authRequired = require("../middleware/auth");
const adminOnly = require("../middleware/admin");

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
                ) AS pinned

            FROM global_messages gm

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

router.post("/api/global/send", authRequired, async (req, res) => {

    const { content } = req.body;

    try {

        const result = await pool.query(`
            INSERT INTO global_messages
            (user_id, username, content)
            VALUES ($1, $2, $3)
            RETURNING *
        `, [
            req.session.user.id,
            req.session.user.username,
            content
        ]);

        io.to("global").emit("global:message:new", {
            ...result.rows[0],
            pinned: false
        });

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
                    ) AS pinned

                FROM global_messages gm

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
DELETE MESSAGE
========================= */

router.delete(
    "/api/admin/message/:id",
    authRequired,
    adminOnly,

    async (req, res) => {

        const { id } = req.params;

        try {

            await pool.query(`
                DELETE FROM global_messages
                WHERE id = $1
            `, [id]);

            await pool.query(`
                DELETE FROM pinned_messages
                WHERE message_id = $1
            `, [id]);

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

        try {

            await pool.query(`
                INSERT INTO pinned_messages
                (
                    message_id,
                    chat_type,
                    chat_target,
                    content,
                    username,
                    pinned_by
                )
                VALUES
                    ($1, $2, $3, $4, $5, $6)
            `, [

                message_id,
                chat_type,
                chat_target,
                content,
                username,
                req.session.user.id
            ]);

            io.emit("message:pin", message_id)

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
    UNPIN MESSAGE
    ========================= */

    router.delete(
        "/api/admin/pin/:messageId",
        authRequired,
        adminOnly,

        async (req, res) => {

            try {

                const messageId =
                    Number(req.params.messageId);

                if (!messageId) {

                    return res.status(400).json({
                        success: false
                    });
                }

                await pool.query(`
                    DELETE FROM pinned_messages
                    WHERE message_id = $1
                `, [messageId]);

                io.emit(
                    "message:unpin",
                    messageId
                );

                res.json({
                    success: true
                });

            } catch (err) {

                console.error(
                    "UNPIN ERROR:",
                    err
                );

                res.status(500).json({
                    success: false
                });
            }
        }
    );

    return router;
};