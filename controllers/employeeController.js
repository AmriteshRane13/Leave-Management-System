const bcrypt = require("bcryptjs");
const { sendLeaveNotificationToManager } = require("../config/emailService");
const db = require("../config/db");

// Middleware to ensure logged-in employee
exports.ensureEmployee = (req, res, next) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  if (req.session.user.role === "hr" || req.session.user.role === "admin") {
    return res.redirect("/admin/dashboard");
  }
  if (req.session.user.role === "manager") {
    return res.redirect("/manager/dashboard");
  }
  next();
};

// Employee Dashboard
exports.getDashboard = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [summary] = await db.query(
      `SELECT 
         COUNT(*) AS totalLeavesApplied,
         SUM(status = 'pending') AS pendingLeaves
       FROM leave_applications
       WHERE user_id = ?`,
      [userId]
    );

    const [balances] = await db.query(
      `SELECT SUM(total_leaves - used_leaves) AS remainingBalance
       FROM leave_balances
       WHERE user_id = ?`,
      [userId]
    );

    const [recentLeaves] = await db.query(
      `SELECT 
         la.id,
         lt.type_name AS type,
         la.start_date AS fromDate,
         la.end_date AS toDate,
         la.status
       FROM leave_applications la
       JOIN leave_types lt ON la.leave_type_id = lt.id
       WHERE la.user_id = ?
       ORDER BY la.applied_at DESC
       LIMIT 5`,
      [userId]
    );

    res.render("dashboard_employee", {
      totalLeavesApplied: summary[0]?.totalLeavesApplied || 0,
      pendingLeaves: summary[0]?.pendingLeaves || 0,
      remainingBalance: balances[0]?.remainingBalance || 20,
      recentLeaves,
      user: req.session.user,
      role: req.session.user.role,
      seniority: req.session.user.seniority,
      balances,
    });
  } catch (error) {
    console.error("Error loading employee dashboard:", error);
    res.status(500).send("Error loading dashboard");
  }
};

// Show profile page
exports.showProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [users] = await db.query(
      `SELECT u.*, m.name as manager_name 
       FROM users u
       LEFT JOIN users m ON u.manager_id = m.id
       WHERE u.id = ?`,
      [userId]
    );

    if (users.length === 0) {
      return res.status(404).send("User not found");
    }

    const user = users[0];

    // Get leave balance details
    const [leaveBalances] = await db.query(
      `SELECT lb.*, lt.type_name 
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.user_id = ?`,
      [userId]
    );

    res.render("employeeProfile", {
      profileUser: user,
      leaveBalances,
      user: req.session.user,
      role: req.session.user.role,
      message: null,
    });
  } catch (error) {
    console.error("Error loading profile:", error);
    res.status(500).send("Error loading profile");
  }
};

// Update profile
exports.updateProfile = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { name, email, department, designation } = req.body;

    // Validate inputs
    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

    // Check if email is already taken by another user
    const [existingUsers] = await db.query(
      "SELECT id FROM users WHERE email = ? AND id != ?",
      [email, userId]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Email is already taken by another user",
      });
    }

    // Update user profile
    await db.query(
      "UPDATE users SET name = ?, email = ?, department = ?, designation = ? WHERE id = ?",
      [name, email, department || null, designation || null, userId]
    );

    // Update session
    req.session.user.name = name;
    req.session.user.email = email;
    req.session.user.department = department;
    req.session.user.designation = designation;

    // Log activity
    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [userId, "Updated profile information"]
    );

    res.json({
      success: true,
      message: "Profile updated successfully",
    });
  } catch (error) {
    console.error("Error updating profile:", error);
    res.status(500).json({
      success: false,
      message: "Error updating profile",
    });
  }
};

// Change password
exports.changePassword = async (req, res) => {
  try {
    const userId = req.session.user.id;
    const { currentPassword, newPassword, confirmPassword } = req.body;

    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "All fields are required",
      });
    }

    if (newPassword !== confirmPassword) {
      return res.status(400).json({
        success: false,
        message: "New passwords do not match",
      });
    }

    if (newPassword.length < 6) {
      return res.status(400).json({
        success: false,
        message: "New password must be at least 6 characters",
      });
    }

    // Get user's current password
    const [users] = await db.query("SELECT password FROM users WHERE id = ?", [
      userId,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    // Hash new password
    const hashedPassword = await bcrypt.hash(newPassword, 10);

    // Update password
    await db.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      userId,
    ]);

    // Log activity
    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [userId, "Changed password"]
    );

    res.json({
      success: true,
      message: "Password changed successfully",
    });
  } catch (error) {
    console.error("Error changing password:", error);
    res.status(500).json({
      success: false,
      message: "Error changing password",
    });
  }
};

