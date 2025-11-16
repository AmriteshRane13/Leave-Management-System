const bcrypt = require("bcryptjs");
const db = require("../config/db");
const {
  sendWelcomeEmail,
  sendLeaveStatusEmail,
} = require("../config/emailService");

// Show admin dashboard
exports.showDashboard = async (req, res) => {
  try {
    const [totalEmployees] = await db.query(
      'SELECT COUNT(*) as count FROM users WHERE role != "hr"'
    );

    const [leaveTypes] = await db.query(
      "SELECT COUNT(*) as count FROM leave_types"
    );

    // Get pending requests count - ONLY for managers
    const [pendingRequests] = await db.query(`
      SELECT COUNT(*) as count 
      FROM leave_applications la
      JOIN users u ON la.user_id = u.id
      WHERE la.status = "pending" AND u.role = "manager"
    `);

    const [approvedThisMonth] = await db.query(`
      SELECT COUNT(*) as count 
      FROM leave_applications 
      WHERE status = "approved" 
      AND MONTH(applied_at) = MONTH(CURRENT_DATE()) 
      AND YEAR(applied_at) = YEAR(CURRENT_DATE())
    `);

    // Get leave requests - ONLY for managers (hierarchical system)
    const [allRequests] = await db.query(`
      SELECT 
        la.id,
        u.name as employeeName,
        u.role as employeeRole,
        lt.type_name as type,
        la.start_date as fromDate,
        la.end_date as toDate,
        la.status,
        la.applied_at as submittedOn,
        la.reason,
        la.manager_remarks
      FROM leave_applications la
      JOIN users u ON la.user_id = u.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      WHERE u.role = "manager"
      ORDER BY 
        CASE la.status 
          WHEN 'pending' THEN 1 
          WHEN 'approved' THEN 2 
          WHEN 'rejected' THEN 3 
        END,
        la.applied_at DESC
    `);

    const [managers] = await db.query(`
      SELECT id, name, department 
      FROM users 
      WHERE role IN ('manager', 'hr') 
      ORDER BY name
    `);

    res.render("dashboard_admin", {
      role: req.session.user.role,
      user: req.session.user,
      totalEmployees: totalEmployees[0].count,
      leaveTypes: leaveTypes[0].count,
      pendingRequests: pendingRequests[0].count,
      approvedThisMonth: approvedThisMonth[0].count,
      allRequests,
      managers,
    });
  } catch (error) {
    console.error("Dashboard error:", error);
    res.status(500).send("Error loading dashboard");
  }
};

// Add new employee (UPDATED with seniority and automatic leave allocation)
// exports.addEmployee = async (req, res) => {
//   const {
//     name,
//     gender,
//     email,
//     password,
//     role,
//     department,
//     designation,
//     manager_id,
//     seniority,
//   } = req.body;

//   try {
//     const [existingUsers] = await db.query(
//       "SELECT * FROM users WHERE email = ?",
//       [email]
//     );

//     if (existingUsers.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Employee with this email already exists",
//       });
//     }

//     if (!name || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, email, and password are required",
//       });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     // Insert user with seniority
//     const [result] = await db.query(
//       "INSERT INTO users (name, gender, email, password, role, department, designation, manager_id, seniority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
//       [
//         name,
//         gender,
//         email,
//         hashedPassword,
//         role || "employee",
//         department || null,
//         designation || null,
//         manager_id || null,
//         seniority || "junior",
//       ]
//     );

//     const userId = result.insertId;
//     const userRole = role || "employee";
//     const userSeniority = seniority || "junior";

//     // Get leave allocations based on role and seniority
//     const [allocations] = await db.query(
//       `SELECT leave_type_id, days
//        FROM leave_allocations
//        WHERE role = ? AND seniority = ?`,
//       [userRole, userSeniority]
//     );

//     // Insert leave balances based on allocations
//     if (allocations.length > 0) {
//       for (const allocation of allocations) {
//         await db.query(
//           "INSERT INTO leave_balances (user_id, leave_type_id, total_leaves, used_leaves) VALUES (?, ?, ?, 0)",
//           [userId, allocation.leave_type_id, allocation.days]
//         );
//       }
//     } else {
//       // Fallback: If no allocations found, give default 12 days for all leave types
//       const [leaveTypes] = await db.query("SELECT id FROM leave_types");
//       for (const leaveType of leaveTypes) {
//         await db.query(
//           "INSERT INTO leave_balances (user_id, leave_type_id, total_leaves, used_leaves) VALUES (?, ?, 12, 0)",
//           [userId, leaveType.id]
//         );
//       }
//     }

