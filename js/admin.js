// js/admin.js
// Admin dashboard: lists all faculty, departments, and events. Simple logout.
// Place inside js/ with supabaseClient.js

import { supabase } from "./supabaseClient.js";

const adminId = localStorage.getItem("admin_id");
if (!adminId) {
  try { window.location = "../index.html"; } catch (e) {}
}

// Load faculty list
async function loadFaculty() {
  const tableBody = document.querySelector("#faculty-table tbody");
  if (!tableBody) return;
  tableBody.innerHTML = "<tr><td colspan='7'>Loading faculty...</td></tr>";

  const { data, error } = await supabase.from("faculty").select("name, faculty_id, school, department, mobile, gender, email").order("name", { ascending: true }).limit(200);
  if (error) {
    tableBody.innerHTML = `<tr><td colspan='7'>Error: ${error.message}</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  if (!data || data.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='7'>No faculty found.</td></tr>";
    return;
  }

  data.forEach(f => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${f.name || ""}</td>
      <td>${f.faculty_id || ""}</td>
      <td>${f.school || "N/A"}</td>
      <td>${f.department || "N/A"}</td>
      <td>${f.mobile || "N/A"}</td>
      <td>${f.gender || "N/A"}</td>
      <td>${f.email || ""}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Load departments
async function loadDepartments() {
  const tableBody = document.querySelector("#department-table tbody");
  if (!tableBody) return;
  tableBody.innerHTML = "<tr><td colspan='5'>Loading departments...</td></tr>";

  const { data, error } = await supabase.from("departments").select("name, department_id, school, head_name, email").order("name", { ascending: true }).limit(200);
  if (error) {
    tableBody.innerHTML = `<tr><td colspan='5'>Error: ${error.message}</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  if (!data || data.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='5'>No departments found.</td></tr>";
    return;
  }

  data.forEach(d => {
    const row = document.createElement("tr");
    row.innerHTML = `
      <td>${d.name || ""}</td>
      <td>${d.department_id || ""}</td>
      <td>${d.school || "N/A"}</td>
      <td>${d.head_name || "N/A"}</td>
      <td>${d.email || ""}</td>
    `;
    tableBody.appendChild(row);
  });
}

// Load events (both faculty_events and department_events)
async function loadEvents() {
  const facultyList = document.getElementById("faculty-events-list");
  const departmentList = document.getElementById("department-events-list");
  if (!facultyList || !departmentList) return;

  facultyList.innerHTML = "<li>Loading faculty events...</li>";
  departmentList.innerHTML = "<li>Loading department events...</li>";

  // Fetch both in parallel
  const [fe, de] = await Promise.all([
    supabase.from("faculty_events").select("*, faculty:faculty_id(faculty_id, name)").order("created_at", { ascending: false }).limit(200),
    supabase.from("department_events").select("*, department:department_id(name)").order("created_at", { ascending: false }).limit(200)
  ]);

  const feData = fe.data || [];
  const feErr = fe.error;
  const deData = de.data || [];
  const deErr = de.error;

  facultyList.innerHTML = "";
  if (feErr) {
    facultyList.innerHTML = `<li>Error: ${feErr.message}</li>`;
  } else if (feData.length) {
    feData.forEach(ev => {
      const li = document.createElement("li");
      const facultyText = ev.faculty ? `By: ${ev.faculty.name || ""} (${ev.faculty.faculty_id || ""})` : `Faculty ID: ${ev.faculty_id}`;
      li.textContent = `Title: ${ev.title} — ${facultyText} — Type: ${ev.type || "N/A"}`;
      facultyList.appendChild(li);
    });
  } else {
    facultyList.innerHTML = "<li>No faculty events found.</li>";
  }

  departmentList.innerHTML = "";
  if (deErr) {
    departmentList.innerHTML = `<li>Error: ${deErr.message}</li>`;
  } else if (deData.length) {
    deData.forEach(ev => {
      const li = document.createElement("li");
      const deptText = ev.department ? `By: ${ev.department.name || ""}` : `Dept ID: ${ev.department_id}`;
      li.textContent = `Title: ${ev.title} — ${deptText} — Type: ${ev.type || "N/A"}`;
      departmentList.appendChild(li);
    });
  } else {
    departmentList.innerHTML = "<li>No department events found.</li>";
  }
}

// Logout
const logoutBtn = document.getElementById("logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("admin_id");
    localStorage.removeItem("admin_name");
    window.location = "../index.html";
  });
}

// Sidebar Navigation
const sections = {
  'view-faculty': 'faculty-section',
  'view-department': 'department-section',
  'view-events': 'events-section'
};

document.querySelectorAll('.sidebar ul li a').forEach(link => {
  link.addEventListener('click', (e) => {
    const sectionId = sections[e.target.id];
    if (sectionId) {
      e.preventDefault();
      document.querySelectorAll('.data-section').forEach(section => {
        section.classList.add('hidden');
      });
      document.getElementById(sectionId).classList.remove('hidden');
      
      document.querySelectorAll('.sidebar ul li a').forEach(link => link.classList.remove('active'));
      e.target.classList.add('active');
    }
  });
});

// Set initial active link and load initial content
document.getElementById('view-faculty').classList.add('active');
loadFaculty();
loadDepartments();
loadEvents();