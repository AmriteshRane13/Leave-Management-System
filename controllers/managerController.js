const db = require("../config/db");

// Show manager dashboard
exports.showDashboard = async (req, res) => {
  try {
    const managerId = req.session.user.id;

    // Get manager's total leaves applied
    const [totalLeavesApplied] = await db.query(
      "SELECT COUNT(*) as count FROM leave_applications WHERE user_id = ?",
      [managerId]
    );

    // Get manager's pending leaves
    const [pendingLeaves] = await db.query(
      'SELECT COUNT(*) as count FROM leave_applications WHERE user_id = ? AND status = "pending"',
      [managerId]
    );

    // Get manager's remaining leave balance (sum of all leave types)
    const [remainingBalance] = await db.query(
      "SELECT SUM(remaining_leaves) as total FROM leave_balances WHERE user_id = ?",
      [managerId]
    );

    // Get team pending requests (employees under this manager)
    const [teamPendingRequests] = await db.query(
      'SELECT COUNT(*) as count FROM leave_applications la JOIN users u ON la.user_id = u.id WHERE u.manager_id = ? AND la.status = "pending"',
      [managerId]
    );

    // Get team leave requests with details
    const [teamRequests] = await db.query(
      `
      SELECT 
        la.id,
        u.name as employeeName,
        lt.type_name as type,
        la.start_date as fromDate,
        la.end_date as toDate,
        la.reason,
        la.status,
        la.applied_at as submittedOn
      FROM leave_applications la
      JOIN users u ON la.user_id = u.id
      JOIN leave_types lt ON la.leave_type_id = lt.id
      WHERE u.manager_id = ?
      ORDER BY la.applied_at DESC
    `,
      [managerId]
    );

    res.render("dashboard_manager", {
      role: req.session.user.role,
      user: req.session.user,
      totalLeavesApplied: totalLeavesApplied[0].count,
      pendingLeaves: pendingLeaves[0].count,
      remainingBalance: remainingBalance[0].total || 0,
      teamPendingRequests: teamPendingRequests[0].count,
      teamRequests,
    });
  } catch (error) {
    console.error("Manager dashboard error:", error);
    res.status(500).send("Error loading dashboard");
  }
};

// Approve leave request
exports.approveLeave = async (req, res) => {
  const { id } = req.params;
  const managerId = req.session.user.id;

  try {
    // Get leave details and verify manager
    const [leaves] = await db.query(
      `
      SELECT la.*, u.manager_id, u.name as user_name,
             DATEDIFF(la.end_date, la.start_date) + 1 as days
      FROM leave_applications la
      JOIN users u ON la.user_id = u.id
      WHERE la.id = ?
    `,
      [id]
    );

    if (leaves.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Leave request not found" });
    }

    const leave = leaves[0];

    // Verify this manager can approve this leave
    if (leave.manager_id !== managerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to approve this leave",
      });
    }

    // Check if already processed
    if (leave.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Leave request already processed" });
    }

    // Update leave status to approved
    await db.query(
      'UPDATE leave_applications SET status = "approved", manager_remarks = ? WHERE id = ?',
      ["Approved by manager", id]
    );

    // Update leave balance
    await db.query(
      "UPDATE leave_balances SET used_leaves = used_leaves + ? WHERE user_id = ? AND leave_type_id = ?",
      [leave.days, leave.user_id, leave.leave_type_id]
    );

    // Log activity
    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [managerId, `Approved leave request for ${leave.user_name}`]
    );

    res.json({ success: true, message: "Leave approved successfully" });
  } catch (error) {
    console.error("Approve leave error:", error);
    res.status(500).json({ success: false, message: "Error approving leave" });
  }
};

