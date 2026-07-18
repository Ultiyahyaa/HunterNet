const pool = require("../config/database");

async function getGlobalMessages() {

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

        GROUP BY
            gm.id,
            gm.user_id,
            gm.username,
            gm.content,
            gm.created_at

        ORDER BY gm.created_at ASC
    `);

    return result.rows;

}

async function createGlobalMessage(data) {

    const result = await pool.query(`
        INSERT INTO global_messages
        (
            user_id,
            username,
            content
        )
        VALUES ($1,$2,$3)
        RETURNING *
    `, [
        data.userId,
        data.username,
        data.content
    ]);

    return result.rows[0];

}

async function createAttachment(data) {

    const result = await pool.query(`
        INSERT INTO message_attachments
        (
            chat_type,
            message_id,
            image_url,
            uploaded_by
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *
    `, [
        data.chatType,
        data.messageId,
        data.imageUrl,
        data.userId
    ]);

    return result.rows[0];

}

async function getPins(data) {

    let result;

    if (data.type === "global") {

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
            WHERE chat_type = $1
              AND chat_target = $2
            ORDER BY pinned_at DESC
        `, [
            data.type,
            data.target
        ]);

    }

    return result.rows;

}

const messageTables = {

    global: "global_messages",
    room: "room_messages",
    dm: "direct_messages"

};


async function getMessageAttachments(type, id) {

    const result = await pool.query(`
        SELECT image_url
        FROM message_attachments
        WHERE chat_type = $1
          AND message_id = $2
    `, [
        type,
        id
    ]);

    return result.rows;

}


async function deleteAttachments(type, id) {

    await pool.query(`
        DELETE FROM message_attachments
        WHERE chat_type = $1
        AND message_id = $2
    `, [
        type,
        id
    ]);

}


async function deletePins(id) {

    await pool.query(`
        DELETE FROM pinned_messages
        WHERE message_id = $1
    `, [id]);

}


async function deleteMessage(type, id) {

    const table =
        messageTables[type];


    if (!table) {
        throw new Error("Invalid chat type");
    }


    await pool.query(
        `
        DELETE FROM ${table}
        WHERE id = $1
        `,
        [id]
    );

}

async function getUser(id) {

    const result = await pool.query(`
        SELECT
            id,
            username,
            is_admin
        FROM users
        WHERE id = $1
    `, [
        id
    ]);

    return result.rows[0];

}

async function pinMessage(data) {

    await pool.query(`
        INSERT INTO pinned_messages
            (message_id, chat_type, chat_target, pinned_by, content, username)
        VALUES ($1, $2, $3, $4, $5, $6)
        ON CONFLICT (message_id)
        DO NOTHING
    `, [
        data.message_id,
        data.chat_type,
        data.chat_target || null,
        Number(data.userId),
        data.content,
        data.username
    ]);

}

async function unpinMessage(data) {

    await pool.query(`
        DELETE
        FROM pinned_messages
        WHERE message_id = $1
          AND chat_type = $2
          AND ($3::text IS NULL OR chat_target = $3)
    `, [
        data.messageId,
        data.chat_type,
        data.chat_target || null
    ]);

}

module.exports = {
    getGlobalMessages,
    createGlobalMessage,
    createAttachment,
    getPins,
    getMessageAttachments,
    deleteAttachments,
    deletePins,
    deleteMessage,
    getUser,
    pinMessage,
    unpinMessage,
};