const roomRepository = require("../repositories/roomRepository");
const AppError = require("../utils/AppError");


async function getRooms(userId) {

    return await roomRepository.getRooms(userId);
}

async function getAllRooms() {

    return await roomRepository.getRooms();
}

async function getRoomMessages(roomId, userId) {

    const isMember =
        await roomRepository.isRoomMember(
            roomId,
            userId
        );

    if (!isMember) {
        throw new AppError("ACCESS_DENIED", "You are not a member of this room", 403);
    }

    return await roomRepository.getRoomMessages(roomId);
}

async function getAdminRoomMessages(roomId) {

    return await roomRepository.getRoomMessages(roomId);
}

async function createRoom(name, userId) {

    const roomName = String(name || "").trim();

    if (!roomName) {
        throw new AppError("ROOM_NAME_REQUIRED", "A room name is required", 400);
    }

    return await roomRepository.createRoom(
        roomName,
        userId
    );

}

async function inviteUser(roomId, userId, username) {

    const isMember =
        await roomRepository.isRoomMember(
            roomId,
            userId
        );

    if (!isMember) {

        throw new AppError("ACCESS_DENIED", "You are not a member of this room", 403);
    }

    const targetUser = await roomRepository.getUserByUsername(username.trim());

    if (!targetUser) {

        throw new AppError("USER_NOT_FOUND", "User does not exist", 404);
    }

    await roomRepository.addRoomMember(
        roomId,
        targetUser.id
    );

    return targetUser;

}

async function changeRoomName(roomId, userId, name) {

    const roomName =
        String(name || "").trim();

    if (!roomName) {
        throw new AppError("INVALID_NAME", "A room name is required", 400);
    }

    if (roomName.length > 100) {
        throw new AppError("NAME_TOO_LONG", "This room name is too long", 400);
    }

    const isMember =
        await roomRepository.isRoomMember(
            roomId,
            userId
        );

    if (!isMember) {
        throw new AppError("ACCESS_DENIED", "You are not a member of this room", 403);
    }

    const room =
        await roomRepository.changeRoomName(
            roomId,
            roomName
        );

    if (!room) {
        throw new AppError("ROOM_NOT_FOUND", "Room not found", 404);
    }

    return room;
}

async function getRoomMembers(roomId, userId) {

    const isMember =
        await roomRepository.isRoomMember(
            roomId,
            userId
        );

    if (!isMember) {

        throw new AppError("ACCESS_DENIED", "You are not a member of this room", 403);
    }

    return await roomRepository.getRoomMembers(
        roomId
    );

}

async function removeRoomMember(roomId, userId, memberId) {

    const isMember =
        await roomRepository.isRoomMember(
            roomId,
            userId
        );

    if (!isMember) {

        throw new AppError("ACCESS_DENIED", "You are not a member of this room", 403);
    }

    const removed =
        await roomRepository.removeRoomMember(
            roomId,
            memberId
        );

    if (!removed) {

        throw new AppError("MEMBER_NOT_FOUND", "Member not Found", 404);

    }

}

async function sendRoomMessage({
                                   roomId,
                                   userId,
                                   username,
                                   content,
                                   files
                               }) {


    const isMember =
        await roomRepository.isRoomMember(
            roomId,
            userId
        );


    if (!isMember) {

        throw new AppError("ACCESS_DENIED", "You are not a member of this room", 403);

    }


    if (
        !content.trim()
        &&
        (!files || !files.length)
    ) {

        throw new AppError("EMPTY_MESSAGE", "Message cannot be empty", 400);

    }

    const message =
        await roomRepository.createRoomMessage({
            roomId,
            userId,
            username,
            content
        });

    let attachments = [];


    if (files && files.length) {

        for (const file of files) {

            const imageUrl = `/uploads/chat/${file.filename}`;

            const attachment =
                await roomRepository.createMessageAttachment({
                    chatType: "room",
                    messageId: message.id,
                    imageUrl,
                    uploadedBy: userId
                });

            attachments.push(attachment);
        }
    }

    return {
        ...message,
        attachments,
        pinned: false
    };
}

module.exports = {
    getRooms,
    getAllRooms,
    getRoomMessages,
    getAdminRoomMessages,
    createRoom,
    inviteUser,
    changeRoomName,
    getRoomMembers,
    removeRoomMember,
    sendRoomMessage,
};