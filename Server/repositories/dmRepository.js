const pool = require("../config/database");


async function getContacts(userId) {

    const result =
        await pool.query(`

            SELECT id,
                   username
            FROM users
            WHERE id != $1
            ORDER BY username ASC
        `, [userId]);

    return result.rows;
}


async function findUser(username, userId) {

    const result =
        await pool.query(`

            SELECT id,
                   username
            FROM users
            WHERE username = $1
              AND id != $2
        `, [
            username,
            userId
        ]);

    return result.rows[0];
}


async function getThread(userId, contactId) {

    const result =
        await pool.query(`

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
            GROUP BY dm.id,
                     dm.sender_id,
                     dm.sender_username,
                     dm.content,
                     dm.created_at
            ORDER BY dm.created_at ASC
        `, [
            userId,
            contactId
        ]);


    return result.rows;
}


async function createMessage(userId, receiverId, username, content) {

    const result =
        await pool.query(`

            INSERT INTO direct_messages
            (
                sender_id,
                receiver_id,
                sender_username,
                content
            )
            VALUES ($1,$2,$3,$4)
            RETURNING *
        `, [
            userId,
            receiverId,
            username,
            content
        ]);


    return result.rows[0];
}


async function createAttachment(messageId, imageUrl, userId) {

    const result =
        await pool.query(`

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
            "dm",
            messageId,
            imageUrl,
            userId
        ]);


    return result.rows[0];
}


async function getAdminContacts(userId) {

    const result =
        await pool.query(`

            SELECT DISTINCT
                other.id,
                other.username
            FROM direct_messages dm
            JOIN users other ON (
                CASE

                    WHEN dm.sender_id = $1
                    THEN dm.receiver_id

                    ELSE dm.sender_id

                END
            ) = other.id
            WHERE dm.sender_id = $1
               OR dm.receiver_id = $1
            ORDER BY other.username ASC
        `, [userId]);

    return result.rows;
}


module.exports = {
    getContacts,
    findUser,
    getThread,
    createMessage,
    createAttachment,
    getAdminContacts
};