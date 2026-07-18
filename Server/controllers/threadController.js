const threadService = require("../services/threadService");
const response = require("../utils/response");


async function getThreads(req, res, next){

    try {

        const threads = await threadService.getThreads();

        res.json(threads);

    } catch(err){
        next(err)
    }
}

async function createThread(req, res, next) {

    try {

        const thread = await threadService.createThread({
            title: req.body.title,
            content: req.body.content,
            userId: req.session.user.id,
            username: req.session.user.username,
            files: req.files
        });


        const io = req.app.get("io");

        if (io && typeof io.emit === "function") {
            io.emit("threads:new", thread);
        }

        response.success(res, thread);


    } catch (err) {
        next(err)
    }
}

async function getMessages(req, res, next) {

    try {

        const messages = await threadService.getMessages(req.params.threadId);

        res.json(messages);

    } catch (err) {
        next(err)
    }
}

async function sendMessage(req, res, next) {

    try {

        const message = await threadService.sendMessage({
            threadId: req.params.threadId,
            content: req.body.content || "",
            userId: req.session.user.id,
            username: req.session.user.username,
            isAdmin: req.session.user.is_admin,
            files: req.files
        });


        const io = req.app.get("io");

        if (io && typeof io.threadEmit === "function") {

            io.threadEmit(
                req.params.threadId,
                "thread:message:new",
                message
            );

        }

        res.json(message);

    } catch (err) {
        next(err)
    }
}

async function deleteThread(req, res, next) {

    try {

        await threadService.deleteThread(req.params.id);


        const io = req.app.get("io");

        if (io && typeof io.emit === "function") {

            io.emit("threads:deleted", {
                threadId: Number(req.params.id)
            });

        }

        response.success(res);

    } catch (err) {
        next(err)
    }
}

async function pinThread(req, res, next) {

    try {

        const thread = await threadService.pinThread(req.params.id);


        const io = req.app.get("io");

        if (io && typeof io.emit === "function") {

            io.emit("thread:updated", {
                threadId: Number(req.params.id),
                is_pinned: thread.is_pinned
            });

        }

        response.success(res, thread);

    } catch (err) {
        next(err)
    }
}

async function lockThread(req, res, next) {

    try {

        const thread = await threadService.lockThread(req.params.id);


        const io = req.app.get("io");

        if (io && typeof io.emit === "function") {

            io.emit("thread:updated", {
                threadId: Number(req.params.id),
                is_locked: thread.is_locked
            });

        }

        response.success(res, thread);

    } catch (err) {
        next(err)
    }
}

async function getPins(req, res, next) {

    try {

        const pins = await threadService.getPins(req.params.threadId);

        res.json(pins);

    } catch (err) {
        next(err)
    }
}

async function pinMessage(req, res, next) {

    try {

        await threadService.pinMessage({
            messageId: Number(req.params.messageId),
            threadId: Number(req.body.thread_id),
            pinnedBy: req.session.user.id,
            content: req.body.content || "",
            username: req.body.username || ""
        });

        const io = req.app.get("io");

        if (io && typeof io.threadEmit === "function") {

            io.threadEmit(req.body.thread_id, "thread:message:pin", {
                messageId: Number(req.params.messageId),
                threadId: Number(req.body.thread_id)
            });

        }

        response.success(res);

    } catch (err) {
        next(err)
    }
}

async function unpinMessage(req, res, next) {

    try {

        await threadService.unpinMessage({
            messageId: Number(req.params.messageId),
            threadId: Number(req.body.thread_id)
        });

        const io = req.app.get("io");

        if (io && typeof io.threadEmit === "function") {

            io.threadEmit(req.body.thread_id, "thread:message:unpin", {
                messageId: Number(req.params.messageId),
                threadId: Number(req.body.thread_id)
            });

        }

        response.success(res);

    } catch (err) {
        next(err)
    }
}

async function deleteMessage(req, res, next) {

    try {

        const threadId = await threadService.deleteMessage(Number(req.params.id));


        const io = req.app.get("io");

        if (io && typeof io.threadEmit === "function") {

            io.threadEmit(
                threadId,
                "thread:message:delete",
                Number(req.params.id)
            );

        }

        response.success(res)

    } catch (err) {
        next(err)
    }
}

async function deleteAttachment(req, res, next) {

    try {

        const attachment = await threadService.deleteAttachment(req.params.id);


        const io = req.app.get("io");

        if (io && typeof io.threadEmit === "function") {

            io.threadEmit(
                attachment.thread_id,
                "thread:attachment:deleted",
                {
                    threadId: attachment.thread_id,
                    messageId: attachment.message_id,
                    attachmentId: attachment.id
                }
            );

        }

        response.success(res, attachment);

    } catch (err) {
        next(err)
    }
}

module.exports = {
    getThreads,
    createThread,
    deleteThread,
    pinThread,
    lockThread,
    getMessages,
    sendMessage,
    getPins,
    pinMessage,
    unpinMessage,
    deleteMessage,
    deleteAttachment
};