// Render apply leave form
exports.getManagerApplyLeave = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Get user's gender
    const [userData] = await db.query(
      "SELECT gender, role, seniority FROM users WHERE id = ?",
      [userId]
    );

    if (userData.length === 0) {
      return res.status(404).send("User not found");
    }

    const user = userData[0];

    // Get leave types with allocations for this user
    let leaveTypesQuery = `
      SELECT DISTINCT lt.id, lt.type_name, lt.description, la.days as allocated_days
      FROM leave_types lt
      INNER JOIN leave_allocations la ON lt.id = la.leave_type_id
      WHERE la.role = ? AND la.seniority = ?
    `;

    // Filter based on gender
    if (user.gender === "male") {
      leaveTypesQuery += ` AND lt.type_name NOT LIKE '%Maternity%'`;
    } else if (user.gender === "female") {
      leaveTypesQuery += ` AND lt.type_name NOT LIKE '%Paternity%'`;
    }

    leaveTypesQuery += ` ORDER BY lt.type_name`;

    const [leaveTypes] = await db.query(leaveTypesQuery, [
      user.role,
      user.seniority,
    ]);
    // Get leave balances
    const [leaveBalances] = await db.query(
      `SELECT lb.leave_type_id, lb.total_leaves, lb.used_leaves, lt.type_name
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.user_id = ?`,
      [userId]
    );

    res.render("apply_managerLeave", {
      leaveTypes,
      leaveBalances,
      user: req.session.user,
      role: req.session.user.role,
    });
  } catch (error) {
    console.error("Error loading apply leave page:", error);
    res.status(500).send("Error loading apply leave page");
  }
};

exports.getEmployeeApplyLeave = async (req, res) => {
  try {
    const userId = req.session.user.id;

    // Get user's gender
    const [userData] = await db.query(
      "SELECT gender, role, seniority FROM users WHERE id = ?",
      [userId]
    );

    if (userData.length === 0) {
      return res.status(404).send("User not found");
    }

    const user = userData[0];

    // Get leave types with allocations for this user
    let leaveTypesQuery = `
      SELECT DISTINCT lt.id, lt.type_name, lt.description, la.days as allocated_days
      FROM leave_types lt
      INNER JOIN leave_allocations la ON lt.id = la.leave_type_id
      WHERE la.role = ? AND la.seniority = ?
    `;

    // Filter based on gender
    if (user.gender === "male") {
      leaveTypesQuery += ` AND lt.type_name NOT LIKE '%Maternity%'`;
    } else if (user.gender === "female") {
      leaveTypesQuery += ` AND lt.type_name NOT LIKE '%Paternity%'`;
    }

    leaveTypesQuery += ` ORDER BY lt.type_name`;

    const [leaveTypes] = await db.query(leaveTypesQuery, [
      user.role,
      user.seniority,
    ]);

    // Get leave balances
    const [leaveBalances] = await db.query(
      `SELECT lb.leave_type_id, lb.total_leaves, lb.used_leaves, lt.type_name
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.user_id = ?`,
      [userId]
    );

    res.render("apply_employeeLeave", {
      leaveTypes,
      leaveBalances,
      user: req.session.user,
      role: req.session.user.role,
    });
  } catch (error) {
    console.error("Error loading apply leave page:", error);
    res.status(500).send("Error loading apply leave page");
  }
};

// // Submit leave application
// exports.submitLeave = async (req, res) => {
//   const { leave_type_id, start_date, end_date, reason } = req.body;
//   const userId = req.session.user.id;

//   if (!leave_type_id || !start_date || !end_date || !reason) {
//     return res
//       .status(400)
//       .json({ success: false, message: "All fields are required" });
//   }

//   try {
//     // Check leave balance
//     const [balanceRows] = await db.query(
//       "SELECT total_leaves, used_leaves FROM leave_balances WHERE user_id = ? AND leave_type_id = ?",
//       [userId, leave_type_id]
//     );

//     if (!balanceRows.length) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Leave type not available for you" });
//     }

//     const balance = balanceRows[0];
//     const daysRequested =
//       (new Date(end_date) - new Date(start_date)) / (1000 * 60 * 60 * 24) + 1;

//     if (daysRequested > balance.total_leaves - balance.used_leaves) {
//       return res
//         .status(400)
//         .json({ success: false, message: "Not enough leave balance" });
//     }

//     // Insert leave application
//     await db.query(
//       "INSERT INTO leave_applications (user_id, leave_type_id, start_date, end_date, reason, status, applied_at) VALUES (?, ?, ?, ?, ?, 'pending', NOW())",
//       [userId, leave_type_id, start_date, end_date, reason]
//     );

//     res.json({ success: true, message: "Leave submitted successfully" });
//   } catch (error) {
//     console.error("Error submitting leave:", error);
//     res.status(500).json({ success: false, message: "Error submitting leave" });
//   }
// };