//     await db.query(
//       "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
//       [
//         req.session.user.id,
//         `Added new employee: ${name} (${email}) - ${userSeniority} ${userRole}`,
//       ]
//     );

//     res.json({
//       success: true,
//       message: "Employee added successfully",
//       employeeId: userId,
//     });
//   } catch (error) {
//     console.error("Add employee error:", error);
//     res.status(500).json({ success: false, message: "Error adding employee" });
//   }
// };

// Show all users
exports.showUsers = async (req, res) => {
  try {
    const [employees] = await db.query(`
      SELECT u.*, m.name as manager_name 
      FROM users u
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE u.role != 'hr'
      ORDER BY u.created_at DESC
    `);

    const [managers] = await db.query(`
      SELECT id, name, department 
      FROM users 
      WHERE role IN ('manager', 'hr')
      ORDER BY name
    `);

    // Check if request wants JSON (for modal) or HTML (for page)
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res.json({ success: true, employees, managers });
    }

    res.render("manage_users", {
      role: req.session.user.role,
      user: req.session.user,
      employees,
      managers,
    });
  } catch (error) {
    console.error("Users error:", error);
    if (req.headers.accept && req.headers.accept.includes("application/json")) {
      return res
        .status(500)
        .json({ success: false, message: "Error loading users" });
    }
    res.status(500).send("Error loading users");
  }
};

// Get employee by ID (for editing)
exports.getEmployee = async (req, res) => {
  const { id } = req.params;

  try {
    const [employees] = await db.query(
      "SELECT id, name, gender, email, role, department, designation, manager_id, seniority FROM users WHERE id = ?",
      [id]
    );
    console.log(employees);

    if (employees.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Employee not found" });
    }

    res.json({ success: true, employee: employees[0] });
  } catch (error) {
    console.error("Get employee error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching employee" });
  }
};

// Update user (UPDATED with seniority and leave balance recalculation)
// exports.updateUser = async (req, res) => {
//   const { id } = req.params;
//   const { name, email, role, department, designation, manager_id, seniority } =
//     req.body;

//   try {
//     // Get current user data to check if role or seniority changed
//     const [currentUser] = await db.query(
//       "SELECT role, seniority FROM users WHERE id = ?",
//       [id]
//     );

//     if (currentUser.length === 0) {
//       return res
//         .status(404)
//         .json({ success: false, message: "User not found" });
//     }

//     const oldRole = currentUser[0].role;
//     const oldSeniority = currentUser[0].seniority;
//     const newRole = role || oldRole;
//     const newSeniority = seniority || oldSeniority;

//     // Update user information
//     await db.query(
//       "UPDATE users SET name = ?, email = ?, role = ?, department = ?, designation = ?, manager_id = ?, seniority = ? WHERE id = ?",
//       [
//         name,
//         email,
//         newRole,
//         department,
//         designation,
//         manager_id || null,
//         newSeniority,
//         id,
//       ]
//     );

//     // If role or seniority changed, update leave balances
//     if (oldRole !== newRole || oldSeniority !== newSeniority) {
//       // Get new allocations based on updated role and seniority
//       const [allocations] = await db.query(
//         `SELECT leave_type_id, days
//          FROM leave_allocations
//          WHERE role = ? AND seniority = ?`,
//         [newRole, newSeniority]
//       );

//       // Update leave balances
//       for (const allocation of allocations) {
//         const [existingBalance] = await db.query(
//           "SELECT used_leaves FROM leave_balances WHERE user_id = ? AND leave_type_id = ?",
//           [id, allocation.leave_type_id]
//         );

//         if (existingBalance.length > 0) {
//           // Update existing balance
//           await db.query(
//             "UPDATE leave_balances SET total_leaves = ? WHERE user_id = ? AND leave_type_id = ?",
//             [allocation.days, id, allocation.leave_type_id]
//           );
//         } else {
//           // Insert new balance if doesn't exist
//           await db.query(
//             "INSERT INTO leave_balances (user_id, leave_type_id, total_leaves, used_leaves) VALUES (?, ?, ?, 0)",
//             [id, allocation.leave_type_id, allocation.days]
//           );
//         }
//       }
//     }

