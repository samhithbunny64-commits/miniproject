// js/auth.js
// Handles faculty signup/login, department login, admin login.
// Place this file inside js/ (same folder as supabaseClient.js)

import { supabase } from "./supabaseClient.js";

/*
Expected simple HTML elements (common IDs used across your pages):
- Faculty signup form (id: faculty-signup-form) OR fields with ids:
  faculty-signup-id, faculty-signup-name, faculty-signup-email, faculty-signup-password, faculty-signup-department, faculty-signup-mobile, faculty-signup-gender, faculty-signup-profile (file)
- Faculty login form (id: faculty-login-form) OR fields: faculty-id, faculty-password
- Department login form (id: department-login-form) OR fields: department-email, department-pin
- Admin login form (id: admin-login-form) OR fields: admin-username, admin-password
This script attempts to attach to forms if they exist. If your HTML uses different IDs, change them or adjust HTML to match.
*/

// -----------------------------
// Utility helpers
// -----------------------------
function qs(id) {
  return document.getElementById(id);
}
function safeText(el) {
  return el ? el.value.trim() : "";
}

// -----------------------------
// Form Toggling Logic
// -----------------------------
const facultyToggle = qs("faculty-toggle");
const deptToggle = qs("department-toggle");
const adminToggle = qs("admin-toggle");

const facultyLoginForm = qs("faculty-login-form");
const deptLoginForm = qs("department-login-form");
const adminLoginForm = qs("admin-login-form");
const signupForm = qs("signup-form");
const facultyForgotForm = qs("faculty-forgot-form");
const departmentForgotForm = qs("department-forgot-form");
const adminForgotForm = qs("admin-forgot-form");

function hideAllForms() {
  const forms = [
    facultyLoginForm,
    deptLoginForm,
    adminLoginForm,
    signupForm,
    facultyForgotForm,
    departmentForgotForm,
    adminForgotForm
  ];
  forms.forEach(form => {
    if (form) form.classList.add("hidden");
  });
  console.log('All forms hidden.');
}

function setActiveToggle(role) {
  const toggles = [facultyToggle, deptToggle, adminToggle];
  toggles.forEach(toggle => {
    if (toggle) toggle.classList.remove("active");
  });
  if (role === "faculty" && facultyToggle) facultyToggle.classList.add("active");
  if (role === "department" && deptToggle) deptToggle.classList.add("active");
  if (role === "admin" && adminToggle) adminToggle.classList.add("active");
  console.log(`Active toggle set to: ${role}`);
}

document.addEventListener('DOMContentLoaded', () => {
    if (facultyToggle) {
        facultyToggle.addEventListener("click", () => {
            hideAllForms();
            if (facultyLoginForm) facultyLoginForm.classList.remove("hidden");
            setActiveToggle("faculty");
        });
    }
    if (deptToggle) {
        deptToggle.addEventListener("click", () => {
            hideAllForms();
            if (deptLoginForm) deptLoginForm.classList.remove("hidden");
            setActiveToggle("department");
        });
    }
    if (adminToggle) {
        adminToggle.addEventListener("click", () => {
            hideAllForms();
            if (adminLoginForm) adminLoginForm.classList.remove("hidden");
            setActiveToggle("admin");
        });
    }

    // Show signup
    const showSignup = qs("show-signup");
    if (showSignup) {
        showSignup.addEventListener("click", (e) => {
            e.preventDefault();
            hideAllForms();
            if (signupForm) signupForm.classList.remove("hidden");
            setActiveToggle("faculty");
            console.log('Navigated to signup form.');
        });
    }

    // Show login from signup
    const showLogin = qs("show-login");
    if (showLogin) {
        showLogin.addEventListener("click", (e) => {
            e.preventDefault();
            hideAllForms();
            if (facultyLoginForm) facultyLoginForm.classList.remove("hidden");
            setActiveToggle("faculty");
            console.log('Navigated to login form.');
        });
    }
    
    // Show faculty login by default on page load
    hideAllForms();
    if (facultyLoginForm) facultyLoginForm.classList.remove('hidden');
    if (facultyToggle) facultyToggle.classList.add('active');

    // --- CORRECTED: Password toggle functionality for Font Awesome ---
    document.querySelectorAll('.toggle-password').forEach(toggle => {
      toggle.addEventListener('click', () => {
        const container = toggle.closest('.password-container');
    const passwordInput = container ? container.querySelector('input') : null;
    const icon = toggle.querySelector('i');
        const type = passwordInput.getAttribute('type') === 'password' ? 'text' : 'password';
        
        passwordInput.setAttribute('type', type);
        
        // Toggle the Font Awesome icon class
        if (type === 'password') {
          icon.classList.remove('fa-eye-slash');
          icon.classList.add('fa-eye');
        } else {
          icon.classList.remove('fa-eye');
          icon.classList.add('fa-eye-slash');
        }
      });
    });
});

