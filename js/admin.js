// js/admin.js
// Admin dashboard: lists all faculty, departments, and events. Simple logout.
// Place inside js/ with supabaseClient.js

import { supabase } from "./supabaseClient.js";

const adminId = localStorage.getItem("admin_id");
if (!adminId) {
  try { window.location = "../index.html"; } catch (e) {}
}

let allEvents = [];
let allFlaggedEvents = [];

// --- NEW HELPER FUNCTION START ---
/**
 * Determines the academic year for a given date.
 * Academic year runs from June to May.
 * @param {string} dateString - The date of the event (e.g., "2024-07-15").
 * @returns {string} The academic year (e.g., "2024-2025").
 */
function getAcademicYear(dateString) {
    if (!dateString) return null;
    const date = new Date(dateString);
    const year = date.getFullYear();
    const month = date.getMonth(); // 0 for January, 5 for June

    // If the month is June or later, the academic year starts in the current year.
    if (month >= 5) {
        return `${year}-${year + 1}`;
    } 
    // Otherwise, the academic year started in the previous year.
    else {
        return `${year - 1}-${year}`;
    }
}
// --- NEW HELPER FUNCTION END ---

// Load faculty list
async function loadFaculty() {
  const tableBody = document.querySelector("#faculty-table tbody");
  if (!tableBody) return;
  tableBody.innerHTML = "<tr><td colspan='8'>Loading faculty...</td></tr>";

  const { data, error } = await supabase.from("faculty").select("id, name, faculty_id, school, department, mobile, gender, email").order("name", { ascending: true }).limit(200);
  if (error) {
    tableBody.innerHTML = `<tr><td colspan='8'>Error: ${error.message}</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  if (!data || data.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='8'>No faculty found.</td></tr>";
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
      <td><button class="btn btn-secondary btn-edit" data-id="${f.id}" data-type="faculty">Edit</button></td>
    `;
    tableBody.appendChild(row);
  });
}

