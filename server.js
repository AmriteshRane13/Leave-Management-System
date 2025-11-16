const express = require("express");
const session = require("express-session");
const path = require("path");
const db = require("./config/db");
require("dotenv").config();

const app = express();
const PORT = process.env.PORT || 3000;

// Middleware
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
app.use(express.static(path.join(__dirname, "public")));

// Session configuration
app.use(
  session({
    secret: "your-secret-key-change-in-production",
    resave: false,
    saveUninitialized: false,
    cookie: {
      maxAge: 1000 * 60 * 60 * 24, // 24 hours
      httpOnly: true,
    },
  })
);

// Set view engine
app.set("view engine", "ejs");
app.set("views", path.join(__dirname, "views"));

// Make user available in all views
app.use((req, res, next) => {
  res.locals.user = req.session.user || null;
  res.locals.role = req.session.user ? req.session.user.role : null;
  next();
});

// Routes
const authRoutes = require("./routes/authRoutes");
const adminRoutes = require("./routes/adminRoutes");
const managerRoutes = require("./routes/managerRoutes");

app.use("/", authRoutes);
app.use("/admin", adminRoutes);
app.use("/manager", managerRoutes);

// Make req available in all EJS templates
app.use((req, res, next) => {
  res.locals.req = req;
  next();
});

// Home route - redirect to login
app.get("/", (req, res) => {
  if (req.session.user) {
    // Redirect based on role
    if (req.session.user.role === "admin" || req.session.user.role === "hr") {
      return res.redirect("/admin/dashboard");
    } else if (req.session.user.role === "manager") {
      return res.redirect("/manager/dashboard");
    } else {
      return res.redirect("/employee/dashboard");
    }
  }
  res.redirect("/login");
});

const employeeRoutes = require("./routes/employeeRoutes");

app.use("/employee", employeeRoutes);

// Test route to check database connection
app.get("/test-db", async (req, res) => {
  try {
    const [rows] = await db.query("SELECT COUNT(*) as count FROM users");
    res.json({
      success: true,
      message: "Database connected",
      userCount: rows[0].count,
    });
  } catch (error) {
    res.json({
      success: false,
      message: "Database connection failed",
      error: error.message,
    });
  }
});

// 404 handler
app.use((req, res) => {
  res.status(404).send("Page not found");
});

// Error handler
app.use((err, req, res, next) => {
  console.error(err.stack);
  res.status(500).send("Something went wrong!");
});

// Start server
app.listen(PORT, () => {
  console.log(`Server is running on http://localhost:${PORT}`);
});