// -----------------------------
// Faculty Signup
// -----------------------------
if (signupForm) {
  signupForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    // read fields (fallbacks)
    const faculty_id = safeText(qs("signup-facultyId"));
    const name = safeText(qs("signup-name"));
    const email = safeText(qs("signup-email"));
    const password = safeText(qs("signup-password"));
    const confirm = safeText(qs("signup-confirm"));
    const department = safeText(qs("signup-department"));
    const mobile = safeText(qs("signup-mobile"));
    const gender = safeText(qs("signup-gender"));
    const school = safeText(qs("signup-school"));
    const profileInput = qs("signup-profilePic");

    if (!faculty_id || !name || !email || !password || !confirm) {
        alert("Please fill all required fields.");
        return;
    }

    // --- GITAM Email Validation ---
    if (!email.toLowerCase().endsWith("@gitam.edu")) {
        alert("please enter your gitam faculty mail id");
        return; // Stop the submission
    }
    // --- END ---

    if (password !== confirm) {
        alert("Passwords do not match.");
        return;
    }

    let profileUrl = null;

    // Check for duplicate faculty_id or email
    const { data: existing, error: checkError } = await supabase
        .from("faculty")
        .select("id")
        .or(`faculty_id.eq.${faculty_id},email.eq.${email}`);

    if (checkError) {
        alert("Error checking for existing user: " + checkError.message);
        console.error("Error checking for existing user:", checkError);
        return;
    }

    if (existing && existing.length > 0) {
        alert("Faculty ID or Email already registered.");
        return;
    }

    // If profile picture provided, upload to 'profile-pics' bucket
    if (profileInput && profileInput.files && profileInput.files.length > 0) {
      const file = profileInput.files[0];
      const ext = file.name.split(".").pop();
      const fileName = `${faculty_id}_${Date.now()}.${ext}`;
      const { data: uploadData, error: uploadErr } = await supabase.storage
        .from("profile-pics")
        .upload(fileName, file, { cacheControl: "3600", upsert: false });

      if (uploadErr) {
        console.error("Profile upload error:", uploadErr);
        alert("Failed to upload profile picture: " + uploadErr.message);
        // continue without profile pic
      } else {
        const { data: urlData } = supabase.storage.from("profile-pics").getPublicUrl(uploadData.path);
        profileUrl = urlData.publicUrl;
      }
    }

    // Insert faculty row
    const { data, error } = await supabase.from("faculty").insert([
      {
        faculty_id,
        name,
        email,
        password,
        department,
        mobile,
        gender,
        school,
        profile_pic: profileUrl
      }
    ]).select().single();

    if (error) {
      console.error("Faculty signup error:", error);
      alert("Signup failed: " + error.message);
      return;
    }

    // create session
    // await supabase.from("sessions").insert([{ user_id: data.id, role: "faculty" }]);

    // Persist to localStorage for simple auth (testing)
    localStorage.setItem("faculty_id", data.faculty_id);
    localStorage.setItem("faculty_row_id", String(data.id));
    alert("Signup successful. Redirecting to dashboard.");
    window.location = "../faculty-dashboard.html";
  });
}

