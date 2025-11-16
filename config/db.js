require("dotenv").config();
const mysql = require("mysql2/promise");

// Create connection pool
const pool = mysql.createPool({
  host: "localhost",
  user: "root",
  password: process.env.DB_PASSWORD, // Update with your MySQL password
  database: process.env.DB_NAME, // Update with your database name
  waitForConnections: true,
  connectionLimit: 10,
  queueLimit: 0,
});

// Test connection
(async () => {
  try {
    const connection = await pool.getConnection();
    console.log("Database connected successfully");
    connection.release();
  } catch (err) {
    console.error("Error connecting to database:", err);
  }
})();

// Export pool
module.exports = pool;
