// Authentication routes for LearnTube users.
// These routes connect register and login requests to controller functions.

const express = require("express");
const router = express.Router();

const {
    registerUser,
    loginUser,
    googleAuth
} = require("../controllers/authController");

router.post("/register", registerUser);
router.post("/login", loginUser);
router.post("/google", googleAuth);

module.exports = router;
