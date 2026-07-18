const express = require("express");
const pool = require("../config/database");

const authRequired = require("../middleware/authRequired");
const adminOnly = require("../middleware/adminOnly");
const roomController = require("../controllers/roomController");
const upload = require("../middleware/chatImages");


module.exports = (io) => {

    const router = express.Router();


    /* =========================
       GET ROOMS
    ========================= */

    router.get("/", authRequired, roomController.getRooms);


    /* =========================
       ROOM MESSAGES
    ========================= */

    router.get("/:roomId/messages", authRequired, roomController.getRoomMessages);


    /* =========================
       CREATE ROOM
    ========================= */

    router.post("/create", authRequired, roomController.createRoom);


    /* =========================
       INVITE USER
    ========================= */

    router.post("/:roomId/invite", authRequired, roomController.inviteUser);



    /* =========================
       ROOM NAME CHANGE
    ========================= */

    router.patch("/:roomId/changeName", authRequired, roomController.changeRoomName);


    /* =========================
       ROOM MEMBERS
    ========================= */

    router.get("/:roomId/members", authRequired, roomController.getRoomMembers);


    /* =========================
    REMOVE ROOM MEMBER
    ========================= */

    router.delete("/:roomId/members/:memberId", authRequired, roomController.removeRoomMember);


    /* =========================
       SEND ROOM MESSAGE
    ========================= */

    router.post("/:roomId/send", authRequired,
        upload.array("images", 8), roomController.sendRoomMessage);


    /* =========================
    ADMIN ROOMS
    ========================= */

    router.get("/admin/", authRequired, adminOnly, roomController.getAllRooms);


    /* =========================
    ADMIN ROOM MESSAGES
    ========================= */

    router.get("/admin/:roomId/messages", authRequired, adminOnly, roomController.getAdminRoomMessages);


    return router;
};