const dmRepository = require("../repositories/dmRepository");
const AppError = require("../utils/AppError");


async function getContacts(userId) {

    return await dmRepository.getContacts(userId);
}


async function startDM(userId, username) {

    if (!username || !username.trim()) {

        throw new AppError("USERNAME_REQUIRED", "a username is required", 400);
    }


    const user =
        await dmRepository.findUser(
            username.trim(),
            userId
        );


    if (!user) {

        throw new AppError("USER_NOT_FOUND", "User not found", 404);
    }


    const roomId = [
        Number(userId),
        Number(user.id)
    ]
        .sort((a,b) => a-b)
        .join("-");


    return {
        id: user.id,
        username: user.username,
        roomId
    };
}


async function getThread(userId, contactId) {

    return await dmRepository.getThread(
        userId,
        contactId
    );
}


async function sendDM(data) {

    const {
        userId,
        username,
        receiverId,
        content,
        files
    } = data;


    if (!content.trim() && (!files || !files.length)) {
        throw new AppError("INVALID_FORMAT", "Message cannot be empty", 400);
    }


    const message =
        await dmRepository.createMessage(
            userId,
            receiverId,
            username,
            content
        );


    const attachments = [];


    if (files && files.length) {

        for (const file of files) {

            const imageUrl = `/uploads/chat/${file.filename}`;


            const attachment =
                await dmRepository.createAttachment(
                    message.id,
                    imageUrl,
                    userId
                );


            attachments.push(attachment);
        }
    }


    const roomId = [
        userId,
        Number(receiverId)
    ]
        .sort()
        .join("-");


    return {
        ...message,
        user_id: message.sender_id,
        username: message.sender_username,
        roomId,
        attachments,
        pinned: false
    };
}


async function getAdminContacts(userId) {
    return await dmRepository.getAdminContacts(userId);
}


async function getAdminThread(userId, contactId) {
    return await dmRepository.getThread(userId, contactId);
}


module.exports = {
    getContacts,
    startDM,
    getThread,
    sendDM,
    getAdminContacts,
    getAdminThread
};