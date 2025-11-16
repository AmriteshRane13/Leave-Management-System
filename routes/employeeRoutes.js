const express = require("express");
const router = express.Router();
const db = require("../config/db");
const employeeController = require("../controllers/employeeController");

// Middleware to ensure user is an employee
router.use(employeeController.ensureEmployee);

// Employee dashboard
router.get("/dashboard", employeeController.getDashboard);

// Apply leave
router.get("/apply-leave", employeeController.getEmployeeApplyLeave);
router.post("/apply-leave", employeeController.submitLeave);

// View leave history
router.get("/view-leaves", employeeController.viewLeaveHistory);

//Profile routes
router.get("/profile", employeeController.showProfile);
router.post("/profile/update", employeeController.updateProfile);
router.post("/profile/change-password", employeeController.changePassword);

module.exports = router;
