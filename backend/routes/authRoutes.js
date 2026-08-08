// Authentication routes for LearnTube users.
// These routes connect register and login requests to controller functions.

const express = require("express");
const router = express.Router();

const {
registerUser,
loginUser
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);

module.exports = router;
