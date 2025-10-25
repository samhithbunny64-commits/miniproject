// js/department.js
// Department dashboard: load department info, add department events, list department events.
// Place inside js/ with supabaseClient.js

import { supabase } from "./supabaseClient.js";

let allEvents = [];
let departmentData;
let flaggedEvents = [];

// Wrap all logic in a window.onload listener to ensure the DOM is ready
window.onload = function() {
    console.log("DOM and script loaded.");

    const departmentRowId = localStorage.getItem("department_row_id");

    if (!departmentRowId) {
      console.error("No department ID found in localStorage. Redirecting to login.");
      try { window.location = "../index.html"; } catch (e) {}
    }
    // In department.js, within the window.onload function

document.addEventListener('click', (e) => {
    // Handle request unflag button click
    if (e.target.classList.contains('request-unflag-btn')) {
        const flaggedId = e.target.dataset.id;
        requestUnflag(flaggedId);
    }
});

    
    // -----------------------------
    // Load department profile
    // -----------------------------
    async function loadDepartmentInfo() {
      console.log("Loading department info...");
      const nameEl = document.getElementById("department-name-display");
      const emailEl = document.getElementById("department-email-display");
      const idEl = document.getElementById("department-id-display");
      const schoolEl = document.getElementById("department-school-display");
      const headEl = document.getElementById("department-head-display");

      if (!departmentRowId) {
        console.error("departmentRowId is not set. Cannot load info.");
        return;
      }
      
      const { data: deptData, error: deptErr } = await supabase
        .from("departments")
        .select("*, head_name, school")
        .eq("id", departmentRowId)
        .limit(1)
        .single();
      
      if (deptErr) {
        console.error("Dept load error:", deptErr);
        if (nameEl) nameEl.textContent = "Error loading department.";
        return;
      }

      departmentData = deptData;

      if (departmentData) {
        if (nameEl) nameEl.textContent = departmentData.name || "N/A";
        if (idEl) idEl.textContent = departmentData.department_id || "N/A";
        if (schoolEl) schoolEl.textContent = departmentData.school || "N/A";
        if (headEl) headEl.textContent = departmentData.head_name || "N/A";
        if (emailEl) emailEl.textContent = departmentData.email || "N/A";
      }

    }

    // -----------------------------
    // Add department-organized event (form id: add-organized-form)
    // -----------------------------
    const addOrganizedForm = document.getElementById("add-organized-form");
    if (addOrganizedForm) {
      addOrganizedForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        console.log("Add event form submitted.");
        const title = document.getElementById("organized-title") ? document.getElementById("organized-title").value.trim() : "";
        const type = document.getElementById("organized-type") ? document.getElementById("organized-type").value.trim() : "";
        const coordinatorName = document.getElementById("organized-coordinator-name") ? document.getElementById("organized-coordinator-name").value.trim() : "";
        const fromDate = document.getElementById("organized-from") ? document.getElementById("organized-from").value : null;
        const toDate = document.getElementById("organized-to") ? document.getElementById("organized-to").value : null;
        const participants = document.getElementById("organized-participants") ? parseInt(document.getElementById("organized-participants").value) || 0 : 0;
        const location = document.getElementById("organized-location") ? document.getElementById("organized-location").value.trim() : "";
        const output = document.getElementById("organized-output") ? document.getElementById("organized-output").value.trim() : "";
        const attachments = document.getElementById("organized-attachments") ? document.getElementById("organized-attachments").value.trim() : "";
        const certificateLink = document.getElementById("organized-certificate-link") ? document.getElementById("organized-certificate-link").value.trim() : "";

        if (!title || !location || !coordinatorName || !type) {
          alert("Event Title, Type, Coordinator Name, and Location are required.");
          return;
        }

        if (!attachments) {
            alert("A drive link for attachments is required.");
            return;
        }
        
        const { error: insertError } = await supabase.from("department_events").insert([
            { 
              department_id: departmentRowId, 
              title, 
              type, 
              coordinator_name: coordinatorName,
              from_date: fromDate, 
              to_date: toDate, 
              participants, 
              location, 
              output,
              attachments: attachments,
              certificate_link: certificateLink || null
            }
        ]);

        if (insertError) {
          console.error("Insert event error:", insertError);
          alert("Failed to add event: " + insertError.message);
          return;
        }
        
        alert("Organized event added successfully!");
        addOrganizedForm.reset();
        loadDepartmentEvents();

        showSection("organized-events-section", document.getElementById('organized-link'));
      });
    }

    // -----------------------------
    // Edit Event form submission
    // -----------------------------
    const editEventForm = document.getElementById("edit-organized-form");
    if (editEventForm) {
      editEventForm.addEventListener("submit", async (e) => {
        e.preventDefault();
        const eventId = document.getElementById("edit-organized-id").value;
        const title = document.getElementById("edit-organized-title").value.trim();
        const type = document.getElementById("edit-organized-type").value.trim();
        const coordinatorName = document.getElementById("edit-organized-coordinator-name").value.trim();
        const fromDate = document.getElementById("edit-organized-from").value;
        const toDate = document.getElementById("edit-organized-to").value;
        const participants = document.getElementById("edit-organized-participants") ? parseInt(document.getElementById("edit-organized-participants").value) || 0 : 0;
        const location = document.getElementById("edit-organized-location").value.trim();
        const output = document.getElementById("edit-organized-output").value.trim();
        const attachments = document.getElementById("edit-organized-attachments").value.trim();
        const certificateLink = document.getElementById("edit-organized-certificate-link").value.trim();
        
        if (!title || !location || !coordinatorName || !type) {
          alert("Event Title, Type, Coordinator Name, and Location are required.");
          return;
        }

        const updateData = {
          title,
          type,
          coordinator_name: coordinatorName,
          from_date: fromDate,
          to_date: toDate,
          participants,
          location,
          output,
          attachments: attachments,
          certificate_link: certificateLink || null
        };
        
        const { error } = await supabase.from("department_events").update(updateData).eq("id", eventId);
        if (error) {
          console.error("Update event error:", error);
          alert("Failed to update event: " + error.message);
        } else {
          alert("Event updated successfully!");
          loadDepartmentEvents();
          showSection("organized-events-section", document.getElementById('organized-link'));
        }
      });
    }


    // -----------------------------
    // Load all department events
    // -----------------------------
    async function loadDepartmentEvents() {
        console.log("Loading department events...");
        const tableBody = document.getElementById("organized-list");
        if (!tableBody) return;
        tableBody.innerHTML = "<tr><td colspan='12'>Loading events...</td></tr>";
        
        if (!departmentRowId) {
            console.error("departmentRowId is not set. Cannot fetch events.");
            tableBody.innerHTML = "<tr><td colspan='12'>Error: Department ID not found.</td></tr>";
            return;
        }

        const { data, error } = await supabase.from("department_events").select("*").eq("department_id", departmentRowId).order("from_date", { ascending: false });
        
        console.log("Supabase query result:", { data, error }); // Log the result for debugging

        if (error) {
            tableBody.innerHTML = `<tr><td colspan='12'>Error: ${error.message}</td></tr>`;
            console.error("Load events error:", error);
            return;
        }
        allEvents = data || [];
        populateFilters();
        filterAndRenderEvents();
    }