// Submit leave application
exports.submitLeave = async (req, res) => {
  const { leave_type_id, start_date, end_date, reason } = req.body;
  const userId = req.session.user.id;

  if (!leave_type_id || !start_date || !end_date || !reason) {
    return res
      .status(400)
      .json({ success: false, message: "All fields are required" });
  }
  const [existing] = await db.query(
    `SELECT * FROM leave_applications 
       WHERE user_id = ? 
       AND status IN ('Pending', 'Approved') 
       AND (
         (start_date <= ? AND end_date >= ?) OR
         (start_date <= ? AND end_date >= ?) OR
         (? <= start_date AND ? >= end_date)
       )`,
    [userId, start_date, start_date, end_date, end_date, start_date, end_date]
  );

  if (existing.length > 0) {
    return res.json({
      success: false,
      message: "You already have a leave request overlapping with these dates.",
    });
  }
  try {
    // Calculate days
    const startDate = new Date(start_date);
    const endDate = new Date(end_date);
    const days = Math.ceil((endDate - startDate) / (1000 * 60 * 60 * 24)) + 1;

    if (days <= 0) {
      return res.status(400).json({
        success: false,
        message: "Invalid date range",
      });
    }

    // Get manager_id
    const [managerData] = await db.query(
      "SELECT manager_id FROM users WHERE id = ?",
      [userId]
    );

    const managerId =
      managerData.length > 0 && managerData[0].manager_id
        ? managerData[0].manager_id
        : null;

    // Check leave balance
    const [balanceRows] = await db.query(
      "SELECT total_leaves, used_leaves FROM leave_balances WHERE user_id = ? AND leave_type_id = ?",
      [userId, leave_type_id]
    );

    if (!balanceRows.length) {
      return res
        .status(400)
        .json({ success: false, message: "Leave type not available for you" });
    }

    const balance = balanceRows[0];
    const available = balance.total_leaves - balance.used_leaves;

    if (days > available) {
      return res.status(400).json({
        success: false,
        message: `Insufficient leave balance. Available: ${available} days`,
      });
    }

    // Insert leave application
    await db.query(
      `INSERT INTO leave_applications 
       (user_id, manager_id, leave_type_id, start_date, end_date, reason, status, applied_at) 
       VALUES (?, ?, ?, ?, ?, ?, 'pending', NOW())`,
      [userId, managerId, leave_type_id, start_date, end_date, reason]
    );

    // ✅ GET EMPLOYEE AND MANAGER DETAILS FOR EMAIL
    const [userDetails] = await db.query(
      `SELECT u.name as employee_name, 
              u.email as employee_email,
              m.name as manager_name,
              m.email as manager_email,
              lt.type_name
       FROM users u
       LEFT JOIN users m ON u.manager_id = m.id
       JOIN leave_types lt ON lt.id = ?
       WHERE u.id = ?`,
      [leave_type_id, userId]
    );

    // ✅ SEND EMAIL NOTIFICATION TO MANAGER
    if (userDetails.length > 0 && userDetails[0].manager_email) {
      try {
        await sendLeaveNotificationToManager({
          employeeName: userDetails[0].employee_name,
          employeeEmail: userDetails[0].employee_email,
          managerName: userDetails[0].manager_name,
          managerEmail: userDetails[0].manager_email,
          leaveType: userDetails[0].type_name,
          startDate: start_date,
          endDate: end_date,
          reason: reason,
          days: days,
        });
        console.log(
          `✅ Leave notification sent to manager: ${userDetails[0].manager_email}`
        );
      } catch (emailError) {
        console.error("❌ Failed to send email to manager:", emailError);
        // Don't fail the entire request if email fails
      }
    } else {
      console.log("⚠️ No manager email found - notification not sent");
    }

    // Log activity
    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [userId, `Applied for ${days} day(s) leave`]
    );

    res.json({ success: true, message: "Leave submitted successfully" });
  } catch (error) {
    console.error("Error submitting leave:", error);
    res.status(500).json({ success: false, message: "Error submitting leave" });
  }
};

// View all leaves for employee
exports.viewLeaveHistory = async (req, res) => {
  try {
    const userId = req.session.user.id;

    const [leaves] = await db.query(
      `SELECT 
         la.id,
         lt.type_name AS type,
         la.start_date AS fromDate,
         la.end_date AS toDate,
         la.status,
         la.reason,
         la.manager_remarks,
         la.applied_at AS appliedOn
       FROM leave_applications la
       JOIN leave_types lt ON la.leave_type_id = lt.id
       WHERE la.user_id = ?
       ORDER BY la.applied_at DESC`,
      [userId]
    );
    console.log(leaves);
    res.render("view_leaves", {
      leaves,
      user: req.session.user,
      role: req.session.user.role,
    });
  } catch (error) {
    console.error("Error loading leave history:", error);
    res.status(500).send("Error loading leave history");
  }
};

// ============================================
// EMPLOYEE CONTROLLER - Apply Leave with Email
// employeeController.js
// ============================================
