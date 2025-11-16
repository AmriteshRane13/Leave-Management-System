// ============================================
// ADD THIS AT THE VERY TOP OF YOUR SCRIPT.JS
// ============================================

// Notification System Class
class NotificationSystem {
  constructor() {
    this.container = null;
    this.init();
  }

  init() {
    if (!document.getElementById("notificationContainer")) {
      const container = document.createElement("div");
      container.id = "notificationContainer";
      container.className = "notification-container";
      document.body.appendChild(container);
      this.container = container;
    } else {
      this.container = document.getElementById("notificationContainer");
    }
  }

  show(message, type = "info", duration = 5000) {
    const notification = document.createElement("div");
    notification.className = `notification notification-${type} notification-enter`;

    const icons = {
      success: "✓",
      error: "✕",
      warning: "⚠",
      info: "ℹ",
    };

    notification.innerHTML = `
      <div class="notification-icon">${icons[type] || icons.info}</div>
      <div class="notification-content">
        <div class="notification-message">${message}</div>
      </div>
      <button class="notification-close" onclick="this.parentElement.remove()">×</button>
    `;

    this.container.appendChild(notification);
    setTimeout(() => notification.classList.remove("notification-enter"), 10);

    if (duration > 0) {
      setTimeout(() => this.remove(notification), duration);
    }

    return notification;
  }

  remove(notification) {
    notification.classList.add("notification-exit");
    setTimeout(() => {
      if (notification.parentElement) notification.remove();
    }, 300);
  }

  success(message, duration = 5000) {
    return this.show(message, "success", duration);
  }

  error(message, duration = 6000) {
    return this.show(message, "error", duration);
  }

  warning(message, duration = 5000) {
    return this.show(message, "warning", duration);
  }

  info(message, duration = 5000) {
    return this.show(message, "info", duration);
  }