// In department.js

async function requestUnflag(flaggedId) {
  const comment = prompt("Please provide a reason for the unflag request (e.g., 'Details have been corrected'):");
  if (!comment || comment.trim() === '') {
      alert("A reason is required to request an unflag.");
      return;
  }

  const { error } = await supabase.from('flagged_events')
    .update({ unflag_requested: true, owner_comment: comment })
    .eq('id', flaggedId);

  if (error) {
    alert("Failed to send unflag request: " + error.message);
    console.error("Unflag request error:", error);
  } else {
    alert("Unflag request sent successfully! An admin will review it.");
    loadFlaggedEvents(); // Refresh the list
  }
}
    // -----------------------------
    // Load flagged events
    // -----------------------------
    async function loadFlaggedEvents() {
        console.log("Loading flagged events...");
        const tableBody = document.getElementById("flagged-events-table-body");
        tableBody.innerHTML = "<tr><td colspan='6'>Loading flagged events...</td></tr>";
        
        const { data, error } = await supabase.from("flagged_events")
          .select("id, event_id, title, type, from_date, admin_comment, unflag_requested")
          .eq("department_id", departmentRowId)
          .order("created_at", { ascending: false });
          
        if (error) {
          console.error("Error fetching flagged events:", error.message);
          tableBody.innerHTML = `<tr><td colspan='6'>Error loading flagged events.</td></tr>`;
          return;
        }
        
        flaggedEvents = data || [];
        renderFlaggedEvents();
    }
    
  // In department.js