// Load departments
async function loadDepartments() {
  const tableBody = document.querySelector("#department-table tbody");
  if (!tableBody) return;
  tableBody.innerHTML = "<tr><td colspan='6'>Loading departments...</td></tr>";

  const { data, error } = await supabase.from("departments").select("id, name, department_id, school, head_name, email").order("name", { ascending: true }).limit(200);
  if (error) {
    tableBody.innerHTML = `<tr><td colspan='6'>Error: ${error.message}</td></tr>`;
    return;
  }

  tableBody.innerHTML = "";
  if (!data || data.length === 0) {
    tableBody.innerHTML = "<tr><td colspan='6'>No departments found.</td></tr>";
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
      <td><button class="btn btn-secondary btn-edit" data-id="${d.id}" data-type="department">Edit</button></td>
    `;
    tableBody.appendChild(row);
  });
}

// -----------------------------
// Load and Combine All Events
// -----------------------------
async function loadEvents() {
  const tableBody = document.getElementById("all-events-table-body");
  if (!tableBody) return;

  tableBody.innerHTML = "<tr><td colspan='12'>Loading all events...</td></tr>";

  // Fetch flagged event IDs to exclude them from the main list
  const { data: flaggedIdsData, error: flaggedIdsError } = await supabase
    .from("flagged_events")
    .select("event_id");

  if (flaggedIdsError) {
    console.error("Error fetching flagged events:", flaggedIdsError);
    return;
  }
  const flaggedIds = new Set(flaggedIdsData.map(item => item.event_id));

  const [fe, de] = await Promise.all([
    supabase.from("faculty_events").select("*, faculty:faculty_id(faculty_id, name, email)").order("created_at", { ascending: false }).limit(200),
    supabase.from("department_events").select("*, department:department_id(name, email)").order("created_at", { ascending: false }).limit(200)
  ]);

  const feData = fe.data || [];
  const feErr = fe.error;
  const deData = de.data || [];
  const deErr = de.error;

  if (feErr || deErr) {
    console.error("Error fetching events:", feErr || deErr);
    tableBody.innerHTML = `<tr><td colspan='12'>Error loading events.</td></tr>`;
    return;
  }

  allEvents = [];
  feData.forEach(ev => {
    // Only add if not flagged
    if (!flaggedIds.has(ev.id.toString())) {
      allEvents.push({
        ...ev,
        eventSource: "Faculty",
        sourceName: ev.faculty ? ev.faculty.name : "N/A",
        sourceEmail: ev.faculty ? ev.faculty.email : "N/A"
      });
    }
  });
  deData.forEach(ev => {
    // Only add if not flagged
    if (!flaggedIds.has(ev.id.toString())) {
      allEvents.push({
        ...ev,
        eventSource: "Department",
        sourceName: ev.department ? ev.department.name : "N/A",
        sourceEmail: ev.department ? ev.department.email : "N/A",
        event_role: "Organized"
      });
    }
  });

  allEvents.sort((a, b) => new Date(b.from_date) - new Date(a.from_date));
  
  // --- NEW CHANGE: Populate the new filter ---
  populateAcademicYearFilter();

  filterAndRenderEvents();

  document.getElementById("type-filter").addEventListener("change", filterAndRenderEvents);
  document.getElementById("days-filter").addEventListener("change", filterAndRenderEvents);
  document.getElementById("role-filter").addEventListener("change", filterAndRenderEvents);
  document.getElementById("from-date-filter").addEventListener("change", filterAndRenderEvents);
  document.getElementById("to-date-filter").addEventListener("change", filterAndRenderEvents);
  // --- NEW CHANGE: Add event listener for the new filter ---
  document.getElementById("academic-year-filter").addEventListener("change", filterAndRenderEvents);
}

// -----------------------------
// Load Flagged Events
// -----------------------------
async function loadFlaggedEvents() {
    const tableBody = document.getElementById("flagged-events-table-body");
    if (!tableBody) return;
    tableBody.innerHTML = "<tr><td colspan='8'>Loading flagged events...</td></tr>";

    const { data, error } = await supabase.from("flagged_events").select("*").order("created_at", { ascending: false });
    
    if (error) {
        console.error("Error fetching flagged events:", error);
        tableBody.innerHTML = `<tr><td colspan='8'>Error loading flagged events.</td></tr>`;
        return;
    }

    allFlaggedEvents = data || [];
    renderFlaggedEventsTable(allFlaggedEvents);
}

// -----------------------------
// Render Flagged Events to Table
// -----------------------------
function renderFlaggedEventsTable(events) {
    const tableBody = document.getElementById("flagged-events-table-body");
    tableBody.innerHTML = "";
    if (events.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='8'>No flagged events found.</td></tr>";
        return;
    }

    events.forEach(event => {
        const row = document.createElement("tr");
        
        let statusBadge = 'No Request';
        let actions = `<button class="btn btn-secondary delete-flagged-btn" data-id="${event.id}">Delete</button>`;
        
        if (event.unflag_requested) {
            statusBadge = `<span class="unflag-requested-badge">Requested</span>`;
            actions = `
                <button class="btn btn-primary unflag-btn" data-id="${event.id}" data-event-id="${event.event_id}" data-source-table="${event.event_source_table}">Unflag</button>
                <button class="btn btn-secondary delete-flagged-btn" data-id="${event.id}">Delete</button>
            `;
        }

        row.innerHTML = `
            <td>${event.title || "N/A"}</td>
            <td>${event.event_source_table || "N/A"}</td>
            <td>${event.admin_comment || "N/A"}</td>
            <td>${event.owner_comment || "N/A"}</td>
            <td>${statusBadge}</td>
            <td>${event.created_at ? new Date(event.created_at).toLocaleDateString() : "N/A"}</td>
            <td>${actions}</td>
        `;
        tableBody.appendChild(row);
    });
}


// --- NEW FUNCTION TO POPULATE THE DROPDOWN ---
function populateAcademicYearFilter() {
    const academicYearFilter = document.getElementById("academic-year-filter");
    // Use a Set to get unique academic years
    const academicYears = new Set(allEvents.map(event => getAcademicYear(event.from_date)).filter(year => year));

    // Convert Set to array, sort descending, and add to dropdown
    [...academicYears].sort().reverse().forEach(year => {
        const option = document.createElement("option");
        option.value = year;
        option.textContent = year;
        academicYearFilter.appendChild(option);
    });
}

// -----------------------------
// Filter and Render Events (UPDATED)
// -----------------------------
function filterAndRenderEvents() {
    const typeFilter = document.getElementById("type-filter").value;
    const daysFilter = document.getElementById("days-filter").value;
    const roleFilter = document.getElementById("role-filter").value;
    const fromDate = document.getElementById("from-date-filter").value;
    const toDate = document.getElementById("to-date-filter").value;
    // --- NEW CHANGE: Get the value from the new filter ---
    const academicYearFilter = document.getElementById("academic-year-filter").value;

    const filteredEvents = allEvents.filter(event => {
        const numDays = calculateDays(event.from_date, event.to_date);

        const matchesType = !typeFilter || event.type === typeFilter;
        const matchesRole = !roleFilter || event.event_role === roleFilter;
        const matchesDates = (!fromDate || (event.from_date && event.from_date >= fromDate)) && (!toDate || (event.to_date && event.to_date <= toDate));
        
        // --- NEW CHANGE: Add the academic year condition ---
        const eventAcademicYear = getAcademicYear(event.from_date);
        const matchesAcademicYear = !academicYearFilter || eventAcademicYear === academicYearFilter;

        let matchesDays = true;
        if (daysFilter) {
            if (daysFilter === "1") {
                matchesDays = numDays === 1;
            } else if (daysFilter === "2-7") {
                matchesDays = numDays >= 2 && numDays <= 7;
            } else if (daysFilter === "8-30") {
                matchesDays = numDays >= 8 && numDays <= 30;
            } else if (daysFilter === "31+") {
                matchesDays = numDays > 30;
            }
        }
        // --- NEW CHANGE: Include the academic year match in the final check ---
        return matchesType && matchesRole && matchesDates && matchesDays && matchesAcademicYear;
    });

    renderEventsTable(filteredEvents);
}

// -----------------------------
// Render Events to Table
// -----------------------------
function renderEventsTable(events) {
    const tableBody = document.getElementById("all-events-table-body");
    tableBody.innerHTML = "";
    if (events.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='12'>No events found matching your criteria.</td></tr>";
        return;
    }

    events.forEach(event => {
        const row = document.createElement("tr");
        const numDays = calculateDays(event.from_date, event.to_date);

        const participantsText = (event.event_role === 'Attended') ? '-' : event.participants || 'N/A';
        const attachmentsCell = event.attachments
            ? `<td><button class="btn btn-secondary view-link-btn" data-url="${event.attachments.replace(/[{}]/g, '')}">View</button></td>`
            : `<td>N/A</td>`;
        
        row.innerHTML = `
            <td>${event.title || "N/A"}</td>
            <td>${event.type || "N/A"}</td>
            <td>${event.from_date || "N/A"}</td>
            <td>${event.to_date || "N/A"}</td>
            <td>${numDays}</td>
            <td>${participantsText}</td>
            <td>${event.event_role || "N/A"}</td>
            <td>${event.location || "N/A"}</td>
            ${attachmentsCell}
            <td>${event.eventSource} Event</td>
            <td>${event.sourceName}</td>
            <td>
                <button class="btn btn-secondary flag-btn" data-id="${event.id}" data-type="${event.eventSource}" data-email="${event.sourceEmail}">Flag</button>
                <button class="btn btn-secondary delete-btn" data-id="${event.id}" data-type="${event.eventSource}" data-email="${event.sourceEmail}">Delete</button>
            </td>
        `;
        tableBody.appendChild(row);
    });
}

// Helper function to calculate number of days
function calculateDays(fromDate, toDate) {
    if (!fromDate || !toDate) return 'N/A';
    const oneDay = 24 * 60 * 60 * 1000;
    const from = new Date(fromDate);
    const to = new Date(toDate);
    const diffDays = Math.round(Math.abs((to - from) / oneDay)) + 1;
    return diffDays;
}

// -----------------------------
// Excel Export
// -----------------------------
document.getElementById('export-excel-btn').addEventListener('click', () => {
    exportToExcel('all-events-table', 'all_events');
});

function exportToExcel(tableID, filename = 'data') {
  const table = document.getElementById(tableID);
  if (!table) {
      alert("Table not found!");
      return;
  }
  
  const tempTable = table.cloneNode(true);
  
  const headers = tempTable.querySelectorAll('thead th');
  const actionsHeaderIndex = Array.from(headers).findIndex(th => th.textContent.trim() === 'Actions');
  if (actionsHeaderIndex !== -1) {
      headers[actionsHeaderIndex].remove();
      tempTable.querySelectorAll('tbody tr').forEach(row => {
          row.cells[actionsHeaderIndex].remove();
      });
  }

  tempTable.querySelectorAll('tbody tr').forEach(row => {
      const linkCell = row.querySelector('.view-link-btn');
      if (linkCell) {
          const url = linkCell.dataset.url;
          const newCell = document.createElement('td');
          newCell.textContent = url;
          linkCell.parentNode.replaceWith(newCell);
      }
  });

  const ws = XLSX.utils.table_to_sheet(tempTable);
  const wb = XLSX.utils.book_new();
  XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
  XLSX.writeFile(wb, `${filename}.xlsx`);
}

// -----------------------------
// Flag Event Functionality
// -----------------------------
async function flagEvent(eventId, eventSource, sourceEmail) {
    const comment = prompt("Please enter a comment for flagging this event:");
    if (!comment) return;

    const table = eventSource === 'Faculty' ? 'faculty_events' : 'department_events';

    const { data: eventToFlag, error: fetchError } = await supabase
        .from(table)
        .select('*')
        .eq('id', eventId)
        .single();

    if (fetchError || !eventToFlag) {
        console.error("Error fetching event to flag:", fetchError);
        alert("Failed to flag event: Could not retrieve original data.");
        return;
    }

    const flaggedEventData = {
        ...eventToFlag,
        event_id: eventToFlag.id,
        event_source_table: table,
        admin_comment: comment,
        faculty_or_dept_email: sourceEmail
    };
    
    delete flaggedEventData.id;
    delete flaggedEventData.is_flagged;
    
    const { error: insertError } = await supabase.from('flagged_events').insert(flaggedEventData);

    if (insertError) {
        console.error("Error inserting into flagged events:", insertError);
        alert("Failed to flag event: " + insertError.message);
        return;
    }

    const { error: deleteError } = await supabase.from(table).delete().eq('id', eventId);
    
    if (deleteError) {
        console.error("Error deleting original event:", deleteError);
        alert("Event flagged, but failed to remove from original list. Please resolve manually.");
    } else {
        alert("Event flagged successfully and moved to the flagged list!");
        loadEvents();
        loadFlaggedEvents();
    }
}


// -----------------------------
// Unflag Event Functionality
// -----------------------------
async function unflagEvent(flaggedEventId, originalEventId, sourceTable) {
    if (!confirm("Are you sure you want to unflag this event? It will be restored to the main list.")) {
        return;
    }

    const { data: flaggedData, error: fetchError } = await supabase
        .from('flagged_events')
        .select('*')
        .eq('id', flaggedEventId)
        .single();

    if (fetchError || !flaggedData) {
        alert("Failed to unflag: Could not retrieve flagged event data.");
        console.error("Unflag fetch error:", fetchError);
        return;
    }

    let restoredEventData = {};

    if (sourceTable === 'faculty_events') {
        restoredEventData = {
            id: flaggedData.event_id,
            faculty_id: flaggedData.faculty_id,
            event_role: flaggedData.event_role,
            type: flaggedData.type,
            title: flaggedData.title,
            from_date: flaggedData.from_date,
            to_date: flaggedData.to_date,
            participants: flaggedData.participants,
            remarks: flaggedData.remarks,
            location: flaggedData.location,
            attachments: flaggedData.attachments
        };
    } else if (sourceTable === 'department_events') {
        restoredEventData = {
            id: flaggedData.event_id,
            department_id: flaggedData.department_id,
            title: flaggedData.title,
            type: flaggedData.type,
            coordinator_name: flaggedData.coordinator_name,
            from_date: flaggedData.from_date,
            to_date: flaggedData.to_date,
            participants: flaggedData.participants,
            location: flaggedData.location,
            output: flaggedData.output,
            attachments: flaggedData.attachments,
            certificate_link: flaggedData.certificate_link
        };
    } else {
        alert("Unknown source table. Cannot restore event.");
        return;
    }

    const { error: upsertError } = await supabase.from(sourceTable).upsert(restoredEventData);

    if (upsertError) {
        console.error("Error restoring event to original table:", upsertError);
        alert("Failed to restore event: " + upsertError.message);
        return;
    }

    const { error: deleteError } = await supabase.from('flagged_events').delete().eq('id', flaggedEventId);
    
    if (deleteError) {
        alert("Event restored, but failed to remove from flagged list. Please delete it manually.");
    } else {
        alert("Event has been unflagged and restored successfully!");
    }

    loadFlaggedEvents();
    loadEvents();
}


// -----------------------------
// Delete Event Functionality
// -----------------------------
async function deleteEvent(eventId, eventSource, sourceEmail) {
    if (!confirm("Are you sure you want to delete this event? This action cannot be undone.")) {
        return;
    }

    const table = eventSource === 'Faculty' ? 'faculty_events' : 'department_events';

    const { error } = await supabase.from(table).delete().eq('id', eventId);
    
    if (error) {
        alert("Failed to delete event: " + error.message);
    } else {
        alert("Event deleted successfully!");
        loadEvents();
    }
}

// -----------------------------
// Delete Flagged Event Functionality
// -----------------------------
async function deleteFlaggedEvent(flagId) {
    if (!confirm("Are you sure you want to delete this flagged event? This will be permanently removed.")) {
        return;
    }

    const { error } = await supabase.from('flagged_events').delete().eq('id', flagId);
    
    if (error) {
        alert("Failed to delete flagged event: " + error.message);
    } else {
        alert("Flagged event deleted successfully!");
        loadFlaggedEvents();
    }
}

// -----------------------------
// Admin Logout
// -----------------------------
const logoutBtn = document.getElementById("logout");
if (logoutBtn) {
  logoutBtn.addEventListener("click", () => {
    localStorage.removeItem("admin_id");
    localStorage.removeItem("admin_name");
    window.location = "../index.html";
  });
}

// -----------------------------
// Sidebar Navigation
// -----------------------------
const sections = {
  'view-faculty': 'faculty-section',
  'add-faculty-btn': 'add-faculty-section',
  'view-department': 'department-section',
  'add-department-btn': 'add-department-section',
  'view-events': 'events-section',
  'view-flagged-btn': 'flagged-events-section'
};

function showSection(sectionId) {
    document.querySelectorAll('.data-section').forEach(section => {
        section.classList.add('hidden');
    });
    document.getElementById(sectionId).classList.remove('hidden');

    document.querySelectorAll('.sidebar ul li a').forEach(link => link.classList.remove('active'));
    for (const [key, value] of Object.entries(sections)) {
        if (value === sectionId) {
            const link = document.getElementById(key);
            if (link && link.tagName === 'A') {
                link.classList.add('active');
            }
        }
    }

    if (sectionId === 'flagged-events-section') {
        loadFlaggedEvents();
    }
}

// Global click listener for buttons and navigation
document.addEventListener('click', (e) => {
    if (e.target.classList.contains('flag-btn')) {
        const id = e.target.dataset.id;
        const source = e.target.dataset.type;
        const email = e.target.dataset.email;
        flagEvent(id, source, email);
    } else if (e.target.classList.contains('delete-btn')) {
        const id = e.target.dataset.id;
        const source = e.target.dataset.type;
        const email = e.target.dataset.email;
        deleteEvent(id, source, email);
    } else if (e.target.classList.contains('delete-flagged-btn')) {
        const id = e.target.dataset.id;
        deleteFlaggedEvent(id);
    } else if (e.target.classList.contains('unflag-btn')) {
        const id = e.target.dataset.id;
        const eventId = e.target.dataset.eventId;
        const sourceTable = e.target.dataset.sourceTable;
        unflagEvent(id, eventId, sourceTable);
    } else if (e.target.classList.contains('view-link-btn')) {
        const url = e.target.dataset.url;
        if (url) {
            window.open(url, '_blank').focus();
        }
    }
    
    const sectionId = sections[e.target.id];
    if (sectionId) {
        e.preventDefault();
        showSection(sectionId);
    }
});


// Set initial active link and load initial content
document.getElementById('view-faculty').classList.add('active');
loadFaculty();
loadDepartments();
loadEvents();