const express = require("express");
const upload = require("../middleware/threadImages");

const authRequired = require("../middleware/authRequired");
const adminOnly = require("../middleware/adminOnly");
const threadController = require("../controllers/threadController");

module.exports = (io) => {

    const router = express.Router();


    /* =========================
    GET ALL THREADS
    ========================= */

    router.get("/", authRequired, threadController.getThreads);


    /* =========================
    CREATE THREAD
    ========================= */

    router.post("/create", authRequired,
        upload.array("images", 8), threadController.createThread);


    /* =========================
    JOIN THREAD
    ========================= */



    /* =========================
    GET THREAD MESSAGES
    ========================= */

    router.get("/:threadId/messages", authRequired, threadController.getMessages);


    /* =========================
    SEND MESSAGE
    ========================= */

    router.post("/:threadId/send", authRequired,
        upload.array("images", 8), threadController.sendMessage);


    /* =========================
    GET THREAD PINS
    ========================= */

    router.get("/:threadId/pins", authRequired, threadController.getPins);


    /* =========================
    DELETE THREAD (ADMIN)
    ========================= */

    router.delete("/admin/thread/:id", authRequired, adminOnly, threadController.deleteThread);


    /* =========================
    PIN THREAD (ADMIN)
    ========================= */

    router.patch("/admin/thread/:id/pin", authRequired, adminOnly, threadController.pinThread);


    /* =========================
    LOCK THREAD (ADMIN)
    ========================= */

    router.patch("/admin/thread/:id/lock", authRequired, adminOnly, threadController.lockThread);



    /* =========================
    PIN THREAD MESSAGE (ADMIN)
    ========================= */

    router.post("/admin/message/:messageId/pin", authRequired, adminOnly, threadController.pinMessage);


    /* =========================
    UNPIN THREAD MESSAGE (ADMIN)
    ========================= */

    router.delete("/admin/message/:messageId/pin", authRequired, adminOnly, threadController.unpinMessage);


    /* =========================
    DELETE THREAD MESSAGE (ADMIN)
    ========================= */

    router.delete("/admin/message/:id", authRequired, adminOnly, threadController.deleteMessage);


    /* =========================
    DELETE THREAD ATTACHMENT (ADMIN)
    ========================= */

    router.delete("/admin/attachment/:id", authRequired, adminOnly, threadController.deleteAttachment);


    return router;

}