function renderFlaggedEvents() {
    const tableBody = document.getElementById("flagged-events-table-body");
    tableBody.innerHTML = "";

    if (flaggedEvents.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='6'>No flagged events found.</td></tr>";
        return;
    }

    flaggedEvents.forEach(event => {
        const row = document.createElement("tr");

        let statusHtml, actionHtml;
        if (event.unflag_requested) {
            statusHtml = '<span class="unflag-requested-status">Request Sent</span>';
            actionHtml = '<span>Awaiting Admin Review</span>';
        } else {
            statusHtml = '<span class="flagged-status">Flagged</span>';
            actionHtml = `<button class="btn btn-primary request-unflag-btn" data-id="${event.id}">Request Unflag</button>`;
        }

        row.innerHTML = `
            <td>${event.title || 'N/A'}</td>
            <td>${event.type || 'N/A'}</td>
            <td>${event.from_date || 'N/A'}</td>
            <td>${event.admin_comment || 'N/A'}</td>
            <td>${statusHtml}</td>
            <td>${actionHtml}</td>
        `;
        tableBody.appendChild(row);
    });
}


    // -----------------------------
    // Request Unflag Functionality
    // -----------------------------
    async function requestUnflag(flaggedId) {
      const comment = prompt("Please provide a reason for the unflag request:");
      if (!comment) return;
      
      const { error } = await supabase.from('flagged_events')
        .update({ unflag_requested: true, owner_comment: comment })
        .eq('id', flaggedId);
        
      if (error) {
        alert("Failed to send unflag request: " + error.message);
        console.error("Unflag request error:", error);
      } else {
        alert("Unflag request sent successfully!");
        loadFlaggedEvents();
      }
    }

    // -----------------------------
    // Populate filters with unique values
    // -----------------------------
    function populateFilters() {
      // The location filter is now removed, so this function is empty
    }

    // -----------------------------
    // Filter and Render Events
    // -----------------------------
    function filterAndRenderEvents() {
        console.log("Filtering and rendering events. Total events:", allEvents.length);

        const typeFilter = document.getElementById("type-filter").value;
        const daysFilter = document.getElementById("days-filter").value;
        const fromDate = document.getElementById("from-date-filter").value;
        const toDate = document.getElementById("to-date-filter").value;
        const tableBody = document.getElementById("organized-list");
        tableBody.innerHTML = "";

        const filteredEvents = allEvents.filter(event => {
            const numDays = calculateDays(event.from_date, event.to_date);

            const matchesType = !typeFilter || event.type === typeFilter;
            const matchesDates = (!fromDate || (event.from_date && event.from_date >= fromDate)) && (!toDate || (event.to_date && event.to_date <= toDate));
            
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
            
            console.log("Event:", event.title, "Matches:", matchesType && matchesDates && matchesDays);
            return matchesType && matchesDates && matchesDays;
        });
        
        console.log("Filtered events count:", filteredEvents.length); // Log the count of filtered events

        if (filteredEvents.length === 0) {
            tableBody.innerHTML = "<tr><td colspan='12'>No events found matching your criteria.</td></tr>";
            return;
        }

        filteredEvents.forEach(ev => {
            const row = document.createElement("tr");
            const from = ev.from_date ? new Date(ev.from_date).toLocaleDateString() : "N/A";
            const to = ev.to_date ? new Date(ev.to_date).toLocaleDateString() : "N/A";
            const numDays = calculateDays(ev.from_date, ev.to_date);
            const participantsText = ev.participants || '-';

            const attachmentsCell = ev.attachments
                ? `<td><a href="${ev.attachments}" target="_blank" class="btn btn-secondary view-link-btn" data-url="${ev.attachments}">View Link</a></td>`
                : `<td>-</td>`;

            const certificateLinkCell = ev.certificate_link
                ? `<td><a href="${ev.certificate_link}" target="_blank">View</a></td>`
                : `<td>-</td>`; 

            row.innerHTML = `
                <td>${ev.title || "N/A"}</td>
                <td>${ev.type || "N/A"}</td>
                <td>${ev.coordinator_name || "N/A"}</td>
                <td>${from}</td>
                <td>${to}</td>
                <td>${numDays}</td>
                <td>${participantsText}</td>
                <td>${ev.location || "N/A"}</td>
                <td>${ev.output || "N/A"}</td>
                ${attachmentsCell}
                ${certificateLinkCell}
                <td><button class="btn btn-secondary edit-event-btn" data-id="${ev.id}">Edit</button></td>
            `;
            tableBody.appendChild(row);
        });
        
        // Attach event listeners to all 'Edit' buttons
        document.querySelectorAll('.edit-event-btn').forEach(button => {
            button.addEventListener('click', (e) => {
                const eventId = e.target.dataset.id;
                loadEventForEdit(eventId);
            });
        });
    }
    
    // -----------------------------
    // Load event data for editing
    // -----------------------------
    async function loadEventForEdit(eventId) {
      const { data: event, error } = await supabase.from('department_events').select('*').eq('id', eventId).single();
      if (error) {
        alert("Error loading event for edit: " + error.message);
        return;
      }
      
      document.getElementById('edit-organized-id').value = event.id;
      document.getElementById('edit-organized-title').value = event.title;
      document.getElementById('edit-organized-type').value = event.type;
      document.getElementById('edit-organized-coordinator-name').value = event.coordinator_name;
      document.getElementById('edit-organized-from').value = event.from_date;
      document.getElementById('edit-organized-to').value = event.to_date;
      document.getElementById('edit-organized-participants').value = event.participants;
      document.getElementById('edit-organized-location').value = event.location;
      document.getElementById('edit-organized-output').value = event.output;
      document.getElementById('edit-organized-attachments').value = event.attachments;
      document.getElementById('edit-organized-certificate-link').value = event.certificate_link || '';

      showSection('edit-event-section', document.getElementById('organized-link'));
    }

    // Helper function to calculate number of days
    function calculateDays(fromDate, toDate) {
        if (!fromDate || !toDate) return 'N/A';
        const oneDay = 24 * 60 * 60 * 1000;
        const from = new Date(fromDate);
        const to = new Date(toDate);
        const diffDays = Math.round(Math.abs((to - from) / oneDay)) + 1; // +1 to include both start and end days
        return diffDays;
    }

    // -----------------------------
    // Export to Excel
    // -----------------------------
    document.getElementById('export-excel-btn').addEventListener('click', () => {
        exportToExcel('organized-events-table', 'department_events');
    });

    function exportToExcel(tableID, filename = 'data') {
      const table = document.getElementById(tableID);
      if (!table) {
          alert("Table not found!");
          return;
      }
      
      // Create a temporary clone of the table to modify for export
      const tempTable = table.cloneNode(true);
      const tempRows = tempTable.querySelectorAll('tbody tr');
      
      tempRows.forEach(row => {
          const linkCell = row.querySelector('.view-link-btn');
          if (linkCell) {
              const url = linkCell.dataset.url;
              // Replace the 'View Link' button with a simple text node of the URL
              const urlTextNode = document.createTextNode(url);
              linkCell.parentNode.replaceChild(urlTextNode, linkCell);
          }
      });

      const ws = XLSX.utils.table_to_sheet(tempTable);
      const wb = XLSX.utils.book_new();
      XLSX.utils.book_append_sheet(wb, ws, "Sheet1");
      XLSX.writeFile(wb, `${filename}.xlsx`);
    }
