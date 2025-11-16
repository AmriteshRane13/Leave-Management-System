const express = require("express");
const router = express.Router();
const managerController = require("../controllers/managerController");
const employeeController = require("../controllers/employeeController");

// Middleware to check if user is Manager
const isManager = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  if (req.session.user.role !== "manager") {
    return res.status(403).send("Access denied. Manager role required.");
  }
  next();
};

// Apply middleware to all manager routes
router.use(isManager);

// Dashboard
router.get("/dashboard", managerController.showDashboard);

// Apply leave
router.get("/apply-leave", employeeController.getManagerApplyLeave);
router.post("/apply-leave", employeeController.submitLeave);
router.get("/view-leaves", employeeController.viewLeaveHistory);

// Team management
router.get("/team", managerController.viewTeam);

// Add these routes to managerRoutes.js
router.get("/profile", managerController.showProfile);
router.post("/profile/update", managerController.updateProfile);
router.post("/profile/change-password", managerController.changePassword);
router.get("/team-stats", managerController.getTeamStats);
// Leave approval routes
router.post("/leaves/:id/approve", managerController.approveLeave);
router.post("/leaves/:id/reject", managerController.rejectLeave);

module.exports = router;
