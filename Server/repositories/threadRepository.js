const pool = require("../config/database");


async function getThreads(){

    const result =
        await pool.query(`

            SELECT
                t.id,
                t.title,
                t.content,
                t.user_id,
                t.username,
                t.created_at,
                t.is_pinned,
                t.is_locked,
                t.members,

                COALESCE(
                    json_agg(
                        json_build_object(
                            'id', a.id,
                            'image_url', a.image_url,
                            'uploaded_by', a.uploaded_by
                        )
                    )
                    FILTER (WHERE a.id IS NOT NULL),
                    '[]'
                ) AS attachments

            FROM threads t

            LEFT JOIN thread_attachments a
                ON t.id = a.thread_id
                AND a.message_id IS NULL

            GROUP BY
                t.id,
                t.title,
                t.content,
                t.user_id,
                t.username,
                t.created_at,
                t.is_pinned,
                t.is_locked,
                t.members

            ORDER BY
                t.is_pinned DESC,
                t.created_at DESC

        `);


    return result.rows;

}

async function createThread(data) {

    const result =
        await pool.query(`

            INSERT INTO threads
            (
                title,
                content,
                user_id,
                username
            )

            VALUES ($1,$2,$3,$4)

            RETURNING *

        `, [

            data.title,
            data.content,
            data.userId,
            data.username

        ]);


    return result.rows[0];

}



async function createAttachment(data) {

    const result =
        await pool.query(`

            INSERT INTO thread_attachments
            (
                thread_id,
                image_url,
                uploaded_by
            )

            VALUES ($1,$2,$3)

            RETURNING *

        `, [

            data.threadId,
            data.imageUrl,
            data.userId

        ]);


    return result.rows[0];

}

async function getMessages(threadId) {

    const result = await pool.query(`
        SELECT
            m.id,
            m.thread_id,
            m.user_id,
            m.username,
            m.content,
            m.created_at,

            EXISTS (
                SELECT 1
                FROM thread_pinned_messages pm
                WHERE pm.message_id = m.id
                  AND pm.thread_id = m.thread_id
            ) AS pinned,

            COALESCE(
                json_agg(
                    json_build_object(
                        'id', a.id,
                        'image_url', a.image_url,
                        'uploaded_by', a.uploaded_by
                    )
                ) FILTER (WHERE a.id IS NOT NULL),
                '[]'
            ) AS attachments

        FROM thread_messages m

        LEFT JOIN thread_attachments a
            ON m.id = a.message_id

        WHERE m.thread_id = $1

        GROUP BY
            m.id,
            m.thread_id,
            m.user_id,
            m.username,
            m.content,
            m.created_at

        ORDER BY m.created_at ASC
    `, [threadId]);

    return result.rows;

}

async function getThread(threadId) {

    const result = await pool.query(
        `
        SELECT is_locked
        FROM threads
        WHERE id = $1
        `,
        [threadId]
    );

    return result.rows[0];

}


async function createMessage(data) {

    const result = await pool.query(
        `
        INSERT INTO thread_messages
        (
            thread_id,
            user_id,
            username,
            content
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *
        `,
        [
            data.threadId,
            data.userId,
            data.username,
            data.content
        ]
    );

    return result.rows[0];

}


async function createMessageAttachment(data) {

    const result = await pool.query(
        `
        INSERT INTO thread_attachments
        (
            thread_id,
            message_id,
            image_url,
            uploaded_by
        )
        VALUES ($1,$2,$3,$4)
        RETURNING *
        `,
        [
            data.threadId,
            data.messageId,
            data.imageUrl,
            data.userId
        ]
    );

    return result.rows[0];

}

async function getThreadAttachments(threadId) {

    const result = await pool.query(
        `
        SELECT image_url
        FROM thread_attachments
        WHERE thread_id = $1
        `,
        [threadId]
    );

    return result.rows;

}

async function deleteThread(threadId) {

    await pool.query(
        `DELETE FROM thread_pinned_messages WHERE thread_id = $1`,
        [threadId]
    );

    await pool.query(
        `DELETE FROM thread_attachments WHERE thread_id = $1`,
        [threadId]
    );

    await pool.query(
        `DELETE FROM thread_messages WHERE thread_id = $1`,
        [threadId]
    );

    await pool.query(
        `DELETE FROM thread_members WHERE thread_id = $1`,
        [threadId]
    );

    await pool.query(
        `DELETE FROM threads WHERE id = $1`,
        [threadId]
    );

}

async function pinThread(threadId) {

    const result = await pool.query(`
        UPDATE threads
        SET is_pinned = NOT is_pinned
        WHERE id = $1
        RETURNING id, is_pinned
    `, [threadId]);

    return result.rows[0];

}

async function lockThread(threadId) {

    const result = await pool.query(`
        UPDATE threads
        SET is_locked = NOT is_locked
        WHERE id = $1
        RETURNING id, is_locked
    `, [threadId]);

    return result.rows[0];

}

async function getPins(threadId) {

    const result = await pool.query(`
        SELECT *
        FROM thread_pinned_messages
        WHERE thread_id = $1
        ORDER BY pinned_at DESC
    `, [threadId]);

    return result.rows;

}

async function pinMessage(data) {

    await pool.query(`
        INSERT INTO thread_pinned_messages
            (message_id, thread_id, pinned_by, content, username)
        VALUES ($1, $2, $3, $4, $5)
        ON CONFLICT (message_id)
        DO NOTHING
    `, [
        data.messageId,
        data.threadId,
        data.pinnedBy,
        data.content,
        data.username
    ]);

}

async function unpinMessage(data) {

    await pool.query(`
        DELETE FROM thread_pinned_messages
        WHERE message_id = $1
          AND thread_id = $2
    `, [
        data.messageId,
        data.threadId
    ]);

}

async function getMessage(messageId) {

    const result = await pool.query(`
        SELECT thread_id
        FROM thread_messages
        WHERE id = $1
    `, [messageId]);

    return result.rows[0];

}

async function getMessageAttachments(messageId) {

    const result = await pool.query(`
        SELECT image_url
        FROM thread_attachments
        WHERE message_id = $1
    `, [messageId]);

    return result.rows;

}

async function deleteMessage(messageId) {

    await pool.query(
        `DELETE FROM thread_attachments WHERE message_id = $1`,
        [messageId]
    );

    await pool.query(
        `DELETE FROM thread_pinned_messages WHERE message_id = $1`,
        [messageId]
    );

    await pool.query(
        `DELETE FROM thread_messages WHERE id = $1`,
        [messageId]
    );

}

async function getAttachment(attachmentId) {

    const result = await pool.query(`
        SELECT
            id,
            thread_id,
            message_id,
            image_url
        FROM thread_attachments
        WHERE id = $1
    `, [attachmentId]);

    return result.rows[0];

}

async function deleteAttachment(attachmentId) {

    await pool.query(`
        DELETE FROM thread_attachments
        WHERE id = $1
    `, [attachmentId]);

}

module.exports = {
    getThreads,
    createThread,
    createAttachment,
    getMessages,
    getThread,
    createMessage,
    createMessageAttachment,
    getThreadAttachments,
    deleteThread,
    pinThread,
    lockThread,
    getPins,
    pinMessage,
    unpinMessage,
    getMessage,
    getMessageAttachments,
    deleteMessage,
    getAttachment,
    deleteAttachment,
};