// -----------------------------
// -----------------------------
// Download Excel Template
// -----------------------------
document.getElementById('download-template-btn').addEventListener('click', () => {
    const headers = [
        "Event Title",
        "Type",
        "Coordinator",
        "From Date (YYYY-MM-DD)",
        "To Date (YYYY-MM-DD)",
        "Participants",
        "Location",
        "Event Output",
        "Attachments Link",
        "Certificate Link (Optional)"
    ];

    // Example event row
    const exampleRow = [
        "National Conference on AI",     // Event Title
        "Conference",                   // Type
        "Dr. Jane Doe",                 // Coordinator
        "2025-01-15",                   // From Date
        "2025-01-17",                   // To Date
        150,                            // Participants
        "Main Auditorium",              // Location
        "Discussed advancements in AI", // Event Output
        "https://drive.google.com/attachments-sample", // Attachments
        "https://drive.google.com/certificates-sample" // Certificate (optional)
    ];

    const wsData = [headers, exampleRow];
    const ws = XLSX.utils.aoa_to_sheet(wsData);

    // Add a note on column B (Type) so user knows available options
    const eventTypes = [
        "Workshop", "Seminar", "Conference", "Competition",
        "FDP", "STP", "Hackathon", "Guest lecture", "Technical talk"
    ];
    ws["B1"].c = [{ a: "System", t: `Allowed values: ${eventTypes.join(", ")}` }];

    const wb = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(wb, ws, "Template");
    XLSX.writeFile(wb, "department_events_template.xlsx");
});


