const express = require("express");
const router = express.Router();
const authController = require("../controllers/authController");

// Login routes
router.get("/login", authController.showLogin);
router.post("/login", authController.login);

// Logout route
router.get("/logout", authController.logout);

// Register routes (optional - for initial setup)
router.get("/register", authController.showRegister);
router.post("/register", authController.register);

// Change password routes
router.get("/change-password", authController.showChangePassword);
router.post("/change-password", authController.changePassword);

module.exports = router;
router.post("/login", authController.login);

// Logout route
router.get("/logout", authController.logout);

// Register routes (optional - for initial setup)
router.get("/register", authController.showRegister);
router.post("/register", authController.register);

module.exports = router;