// Reject leave request
exports.rejectLeave = async (req, res) => {
  const { id } = req.params;
  const { remarks } = req.body;
  const managerId = req.session.user.id;

  try {
    // Get leave details and verify manager
    const [leaves] = await db.query(
      `
      SELECT la.*, u.manager_id, u.name as user_name
      FROM leave_applications la
      JOIN users u ON la.user_id = u.id
      WHERE la.id = ?
    `,
      [id]
    );

    if (leaves.length === 0) {
      return res
        .status(404)
        .json({ success: false, message: "Leave request not found" });
    }

    const leave = leaves[0];

    // Verify this manager can reject this leave
    if (leave.manager_id !== managerId) {
      return res.status(403).json({
        success: false,
        message: "You are not authorized to reject this leave",
      });
    }

    // Check if already processed
    if (leave.status !== "pending") {
      return res
        .status(400)
        .json({ success: false, message: "Leave request already processed" });
    }

    // Update leave status to rejected
    await db.query(
      'UPDATE leave_applications SET status = "rejected", manager_remarks = ? WHERE id = ?',
      [remarks || "Rejected by manager", id]
    );

    // Log activity
    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [managerId, `Rejected leave request for ${leave.user_name}`]
    );

    res.json({ success: true, message: "Leave rejected successfully" });
  } catch (error) {
    console.error("Reject leave error:", error);
    res.status(500).json({ success: false, message: "Error rejecting leave" });
  }
};

