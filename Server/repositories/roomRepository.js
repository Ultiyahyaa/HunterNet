const pool = require("../config/database");

async function getRooms(userId = null) {

    const query = `
        SELECT
            id,
            name
        FROM rooms
                 ${userId !== null ? "WHERE $1 = ANY(members)" : ""}
        ORDER BY id ASC
    `;

    const result = await pool.query(
        query,
        userId !== null ? [userId] : []
    );

    return result.rows;
}


async function isRoomMember(roomId, userId) {

    const result = await pool.query(`
        SELECT 1
        FROM rooms
        WHERE id = $1
          AND members @> ARRAY[$2]::INTEGER[]
    `, [
        roomId,
        userId
    ]);

    return result.rows.length > 0;

}

async function getRoomMessages(roomId) {

    const result = await pool.query(`

        SELECT
            rm.id,
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

        GROUP BY
            rm.id,
            rm.room_id,
            rm.user_id,
            rm.username,
            rm.content,
            rm.created_at

        ORDER BY rm.created_at ASC

    `, [
        roomId
    ]);

    return result.rows;

}
async function createRoom(name, userId) {

    const result = await pool.query(`
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
        name,
        userId,
        userId,
        userId
    ]);

    return result.rows[0];

}

async function getUserByUsername(username) {

    const result = await pool.query(`
        SELECT id,
               username
        FROM users
        WHERE LOWER(username) = LOWER($1)
    `, [
        username
    ]);

    return result.rows[0];

}


async function addRoomMember(roomId, userId) {

    await pool.query(`
        UPDATE rooms
        SET members = array_append(
            members,
            $1
        )
        WHERE id = $2
          AND NOT ($1 = ANY(members))
    `, [
        userId,
        roomId
    ]);

}

async function changeRoomName(roomId, name) {

    const result = await pool.query(`
        UPDATE rooms
        SET name = $1
        WHERE id = $2
        RETURNING id, name
    `, [
        name,
        roomId
    ]);

    return result.rows[0] || null;

}

async function getRoomMembers(roomId) {

    const result = await pool.query(`
        SELECT
            u.id,
            u.username
        FROM users u
        JOIN rooms r
            ON u.id = ANY(r.members)
        WHERE r.id = $1
        ORDER BY u.username ASC
    `, [
        roomId
    ]);

    return result.rows;

}

async function removeRoomMember(roomId, memberId) {

    const result = await pool.query(`
        UPDATE rooms
        SET members = array_remove(members, $1)
        WHERE id = $2
        RETURNING id
    `, [
        memberId,
        roomId
    ]);

    return result.rows.length > 0;

}

async function createRoomMessage({
                                     roomId,
                                     userId,
                                     username,
                                     content
                                 }) {

    const result = await pool.query(`

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
        username,
        content
    ]);

    return result.rows[0];

}


async function createMessageAttachment({
                                           chatType,
                                           messageId,
                                           imageUrl,
                                           uploadedBy
                                       }) {

    const result = await pool.query(`

        INSERT INTO message_attachments
        (
            chat_type,
            message_id,
            image_url,
            uploaded_by
        )

        VALUES ($1, $2, $3, $4)

        RETURNING *

    `, [
        chatType,
        messageId,
        imageUrl,
        uploadedBy
    ]);

    return result.rows[0];

}

module.exports = {
    getRooms,
    isRoomMember,
    getRoomMessages,
    createRoom,
    getUserByUsername,
    addRoomMember,
    changeRoomName,
    getRoomMembers,
    removeRoomMember,
    createRoomMessage,
    createMessageAttachment,
};