//     await db.query(
//       "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
//       [
//         req.session.user.id,
//         `Updated user: ${name} (Role: ${newRole}, Seniority: ${newSeniority})`,
//       ]
//     );

//     res.json({ success: true, message: "User updated successfully" });
//   } catch (error) {
//     console.error("Update user error:", error);
//     res.status(500).json({ success: false, message: "Error updating user" });
//   }
// };

// Delete user
exports.deleteUser = async (req, res) => {
  const { id } = req.params;

  try {
    const [users] = await db.query("SELECT name FROM users WHERE id = ?", [id]);
    const userName = users[0]?.name;

    await db.query("DELETE FROM users WHERE id = ?", [id]);

    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [req.session.user.id, `Deleted user: ${userName}`]
    );

    res.json({ success: true, message: "User deleted successfully" });
  } catch (error) {
    console.error("Delete user error:", error);
    res.status(500).json({ success: false, message: "Error deleting user" });
  }
};

// Show all leave applications
exports.showAllLeaves = async (req, res) => {
  try {
    const [leaves] = await db.query(`
      SELECT la.*, u.name as user_name, u.department, lt.type_name 
      FROM leave_applications la
      JOIN users u ON la.user_id = u.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      ORDER BY la.applied_at DESC
    `);

    res.render("view_all_leaves", { leaves });
  } catch (error) {
    console.error("Leaves error:", error);
    res.status(500).send("Error loading leaves");
  }
};

// // Update leave status
// exports.updateLeaveStatus = async (req, res) => {
//   const { id } = req.params;
//   const { status, remarks } = req.body;

//   try {
//     const [leaves] = await db.query(
//       `
//       SELECT la.*, u.name as user_name, lt.type_name,
//              DATEDIFF(la.end_date, la.start_date) + 1 as days
//       FROM leave_applications la
//       JOIN users u ON la.user_id = u.id
//       JOIN leave_types lt ON la.leave_type_id = lt.id
//       WHERE la.id = ?
//     `,
//       [id]
//     );

//     if (leaves.length === 0) {
//       return res
//         .status(404)
//         .json({ success: false, message: "Leave not found" });
//     }

//     const leave = leaves[0];
//     const oldStatus = leave.status;

//     await db.query(
//       "UPDATE leave_applications SET status = ?, manager_remarks = ? WHERE id = ?",
//       [status, remarks || null, id]
//     );

//     if (oldStatus === "pending" && status === "approved") {
//       await db.query(
//         "UPDATE leave_balances SET used_leaves = used_leaves + ? WHERE user_id = ? AND leave_type_id = ?",
//         [leave.days, leave.user_id, leave.leave_type_id]
//       );
//     }

//     if (oldStatus === "approved" && status !== "approved") {
//       await db.query(
//         "UPDATE leave_balances SET used_leaves = used_leaves - ? WHERE user_id = ? AND leave_type_id = ?",
//         [leave.days, leave.user_id, leave.leave_type_id]
//       );
//     }

//     await db.query(
//       "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
//       [
//         req.session.user.id,
//         `Updated leave status for ${leave.user_name} to ${status}`,
//       ]
//     );

//     res.json({ success: true, message: "Leave status updated successfully" });
//   } catch (error) {
//     console.error("Update leave status error:", error);
//     res
//       .status(500)
//       .json({ success: false, message: "Error updating leave status" });
//   }
// };

// Get all leave types (UPDATED to include allocations)
exports.getLeaveTypes = async (req, res) => {
  try {
    const [leaveTypes] = await db.query(
      "SELECT * FROM leave_types ORDER BY type_name"
    );

    // Get allocations for each leave type
    for (let leaveType of leaveTypes) {
      const [allocations] = await db.query(
        `SELECT role, seniority, days 
         FROM leave_allocations 
         WHERE leave_type_id = ?
         ORDER BY 
           FIELD(role, 'employee', 'manager', 'admin', 'hr'),
           FIELD(seniority, 'junior', 'mid', 'senior', 'lead')`,
        [leaveType.id]
      );
      leaveType.allocations = allocations;
    }

    res.json({ success: true, leaveTypes });
  } catch (error) {
    console.error("Get leave types error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error fetching leave types" });
  }
};