  async confirm(message, title = "Confirm Action") {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "notification-modal";
      modal.innerHTML = `
        <div class="notification-modal-overlay"></div>
        <div class="notification-modal-content">
          <div class="notification-modal-header">
            <h3>${title}</h3>
          </div>
          <div class="notification-modal-body">
            <p>${message}</p>
          </div>
          <div class="notification-modal-footer">
            <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
            <button class="btn btn-primary" id="confirmBtn">Confirm</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add("show"), 10);

      const cleanup = (result) => {
        modal.classList.remove("show");
        setTimeout(() => modal.remove(), 300);
        resolve(result);
      };

      modal.querySelector("#confirmBtn").onclick = () => cleanup(true);
      modal.querySelector("#cancelBtn").onclick = () => cleanup(false);
      modal.querySelector(".notification-modal-overlay").onclick = () =>
        cleanup(false);
    });
  }

  async prompt(message, title = "Input Required", defaultValue = "") {
    return new Promise((resolve) => {
      const modal = document.createElement("div");
      modal.className = "notification-modal";
      modal.innerHTML = `
        <div class="notification-modal-overlay"></div>
        <div class="notification-modal-content">
          <div class="notification-modal-header">
            <h3>${title}</h3>
          </div>
          <div class="notification-modal-body">
            <p>${message}</p>
            <textarea 
              id="promptInput" 
              class="notification-prompt-input" 
              rows="3"
              placeholder="Enter your response..."
            >${defaultValue}</textarea>
          </div>
          <div class="notification-modal-footer">
            <button class="btn btn-secondary" id="cancelBtn">Cancel</button>
            <button class="btn btn-primary" id="submitBtn">Submit</button>
          </div>
        </div>
      `;

      document.body.appendChild(modal);
      setTimeout(() => modal.classList.add("show"), 10);

      const input = modal.querySelector("#promptInput");
      input.focus();

      const cleanup = (result) => {
        modal.classList.remove("show");
        setTimeout(() => modal.remove(), 300);
        resolve(result);
      };

      modal.querySelector("#submitBtn").onclick = () => {
        const value = input.value.trim();
        cleanup(value || null);
      };

      modal.querySelector("#cancelBtn").onclick = () => cleanup(null);
      modal.querySelector(".notification-modal-overlay").onclick = () =>
        cleanup(null);

      input.onkeydown = (e) => {
        if (e.key === "Enter" && e.ctrlKey) {
          modal.querySelector("#submitBtn").click();
        }
      };
    });
  }
}

// Initialize notification system
const notify = new NotificationSystem();

// ============================================
// FORM VALIDATION & UTILITIES
// ============================================

function isValidEmail(email) {
  const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
  return emailRegex.test(email);
}

function showError(elementId, message) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = message;
    errorElement.classList.add("show");
  }
}

function clearError(elementId) {
  const errorElement = document.getElementById(elementId);
  if (errorElement) {
    errorElement.textContent = "";
    errorElement.classList.remove("show");
  }
}

function clearAllErrors() {
  const errorElements = document.querySelectorAll(".error-message");
  errorElements.forEach((el) => {
    el.textContent = "";
    el.classList.remove("show");
  });
}

// ============================================
// DATE INPUT LISTENERS
// ============================================

document.addEventListener("DOMContentLoaded", () => {
  const fromDateInput = document.getElementById("fromDate");
  const toDateInput = document.getElementById("toDate");

  if (fromDateInput) {
    fromDateInput.addEventListener("change", updateDaysCount);
  }

  if (toDateInput) {
    toDateInput.addEventListener("change", updateDaysCount);
  }

  const today = new Date().toISOString().split("T")[0];
  if (fromDateInput) {
    fromDateInput.setAttribute("min", today);
  }
  if (toDateInput) {
    toDateInput.setAttribute("min", today);
  }
});

// ============================================
// APPLY LEAVE FORM HANDLING
// ============================================

function calculateDays(fromDate, toDate) {
  if (!fromDate || !toDate) return 0;
  const from = new Date(fromDate);
  const to = new Date(toDate);
  const diffTime = Math.abs(to - from);
  const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1;
  return diffDays;
}

function updateDaysCount() {
  const fromDate = document.getElementById("fromDate")?.value;
  const toDate = document.getElementById("toDate")?.value;
  const daysCount = document.getElementById("daysCount");

  if (daysCount) {
    const days = calculateDays(fromDate, toDate);
    daysCount.textContent = days;
  }
}
// Manager Leave
async function handleApplyManagerLeave(event) {
  event.preventDefault();
  clearAllErrors();

  const leaveType = document.getElementById("leaveType").value;
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;
  const reason = document.getElementById("reason").value.trim();

  let isValid = true;

  if (!leaveType) {
    showError("leaveTypeError", "Please select a leave type");
    isValid = false;
  }

  if (!fromDate) {
    showError("fromDateError", "From date is required");
    isValid = false;
  }

  if (!toDate) {
    showError("toDateError", "To date is required");
    isValid = false;
  }

  if (fromDate && toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (from > to) {
      showError("toDateError", "To date must be after from date");
      isValid = false;
    }
  }

  if (!reason) {
    showError("reasonError", "Please provide a reason");
    isValid = false;
  } else if (reason.length < 10) {
    showError("reasonError", "Reason must be at least 10 characters");
    isValid = false;
  }

  if (isValid) {
    try {
      const response = await fetch("/manager/apply-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_type_id: leaveType,
          start_date: fromDate,
          end_date: toDate,
          reason: reason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        notify.success(
          "Leave request submitted successfully! Your manager has been notified via email."
        );
        setTimeout(() => {
          window.location.href = "/employee/view-leaves";
        }, 1500);
      } else {
        notify.error(result.message || "Error submitting leave request");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error submitting leave request. Please try again.");
    }
  }
}

// Employee leave
async function handleApplyEmployeeLeave(event) {
  event.preventDefault();
  clearAllErrors();

  const leaveType = document.getElementById("leaveType").value;
  const fromDate = document.getElementById("fromDate").value;
  const toDate = document.getElementById("toDate").value;
  const reason = document.getElementById("reason").value.trim();

  let isValid = true;

  if (!leaveType) {
    showError("leaveTypeError", "Please select a leave type");
    isValid = false;
  }

  if (!fromDate) {
    showError("fromDateError", "From date is required");
    isValid = false;
  }

  if (!toDate) {
    showError("toDateError", "To date is required");
    isValid = false;
  }

  if (fromDate && toDate) {
    const from = new Date(fromDate);
    const to = new Date(toDate);
    if (from > to) {
      showError("toDateError", "To date must be after from date");
      isValid = false;
    }
  }

  if (!reason) {
    showError("reasonError", "Please provide a reason");
    isValid = false;
  } else if (reason.length < 10) {
    showError("reasonError", "Reason must be at least 10 characters");
    isValid = false;
  }

  if (isValid) {
    try {
      const response = await fetch("/employee/apply-leave", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          leave_type_id: leaveType,
          start_date: fromDate,
          end_date: toDate,
          reason: reason,
        }),
      });

      const result = await response.json();

      if (result.success) {
        notify.success(
          "Leave request submitted successfully! Your manager has been notified via email."
        );
        setTimeout(() => {
          window.location.href = "/employee/view-leaves";
        }, 1500);
      } else {
        notify.error(result.message || "Error submitting leave request");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error submitting leave request. Please try again.");
    }
  }
}

// async function handleApplyEmployeeLeave(event) {
//   event.preventDefault();
//   clearAllErrors();

//   const leaveType = document.getElementById("leaveType").value;
//   const fromDate = document.getElementById("fromDate").value;
//   const toDate = document.getElementById("toDate").value;
//   const reason = document.getElementById("reason").value.trim();

//   let isValid = true;

//   if (!leaveType) {
//     showError("leaveTypeError", "Please select a leave type");
//     isValid = false;
//   }

//   if (!fromDate) {
//     showError("fromDateError", "From date is required");
//     isValid = false;
//   }

//   if (!toDate) {
//     showError("toDateError", "To date is required");
//     isValid = false;
//   }

//   if (fromDate && toDate) {
//     const from = new Date(fromDate);
//     const to = new Date(toDate);
//     if (from > to) {
//       showError("toDateError", "To date must be after from date");
//       isValid = false;
//     }
//   }

//   if (!reason) {
//     showError("reasonError", "Please provide a reason");
//     isValid = false;
//   } else if (reason.length < 10) {
//     showError("reasonError", "Reason must be at least 10 characters");
//     isValid = false;
//   }

//   if (!isValid) return;

//   try {
//     // 🧩 Step 1: Check for existing leave overlaps
//     const checkResponse = await fetch("/employee/get-leaves");
//     const existingLeaves = await checkResponse.json();

//     const newFrom = new Date(fromDate);
//     const newTo = new Date(toDate);

//     const overlap = existingLeaves.some((leave) => {
//       const existingFrom = new Date(leave.start_date);
//       const existingTo = new Date(leave.end_date);
//       return (
//         (newFrom >= existingFrom && newFrom <= existingTo) ||
//         (newTo >= existingFrom && newTo <= existingTo)
//       );
//     });

//     if (overlap) {
//       notify.warning("You already have a leave applied in this date range.");
//       return;
//     }

//     // 🧩 Step 2: Submit the leave request
//     const response = await fetch("/employee/apply-leave", {
//       method: "POST",
//       headers: { "Content-Type": "application/json" },
//       body: JSON.stringify({
//         leave_type_id: leaveType,
//         start_date: fromDate,
//         end_date: toDate,
//         reason: reason,
//       }),
//     });

//     const result = await response.json();

//     if (result.success) {
//       notify.success(
//         "Leave request submitted successfully! Your manager has been notified via email."
//       );
//       setTimeout(() => {
//         window.location.href = "/employee/view-leaves";
//       }, 1500);
//     } else {
//       notify.error(result.message || "Error submitting leave request");
//     }
//   } catch (error) {
//     console.error("Error:", error);
//     notify.error("Error submitting leave request. Please try again.");
//   }
// }

// ============================================
// LEAVE FILTERING
// ============================================

function filterLeaves() {
  const statusFilter = document.getElementById("statusFilter")?.value;
  const tableRows = document.querySelectorAll(".data-table tbody tr");

  tableRows.forEach((row) => {
    if (!statusFilter) {
      row.style.display = "";
    } else {
      const statusBadge = row.querySelector(".status-badge");
      const status = statusBadge?.textContent.trim().toLowerCase();
      row.style.display = status === statusFilter.toLowerCase() ? "" : "none";
    }
  });
}

// ============================================
// MANAGER ACTIONS
// ============================================

async function approveLeave(leaveId) {
  const confirmed = await notify.confirm(
    "Are you sure you want to approve this leave request? The employee will be notified via email.",
    "Approve Leave"
  );
  if (confirmed) {
    try {
      const response = await fetch(`/manager/leaves/${leaveId}/approve`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
      });

      const result = await response.json();

      if (result.success) {
        notify.success("Leave approved successfully!");
        setTimeout(() => {
          location.reload();
        }, 1000);
      } else {
        notify.error(result.message || "Error approving leave");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error approving leave. Please try again.");
    }
  }
}

async function rejectLeave(leaveId) {
  const reason = await notify.prompt(
    "Please provide a detailed reason for rejection:",
    "Reject Leave Request"
  );
  if (reason) {
    try {
      const response = await fetch(`/manager/leaves/${leaveId}/reject`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ remarks: reason }),
      });

      const result = await response.json();

      if (result.success) {
        notify.success("Leave rejected successfully!");
        location.reload();
      } else {
        notify.error(result.message || "Error rejecting leave");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error rejecting leave. Please try again.");
    }
  }
}

// ============================================
// ADMIN ACTIONS - ADD EMPLOYEE
// ============================================

function openAddEmployeeModal() {
  const modal = document.getElementById("addEmployeeModal");
  if (modal) {
    modal.style.display = "flex";
  }
}

function closeAddEmployeeModal() {
  const modal = document.getElementById("addEmployeeModal");
  if (modal) {
    modal.style.display = "none";
    const form = document.querySelector("#addEmployeeModal form");
    if (form) form.reset();
  }
}

async function handleAddEmployee(event) {
  event.preventDefault();

  const formData = new FormData(event.target);
  const data = {
    name: formData.get("name")?.trim(),
    email: formData.get("email")?.trim(),
    password: formData.get("password"),
    role: formData.get("role"),
    gender: formData.get("gender"),
    department: formData.get("department") || null,
    designation: formData.get("designation") || null,
    manager_id: formData.get("manager_id") || null,
    seniority: formData.get("seniority") || junior,
  };

  if (
    !data.name ||
    !data.email ||
    !data.password ||
    !data.role ||
    !data.gender
  ) {
    alert("Please fill in all required fields");
    return;
  }

  try {
    const response = await fetch("/admin/add-employee", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    if (!response.ok) {
      throw new Error(`HTTP error! Status: ${response.status}`);
    }

    const result = await response.json();

    if (result.success) {
      notify.success(
        `Employee added successfully! Welcome email has been sent to ${data.email}`
      );
      closeAddEmployeeModal();
      //location.reload();
    } else {
      notify.error(result.message || "Error adding employee");
    }
  } catch (error) {
    console.error("Error:", error);
    notify.error("Error adding employee. Please try again.");
  }
}

// ============================================
// ADMIN ACTIONS - MANAGE EMPLOYEES
// ============================================

let employeesData = [];
let managersData = [];

async function openManageEmployeesModal() {
  console.log("Opening manage employees modal...");
  try {
    const response = await fetch("/admin/users", {
      headers: {
        Accept: "application/json",
      },
    });

    console.log("Response status:", response.status);
    const result = await response.json();
    console.log("Result:", result);

    if (result.success) {
      employeesData = result.employees;
      managersData = result.managers;
      showManageEmployeesModal();
    } else {
      notify.error("Error loading employees");
    }
  } catch (error) {
    console.error("Error:", error);
    notify.error("Error loading employees");
  }
}

function showManageEmployeesModal() {
  const modalHTML = `
    <div id="manageEmployeesModal" class="modal" style="display: flex;">
      <div class="modal-content" style="max-width: 900px; max-height: 90vh; overflow-y: auto;">
        <div class="modal-header">
          <h3>Manage Employees</h3>
          <button class="modal-close" onclick="closeManageEmployeesModal()">&times;</button>
        </div>
        <div class="modal-body">
          ${renderEmployeesList()}
        </div>
      </div>
    </div>
  `;

  const existingModal = document.getElementById("manageEmployeesModal");
  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function renderEmployeesList() {
  if (employeesData.length === 0) {
    return '<p class="empty-state">No employees found</p>';
  }

  return `
    <div class="table-responsive">
      <table class="data-table">
        <thead>
          <tr>
            <th>ID</th>
            <th>Name</th>
            <th>Email</th>
            <th>Role</th>
            <th>Department</th>
            <th>Manager</th>
            <th>Actions</th>
          </tr>
        </thead>
        <tbody>
          ${employeesData
            .map(
              (emp) => `
            <tr>
              <td><strong>#${emp.id}</strong></td>
              <td>${emp.name}</td>
              <td>${emp.email}</td>
              <td>
                <span class="status-badge" style="background-color: #dbeafe; color: #1e40af; text-transform: capitalize;">
                  ${emp.role}
                </span>
              </td>
              <td>${emp.department || "N/A"}</td>
              <td>${emp.manager_name || "No Manager"}</td>
              <td>
                <button class="btn btn-sm btn-primary" onclick="openEditEmployeeModalFromList(${
                  emp.id
                })">
                  Edit
                </button>
                <button class="btn btn-sm btn-danger" onclick="deleteEmployeeFromList(${
                  emp.id
                })">
                  Delete
                </button>
              </td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    </div>
  `;
}

function closeManageEmployeesModal() {
  const modal = document.getElementById("manageEmployeesModal");
  if (modal) {
    modal.remove();
  }
}

async function openEditEmployeeModalFromList(employeeId) {
  console.log("Opening edit modal for employee:", employeeId);
  try {
    const response = await fetch(`/admin/users/${employeeId}`);
    const result = await response.json();

    if (result.success) {
      const employee = result.employee;
      showDynamicEditEmployeeModal(employee);
    } else {
      notify.error("Error loading employee data");
    }
  } catch (error) {
    console.error("Error:", error);
    notify.error("Error loading employee data. Please try again.");
  }
}

function showDynamicEditEmployeeModal(employee) {
  // Build manager options
  const managerOptions = managersData
    .map(
      (manager) => `
    <option value="${manager.id}" ${
        employee.manager_id == manager.id ? "selected" : ""
      }>
      ${manager.name}${manager.department ? " - " + manager.department : ""}
    </option>
  `
    )
    .join("");

  const modalHTML = `
    <div id="dynamicEditEmployeeModal" class="modal" style="display: flex;">
      <div class="modal-content">
        <div class="modal-header">
          <h3>Edit Employee</h3>
          <button class="modal-close" onclick="closeDynamicEditEmployeeModal()">&times;</button>
        </div>
        <form class="modal-form" onsubmit="handleDynamicEditEmployee(event)">
          <input type="hidden" id="dynamicEditEmpId" name="id" value="${
            employee.id
          }" />

          <div class="form-group">
            <label for="dynamicEditEmpName">Full Name <span style="color: red">*</span></label>
            <input type="text" id="dynamicEditEmpName" name="name" value="${
              employee.name
            }" required />
            <span class="error-message" id="dynamicEditEmpNameError"></span>
          </div>

          <div class="form-group">
            <label for="dynamicEditEmpEmail">Email <span style="color: red">*</span></label>
            <input type="email" id="dynamicEditEmpEmail" name="email" value="${
              employee.email
            }" required />
            <span class="error-message" id="dynamicEditEmpEmailError"></span>
          </div>

          <div class="form-group">
            <label for="dynamicEditEmpRole">Role <span style="color: red">*</span></label>
            <select id="dynamicEditEmpRole" name="role" required>
              <option value="">Select Role</option>
              <option value="employee" ${
                employee.role === "employee" ? "selected" : ""
              }>Employee</option>
              <option value="manager" ${
                employee.role === "manager" ? "selected" : ""
              }>Manager</option>
              <option value="hr" ${
                employee.role === "hr" ? "selected" : ""
              }>HR</option>
            </select>
          </div>

          <div class="form-group">
            <label for="dynamicEditEmpDepartment">Department</label>
            <input type="text" id="dynamicEditEmpDepartment" name="department" value="${
              employee.department || ""
            }" />
          </div>

          <div class="form-group">
            <label for="dynamicEditEmpDesignation">Designation</label>
            <input type="text" id="dynamicEditEmpDesignation" name="designation" value="${
              employee.designation || ""
            }" />
          </div>

          <div class="form-group">
            <label for="dynamicEditEmpManagerId">Manager (Optional)</label>
            <select id="dynamicEditEmpManagerId" name="manager_id">
              <option value="">No Manager</option>
              ${managerOptions}
            </select>
          </div>

          <div class="modal-actions">
            <button type="button" class="btn btn-secondary" onclick="closeDynamicEditEmployeeModal()">
              Cancel
            </button>
            <button type="submit" class="btn btn-primary">Save Changes</button>
          </div>
        </form>
      </div>
    </div>
  `;

  const existingModal = document.getElementById("dynamicEditEmployeeModal");
  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function closeDynamicEditEmployeeModal() {
  const modal = document.getElementById("dynamicEditEmployeeModal");
  if (modal) {
    modal.remove();
  }
}

async function handleDynamicEditEmployee(event) {
  event.preventDefault();
  clearAllErrors();

  const empId = document.getElementById("dynamicEditEmpId").value;
  const formData = new FormData(event.target);
  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    department: formData.get("department") || null,
    designation: formData.get("designation") || null,
    manager_id: formData.get("manager_id") || null,
  };

  console.log("Updating employee:", empId, data);

  let isValid = true;

  if (!data.name) {
    showError("dynamicEditEmpNameError", "Employee name is required");
    isValid = false;
  }

  if (!data.email || !isValidEmail(data.email)) {
    showError("dynamicEditEmpEmailError", "Valid email is required");
    isValid = false;
  }

  if (!data.role) {
    alert("Role is required");
    isValid = false;
  }

  if (isValid) {
    try {
      const response = await fetch(`/admin/users/${empId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        notify.success("Employee updated successfully!");
        closeDynamicEditEmployeeModal();
        openManageEmployeesModal(); // Refresh the manage employees modal
      } else {
        alert(result.message || "Error updating employee");
      }
    } catch (error) {
      console.error("Error:", error);
      alert("Error updating employee. Please try again.");
    }
  }
}

async function deleteEmployeeFromList(employeeId) {
  const confirmed = await notify.confirm(
    "Are you sure you want to delete this employee? This action cannot be undone.",
    "Delete Employee"
  );
  if (confirmed) {
    try {
      const response = await fetch(`/admin/users/${employeeId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        notify.success("Employee deleted successfully!");
        setTimeout(() => openManageEmployeesModal(), 1000);
      } else {
        notify.error(result.message || "Error deleting employee");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error deleting employee. Please try again.");
    }
  }
}

// ============================================
// EDIT EMPLOYEE MODAL (for manage_users.ejs page)
// ============================================

async function openEditEmployeeModal(employeeId) {
  console.log("Fetching employee data for ID:", employeeId);
  try {
    const response = await fetch(`/admin/users/${employeeId}`);
    console.log("Response status:", response.status);
    const result = await response.json();
    console.log("Employee data:", result);

    if (result.success) {
      const employee = result.employee;

      // Check if modal exists in DOM
      const modal = document.getElementById("editEmployeeModal");
      if (!modal) {
        console.error("Edit employee modal not found in DOM");
        notify.error(
          "Error: Edit modal not available. Please refresh the page and try again."
        );
        return;
      }

      // Safely populate form fields with null checks
      const editEmpId = document.getElementById("editEmpId");
      const editEmpName = document.getElementById("editEmpName");
      const editEmpEmail = document.getElementById("editEmpEmail");
      const editEmpRole = document.getElementById("editEmpRole");
      const editEmpDepartment = document.getElementById("editEmpDepartment");
      const editEmpDesignation = document.getElementById("editEmpDesignation");
      const managerSelect = document.getElementById("editEmpManagerId");

      if (!editEmpId || !editEmpName || !editEmpEmail || !editEmpRole) {
        console.error("Required form fields not found");
        alert("Error: Form fields not available. Please refresh the page.");
        return;
      }

      // Populate form fields
      editEmpId.value = employee.id;
      editEmpName.value = employee.name;
      editEmpEmail.value = employee.email;
      editEmpRole.value = employee.role;

      if (editEmpDepartment)
        editEmpDepartment.value = employee.department || "";
      if (editEmpDesignation)
        editEmpDesignation.value = employee.designation || "";
      if (managerSelect) managerSelect.value = employee.manager_id || "";

      // Show modal
      modal.style.display = "flex";
      console.log("Edit modal displayed");
    } else {
      notify.error("Error loading employee data");
    }
  } catch (error) {
    console.error("Error:", error);
    notify.error("Error loading employee data");
  }
}

function closeEditEmployeeModal() {
  const modal = document.getElementById("editEmployeeModal");
  if (modal) {
    modal.style.display = "none";
    const form = document.querySelector("#editEmployeeModal form");
    if (form) form.reset();
  }
}

async function handleEditEmployee(event) {
  event.preventDefault();
  clearAllErrors();

  const empId = document.getElementById("editEmpId").value;
  const formData = new FormData(event.target);
  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    role: formData.get("role"),
    department: formData.get("department") || null,
    designation: formData.get("designation") || null,
    manager_id: formData.get("manager_id") || null,
  };

  console.log("Updating employee:", empId, data);

  let isValid = true;

  if (!data.name) {
    showError("editEmpNameError", "Employee name is required");
    isValid = false;
  }

  if (!data.email || !isValidEmail(data.email)) {
    showError("editEmpEmailError", "Valid email is required");
    isValid = false;
  }

  if (!data.role) {
    showError("editEmpRoleError", "Role is required");
    isValid = false;
  }

  if (isValid) {
    try {
      const response = await fetch(`/admin/users/${empId}`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        alert("Employee updated successfully!");
        closeEditEmployeeModal();
        const manageModal = document.getElementById("manageEmployeesModal");
        if (manageModal) {
          openManageEmployeesModal();
        } else {
          location.reload();
        }
      } else {
        notify.error(result.message || "Error updating employee");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error updating employee. Please try again.");
    }
  }
}

// ============================================
// ADMIN ACTIONS - MANAGE LEAVE TYPES
// ============================================

let leaveTypesData = [];

async function openManageLeaveTypesModal() {
  try {
    const response = await fetch("/admin/leave-types");
    const result = await response.json();

    if (result.success) {
      leaveTypesData = result.leaveTypes;
      showLeaveTypesModal();
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error loading leave types");
  }
}

function showLeaveTypesModal() {
  const modalHTML = `
    <div id="leaveTypesModal" class="modal" style="display: flex;">
      <div class="modal-content" style="max-width: 800px;">
        <div class="modal-header">
          <h3>Manage Leave Types</h3>
          <button class="modal-close" onclick="closeLeaveTypesModal()">&times;</button>
        </div>
        <div class="modal-body">
          <button class="btn btn-primary" onclick="showAddLeaveTypeForm()" style="margin-bottom: 20px;">
            Add New Leave Type
          </button>
          <div id="leaveTypesList">
            ${renderLeaveTypesList()}
          </div>
        </div>
      </div>
    </div>
  `;

  const existingModal = document.getElementById("leaveTypesModal");
  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function renderLeaveTypesList() {
  if (leaveTypesData.length === 0) {
    return '<p class="empty-state">No leave types found</p>';
  }

  return `
    <table class="data-table">
      <thead>
        <tr>
          <th>Leave Type</th>
          <th>Description</th>
          <th>Allocations</th>
          <th>Actions</th>
        </tr>
      </thead>
      <tbody>
        ${leaveTypesData
          .map(
            (lt) => `
          <tr>
            <td><strong>${lt.type_name}</strong></td>
            <td>${lt.description || "-"}</td>
            <td>
              ${renderAllocationsSummary(lt.allocations)}
            </td>
            <td>
              <button class="btn btn-sm btn-primary" onclick="viewLeaveTypeDetails(${
                lt.id
              })">
                View Details
              </button>
              <button class="btn btn-sm btn-danger" onclick="deleteLeaveType(${
                lt.id
              }, '${lt.type_name.replace(/'/g, "\\'")}')">
                Delete
              </button>
            </td>
          </tr>
        `
          )
          .join("")}
      </tbody>
    </table>
  `;
}

function renderAllocationsSummary(allocations) {
  if (!allocations || allocations.length === 0) {
    return '<span style="color: #999;">No allocations</span>';
  }

  return `<small>${allocations.length} allocation(s) configured</small>`;
}

function closeLeaveTypesModal() {
  const modal = document.getElementById("leaveTypesModal");
  if (modal) {
    modal.remove();
  }
}

function showAddLeaveTypeForm() {
  const formHTML = `
    <div id="addLeaveTypeForm" style="margin-top: 20px; padding: 20px; border: 1px solid #ddd; border-radius: 8px; background: #f9fafb;">
      <h4>Add New Leave Type</h4>
      <form onsubmit="handleAddLeaveType(event)">
        <div class="form-group">
          <label>Leave Type Name <span style="color: red;">*</span></label>
          <input type="text" name="type_name" required placeholder="e.g., Annual Leave, Sick Leave">
        </div>
        <div class="form-group">
          <label>Description</label>
          <textarea name="description" rows="2" placeholder="Brief description of this leave type"></textarea>
        </div>

        <h5 style="margin-top: 20px; margin-bottom: 10px; color: #374151;">Leave Allocations by Role & Seniority</h5>
        <div id="allocationsContainer">
          <div class="allocation-item" style="padding: 15px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 10px;">
            <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 10px; align-items: end;">
              <div class="form-group" style="margin-bottom: 0;">
                <label>Role <span style="color: red;">*</span></label>
                <select name="allocations[0][role]" required>
                  <option value="">Select Role</option>
                  <option value="employee">Employee</option>
                  <option value="manager">Manager</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label>Seniority Level <span style="color: red;">*</span></label>
                <select name="allocations[0][seniority]" required>
                  <option value="">Select Level</option>
                  <option value="junior">Junior (0-2 years)</option>
                  <option value="mid">Mid-Level (2-5 years)</option>
                  <option value="senior">Senior (5-10 years)</option>
                  <option value="lead">Lead (10+ years)</option>
                </select>
              </div>
              <div class="form-group" style="margin-bottom: 0;">
                <label>Days Allocated <span style="color: red;">*</span></label>
                <input type="number" name="allocations[0][days]" required min="0" max="365" placeholder="e.g., 15">
              </div>
              <button type="button" class="btn btn-sm btn-danger" onclick="removeAllocation(this)" style="height: 38px;">Remove</button>
            </div>
          </div>
        </div>
        
        <button type="button" class="btn btn-secondary" onclick="addAllocationRow()" style="margin-top: 10px;">
          + Add Another Allocation
        </button>

        <div style="display: flex; gap: 10px; margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
          <button type="submit" class="btn btn-primary">Create Leave Type</button>
          <button type="button" class="btn btn-secondary" onclick="hideAddLeaveTypeForm()">Cancel</button>
        </div>
      </form>
    </div>
  `;

  const existingForm = document.getElementById("addLeaveTypeForm");
  if (existingForm) {
    existingForm.remove();
  }

  document
    .getElementById("leaveTypesList")
    .insertAdjacentHTML("beforebegin", formHTML);
}

let allocationCounter = 1;

function addAllocationRow() {
  const container = document.getElementById("allocationsContainer");
  const newRow = `
    <div class="allocation-item" style="padding: 15px; background: white; border: 1px solid #e5e7eb; border-radius: 6px; margin-bottom: 10px;">
      <div style="display: grid; grid-template-columns: 1fr 1fr 1fr auto; gap: 10px; align-items: end;">
        <div class="form-group" style="margin-bottom: 0;">
          <label>Role <span style="color: red;">*</span></label>
          <select name="allocations[${allocationCounter}][role]" required>
            <option value="">Select Role</option>
            <option value="employee">Employee</option>
            <option value="manager">Manager</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>Seniority Level <span style="color: red;">*</span></label>
          <select name="allocations[${allocationCounter}][seniority]" required>
            <option value="">Select Level</option>
            <option value="junior">Junior (0-2 years)</option>
            <option value="mid">Mid-Level (2-5 years)</option>
            <option value="senior">Senior (5-10 years)</option>
            <option value="lead">Lead (10+ years)</option>
          </select>
        </div>
        <div class="form-group" style="margin-bottom: 0;">
          <label>Days Allocated <span style="color: red;">*</span></label>
          <input type="number" name="allocations[${allocationCounter}][days]" required min="0" max="365" placeholder="e.g., 15">
        </div>
        <button type="button" class="btn btn-sm btn-danger" onclick="removeAllocation(this)" style="height: 38px;">Remove</button>
      </div>
    </div>
  `;

  container.insertAdjacentHTML("beforeend", newRow);
  allocationCounter++;
}

function removeAllocation(button) {
  const allocationItems = document.querySelectorAll(".allocation-item");
  if (allocationItems.length > 1) {
    button.closest(".allocation-item").remove();
  } else {
    alert("At least one allocation is required");
  }
}

function hideAddLeaveTypeForm() {
  const form = document.getElementById("addLeaveTypeForm");
  if (form) {
    form.remove();
  }
  allocationCounter = 1;
}

async function handleAddLeaveType(event) {
  event.preventDefault();

  const formData = new FormData(event.target);

  // Extract allocations
  const allocations = [];
  const allocationItems = document.querySelectorAll(".allocation-item");

  allocationItems.forEach((item, index) => {
    const role = formData.get(`allocations[${index}][role]`);
    const seniority = formData.get(`allocations[${index}][seniority]`);
    const days = formData.get(`allocations[${index}][days]`);

    if (role && seniority && days) {
      allocations.push({
        role: role,
        seniority: seniority,
        days: parseInt(days),
      });
    }
  });

  if (allocations.length === 0) {
    notify.warning("Please add at least one leave allocation");
    return;
  }

  const data = {
    type_name: formData.get("type_name"),
    description: formData.get("description"),
    allocations: allocations,
  };

  try {
    const response = await fetch("/admin/leave-types", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(data),
    });

    const result = await response.json();

    if (result.success) {
      notify.success("Leave type added successfully with allocations!");
      hideAddLeaveTypeForm();
      openManageLeaveTypesModal();
    } else {
      notify.error(result.message || "Error adding leave type");
    }
  } catch (error) {
    console.error("Error:", error);
    notify.error("Error adding leave type. Please try again.");
  }
}

async function viewLeaveTypeDetails(leaveTypeId) {
  try {
    const response = await fetch(`/admin/leave-types/${leaveTypeId}`);
    const result = await response.json();

    if (result.success) {
      showLeaveTypeDetailsModal(result.leaveType);
    } else {
      notify.error("Error loading leave type details");
    }
  } catch (error) {
    console.error("Error:", error);
    notify.error("Error loading leave type details");
  }
}

function showLeaveTypeDetailsModal(leaveType) {
  const allocationsHTML =
    leaveType.allocations && leaveType.allocations.length > 0
      ? `
      <table class="data-table" style="margin-top: 15px;">
        <thead>
          <tr>
            <th>Role</th>
            <th>Seniority Level</th>
            <th>Days Allocated</th>
          </tr>
        </thead>
        <tbody>
          ${leaveType.allocations
            .map(
              (alloc) => `
            <tr>
              <td style="text-transform: capitalize;">${alloc.role}</td>
              <td style="text-transform: capitalize;">${alloc.seniority}</td>
              <td><strong>${alloc.days} days</strong></td>
            </tr>
          `
            )
            .join("")}
        </tbody>
      </table>
    `
      : '<p style="color: #999; margin-top: 15px;">No allocations configured</p>';

  const modalHTML = `
    <div id="leaveTypeDetailsModal" class="modal" style="display: flex;">
      <div class="modal-content" style="max-width: 600px;">
        <div class="modal-header">
          <h3>${leaveType.type_name}</h3>
          <button class="modal-close" onclick="closeLeaveTypeDetailsModal()">&times;</button>
        </div>
        <div class="modal-body">
          <div style="margin-bottom: 20px;">
            <h4 style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Description</h4>
            <p>${leaveType.description || "No description provided"}</p>
          </div>
          
          <div>
            <h4 style="color: #6b7280; font-size: 14px; margin-bottom: 5px;">Leave Allocations</h4>
            ${allocationsHTML}
          </div>

          <div style="margin-top: 20px; padding-top: 15px; border-top: 1px solid #e5e7eb;">
            <button class="btn btn-secondary" onclick="closeLeaveTypeDetailsModal()">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  const existingModal = document.getElementById("leaveTypeDetailsModal");
  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML("beforeend", modalHTML);
}

function closeLeaveTypeDetailsModal() {
  const modal = document.getElementById("leaveTypeDetailsModal");
  if (modal) {
    modal.remove();
  }
}

async function deleteLeaveType(id, name) {
  const confirmed = await notify.confirm(
    `Are you sure you want to delete "${name}"? This will remove all associated leave balances and allocations.`,
    "Delete Leave Type"
  );

  if (!confirmed) return;

  try {
    const response = await fetch(`/admin/leave-types/${id}`, {
      method: "DELETE",
    });

    const result = await response.json();

    if (result.success) {
      notify.success("Leave type deleted successfully!");
      setTimeout(() => openManageLeaveTypesModal(), 1000);
    } else {
      notify.error(result.message || "Error deleting leave type");
    }
  } catch (error) {
    console.error("Error:", error);
    notify.error("Error deleting leave type. Please try again.");
  }
}

// ============================================
// ADMIN ACTIONS - UPDATE LEAVE STATUS
// ============================================

async function updateLeaveStatus(leaveId, status) {
  const action = status === "approved" ? "approve" : "reject";
  let remarks = null;

  if (status === "rejected") {
    remarks = await notify.prompt(
      "Please provide a reason for rejection:",
      "Reject Leave Request"
    );
    if (!remarks) return;
  } else {
    const confirmed = await notify.confirm(
      `Are you sure you want to ${action} this leave request? The employee will be notified via email.`,
      `${action.charAt(0).toUpperCase() + action.slice(1)} Leave`
    );
    if (!confirmed) return;
  }

  try {
    const response = await fetch(`/admin/leaves/${leaveId}/status`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ status, remarks }),
    });

    const result = await response.json();

    if (result.success) {
      notify.success(
        `Leave request ${status} successfully! Employee has been notified via email.`
      );
      setTimeout(() => location.reload(), 1500);
    } else {
      notify.error(result.message || `Error ${action}ing leave request`);
    }
  } catch (error) {
    console.error("Error:", error);
    notify.error(`Error ${action}ing leave request. Please try again.`);
  }
}

// ============================================
// DOWNLOAD REPORTS
// ============================================

async function downloadReports() {
  try {
    const response = await fetch("/admin/download-reports");
    const result = await response.json();

    if (result.success) {
      const csv = convertToCSV(result.data);
      downloadCSV(csv, "leave_reports.csv");
    } else {
      alert("Error generating report");
    }
  } catch (error) {
    console.error("Error:", error);
    alert("Error downloading reports. Please try again.");
  }
}

function convertToCSV(data) {
  if (data.length === 0) return "";

  const headers = Object.keys(data[0]);
  const csvRows = [];

  csvRows.push(headers.join(","));

  for (const row of data) {
    const values = headers.map((header) => {
      const value = row[header];
      return `"${String(value).replace(/"/g, '""')}"`;
    });
    csvRows.push(values.join(","));
  }

  return csvRows.join("\n");
}

