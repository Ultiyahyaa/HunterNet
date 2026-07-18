const chatRepository = require("../repositories/chatRepository");
const AppError = require("../utils/AppError");


async function getGlobalMessages() {

    return await chatRepository.getGlobalMessages();

}

async function sendGlobalMessage(data) {

    if ((!data.content || !data.content.trim()) && (!data.files || !data.files.length)) {
        throw new AppError("INVALID_FORMAT", "Message cannot be empty", 400)
    }

    const message = await chatRepository.createGlobalMessage(data);
    const attachments = [];

    for (const file of data.files || []) {

        const attachment = await chatRepository.createAttachment({
                chatType: "global",
                messageId: message.id,
                imageUrl: `/uploads/chat/${file.filename}`,
                userId: data.userId
            });

        attachments.push(attachment);
    }

    return {
        ...message,
        attachments,
        pinned: false
    };

}

async function getPins(data) {
    return await chatRepository.getPins(data);
}

const fs = require("fs").promises;
const path = require("path");


function getChatUploadPath(imageUrl) {

    return path.join(
        __dirname,
        "..",
        "..",
        "public",
        imageUrl.replace(/^\//, "")
    );

}


async function deleteMessage(data) {

    const attachments = await chatRepository.getMessageAttachments(
        data.chatType,
        data.id
    );


    for (const attachment of attachments) {

        await fs.unlink(
            getChatUploadPath(
                attachment.image_url
            )
        ).catch(() => null);

    }


    await chatRepository.deleteAttachments(
        data.chatType,
        data.id
    );


    await chatRepository.deletePins(
        data.id
    );


    await chatRepository.deleteMessage(
        data.chatType,
        data.id
    );

}


async function getUser(id) {

    return await chatRepository.getUser(id);

}


async function pinMessage(data) {

    if (!data.message_id || !data.chat_type) {
        throw new AppError("MISSING_REQUIRED_FIELDS", "Missing required fields", 400, true);
    }

    await chatRepository.pinMessage(data);

}

async function unpinMessage(data) {

    if (!data.messageId || !data.chat_type) {
        throw new AppError("MISSING_REQUIRED_FIELDS", "Missing required fields", 400, true);
    }

    await chatRepository.unpinMessage(data);

}

module.exports = {
    getGlobalMessages,
    sendGlobalMessage,
    getPins,
    deleteMessage,
    getUser,
    pinMessage,
    unpinMessage,
};