// -----------------------------
// Import Events from Excel
// -----------------------------
document.getElementById('import-excel-btn').addEventListener('click', () => {
    document.getElementById('import-excel-input').click();
});

document.getElementById('import-excel-input').addEventListener('change', handleImportExcel);

async function handleImportExcel(e) {
    const file = e.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async (evt) => {
        const data = evt.target.result;
        const workbook = XLSX.read(data, { type: "binary" });
        const firstSheet = workbook.Sheets[workbook.SheetNames[0]];
        const rows = XLSX.utils.sheet_to_json(firstSheet, { defval: "" });

        if (!rows.length) {
            alert("No data found in file.");
            return;
        }

        let insertData = [];
       rows.forEach(r => {
    if (!r["Event Title"] || !r["Type"] || !r["Coordinator"] || !r["Location"]) return;

    function formatDate(val) {
        if (!val) return null;
        // If Excel gave a number, convert it to JS Date
        if (typeof val === "number") {
            return XLSX.SSF.format("yyyy-mm-dd", val);
        }
        // If it's already string (yyyy-mm-dd), just return
        if (typeof val === "string") {
            return val.trim();
        }
        return null;
    }

    insertData.push({
        department_id: localStorage.getItem("department_row_id"),
        title: r["Event Title"],
        type: r["Type"],
        coordinator_name: r["Coordinator"],
        from_date: formatDate(r["From Date (YYYY-MM-DD)"]),
        to_date: formatDate(r["To Date (YYYY-MM-DD)"]),
        participants: r["Participants"] ? parseInt(r["Participants"]) : 0,
        location: r["Location"],
        output: r["Event Output"] || "",
        attachments: r["Attachments Link"] || "",
        certificate_link: r["Certificate Link (Optional)"] || null
    });
});
        if (insertData.length === 0) {
            alert("No valid rows to import.");
            return;
        }

        const { error } = await supabase.from("department_events").insert(insertData);
        if (error) {
            console.error("Excel import error:", error);
            alert("Failed to import: " + error.message);
        } else {
            alert("Events imported successfully!");
            loadDepartmentEvents();
        }
    };
    reader.readAsBinaryString(file);
}

    // -----------------------------
    // Logout
    // -----------------------------
    const logoutBtn = document.getElementById("logout");
    if (logoutBtn) {
      logoutBtn.addEventListener("click", () => {
        console.log("Logging out.");
        localStorage.removeItem("department_row_id");
        localStorage.removeItem("department_id");
        localStorage.removeItem("department_name");
        window.location = "../index.html";
      });
    }

    // Add event listeners for the new filters
    document.getElementById("type-filter").addEventListener("change", filterAndRenderEvents);
    document.getElementById("days-filter").addEventListener("change", filterAndRenderEvents);
    document.getElementById("from-date-filter").addEventListener("change", filterAndRenderEvents);
    document.getElementById("to-date-filter").addEventListener("change", filterAndRenderEvents);

    document.addEventListener('click', (e) => {
        // Handle request unflag button click
        if (e.target.classList.contains('request-unflag-btn')) {
            const flaggedId = e.target.dataset.id;
            requestUnflag(flaggedId);
        }
    });

    // Initial load calls
    loadDepartmentInfo();
    loadDepartmentEvents();
loadFlaggedEvents();
}; // End of window.onload listener