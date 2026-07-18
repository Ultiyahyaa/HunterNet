const chatService = require("../services/chatService");
const response = require("../utils/response");

async function getGlobalMessages(req, res, next) {

    try {

        const messages = await chatService.getGlobalMessages();

        res.json(messages);

    } catch (err) {
        next(err)
    }
}

async function sendGlobalMessage(req, res, next) {

    try {

        const message = await chatService.sendGlobalMessage({
            content: req.body.content,
            userId: req.session.user.id,
            username: req.session.user.username,
            files: req.files
        });


        const io = req.app.get("io");

        io.to("global")
            .emit("global:message:new", message);

        response.success(res);

    } catch (err) {
        next(err)
    }
}

async function getPins(req, res, next) {

    try {

        const pins = await chatService.getPins({
            type: req.query.type,
            target: req.query.target
        });

        res.json(pins);

    } catch (err) {
        next(err)
    }
}

async function getAdminGlobalMessages(req, res, next) {

    try {

        const messages = await chatService.getGlobalMessages();

        res.json(messages);

    } catch (err) {
        next(err)
    }
}


async function deleteMessage(req, res, next) {

    try {

        await chatService.deleteMessage({
            id: Number(req.params.id),
            chatType: req.body.chatType
        });


        const io = req.app.get("io");

        if (io && typeof io.emit === "function") {

            io.emit(
                "message:delete",
                Number(req.params.id)
            );

        }

        response.success(res);

    } catch (err) {
        next(err)
    }
}

async function getUser(req, res, next) {

    const { id } = req.params;

    try {

        const user = await chatService.getUser(id);

        res.json(user);

    } catch (err) {
        next(err)
    }
}

async function pinMessage(req, res, next) {

    const {
        message_id,
        chat_type,
        chat_target,
        content,
        username
    } = req.body;

    try {

        await chatService.pinMessage({
            message_id,
            chat_type,
            chat_target,
            content,
            username,
            userId: req.session.user.id
        });

        const io = req.app.get("io");

        io.emit("message:pin", {
            messageId: message_id,
            chat_type,
            chat_target
        });

        response.success(res);

    } catch (err) {
        next(err)
    }
}

async function unpinMessage(req, res, next) {

    const messageId = Number(req.params.messageId);
    const {
        chat_type,
        chat_target
    } = req.body || {};

    try {

        await chatService.unpinMessage({
            messageId,
            chat_type,
            chat_target
        });

        const io = req.app.get("io");

        io.emit("message:unpin", {
            messageId,
            chat_type,
            chat_target
        });

        response.success(res);

    } catch (err) {
        next(err)
    }
}

module.exports = {
    getGlobalMessages,
    sendGlobalMessage,
    getPins,
    getAdminGlobalMessages,
    deleteMessage,
    getUser,
    pinMessage,
    unpinMessage
};