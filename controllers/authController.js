const bcrypt = require("bcryptjs");
const db = require("../config/db");

// Show login page
exports.showLogin = (req, res) => {
  if (req.session.user) {
    return res.redirect("/");
  }
  res.render("login", { message: null });
};

// Handle login
exports.login = async (req, res) => {
  console.log("Login attempt:", req.body);
  const { email, password } = req.body;

  // Validate input
  if (!email || !password) {
    console.log("Missing email or password");
    return res.render("login", { message: "Email and password are required" });
  }

  try {
    // Find user by email
    console.log("Searching for user with email:", email);
    const [users] = await db.query("SELECT * FROM users WHERE email = ?", [
      email,
    ]);

    if (users.length === 0) {
      console.log("User not found");
      return res.render("login", { message: "Invalid email or password" });
    }

    const user = users[0];
    console.log("User found:", user.email, "Role:", user.role);

    // Compare password
    const isMatch = await bcrypt.compare(password, user.password);
    console.log("Password match:", isMatch);

    if (!isMatch) {
      console.log("Password mismatch");
      return res.render("login", { message: "Invalid email or password" });
    }

    // Create session
    req.session.user = {
      id: user.id,
      name: user.name,
      email: user.email,
      role: user.role,
      department: user.department,
      designation: user.designation,
      manager_id: user.manager_id,
    };

    console.log("Session created:", req.session.user);

    // Log activity
    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [user.id, "User logged in"]
    );

    // Redirect based on role
    console.log("Redirecting user with role:", user.role);
    if (user.role === "hr") {
      return res.redirect("/admin/dashboard");
    } else if (user.role === "manager") {
      return res.redirect("/manager/dashboard");
    } else {
      return res.redirect("/employee/dashboard");
    }
  } catch (error) {
    console.error("Login error:", error);
    res.render("login", { message: "An error occurred. Please try again." });
  }
};

// Handle logout
exports.logout = async (req, res) => {
  try {
    if (req.session.user) {
      // Log activity
      await db.query(
        "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
        [req.session.user.id, "User logged out"]
      );
    }

    req.session.destroy((err) => {
      if (err) {
        console.error("Logout error:", err);
      }
      res.redirect("/login");
    });
  } catch (error) {
    console.error("Logout error:", error);
    res.redirect("/login");
  }
};

// Show register page (for testing/setup)
exports.showRegister = (req, res) => {
  res.render("register", { message: null });
};

// Handle registration (for testing/setup)
exports.register = async (req, res) => {
  const { name, email, password, role, department, designation } = req.body;

  try {
    // Check if user already exists
    const [existingUsers] = await db.query(
      "SELECT * FROM users WHERE email = ?",
      [email]
    );

    if (existingUsers.length > 0) {
      return res.render("register", {
        message: "User with this email already exists",
      });
    }

    // Hash password
    const hashedPassword = await bcrypt.hash(password, 10);

    // Insert user
    const [result] = await db.query(
      "INSERT INTO users (name, email, password, role, department, designation) VALUES (?, ?, ?, ?, ?, ?)",
      [name, email, hashedPassword, role || "employee", department, designation]
    );

    const userId = result.insertId;

    // Initialize leave balances for the new user
    const [leaveTypes] = await db.query("SELECT id FROM leave_types");

    for (const leaveType of leaveTypes) {
      await db.query(
        "INSERT INTO leave_balances (user_id, leave_type_id, total_leaves, used_leaves) VALUES (?, ?, 12, 0)",
        [userId, leaveType.id]
      );
    }

    // Log activity
    await db.query(
      "INSERT INTO activity_logs (user_id, action) VALUES (?, ?)",
      [userId, "User registered"]
    );

    res.redirect("/login");
  } catch (error) {
    console.error("Registration error:", error);
    res.render("register", { message: "An error occurred. Please try again." });
  }
};

// Show change password page
exports.showChangePassword = (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }
  res.render("change_password", { message: null, user: req.session.user });
};

// Handle change password
exports.changePassword = async (req, res) => {
  if (!req.session.user) {
    return res.redirect("/login");
  }

  const { currentPassword, newPassword, confirmPassword } = req.body;
  const userId = req.session.user.id;

  try {
    // Validate inputs
    if (!currentPassword || !newPassword || !confirmPassword) {
      return res.render("change_password", {
        message: "All fields are required",
        user: req.session.user,
      });
    }

    if (newPassword !== confirmPassword) {
      return res.render("change_password", {
        message: "New passwords do not match",
        user: req.session.user,
      });
    }

    if (newPassword.length < 6) {
      return res.render("change_password", {
        message: "New password must be at least 6 characters",
        user: req.session.user,
      });
    }

    // Get user from database
    const [users] = await db.query("SELECT * FROM users WHERE id = ?", [
      userId,
    ]);

    if (users.length === 0) {
      return res.render("change_password", {
        message: "User not found",
        user: req.session.user,
      });
    }

    const user = users[0];

    // Verify current password
    const isMatch = await bcrypt.compare(currentPassword, user.password);

    if (!isMatch) {
      return res.render("change_password", {
        message: "Current password is incorrect",
        user: req.session.user,
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
      [userId, "Password changed"]
    );

    res.render("change_password", {
      message: "Password changed successfully!",
      user: req.session.user,
      success: true,
    });
  } catch (error) {
    console.error("Change password error:", error);
    res.render("change_password", {
      message: "An error occurred. Please try again.",
      user: req.session.user,
    });
  }
};