// Get specific leave type with allocations (NEW)
exports.getLeaveTypeDetails = async (req, res) => {
  try {
    const { id } = req.params;

    const [leaveTypes] = await db.query(
      "SELECT * FROM leave_types WHERE id = ?",
      [id]
    );

    if (leaveTypes.length === 0) {
      return res.status(404).json({
        success: false,
        message: "Leave type not found",
      });
    }

    const leaveType = leaveTypes[0];

    const [allocations] = await db.query(
      `SELECT role, seniority, days 
       FROM leave_allocations 
       WHERE leave_type_id = ?
       ORDER BY 
         FIELD(role, 'employee', 'manager', 'admin', 'hr'),
         FIELD(seniority, 'junior', 'mid', 'senior', 'lead')`,
      [id]
    );

    leaveType.allocations = allocations;

    res.json({
      success: true,
      leaveType,
    });
  } catch (error) {
    console.error("Get leave type details error:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching leave type details",
    });
  }
};

// Add leave type (UPDATED to include allocations)
exports.addLeaveType = async (req, res) => {
  const { type_name, description, allocations } = req.body;

  try {
    // Check if leave type already exists
    const [existing] = await db.query(
      "SELECT * FROM leave_types WHERE type_name = ?",
      [type_name]
    );

    if (existing.length > 0) {
      return res
        .status(400)
        .json({ success: false, message: "Leave type already exists" });
    }

    if (!allocations || allocations.length === 0) {
      return res.status(400).json({
        success: false,
        message: "At least one allocation is required",
      });
    }

    // Insert leave type
    const [result] = await db.query(
      "INSERT INTO leave_types (type_name, description) VALUES (?, ?)",
      [type_name, description]
    );

    const leaveTypeId = result.insertId;

    console.log("Allocations data:", allocations);

    // Insert allocations and update leave_balances for matching employees
    for (const allocation of allocations) {
      // Insert into leave_allocations
      await db.query(
        "INSERT INTO leave_allocations (leave_type_id, role, seniority, days) VALUES (?, ?, ?, ?)",
        [leaveTypeId, allocation.role, allocation.seniority, allocation.days]
      );

      // Determine gender filter based on leave type
      let genderCondition = "";
      if (type_name.toLowerCase().includes("maternity")) {
        genderCondition = "AND gender = 'female'";
      } else if (type_name.toLowerCase().includes("paternity")) {
        genderCondition = "AND gender = 'male'";
      }

      // Get matching users by role, seniority, and (optional) gender
      const [users] = await db.query(
        `SELECT id FROM users WHERE role = ? AND seniority = ? ${genderCondition}`,
        [allocation.role, allocation.seniority]
      );

      // Add entry in leave_balances for each matching user
      for (const user of users) {
        await db.query(
          "INSERT INTO leave_balances (user_id, leave_type_id, total_leaves, used_leaves) VALUES (?, ?, ?, 0)",
          [user.id, leaveTypeId, allocation.days]
        );
      }
    }

    // Log the activity
    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [
        req.session.user.id,
        `Added leave type: ${type_name} with ${allocations.length} allocation(s)`,
      ]
    );

    res.json({ success: true, message: "Leave type added successfully" });
  } catch (error) {
    console.error("Add leave type error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error adding leave type" });
  }
};

