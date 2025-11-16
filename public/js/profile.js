// Handle employee profile update
async function handleEmployeeUpdateProfile(event) {
  event.preventDefault();
  clearAllErrors();

  const formData = new FormData(event.target);
  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    department: formData.get("department"),
    designation: formData.get("designation"),
  };

  let isValid = true;

  if (!data.name) {
    showError("profileNameError", "Name is required");
    isValid = false;
  }

  if (!data.email) {
    showError("profileEmailError", "Email is required");
    isValid = false;
  } else if (!isValidEmail(data.email)) {
    showError("profileEmailError", "Please enter a valid email");
    isValid = false;
  }

  if (isValid) {
    try {
      const response = await fetch("/employee/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        notify.success("Profile updated successfully!");
        setTimeout(() => {
          location.reload();
        }, 1000);
      } else {
        notify.error(result.message || "Error updating profile");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error updating profile. Please try again.");
    }
  }
}

// Handle Employee password change
async function handleEmployeeChangePassword(event) {
  event.preventDefault();
  clearAllErrors();

  const formData = new FormData(event.target);
  const data = {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  };

  let isValid = true;

  if (!data.currentPassword) {
    showError("currentPasswordError", "Current password is required");
    isValid = false;
  }

  if (!data.newPassword) {
    showError("newPasswordError", "New password is required");
    isValid = false;
  } else if (data.newPassword.length < 6) {
    showError("newPasswordError", "Password must be at least 6 characters");
    isValid = false;
  }

  if (!data.confirmPassword) {
    showError("confirmPasswordError", "Please confirm your new password");
    isValid = false;
  } else if (data.newPassword !== data.confirmPassword) {
    showError("confirmPasswordError", "Passwords do not match");
    isValid = false;
  }

  if (isValid) {
    try {
      const response = await fetch("/employee/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        notify.success("Password changed successfully!");
        document.getElementById("passwordForm").reset();
      } else {
        notify.error(result.message || "Error changing password");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error changing password. Please try again.");
    }
  }
}

// Handle employee profile update
async function handleManagerUpdateProfile(event) {
  event.preventDefault();
  clearAllErrors();

  const formData = new FormData(event.target);
  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    department: formData.get("department"),
    designation: formData.get("designation"),
  };

  let isValid = true;

  if (!data.name) {
    showError("profileNameError", "Name is required");
    isValid = false;
  }

  if (!data.email) {
    showError("profileEmailError", "Email is required");
    isValid = false;
  } else if (!isValidEmail(data.email)) {
    showError("profileEmailError", "Please enter a valid email");
    isValid = false;
  }

  if (isValid) {
    try {
      const response = await fetch("/manager/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        notify.success("Profile updated successfully!");
        setTimeout(() => {
          location.reload();
        }, 1000);
      } else {
        notify.error(result.message || "Error updating profile");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error updating profile. Please try again.");
    }
  }
}

// Handle Employee password change
async function handleManagerChangePassword(event) {
  event.preventDefault();
  clearAllErrors();

  const formData = new FormData(event.target);
  const data = {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  };

  let isValid = true;

  if (!data.currentPassword) {
    showError("currentPasswordError", "Current password is required");
    isValid = false;
  }

  if (!data.newPassword) {
    showError("newPasswordError", "New password is required");
    isValid = false;
  } else if (data.newPassword.length < 6) {
    showError("newPasswordError", "Password must be at least 6 characters");
    isValid = false;
  }

  if (!data.confirmPassword) {
    showError("confirmPasswordError", "Please confirm your new password");
    isValid = false;
  } else if (data.newPassword !== data.confirmPassword) {
    showError("confirmPasswordError", "Passwords do not match");
    isValid = false;
  }

  if (isValid) {
    try {
      const response = await fetch("/manager/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        notify.success("Password changed successfully!");
        document.getElementById("passwordForm").reset();
      } else {
        notify.error(result.message || "Error changing password");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error changing password. Please try again.");
    }
  }
}

// Handle employee profile update
async function handleAdminUpdateProfile(event) {
  event.preventDefault();
  clearAllErrors();

  const formData = new FormData(event.target);
  const data = {
    name: formData.get("name"),
    email: formData.get("email"),
    department: formData.get("department"),
    designation: formData.get("designation"),
  };

  let isValid = true;

  if (!data.name) {
    showError("profileNameError", "Name is required");
    isValid = false;
  }

  if (!data.email) {
    showError("profileEmailError", "Email is required");
    isValid = false;
  } else if (!isValidEmail(data.email)) {
    showError("profileEmailError", "Please enter a valid email");
    isValid = false;
  }

  if (isValid) {
    try {
      const response = await fetch("/admin/profile/update", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        notify.success("Profile updated successfully!");
        setTimeout(() => {
          location.reload();
        }, 2000);
      } else {
        notify.error(result.message || "Error updating profile");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error updating profile. Please try again.");
    }
  }
}

// Handle Employee password change
async function handleAdminChangePassword(event) {
  event.preventDefault();
  clearAllErrors();

  const formData = new FormData(event.target);
  const data = {
    currentPassword: formData.get("currentPassword"),
    newPassword: formData.get("newPassword"),
    confirmPassword: formData.get("confirmPassword"),
  };

  let isValid = true;

  if (!data.currentPassword) {
    showError("currentPasswordError", "Current password is required");
    isValid = false;
  }

  if (!data.newPassword) {
    showError("newPasswordError", "New password is required");
    isValid = false;
  } else if (data.newPassword.length < 6) {
    showError("newPasswordError", "Password must be at least 6 characters");
    isValid = false;
  }

  if (!data.confirmPassword) {
    showError("confirmPasswordError", "Please confirm your new password");
    isValid = false;
  } else if (data.newPassword !== data.confirmPassword) {
    showError("confirmPasswordError", "Passwords do not match");
    isValid = false;
  }

  if (isValid) {
    try {
      const response = await fetch("/admin/profile/change-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(data),
      });

      const result = await response.json();

      if (result.success) {
        notify.success("Password changed successfully!");
        document.getElementById("passwordForm").reset();
      } else {
        notify.error(result.message || "Error changing password");
      }
    } catch (error) {
      console.error("Error:", error);
      notify.error("Error changing password. Please try again.");
    }
  }
}