// -----------------------------
// Faculty Login
// -----------------------------
if (facultyLoginForm) {
  facultyLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const facultyId = safeText(qs("faculty-id"));
    const password = safeText(qs("faculty-password"));

    if (!facultyId || !password) {
      alert("Enter Faculty ID and password.");
      return;
    }

    const { data, error } = await supabase
      .from("faculty")
      .select("id, faculty_id, name, email, password")
      .eq("faculty_id", facultyId)
      .limit(1);

    if (error) {
      console.error("DB error:", error);
      alert("Database error: " + error.message);
      return;
    }

    if (!data || data.length === 0) {
      alert("Faculty ID not found.");
      return;
    }

    const faculty = data[0];
    if (faculty.password !== password) {
      alert("Invalid password.");
      return;
    }

    // create a session record (optional)
    // await supabase.from("sessions").insert([{ user_id: faculty.id, role: "faculty" }]);

    // Save to localStorage
    localStorage.setItem("faculty_id", faculty.faculty_id);
    localStorage.setItem("faculty_row_id", String(faculty.id));
    localStorage.setItem("faculty_name", faculty.name || "");
    alert("Login successful. Redirecting to faculty dashboard.");
    window.location = "../faculty-dashboard.html";
  });
}

// -----------------------------
// Department Login (simple email + pin)
// -----------------------------
if (deptLoginForm) {
  deptLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = safeText(qs("department-email"));
    const pin = safeText(qs("department-pin"));

    if (!email || !pin) {
      alert("Enter department email and pin.");
      return;
    }

    const { data, error } = await supabase
      .from("departments")
      .select("*")
      .eq("email", email)
      .limit(1);

    if (error) {
      console.error("Department login DB error", error);
      alert("Database error: " + error.message);
      return;
    }
    if (!data || data.length === 0) {
      alert("Department not found.");
      return;
    }

    const dept = data[0];
    if (dept.pin !== pin) {
      alert("Invalid PIN.");
      return;
    }

    // create session record
    // await supabase.from("sessions").insert([{ user_id: dept.id, role: "department" }]);

    // Save to localStorage
    localStorage.setItem("department_id", dept.department_id); // string like DEPT_CSE
    localStorage.setItem("department_row_id", String(dept.id));
    localStorage.setItem("department_name", dept.name || "");
    alert("Department login successful. Redirecting to department dashboard.");
    window.location = "../dept-dashboard.html";
  });
}

// -----------------------------
// Admin Login (single admin account)
// -----------------------------
if (adminLoginForm) {
  adminLoginForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const username = safeText(qs("admin-username"));
    const password = safeText(qs("admin-password"));

    if (!username || !password) {
      alert("Enter admin username and password.");
      return;
    }

    const { data, error } = await supabase
      .from("admin")
      .select("*")
      .eq("username", username)
      .limit(1);

    if (error) {
      console.error("Admin DB error:", error);
      alert("Database error: " + error.message);
      return;
    }
    if (!data || data.length === 0) {
      alert("Admin user not found.");
      return;
    }

    const admin = data[0];
    if (admin.password !== password) {
      alert("Invalid admin password.");
      return;
    }

    // Insert session
    // await supabase.from("sessions").insert([{ user_id: admin.id, role: "admin" }]);
    localStorage.setItem("admin_id", String(admin.id));
    localStorage.setItem("admin_name", admin.name || admin.username);
    alert("Admin login successful. Redirecting to admin dashboard.");
    window.location = "../admin-dashboard.html";
  });
}

// -----------------------------
// Optional: quick logout helpers (if you attach logout buttons that call these)
// -----------------------------
window.simpleLogout = function () {
  localStorage.removeItem("faculty_id");
  localStorage.removeItem("faculty_row_id");
  localStorage.removeItem("department_id");
  localStorage.removeItem("department_row_id");
  localStorage.removeItem("admin_id");
  window.location = "../index.html";
};