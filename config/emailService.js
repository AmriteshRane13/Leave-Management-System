// ============================================
// EMAIL SERVICE - config/emailService.js
// ============================================

const nodemailer = require("nodemailer");

// Create transporter
const transporter = nodemailer.createTransport({
  service: "gmail", // You can use other services like 'outlook', 'yahoo', etc.
  auth: {
    user: process.env.EMAIL_USER, // Your email
    pass: process.env.EMAIL_PASSWORD, // Your app password (not regular password)
  },
});

// Verify transporter configuration
transporter.verify((error, success) => {
  if (error) {
    console.error("Email transporter error:", error);
  } else {
    console.log("Email server is ready to send messages");
  }
});

// ============================================
// EMAIL TEMPLATES
// ============================================

// Welcome email for new employee
const sendWelcomeEmail = async (employeeData) => {
  const { name, email, password, role } = employeeData;

  const mailOptions = {
    from: {
      name: "Leave Management System",
      address: process.env.EMAIL_USER,
    },
    to: email,
    subject: "Welcome to Leave Management System - Your Account Credentials",
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .credentials { background: white; padding: 20px; border-left: 4px solid #667eea; margin: 20px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background: #667eea; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
          .warning { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 20px 0; border-radius: 5px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>🎉 Welcome Aboard!</h1>
          </div>
          <div class="content">
            <h2>Hello ${name},</h2>
            <p>Welcome to our organization! Your account has been created in our Leave Management System.</p>
            
            <div class="credentials">
              <h3>Your Login Credentials:</h3>
              <p><strong>Email:</strong> ${email}</p>
              <p><strong>Temporary Password:</strong> <code style="background: #e5e7eb; padding: 5px 10px; border-radius: 3px;">${password}</code></p>
              <p><strong>Role:</strong> <span style="text-transform: capitalize;">${role}</span></p>
            </div>

            <div class="warning">
              <strong>⚠️ Important:</strong> Please change your password after your first login for security purposes.
            </div>

            <p>You can now access the system to:</p>
            <ul>
              <li>Apply for leaves</li>
              <li>View your leave balance</li>
              <li>Track your leave history</li>
              ${
                role === "manager"
                  ? "<li>Approve/Reject team member leaves</li>"
                  : ""
              }
            </ul>

            <a href="${
              process.env.APP_URL || "http://localhost:3000"
            }/login" class="button">Login to Your Account</a>

            <p style="margin-top: 30px;">If you have any questions, please don't hesitate to contact HR.</p>

            <div class="footer">
              <p>This is an automated message, please do not reply to this email.</p>
              <p>&copy; ${new Date().getFullYear()} Leave Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Welcome email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending welcome email:", error);
    return { success: false, error: error.message };
  }
};

// Leave application notification to manager
const sendLeaveNotificationToManager = async (leaveData) => {
  const {
    employeeName,
    employeeEmail,
    managerName,
    managerEmail,
    leaveType,
    startDate,
    endDate,
    reason,
    days,
  } = leaveData;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const mailOptions = {
    from: {
      name: "Leave Management System",
      address: process.env.EMAIL_USER,
    },
    to: managerEmail,
    subject: `Leave Request from ${employeeName} - Action Required`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .leave-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; box-shadow: 0 2px 4px rgba(0,0,0,0.1); }
          .detail-row { display: flex; padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: bold; width: 150px; color: #666; }
          .detail-value { flex: 1; color: #111; }
          .reason-box { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; color: white; text-decoration: none; border-radius: 5px; margin: 10px 5px; }
          .button-primary { background: #10b981; }
          .button-secondary { background: #667eea; }
          .actions { text-align: center; margin: 30px 0; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>📋 Leave Request Pending</h1>
          </div>
          <div class="content">
            <h2>Hello ${managerName},</h2>
            <p>You have received a new leave request that requires your approval.</p>
            
            <div class="leave-details">
              <h3 style="margin-top: 0; color: #667eea;">Leave Request Details</h3>
              
              <div class="detail-row">
                <div class="detail-label">Employee:</div>
                <div class="detail-value"><strong>${employeeName}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Email:</div>
                <div class="detail-value">${employeeEmail}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Leave Type:</div>
                <div class="detail-value"><strong>${leaveType}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">From Date:</div>
                <div class="detail-value">${formatDate(startDate)}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">To Date:</div>
                <div class="detail-value">${formatDate(endDate)}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Duration:</div>
                <div class="detail-value"><strong>${days} day(s)</strong></div>
              </div>
            </div>

            <div class="reason-box">
              <strong>Reason:</strong>
              <p style="margin: 10px 0 0 0;">${reason}</p>
            </div>

            <div class="actions">
              <p><strong>Please review and take action on this leave request.</strong></p>
              <a href="${
                process.env.APP_URL || "http://localhost:3000"
              }/manager/dashboard" class="button button-primary">Review Leave Request</a>
            </div>

            <p style="margin-top: 30px; color: #666; font-size: 14px;">
              <strong>Note:</strong> You can approve or reject this request from your dashboard.
            </p>

            <div class="footer">
              <p>This is an automated notification from the Leave Management System.</p>
              <p>&copy; ${new Date().getFullYear()} Leave Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Leave notification email sent to manager:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending leave notification to manager:", error);
    return { success: false, error: error.message };
  }
};

// Leave status update notification to employee
const sendLeaveStatusEmail = async (statusData) => {
  const {
    employeeName,
    employeeEmail,
    leaveType,
    startDate,
    endDate,
    status,
    remarks,
    managerName,
  } = statusData;

  const formatDate = (date) => {
    return new Date(date).toLocaleDateString("en-IN", {
      day: "numeric",
      month: "long",
      year: "numeric",
    });
  };

  const statusConfig = {
    approved: {
      color: "#10b981",
      icon: "✅",
      title: "Leave Request Approved",
      message: "Good news! Your leave request has been approved.",
    },
    rejected: {
      color: "#ef4444",
      icon: "❌",
      title: "Leave Request Rejected",
      message: "Your leave request has been rejected.",
    },
  };

  const config = statusConfig[status] || statusConfig.rejected;

  const mailOptions = {
    from: {
      name: "Leave Management System",
      address: process.env.EMAIL_USER,
    },
    to: employeeEmail,
    subject: `${config.title} - ${leaveType}`,
    html: `
      <!DOCTYPE html>
      <html>
      <head>
        <style>
          body { font-family: Arial, sans-serif; line-height: 1.6; color: #333; }
          .container { max-width: 600px; margin: 0 auto; padding: 20px; }
          .header { background: ${
            config.color
          }; color: white; padding: 30px; text-align: center; border-radius: 10px 10px 0 0; }
          .content { background: #f9fafb; padding: 30px; border-radius: 0 0 10px 10px; }
          .leave-details { background: white; padding: 20px; border-radius: 8px; margin: 20px 0; }
          .detail-row { padding: 10px 0; border-bottom: 1px solid #e5e7eb; }
          .detail-row:last-child { border-bottom: none; }
          .detail-label { font-weight: bold; color: #666; }
          .remarks-box { background: #fef3c7; padding: 15px; border-left: 4px solid #f59e0b; margin: 15px 0; border-radius: 5px; }
          .button { display: inline-block; padding: 12px 30px; background: ${
            config.color
          }; color: white; text-decoration: none; border-radius: 5px; margin-top: 20px; }
          .footer { text-align: center; margin-top: 30px; color: #666; font-size: 12px; }
        </style>
      </head>
      <body>
        <div class="container">
          <div class="header">
            <h1>${config.icon} ${config.title}</h1>
          </div>
          <div class="content">
            <h2>Hello ${employeeName},</h2>
            <p>${config.message}</p>
            
            <div class="leave-details">
              <h3 style="margin-top: 0;">Leave Details</h3>
              
              <div class="detail-row">
                <div class="detail-label">Leave Type:</div>
                <div>${leaveType}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">From Date:</div>
                <div>${formatDate(startDate)}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">To Date:</div>
                <div>${formatDate(endDate)}</div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Status:</div>
                <div><strong style="color: ${
                  config.color
                }; text-transform: uppercase;">${status}</strong></div>
              </div>
              
              <div class="detail-row">
                <div class="detail-label">Reviewed by:</div>
                <div>${managerName}</div>
              </div>
            </div>

            ${
              remarks
                ? `
              <div class="remarks-box">
                <strong>Manager's Remarks:</strong>
                <p style="margin: 10px 0 0 0;">${remarks}</p>
              </div>
            `
                : ""
            }

            <a href="${
              process.env.APP_URL || "http://localhost:3000"
            }/employee/view-leaves" class="button">View Leave History</a>

            <div class="footer">
              <p>This is an automated notification from the Leave Management System.</p>
              <p>&copy; ${new Date().getFullYear()} Leave Management System. All rights reserved.</p>
            </div>
          </div>
        </div>
      </body>
      </html>
    `,
  };

  try {
    const info = await transporter.sendMail(mailOptions);
    console.log("Leave status email sent:", info.messageId);
    return { success: true, messageId: info.messageId };
  } catch (error) {
    console.error("Error sending leave status email:", error);
    return { success: false, error: error.message };
  }
};

module.exports = {
  sendWelcomeEmail,
  sendLeaveNotificationToManager,
  sendLeaveStatusEmail,
};