// Update leave type (UPDATED to handle allocations)
exports.updateLeaveType = async (req, res) => {
  const { id } = req.params;
  const { type_name, description, allocations } = req.body;

  try {
    await db.query(
      "UPDATE leave_types SET type_name = ?, description = ? WHERE id = ?",
      [type_name, description, id]
    );

    // If allocations are provided, update them
    if (allocations && allocations.length > 0) {
      // Delete existing allocations
      await db.query("DELETE FROM leave_allocations WHERE leave_type_id = ?", [
        id,
      ]);

      // Insert new allocations
      for (const allocation of allocations) {
        await db.query(
          "INSERT INTO leave_allocations (leave_type_id, role, seniority, days) VALUES (?, ?, ?, ?)",
          [id, allocation.role, allocation.seniority, allocation.days]
        );
      }

      // Update leave balances for all users
      const [users] = await db.query("SELECT id, role, seniority FROM users");

      for (const user of users) {
        const matchingAllocation = allocations.find(
          (alloc) =>
            alloc.role === user.role && alloc.seniority === user.seniority
        );

        if (matchingAllocation) {
          await db.query(
            "UPDATE leave_balances SET total_leaves = ? WHERE user_id = ? AND leave_type_id = ?",
            [matchingAllocation.days, user.id, id]
          );
        }
      }
    }

    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [req.session.user.id, `Updated leave type: ${type_name}`]
    );

    res.json({ success: true, message: "Leave type updated successfully" });
  } catch (error) {
    console.error("Update leave type error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error updating leave type" });
  }
};

// Delete leave type
exports.deleteLeaveType = async (req, res) => {
  const { id } = req.params;

  try {
    const [leaveTypes] = await db.query(
      "SELECT type_name FROM leave_types WHERE id = ?",
      [id]
    );
    const typeName = leaveTypes[0]?.type_name;

    // Check if leave type is in use
    const [inUse] = await db.query(
      "SELECT COUNT(*) as count FROM leave_applications WHERE leave_type_id = ?",
      [id]
    );

    if (inUse[0].count > 0) {
      return res.status(400).json({
        success: false,
        message:
          "Cannot delete leave type. It is being used in leave applications.",
      });
    }

    // Delete leave type (allocations and balances will cascade delete if foreign keys are set)
    await db.query("DELETE FROM leave_types WHERE id = ?", [id]);

    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [req.session.user.id, `Deleted leave type: ${typeName}`]
    );

    res.json({ success: true, message: "Leave type deleted successfully" });
  } catch (error) {
    console.error("Delete leave type error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error deleting leave type" });
  }
};

// Show activity logs
exports.showActivityLogs = async (req, res) => {
  try {
    const [logs] = await db.query(`
      SELECT al.*, u.name as user_name, u.role
      FROM activity_logs al
      LEFT JOIN users u ON al.user_id = u.id
      ORDER BY al.timestamp DESC
      LIMIT 100
    `);

    res.render("activity_logs", { logs });
  } catch (error) {
    console.error("Activity logs error:", error);
    res.status(500).send("Error loading activity logs");
  }
};

