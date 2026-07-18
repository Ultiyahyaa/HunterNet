const dmService = require("../services/dmService");
const response = require("../utils/response");


async function getContacts(req, res, next) {

    try {

        const contacts = await dmService.getContacts(
            req.session.user.id
        );

        res.json(contacts);

    } catch (err) {
        next(err)
    }
}


async function startDM(req, res, next) {

    try {

        const result = await dmService.startDM(
            req.session.user.id,
            req.body.username
        );

        response.success(res, result);

    } catch (err) {
        next(err)
    }
}


async function getThread(req, res, next) {

    try {

        const messages = await dmService.getThread(
            req.session.user.id,
            req.params.userId
        );

        res.json(messages);

    } catch (err) {
        next(err)
    }
}


async function sendDM(req, res, next) {

    try {

        const message = await dmService.sendDM({
            userId: req.session.user.id,
            username: req.session.user.username,
            receiverId: req.params.userId,
            content: req.body.content,
            files: req.files
        });


        const io = req.app.get("io")

        io.to(
            `dm:${message.roomId}`
        ).emit(
            "dm:message:new",
            message
        );

        response.success(res, message);

    } catch (err) {
        next(err)
    }
}


async function getAdminContacts(req, res, next) {

    try {

        const contacts = await dmService.getAdminContacts(
            req.params.id
        );

        res.json(contacts);

    } catch (err) {
        next(err)
    }
}


async function getAdminThread(req, res, next) {

    try {

        const messages = await dmService.getAdminThread(
            req.params.userId,
            req.params.contactId
        );

        res.json(messages);

    } catch (err) {
        next(err)
    }
}


module.exports = {
    getContacts,
    startDM,
    getThread,
    sendDM,
    getAdminContacts,
    getAdminThread
};