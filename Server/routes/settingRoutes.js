const express = require("express");
const router = express.Router();

const authRequired = require("../middleware/authRequired");
const settingsController = require("../controllers/settingController");


router.post("/changePassword", authRequired, settingsController.changePassword);
router.post("/changeFaction", authRequired, settingsController.changeFaction);


module.exports = router;