// Download reports
exports.downloadReports = async (req, res) => {
  try {
    const [leaveData] = await db.query(`
      SELECT 
        u.name as employee_name,
        u.email,
        u.department,
        u.role,
        u.seniority,
        lt.type_name as leave_type,
        la.start_date,
        la.end_date,
        la.status,
        la.reason,
        la.applied_at
      FROM leave_applications la
      JOIN users u ON la.user_id = u.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      ORDER BY la.applied_at DESC
    `);

    res.json({ success: true, data: leaveData });
  } catch (error) {
    console.error("Download reports error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error generating report" });
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

    const [leaveBalances] = await db.query(
      `SELECT lb.*, lt.type_name 
       FROM leave_balances lb
       JOIN leave_types lt ON lb.leave_type_id = lt.id
       WHERE lb.user_id = ?`,
      [userId]
    );

    res.render("adminProfile", {
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

    if (!name || !email) {
      return res.status(400).json({
        success: false,
        message: "Name and email are required",
      });
    }

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

    await db.query(
      "UPDATE users SET name = ?, email = ?, department = ?, designation = ? WHERE id = ?",
      [name, email, department || null, designation || null, userId]
    );

    req.session.user.name = name;
    req.session.user.email = email;
    req.session.user.department = department;
    req.session.user.designation = designation;

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

    const [users] = await db.query("SELECT password FROM users WHERE id = ?", [
      userId,
    ]);

    if (users.length === 0) {
      return res.status(404).json({
        success: false,
        message: "User not found",
      });
    }

    const isMatch = await bcrypt.compare(currentPassword, users[0].password);

    if (!isMatch) {
      return res.status(400).json({
        success: false,
        message: "Current password is incorrect",
      });
    }

    const hashedPassword = await bcrypt.hash(newPassword, 10);

    await db.query("UPDATE users SET password = ? WHERE id = ?", [
      hashedPassword,
      userId,
    ]);

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

// Add new employee with email notification
// exports.addEmployee = async (req, res) => {
//   const {
//     name,
//     email,
//     gender,
//     password,
//     role,
//     department,
//     designation,
//     manager_id,
//     seniority,
//   } = req.body;

//   try {
//     const [existingUsers] = await db.query(
//       "SELECT * FROM users WHERE email = ?",
//       [email]
//     );

//     if (existingUsers.length > 0) {
//       return res.status(400).json({
//         success: false,
//         message: "Employee with this email already exists",
//       });
//     }

//     if (!name || !email || !password) {
//       return res.status(400).json({
//         success: false,
//         message: "Name, email, and password are required",
//       });
//     }

//     const hashedPassword = await bcrypt.hash(password, 10);

//     const [result] = await db.query(
//       "INSERT INTO users (name, email, gender, password, role, department, designation, manager_id, seniority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
//       [
//         name,
//         email,
//         gender,
//         hashedPassword,
//         role || "employee",
//         department || null,
//         designation || null,
//         manager_id || null,
//         seniority || "junior",
//       ]
//     );

//     const userId = result.insertId;
//     const userRole = role || "employee";
//     const userSeniority = seniority || "junior";

//     // Get leave allocations based on role and seniority
//     const [allocations] = await db.query(
//       `SELECT leave_type_id, days
//        FROM leave_allocations
//        WHERE role = ? AND seniority = ?`,
//       [userRole, userSeniority]
//     );

//     // Insert leave balances based on allocations
//     if (allocations.length > 0) {
//       for (const allocation of allocations) {
//         await db.query(
//           "INSERT INTO leave_balances (user_id, leave_type_id, total_leaves, used_leaves) VALUES (?, ?, ?, 0)",
//           [userId, allocation.leave_type_id, allocation.days]
//         );
//       }
//     } else {
//       const [leaveTypes] = await db.query("SELECT id FROM leave_types");
//       for (const leaveType of leaveTypes) {
//         await db.query(
//           "INSERT INTO leave_balances (user_id, leave_type_id, total_leaves, used_leaves) VALUES (?, ?, 12, 0)",
//           [userId, leaveType.id]
//         );
//       }
//     }

//     // Send welcome email to new employee
//     await sendWelcomeEmail({
//       name,
//       email,
//       password, // Send plain password only once via email
//       role: userRole,
//     });

//     await db.query(
//       "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
//       [
//         req.session.user.id,
//         `Added new employee: ${name} (${email}) - ${userSeniority} ${userRole}`,
//       ]
//     );

//     res.json({
//       success: true,
//       message: "Employee added successfully and welcome email sent",
//       employeeId: userId,
//     });
//   } catch (error) {
//     console.error("Add employee error:", error);
//     res.status(500).json({ success: false, message: "Error adding employee" });
//   }
// };

// Update leave status with email notification
exports.updateLeaveStatus = async (req, res) => {
  const { id } = req.params;
  const { status, remarks } = req.body;

  try {
    const [leaves] = await db.query(
      `
      SELECT la.*, 
             u.name as user_name, 
             u.email as user_email,
             lt.type_name,
             DATEDIFF(la.end_date, la.start_date) + 1 as days,
             m.name as manager_name
      FROM leave_applications la
      JOIN users u ON la.user_id = u.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      LEFT JOIN users m ON u.manager_id = m.id
      WHERE la.id = ?
    `,
      [id]
    );

    if (leaves.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Leave not found" });
    }

    const leave = leaves[0];
    const oldStatus = leave.status;

    await db.query(
      "UPDATE leave_applications SET status = ?, manager_remarks = ? WHERE id = ?",
      [status, remarks || null, id]
    );

    if (oldStatus === "pending" && status === "approved") {
      await db.query(
        "UPDATE leave_balances SET used_leaves = used_leaves + ? WHERE user_id = ? AND leave_type_id = ?",
        [leave.days, leave.user_id, leave.leave_type_id]
      );
    }

    if (oldStatus === "approved" && status !== "approved") {
      await db.query(
        "UPDATE leave_balances SET used_leaves = used_leaves - ? WHERE user_id = ? AND leave_type_id = ?",
        [leave.days, leave.user_id, leave.leave_type_id]
      );
    }

    // Send status update email to employee
    await sendLeaveStatusEmail({
      employeeName: leave.user_name,
      employeeEmail: leave.user_email,
      leaveType: leave.type_name,
      startDate: leave.start_date,
      endDate: leave.end_date,
      status: status,
      remarks: remarks,
      managerName: req.session.user.name,
    });

    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [
        req.session.user.id,
        `Updated leave status for ${leave.user_name} to ${status}`,
      ]
    );

    res.json({ success: true, message: "Leave status updated successfully" });
  } catch (error) {
    console.error("Update leave status error:", error);
    res
      .status(500)
      .json({ success: false, message: "Error updating leave status" });
  }
};

// ============================================
// FIXED: addEmployee - Gender-based leave allocation
// ============================================

exports.addEmployee = async (req, res) => {
  const {
    name,
    email,
    gender,
    password,
    role,
    department,
    designation,
    manager_id,
    seniority,
  } = req.body;

  try {
    const [existingUsers] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.status(400).json({
        success: false,
        message: "Employee with this email already exists",
      });
    }

    if (!name || !email || !password) {
      return res.status(400).json({
        success: false,
        message: "Name, email, and password are required",
      });
    }

    const hashedPassword = await bcrypt.hash(password, 10);

    const [result] = await db.query(
      "INSERT INTO users (name, email, gender, password, role, department, designation, manager_id, seniority) VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?)",
      [
        name,
        email,
        gender,
        hashedPassword,
        role || "employee",
        department || null,
        designation || null,
        manager_id || null,
        seniority || "junior",
      ]
    );

    const userId = result.insertId;
    const userRole = role || "employee";
    const userSeniority = seniority || "junior";
    const userGender = gender;

    // ✅ FIXED: Get leave allocations with gender filtering
    let allocationQuery = `
      SELECT la.leave_type_id, la.days, lt.type_name
      FROM leave_allocations la
      JOIN leave_types lt ON la.leave_type_id = lt.id
      WHERE la.role = ? AND la.seniority = ?
    `;

    // Add gender filter
    if (userGender === "male") {
      allocationQuery += ` AND lt.type_name NOT LIKE '%Maternity%'`;
    } else if (userGender === "female") {
      allocationQuery += ` AND lt.type_name NOT LIKE '%Paternity%'`;
    }

    const [allocations] = await db.query(allocationQuery, [
      userRole,
      userSeniority,
    ]);

    // Insert leave balances based on gender-filtered allocations
    if (allocations.length > 0) {
      for (const allocation of allocations) {
        await db.query(
          "INSERT INTO leave_balances (user_id, leave_type_id, total_leaves, used_leaves) VALUES (?, ?, ?, 0)",
          [userId, allocation.leave_type_id, allocation.days]
        );
      }
    } else {
      // Fallback with gender filter
      let fallbackQuery = `SELECT id, type_name FROM leave_types WHERE 1=1`;

      if (userGender === "male") {
        fallbackQuery += ` AND type_name NOT LIKE '%Maternity%'`;
      } else if (userGender === "female") {
        fallbackQuery += ` AND type_name NOT LIKE '%Paternity%'`;
      }

      const [leaveTypes] = await db.query(fallbackQuery);
      for (const leaveType of leaveTypes) {
        await db.query(
          "INSERT INTO leave_balances (user_id, leave_type_id, total_leaves, used_leaves) VALUES (?, ?, 12, 0)",
          [userId, leaveType.id]
        );
      }
    }

    // Send welcome email to new employee
    await sendWelcomeEmail({
      name,
      email,
      password,
      role: userRole,
    });

    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [
        req.session.user.id,
        `Added new employee: ${name} (${email}) - ${userSeniority} ${userRole}`,
      ]
    );

    res.json({
      success: true,
      message: "Employee added successfully and welcome email sent",
      employeeId: userId,
    });
  } catch (error) {
    console.error("Add employee error:", error);
    res.status(500).json({ success: false, message: "Error adding employee" });
  }
};

