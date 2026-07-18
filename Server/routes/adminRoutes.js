const express = require("express");
const router = express.Router();

const adminOnly = require("../middleware/adminOnly");
const adminController = require("../controllers/adminController");


router.post("/login", adminController.adminLogin);
router.post("/logout", adminOnly, adminController.adminLogout);
router.get("/users", adminOnly, adminController.getUsers);
router.delete("/user/:id", adminOnly, adminController.deleteUser);
router.patch("/user/:id/role", adminOnly, adminController.updateRole);


module.exports = router;