exports.viewTeam = async (req, res) => {
  try {
    const managerId = req.session.user.id;

    // Get all team members under this manager
    const [teamMembers] = await db.query(
      `
      SELECT 
        u.id,
        u.name,
        u.email,
        u.department,
        u.designation,
        COUNT(la.id) as total_leaves,
        SUM(CASE WHEN la.status = 'approved' THEN 1 ELSE 0 END) as approved_leaves,
        SUM(CASE WHEN la.status = 'pending' THEN 1 ELSE 0 END) as pending_leaves
      FROM users u
      LEFT JOIN leave_applications la ON u.id = la.user_id
      WHERE u.manager_id = ?
      GROUP BY u.id, u.name, u.email, u.department, u.designation
      ORDER BY u.name
    `,
      [managerId]
    );

    // For each member, get current leave (today) and upcoming leave
    for (const member of teamMembers) {
      const [currentLeaveRows] = await db.query(
        `
        SELECT lt.type_name as type, la.start_date, la.end_date, la.reason
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        WHERE la.user_id = ? AND la.status = 'approved'
        AND CURDATE() BETWEEN la.start_date AND la.end_date
        LIMIT 1
      `,
        [member.id]
      );
      member.current_leave = currentLeaveRows[0] || null;

      const [upcomingLeaveRows] = await db.query(
        `
        SELECT lt.type_name as type, la.start_date, la.end_date, la.reason
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        WHERE la.user_id = ? AND la.status = 'approved'
        AND la.start_date > CURDATE()
        ORDER BY la.start_date ASC
        LIMIT 1
      `,
        [member.id]
      );
      member.upcoming_leave = upcomingLeaveRows[0] || null;
    }

    // Count how many members are on leave today
    const onLeaveToday = teamMembers.filter((m) => m.current_leave).length;

    // Count pending requests for this manager
    const [pendingRequestsResult] = await db.query(
      `
      SELECT COUNT(*) AS count
      FROM leave_applications la
      JOIN users u ON la.user_id = u.id
      WHERE u.manager_id = ? AND la.status = 'pending'
    `,
      [managerId]
    );
    const pendingRequests = pendingRequestsResult[0].count || 0;

    res.render("my_team", {
      role: req.session.user.role,
      user: req.session.user,
      teamMembers,
      onLeaveToday,
      pendingRequests,
      currentLeaves: [], // optional: fill if you want a separate current leave table
    });
  } catch (error) {
    console.error("View team error:", error);
    res.status(500).send("Error loading team");
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

    res.render("managerProfile", {
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

    const bcrypt = require("bcryptjs");
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
// ============================================
// ADD THIS TO managerController.js
// Team Statistics for Reports
// ============================================

exports.getTeamStats = async (req, res) => {
  try {
    const managerId = req.session.user.id;
    const { memberId } = req.query;

    let stats = {};
    let member = null;

    if (memberId) {
      // Get specific member stats
      const [memberData] = await db.query(
        "SELECT id, name, email, department, designation FROM users WHERE id = ? AND manager_id = ?",
        [memberId, managerId]
      );

      if (memberData.length === 0) {
        return res.status(404).json({
          success: false,
          message: "Team member not found",
        });
      }

      member = memberData[0];

      // Get leave statistics for specific member
      const [leaveStats] = await db.query(
        `
        SELECT 
          COUNT(*) as totalLeaves,
          SUM(CASE WHEN status = 'approved' THEN 1 ELSE 0 END) as approvedLeaves,
          SUM(CASE WHEN status = 'pending' THEN 1 ELSE 0 END) as pendingLeaves,
          SUM(CASE WHEN status = 'rejected' THEN 1 ELSE 0 END) as rejectedLeaves
        FROM leave_applications
        WHERE user_id = ?
      `,
        [memberId]
      );

      // Get leave type breakdown
      const [typeBreakdown] = await db.query(
        `
        SELECT 
          lt.type_name,
          COUNT(la.id) as count
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        WHERE la.user_id = ?
        GROUP BY lt.id, lt.type_name
        ORDER BY count DESC
      `,
        [memberId]
      );

      // Get recent leaves
      const [recentLeaves] = await db.query(
        `
        SELECT 
          la.id,
          lt.type_name as leave_type,
          la.start_date,
          la.end_date,
          la.status,
          DATEDIFF(la.end_date, la.start_date) + 1 as days
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        WHERE la.user_id = ?
        ORDER BY la.applied_at DESC
        LIMIT 10
      `,
        [memberId]
      );

      stats = {
        totalLeaves: leaveStats[0].totalLeaves || 0,
        approvedLeaves: leaveStats[0].approvedLeaves || 0,
        pendingLeaves: leaveStats[0].pendingLeaves || 0,
        rejectedLeaves: leaveStats[0].rejectedLeaves || 0,
        leaveTypeBreakdown: typeBreakdown,
        recentLeaves: recentLeaves,
      };
    } else {
      // Get overall team stats
      const [teamStats] = await db.query(
        `
        SELECT 
          COUNT(DISTINCT la.id) as totalLeaves,
          SUM(CASE WHEN la.status = 'approved' THEN 1 ELSE 0 END) as approvedLeaves,
          SUM(CASE WHEN la.status = 'pending' THEN 1 ELSE 0 END) as pendingLeaves,
          SUM(CASE WHEN la.status = 'rejected' THEN 1 ELSE 0 END) as rejectedLeaves
        FROM leave_applications la
        JOIN users u ON la.user_id = u.id
        WHERE u.manager_id = ?
      `,
        [managerId]
      );

      // Get team leave type breakdown
      const [teamTypeBreakdown] = await db.query(
        `
        SELECT 
          lt.type_name,
          COUNT(la.id) as count
        FROM leave_applications la
        JOIN leave_types lt ON la.leave_type_id = lt.id
        JOIN users u ON la.user_id = u.id
        WHERE u.manager_id = ?
        GROUP BY lt.id, lt.type_name
        ORDER BY count DESC
      `,
        [managerId]
      );

      // Get recent team leaves
      const [recentTeamLeaves] = await db.query(
        `
        SELECT 
          la.id,
          u.name as employee_name,
          lt.type_name as leave_type,
          la.start_date,
          la.end_date,
          la.status,
          DATEDIFF(la.end_date, la.start_date) + 1 as days
        FROM leave_applications la
        JOIN users u ON la.user_id = u.id
        JOIN leave_types lt ON la.leave_type_id = lt.id
        WHERE u.manager_id = ?
        ORDER BY la.applied_at DESC
        LIMIT 10
      `,
        [managerId]
      );

      stats = {
        totalLeaves: teamStats[0].totalLeaves || 0,
        approvedLeaves: teamStats[0].approvedLeaves || 0,
        pendingLeaves: teamStats[0].pendingLeaves || 0,
        rejectedLeaves: teamStats[0].rejectedLeaves || 0,
        leaveTypeBreakdown: teamTypeBreakdown,
        recentLeaves: recentTeamLeaves,
      };
    }

    res.json({
      success: true,
      data: {
        member,
        stats,
      },
    });
  } catch (error) {
    console.error("Error fetching team stats:", error);
    res.status(500).json({
      success: false,
      message: "Error fetching team statistics",
    });
  }
};