// ============================================
// FIXED: updateUser - Gender-based leave balance update
// ============================================

exports.updateUser = async (req, res) => {
  const { id } = req.params;
  const {
    name,
    email,
    role,
    department,
    designation,
    manager_id,
    seniority,
    gender,
  } = req.body;

  try {
    // Get current user data
    const [currentUser] = await db.query(
      "SELECT role, seniority, gender FROM users WHERE id = ?",
      [id]
    );

    if (currentUser.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "User not found" });
    }

    const oldRole = currentUser[0].role;
    const oldSeniority = currentUser[0].seniority;
    const oldGender = currentUser[0].gender;
    const newRole = role || oldRole;
    const newSeniority = seniority || oldSeniority;
    const newGender = gender || oldGender;

    // Update user information (including gender)
    await db.query(
      "UPDATE users SET name = ?, email = ?, role = ?, department = ?, designation = ?, manager_id = ?, seniority = ?, gender = ? WHERE id = ?",
      [
        name,
        email,
        newRole,
        department,
        designation,
        manager_id || null,
        newSeniority,
        newGender,
        id,
      ]
    );

    // If role, seniority, OR gender changed, update leave balances
    if (
      oldRole !== newRole ||
      oldSeniority !== newSeniority ||
      oldGender !== newGender
    ) {
      // ✅ FIXED: Get allocations with gender filter
      let allocationQuery = `
        SELECT la.leave_type_id, la.days, lt.type_name
        FROM leave_allocations la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        WHERE la.role = ? AND la.seniority = ?
      `;

      // Add gender filter
      if (newGender === "male") {
        allocationQuery += ` AND lt.type_name NOT LIKE '%Maternity%'`;
      } else if (newGender === "female") {
        allocationQuery += ` AND lt.type_name NOT LIKE '%Paternity%'`;
      }

      const [allocations] = await db.query(allocationQuery, [
        newRole,
        newSeniority,
      ]);

      // Get all current leave balances for this user
      const [currentBalances] = await db.query(
        "SELECT leave_type_id FROM leave_balances WHERE user_id = ?",
        [id]
      );

      const currentLeaveTypeIds = currentBalances.map((b) => b.leave_type_id);
      const newLeaveTypeIds = allocations.map((a) => a.leave_type_id);

      // Update existing balances and insert new ones
      for (const allocation of allocations) {
        const [existingBalance] = await db.query(
          "SELECT used_leaves FROM leave_balances WHERE user_id = ? AND leave_type_id = ?",
          [id, allocation.leave_type_id]
        );

        if (existingBalance.length > 0) {
          // Update existing balance
          await db.query(
            "UPDATE leave_balances SET total_leaves = ? WHERE user_id = ? AND leave_type_id = ?",
            [allocation.days, id, allocation.leave_type_id]
          );
        } else {
          // Insert new balance
          await db.query(
            "INSERT INTO leave_balances (user_id, leave_type_id, total_leaves, used_leaves) VALUES (?, ?, ?, 0)",
            [id, allocation.leave_type_id, allocation.days]
          );
        }
      }

      // Remove balances that shouldn't exist (e.g., if gender changed)
      for (const currentLeaveTypeId of currentLeaveTypeIds) {
        if (!newLeaveTypeIds.includes(currentLeaveTypeId)) {
          // Check if this leave type should be removed based on gender
          const [leaveTypeInfo] = await db.query(
            "SELECT type_name FROM leave_types WHERE id = ?",
            [currentLeaveTypeId]
          );

          if (leaveTypeInfo.length > 0) {
            const typeName = leaveTypeInfo[0].type_name;
            let shouldRemove = false;

            if (
              newGender === "male" &&
              typeName.toLowerCase().includes("maternity")
            ) {
              shouldRemove = true;
            } else if (
              newGender === "female" &&
              typeName.toLowerCase().includes("paternity")
            ) {
              shouldRemove = true;
            }

            if (shouldRemove) {
              await db.query(
                "DELETE FROM leave_balances WHERE user_id = ? AND leave_type_id = ?",
                [id, currentLeaveTypeId]
              );
            }
          }
        }
      }
    }

    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [
        req.session.user.id,
        `Updated user: ${name} (Role: ${newRole}, Seniority: ${newSeniority}, Gender: ${newGender})`,
      ]
    );

    res.json({ success: true, message: "User updated successfully" });
  } catch (error) {
    console.error("Update user error:", error);
    res.status(500).json({ success: false, message: "Error updating user" });
  }
};
