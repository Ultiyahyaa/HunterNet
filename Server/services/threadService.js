const threadRepository = require("../repositories/threadRepository");
const AppError = require("../utils/AppError");


async function getThreads(){

    return await threadRepository.getThreads();
}

async function createThread(data) {

    const thread = await threadRepository.createThread(data);


    const attachments = [];

    for (const file of data.files || []) {

        const imageUrl = `/uploads/threads/${file.filename}`;


        const attachment =
            await threadRepository.createAttachment({
                threadId: thread.id,
                imageUrl,
                userId: data.userId
            });


        attachments.push(attachment);
    }

    thread.attachments = attachments;

    return thread;
}

async function getMessages(threadId) {

    return await threadRepository.getMessages(threadId);
}

async function sendMessage(data) {

    const thread = await threadRepository.getThread(data.threadId);

    if (!thread) {

        throw new AppError("THREAD_NOT_FOUND", "Thread not found", 404, true);

    }

    if (thread.is_locked && !data.isAdmin) {

        throw new AppError("THREAD_LOCKED", "Thread is Locked", 403);

    }

    const message = await threadRepository.createMessage(data);

    const attachments = [];

    for (const file of data.files || []) {

        const attachment =
            await threadRepository.createMessageAttachment({
                threadId: data.threadId,
                messageId: message.id,
                imageUrl: `/uploads/threads/${file.filename}`,
                userId: data.userId
            });

        attachments.push(attachment);
    }

    return {
        ...message,
        attachments
    };
}

const fs = require("fs").promises;
const path = require("path");

function getThreadUploadPath(imageUrl) {

    return path.join(
        __dirname,
        "..",
        "..",
        "public",
        imageUrl.replace(/^\//, "")
    );
}

async function deleteThread(threadId) {

    const attachments = await threadRepository.getThreadAttachments(threadId);

    for (const { image_url } of attachments) {

        await fs.unlink(getThreadUploadPath(image_url))
            .catch(() => null);

    }

    await threadRepository.deleteThread(threadId);
}

async function pinThread(threadId) {

    return await threadRepository.pinThread(threadId);
}

async function lockThread(threadId) {

    return await threadRepository.lockThread(threadId);
}

async function getPins(threadId) {

    return await threadRepository.getPins(threadId);
}

async function pinMessage(data) {

    if (!data.messageId || !data.threadId) {

        throw new AppError("INVALID_FIELDS", "Invalid message or thread.", 406, true);

    }

    await threadRepository.pinMessage(data);

}

async function unpinMessage(data) {

    if (!data.messageId || !data.threadId) {

        throw new AppError("INVALID_FIELDS", "Invalid message or thread.", 406, true);

    }

    await threadRepository.unpinMessage(data);

}

async function deleteMessage(messageId) {

    const message = await threadRepository.getMessage(messageId);

    if (!message) {
        throw new AppError("MESSAGE_NOT_FOUND", "Message not found", 404, true);
    }


    const attachments = await threadRepository.getMessageAttachments(messageId);

    for (const { image_url } of attachments) {

        await fs.unlink(getThreadUploadPath(image_url))
            .catch(() => null);
    }

    await threadRepository.deleteMessage(messageId);

    return message.thread_id;
}

async function deleteAttachment(attachmentId) {

    const attachment = await threadRepository.getAttachment(attachmentId);

    if (!attachment) {
        throw new AppError("FILE_NOT_FOUND" ,"Attachment not found", 404, true);
    }


    await fs.unlink(
        getThreadUploadPath(attachment.image_url)
    ).catch(() => null);

    await threadRepository.deleteAttachment(attachmentId);

    return attachment;
}

module.exports = {
    getThreads,
    createThread,
    getMessages,
    sendMessage,
    deleteThread,
    pinThread,
    lockThread,
    getPins,
    pinMessage,
    unpinMessage,
    deleteMessage,
    deleteAttachment,
};