const bcrypt = require("bcryptjs");
const db = require("./config/db");

async function setupInitialData() {
  try {
    console.log("Starting setup...");

    // Check if HR user already exists
    const [existingHR] = await db.query(
      'SELECT * FROM users WHERE role = "hr"'
    );

    if (existingHR.length > 0) {
      console.log("HR user already exists. Skipping user creation.");
    } else {
      // Create initial HR/Admin user
      const hashedPassword = await bcrypt.hash("admin123", 10);

      const [result] = await db.query(
        "INSERT INTO users (name, email, password, role, department, designation) VALUES (?, ?, ?, ?, ?, ?)",
        [
          "Admin User",
          "admin@company.com",
          hashedPassword,
          "hr",
          "Human Resources",
          "HR Manager",
        ]
      );

      console.log("✓ Initial HR user created:");
      console.log("  Email: admin@company.com");
      console.log("  Password: admin123");
      console.log("  (Please change this password after first login)");
    }

    // Check if leave types exist
    // const [existingLeaveTypes] = await db.query("SELECT * FROM leave_types");

    // if (existingLeaveTypes.length > 0) {
    //   console.log("Leave types already exist. Skipping leave types creation.");
    // } else {
    //   // Create default leave types
    //   const leaveTypes = [
    //     ["Casual Leave", "For personal reasons and short breaks"],
    //     ["Sick Leave", "For medical reasons and health issues"],
    //     ["Earned Leave", "Accumulated leave for extended breaks"],
    //     ["Maternity Leave", "For expecting mothers"],
    //     ["Paternity Leave", "For new fathers"],
    //   ];

    //   for (const [type_name, description] of leaveTypes) {
    //     await db.query(
    //       "INSERT INTO leave_types (type_name, description) VALUES (?, ?)",
    //       [type_name, description]
    //     );
    //   }

    //   console.log("✓ Default leave types created");
    // }

    // // Initialize leave balances for existing users without balances
    // const [users] = await db.query("SELECT id FROM users");
    // const [leaveTypes] = await db.query("SELECT id FROM leave_types");

    // for (const user of users) {
    //   for (const leaveType of leaveTypes) {
    //     const [existing] = await db.query(
    //       "SELECT * FROM leave_balances WHERE user_id = ? AND leave_type_id = ?",
    //       [user.id, leaveType.id]
    //     );

    //     if (existing.length === 0) {
    //       await db.query(
    //         "INSERT INTO leave_balances (user_id, leave_type_id, total_leaves, used_leaves) VALUES (?, ?, 12, 0)",
    //         [user.id, leaveType.id]
    //       );
    //     }
    //   }
    // }

    // console.log("✓ Leave balances initialized for all users");
    console.log("\nSetup completed successfully!");
    console.log("\nYou can now login with:");
    console.log("Email: admin@company.com");
    console.log("Password: admin123");

    process.exit(0);
  } catch (error) {
    console.error("Setup error:", error);
    process.exit(1);
  }
}

setupInitialData();
