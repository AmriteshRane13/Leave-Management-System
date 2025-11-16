const express = require("express");
const router = express.Router();
const adminController = require("../controllers/adminController");

const isAdmin = (req, res, next) => {
  if (!req.session.user) return res.redirect("/login");
  if (req.session.user.role !== "hr") {
    return res.status(403).send("Access denied. HR role required.");
  }
  next();
};

const isManagerOrHR = (req, res, next) => {
  if (!req.session.user) return res.redirect("/login");
  const role = req.session.user.role;
  if (role !== "manager" && role !== "hr") {
    return res
      .status(403)
      .send("Access denied. Only managers or HR can access this.");
  }
  next();
};

// HR-only routes
router.use(isAdmin);

// Dashboard
router.get("/dashboard", adminController.showDashboard);

// Employee management
router.post("/add-employee", adminController.addEmployee);
router.get("/users", adminController.showUsers);
router.get("/users/:id", adminController.getEmployee);
router.put("/users/:id", adminController.updateUser);
router.delete("/users/:id", adminController.deleteUser);

// Leave types management (UPDATED)
router.get("/leave-types", adminController.getLeaveTypes);
router.get("/leave-types/:id", adminController.getLeaveTypeDetails); // NEW: Get specific leave type with allocations
router.post("/leave-types", adminController.addLeaveType);
router.put("/leave-types/:id", adminController.updateLeaveType);
router.delete("/leave-types/:id", adminController.deleteLeaveType);

// Reports and logs
router.get("/download-reports", adminController.downloadReports);
router.get("/activity-logs", adminController.showActivityLogs);

// Profile management
router.get("/profile", adminController.showProfile);
router.post("/profile/update", adminController.updateProfile);
router.post("/profile/change-password", adminController.changePassword);

// Leave approval routes (accessible by both HR and Managers)
router.get("/leaves", isManagerOrHR, adminController.showAllLeaves);
router.post("/update-status", isManagerOrHR, adminController.updateLeaveStatus);
router.put(
  "/leaves/:id/status",
  isManagerOrHR,
  adminController.updateLeaveStatus
);

module.exports = router;
