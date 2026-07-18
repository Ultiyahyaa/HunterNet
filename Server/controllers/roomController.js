const roomService = require("../services/roomService");
const response = require("../utils/response");


async function getRooms(req, res, next) {

    try {

        const rooms = await roomService.getRooms(
            req.session.user.id
        );

        res.json(rooms);

    } catch (err) {
        next(err)
    }
}

async function getAllRooms(req, res, next) {

    try {

        const rooms = await roomService.getAllRooms();

        res.json(rooms);

    } catch (err) {
        next(err)
    }
}

async function getRoomMessages(req, res, next) {

    try {

        const messages = await roomService.getRoomMessages(
            Number(req.params.roomId),
            Number(req.session.user.id)
        );

        res.json(messages);

    } catch (err) {
        next(err)
    }
}

async function getAdminRoomMessages(req, res, next) {

    try {

        const messages = await roomService.getAdminRoomMessages(
            Number(req.params.roomId)
        );

        res.json(messages);

    } catch (err) {
        next(err)
    }

}

async function createRoom(req, res, next) {

    try {

        const room = await roomService.createRoom(
            req.body.name,
            Number(req.session.user.id)
        );

        response.success(res, room);

    } catch (err) {
        next(err)
    }

}

async function inviteUser(req, res, next) {

    try {

        const result =
            await roomService.inviteUser(
                Number(req.params.roomId),
                Number(req.session.user.id),
                req.body.username
            );

        res.json({
            success: true,
            username: result.username
        });

    } catch (err) {
        next(err)
    }
}

async function changeRoomName(req, res, next) {

    try {

        const room =
            await roomService.changeRoomName(
                Number(req.params.roomId),
                Number(req.session.user.id),
                req.body.name
            );

        response.success(res, room);

    } catch (err) {
        next(err)
    }
}

async function getRoomMembers(req, res, next) {

    try {

        const members = await roomService.getRoomMembers(
            Number(req.params.roomId),
            Number(req.session.user.id)
        );

        response.success(res, members);

    } catch (err) {
        next(err)
    }
}

async function removeRoomMember(req, res, next) {

    try {

        await roomService.removeRoomMember(
            Number(req.params.roomId),
            Number(req.session.user.id),
            Number(req.params.memberId)
        );

        response.success(res)

    } catch (err) {
        next(err)
    }
}

async function sendRoomMessage(req, res, next) {

    try {

        const message = await roomService.sendRoomMessage({
            roomId: Number(req.params.roomId),
            userId: Number(req.session.user.id),
            username: req.session.user.username,
            content: req.body.content || "",
            files: req.files
        });


        const io = req.app.get("io")

        io.roomEmit(
            `room:${req.params.roomId}`,
            "room:message:new",
            message
        );


        response.success(res, message);

    } catch (err) {
        next(err)
    }
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