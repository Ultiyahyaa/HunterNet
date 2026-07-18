const express = require("express");
const pool = require("../config/database");

const authRequired = require("../middleware/authRequired");
const adminOnly = require("../middleware/adminOnly");
const upload = require("../middleware/chatImages");
const chatController = require("../controllers/chatController");

const fs = require("fs").promises;
const path = require("path");

module.exports = (io) => {

    const router = express.Router();

    /* =========================
       GLOBAL MESSAGES
    ========================= */

    router.get("/global", authRequired, chatController.getGlobalMessages);


    /* =========================
       SEND GLOBAL MESSAGE
    ========================= */

    router.post("/global/send", authRequired,
        upload.array("images", 8), chatController.sendGlobalMessage);


    /* =========================
    GET PINS
    ========================= */

    router.get("/pins", authRequired, chatController.getPins);


    /* =========================
    ADMIN GLOBAL MESSAGES
    ========================= */

    router.get("/admin/global", authRequired, adminOnly, chatController.getAdminGlobalMessages);


    /* =========================
    DELETE MESSAGE
    ========================= */

    router.delete("/admin/message/:id", authRequired, adminOnly, chatController.deleteMessage);


    /* =========================
    GET USER INFO
    ========================= */

    router.get("/admin/user/:id", authRequired, adminOnly, chatController.getUser);


    /* =========================
    PIN MESSAGE
    ========================= */

    router.post("/admin/pin", authRequired, adminOnly, chatController.pinMessage);


    /* =========================
    UNPIN MESSAGE
    ========================= */

    router.delete("/admin/pin/:messageId", authRequired, adminOnly, chatController.unpinMessage);


    return router;
}
