const express = require("express");

const authRequired = require("../middleware/authRequired");
const adminOnly = require("../middleware/adminOnly");
const upload = require("../middleware/chatImages");

const dmController = require("../controllers/dmController");

module.exports = (io) => {

    const router = express.Router();

    /* =========================
       GET USERS / DM CONTACTS
    ========================= */

    router.get("/", authRequired, dmController.getContacts);


    /* =========================
       START DM
    ========================= */

    router.post("/start", authRequired, dmController.startDM);


    /* =========================
       GET DM THREAD
    ========================= */

    router.get("/:userId", authRequired, dmController.getThread);


    /* =========================
       SEND DM
    ========================= */

    router.post("/:userId/send", authRequired,
        upload.array("images", 8), dmController.sendDM);


    /* =========================
    ADMIN USER CONTACTS
    ========================= */

    router.get("/admin/:id/contacts", authRequired, adminOnly, dmController.getAdminContacts);


    /* =========================
    ADMIN DM THREAD
    ========================= */

    router.get("/admin/:userId/:contactId", authRequired, adminOnly, dmController.getAdminThread);


    return router;
};