function downloadCSV(csv, filename) {
  const blob = new Blob([csv], { type: "text/csv" });
  const url = window.URL.createObjectURL(blob);
  const a = document.createElement("a");
  a.setAttribute("hidden", "");
  a.setAttribute("href", url);
  a.setAttribute("download", filename);
  document.body.appendChild(a);
  a.click();
  document.body.removeChild(a);
}

// ============================================
// DELETE EMPLOYEE (from manage_users.ejs page)
// ============================================

async function deleteEmployee(employeeId) {
  const confirmed = await notify.confirm(
    "Are you sure you want to delete this employee? This action cannot be undone.",
    "Delete Employee"
  );

  if (confirmed) {
    try {
      const response = await fetch(`/admin/users/${employeeId}`, {
        method: "DELETE",
      });

      const result = await response.json();

      if (result.success) {
        notify.success("Employee deleted successfully!");
        location.reload();
      } else {
        notify.error(result.message || "Error deleting employee");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error deleting employee. Please try again.");
    }
  }
}

// ============================================
// LOGOUT HANDLER
// ============================================

async function handleLogout() {
  const confirmed = await notify.confirm(
    "Are you sure you want to logout?",
    "Logout"
  );

  if (confirmed) {
    window.location.href = "/logout";
  }
}

// ============================================
// CLOSE MODALS ON OUTSIDE CLICK
// ============================================

window.onclick = function (event) {
  const addEmpModal = document.getElementById("addEmployeeModal");
  const editEmpModal = document.getElementById("editEmployeeModal");
  const leaveTypesModal = document.getElementById("leaveTypesModal");
  const manageEmployeesModal = document.getElementById("manageEmployeesModal");
  const dynamicEditModal = document.getElementById("dynamicEditEmployeeModal");
  const leaveTypeDetailsModal = document.getElementById(
    "leaveTypeDetailsModal"
  );

  if (event.target === addEmpModal) {
    closeAddEmployeeModal();
  }
  if (event.target === editEmpModal) {
    closeEditEmployeeModal();
  }
  if (event.target === leaveTypesModal) {
    closeLeaveTypesModal();
  }
  if (event.target === manageEmployeesModal) {
    closeManageEmployeesModal();
  }
  if (event.target === dynamicEditModal) {
    closeDynamicEditEmployeeModal();
  }
  if (event.target === leaveTypeDetailsModal) {
    closeLeaveTypeDetailsModal();
  }
};

document.getElementById("leaveType")?.addEventListener("change", function () {
  const selectedOption = this.options[this.selectedIndex];
  const typeId = parseInt(selectedOption.value);
  const balanceInfo = document.getElementById("leaveBalanceInfo");
  const availableDays = document.getElementById("availableDays");

  if (!typeId) {
    balanceInfo.style.display = "none";
    return;
  }

  // Find matching balance
  const balance = leaveBalances.find((b) => b.leave_type_id === typeId);
  const allocated = parseInt(selectedOption.dataset.allocated) || 0;
  const available = balance
    ? balance.total_leaves - balance.used_leaves
    : allocated;

  availableDays.textContent = available;
  balanceInfo.style.display = "block";

  // Color coding
  if (available === 0) {
    balanceInfo.style.background = "#fee2e2";
    balanceInfo.style.borderColor = "#ef4444";
    availableDays.parentElement.style.color = "#991b1b";
  } else if (available <= 3) {
    balanceInfo.style.background = "#fef3c7";
    balanceInfo.style.borderColor = "#f59e0b";
    availableDays.parentElement.style.color = "#92400e";
  } else {
    balanceInfo.style.background = "#f0f9ff";
    balanceInfo.style.borderColor = "#3b82f6";
    availableDays.parentElement.style.color = "#1e40af";
  }
});

// ============================================
// ADD THESE FUNCTIONS TO YOUR script.js
// Team Leave Reports with Pie Chart
// ============================================

// Global variable to store chart instance
let teamReportsChart = null;

// Function to open team reports modal
async function openTeamReportsModal(memberId = null) {
  try {
    // Fetch team leave statistics
    const url = memberId
      ? `/manager/team-stats?memberId=${memberId}`
      : "/manager/team-stats";

    const response = await fetch(url);
    const result = await response.json();

    if (result.success) {
      showTeamReportsModal(result.data, memberId);
    } else {
      notify.error("Error loading team statistics");
    }
  } catch (error) {
    console.error("Error:", error);
    notify.error("Error loading team reports. Please try again.");
  }
}

function showTeamReportsModal(data, memberId) {
  const member = memberId ? data.member : null;
  const stats = data.stats;

  const modalHTML = `
    <div id="teamReportsModal" class="modal" style="display: flex;">
      <div class="modal-content" style="max-width: 900px;">
        <div class="modal-header">
          <h3>
            ${
              member ? `Leave Report - ${member.name}` : "Team Leave Statistics"
            }
          </h3>
          <button class="modal-close" onclick="closeTeamReportsModal()">&times;</button>
        </div>
        <div class="modal-body" style="padding: 30px;">
          
          <!-- Summary Cards -->
          <div style="display: grid; grid-template-columns: repeat(auto-fit, minmax(200px, 1fr)); gap: 20px; margin-bottom: 30px;">
            <div style="background: linear-gradient(135deg, #667eea 0%, #764ba2 100%); padding: 20px; border-radius: 10px; color: white;">
              <div style="font-size: 14px; opacity: 0.9;">Total Leave Days</div>
              <div style="font-size: 32px; font-weight: bold; margin-top: 5px;">${
                stats.totalLeaves || 0
              }</div>
            </div>
            <div style="background: linear-gradient(135deg, #f093fb 0%, #f5576c 100%); padding: 20px; border-radius: 10px; color: white;">
              <div style="font-size: 14px; opacity: 0.9;">Approved Leaves</div>
              <div style="font-size: 32px; font-weight: bold; margin-top: 5px;">${
                stats.approvedLeaves || 0
              }</div>
            </div>
            <div style="background: linear-gradient(135deg, #4facfe 0%, #00f2fe 100%); padding: 20px; border-radius: 10px; color: white;">
              <div style="font-size: 14px; opacity: 0.9;">Pending Requests</div>
              <div style="font-size: 32px; font-weight: bold; margin-top: 5px;">${
                stats.pendingLeaves || 0
              }</div>
            </div>
            <div style="background: linear-gradient(135deg, #fa709a 0%, #fee140 100%); padding: 20px; border-radius: 10px; color: white;">
              <div style="font-size: 14px; opacity: 0.9;">Rejected Leaves</div>
              <div style="font-size: 32px; font-weight: bold; margin-top: 5px;">${
                stats.rejectedLeaves || 0
              }</div>
            </div>
          </div>

          <!-- Charts Row -->
          <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 30px; margin-bottom: 30px;">
            
            <!-- Leave Status Pie Chart -->
            <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h4 style="margin: 0 0 20px 0; color: #374151;">Leave Status Distribution</h4>
              <canvas id="statusChart" width="250" height="250"></canvas>
            </div>

            <!-- Leave Types Pie Chart -->
            <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h4 style="margin: 0 0 20px 0; color: #374151;">Leave Types Breakdown</h4>
              <canvas id="typesChart" width="250" height="250"></canvas>
            </div>
          </div>

          <!-- Recent Leave History -->
          ${
            stats.recentLeaves && stats.recentLeaves.length > 0
              ? `
            <div style="background: white; padding: 20px; border-radius: 10px; box-shadow: 0 2px 8px rgba(0,0,0,0.1);">
              <h4 style="margin: 0 0 15px 0; color: #374151;">Recent Leave Applications</h4>
              <div style="max-height: 300px; overflow-y: auto;">
                <table class="data-table" style="margin: 0;">
                  <thead>
                    <tr>
                      <th>Date</th>
                      <th>Leave Type</th>
                      <th>Duration</th>
                      <th>Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    ${stats.recentLeaves
                      .map(
                        (leave) => `
                      <tr>
                        <td>${new Date(
                          leave.start_date
                        ).toLocaleDateString()} - ${new Date(
                          leave.end_date
                        ).toLocaleDateString()}</td>
                        <td>${leave.leave_type}</td>
                        <td>${leave.days} day(s)</td>
                        <td>
                          <span class="status-badge status-${leave.status.toLowerCase()}">
                            ${leave.status}
                          </span>
                        </td>
                      </tr>
                    `
                      )
                      .join("")}
                  </tbody>
                </table>
              </div>
            </div>
          `
              : ""
          }

          <!-- Close Button -->
          <div style="margin-top: 20px; text-align: right;">
            <button class="btn btn-secondary" onclick="closeTeamReportsModal()">Close</button>
          </div>
        </div>
      </div>
    </div>
  `;

  // Remove existing modal if any
  const existingModal = document.getElementById("teamReportsModal");
  if (existingModal) {
    existingModal.remove();
  }

  document.body.insertAdjacentHTML("beforeend", modalHTML);

  // Initialize charts after modal is added to DOM
  setTimeout(() => {
    initializeTeamCharts(stats);
  }, 100);
}

function initializeTeamCharts(stats) {
  // Destroy existing chart if any
  if (teamReportsChart) {
    teamReportsChart.destroy();
  }

  // Status Chart
  const statusCtx = document.getElementById("statusChart");
  if (statusCtx) {
    new Chart(statusCtx, {
      type: "doughnut",
      data: {
        labels: ["Approved", "Pending", "Rejected"],
        datasets: [
          {
            data: [
              stats.approvedLeaves || 0,
              stats.pendingLeaves || 0,
              stats.rejectedLeaves || 0,
            ],
            backgroundColor: [
              "#10b981", // Green for approved
              "#f59e0b", // Orange for pending
              "#ef4444", // Red for rejected
            ],
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage =
                  total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }

  // Leave Types Chart
  const typesCtx = document.getElementById("typesChart");
  if (typesCtx && stats.leaveTypeBreakdown) {
    const labels = stats.leaveTypeBreakdown.map((item) => item.type_name);
    const data = stats.leaveTypeBreakdown.map((item) => item.count);

    new Chart(typesCtx, {
      type: "doughnut",
      data: {
        labels: labels,
        datasets: [
          {
            data: data,
            backgroundColor: [
              "#667eea",
              "#764ba2",
              "#f093fb",
              "#f5576c",
              "#4facfe",
              "#00f2fe",
              "#43e97b",
              "#38f9d7",
            ],
            borderWidth: 2,
            borderColor: "#fff",
          },
        ],
      },
      options: {
        responsive: true,
        maintainAspectRatio: true,
        plugins: {
          legend: {
            position: "bottom",
            labels: {
              padding: 15,
              font: {
                size: 12,
              },
            },
          },
          tooltip: {
            callbacks: {
              label: function (context) {
                const label = context.label || "";
                const value = context.parsed || 0;
                const total = context.dataset.data.reduce((a, b) => a + b, 0);
                const percentage =
                  total > 0 ? ((value / total) * 100).toFixed(1) : 0;
                return `${label}: ${value} (${percentage}%)`;
              },
            },
          },
        },
      },
    });
  }
}

function closeTeamReportsModal() {
  const modal = document.getElementById("teamReportsModal");
  if (modal) {
    // Destroy chart before removing modal
    if (teamReportsChart) {
      teamReportsChart.destroy();
      teamReportsChart = null;
    }
    modal.remove();
  }
}

// Add to window click handler
const originalWindowClickHandler = window.onclick;
window.onclick = function (event) {
  // Call original handler if exists
  if (originalWindowClickHandler) {
    originalWindowClickHandler(event);
  }

  // Handle team reports modal
  const teamReportsModal = document.getElementById("teamReportsModal");
  if (event.target === teamReportsModal) {
    closeTeamReportsModal();
  }
};
