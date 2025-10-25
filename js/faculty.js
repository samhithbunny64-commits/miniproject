// js/faculty.js
// Handles faculty dashboard: load profile, list faculty-specific events, add events, logout.
// Place inside js/ with supabaseClient.js

import { supabase } from "./supabaseClient.js";

const facultyIdStr = localStorage.getItem("faculty_id");
const facultyRowId = localStorage.getItem("faculty_row_id");

// If not logged in, redirect back to index
if (!facultyIdStr || !facultyRowId) {
  try { window.location = "../index.html"; } catch (e) {}
}

let allEvents = []; // Store the full list of events
let flaggedEvents = []; // Store the list of flagged events

// Wrap all logic in a window.onload listener to ensure the DOM is ready
window.onload = function() {
  console.log("DOM and faculty script loaded.");

  // -----------------------------
  // Load faculty profile
  // -----------------------------
  async function loadProfile() {
    console.log("Loading faculty profile...");
    const { data: faculty, error } = await supabase
      .from("faculty")
      .select("*, profile_pic")
      .eq("id", facultyRowId)
      .single();

    if (error || !faculty) {
      console.error("Error loading profile:", error);
      alert("Could not load faculty profile.");
      return;
    }

    // Update profile details
    document.querySelector('.sidebar h3').textContent = faculty.name || "Faculty";
    document.querySelector('.profile-header h2').textContent = (faculty.name || "") + " Profile Information";
    
    // Using explicit IDs to update profile details
    document.getElementById("faculty-name-display").textContent = faculty.name || "N/A";
    document.getElementById("faculty-id-display").textContent = faculty.faculty_id || "N/A";
    document.getElementById("faculty-gender-display").textContent = faculty.gender || "N/A";
    document.getElementById("faculty-school-display").textContent = faculty.school || "N/A";
    document.getElementById("faculty-department-display").textContent = faculty.department || "N/A";
    document.getElementById("faculty-email-display").textContent = faculty.email || "N/A";

    // Update profile pictures
    const profilePicDiv = document.querySelector('.profile-pic');
    const profilePicMain = document.getElementById('profile-pic-main');
    const defaultPic = 'https://via.placeholder.com/120/007367/FFFFFF?text=Fac';

    if (faculty.profile_pic) {
        profilePicDiv.style.backgroundImage = `url('${faculty.profile_pic}')`;
        profilePicMain.src = faculty.profile_pic;
    } else {
        profilePicDiv.style.backgroundImage = `url('${defaultPic}')`;
        profilePicMain.src = defaultPic;
    }

    // Pre-fill edit form
    const editForm = document.querySelector("#edit-profile-section form");
    if (editForm) {
      document.getElementById("firstName").value = faculty.name || "";
      document.getElementById("gender").value = faculty.gender || "";
      document.getElementById("school").value = faculty.school || "";
      document.getElementById("department").value = faculty.department || "";
      document.getElementById("facultyId").value = faculty.faculty_id || "";
    }
  }

  // -----------------------------
  // Load faculty-specific events
  // -----------------------------
  async function loadEvents() {
    console.log("Loading faculty events...");
    const tableBody = document.getElementById("events-table-body");
    tableBody.innerHTML = "<tr><td colspan='10'>Loading events...</td></tr>";

    const { data: events, error } = await supabase
      .from("faculty_events")
      .select("id, title, type, from_date, to_date, participants, event_role, attachments, location")
      .eq("faculty_id", facultyRowId)
      .order("from_date", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error.message);
      tableBody.innerHTML = `<tr><td colspan='10'>Error loading events.</td></tr>`;
      return;
    }

    allEvents = events || []; // Store fetched events
    filterAndRenderEvents(); // Render all events initially

    // Attach filter listeners after the content is loaded
    document.getElementById("type-filter").addEventListener("change", filterAndRenderEvents);
    document.getElementById("days-filter").addEventListener("change", filterAndRenderEvents);
    document.getElementById("event-role-filter").addEventListener("change", filterAndRenderEvents);
    document.getElementById("from-date-filter").addEventListener("change", filterAndRenderEvents);
    document.getElementById("to-date-filter").addEventListener("change", filterAndRenderEvents);
  }
  
  // -----------------------------
  // Load flagged events
  // -----------------------------
 // In faculty.js

async function loadFlaggedEvents() {
    console.log("Loading flagged events...");
    const tableBody = document.getElementById("flagged-events-table-body");
    tableBody.innerHTML = "<tr><td colspan='6'>Loading flagged events...</td></tr>";

    const { data, error } = await supabase.from("flagged_events")
        .select("id, title, type, from_date, admin_comment, unflag_requested")
        .eq("faculty_id", facultyRowId)
        .order("created_at", { ascending: false });

    if (error) {
      console.error("Error fetching flagged events:", error.message);
      tableBody.innerHTML = `<tr><td colspan='6'>Error loading flagged events.</td></tr>`;
      return;
    }

    flaggedEvents = data || [];
    renderFlaggedEvents();
}
  
  // In faculty.js

function renderFlaggedEvents() {
    const tableBody = document.getElementById("flagged-events-table-body");
    tableBody.innerHTML = "";

    if (flaggedEvents.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='6'>No flagged events found.</td></tr>";
        return;
    }

    flaggedEvents.forEach(event => {
        const row = document.createElement("tr");

        // Determine status and action based on unflag_requested status
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
    const comment = prompt("Please provide a reason for the unflag request (e.g., 'I have corrected the details'):");
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
      loadFlaggedEvents();
    }
  }
  
  // -----------------------------
  // Filter and Render Events
  // -----------------------------
  function filterAndRenderEvents() {
      const typeFilter = document.getElementById("type-filter")?.value || "";
      const daysFilter = document.getElementById("days-filter")?.value || "";
      const roleFilter = document.getElementById("event-role-filter")?.value || "";
      const fromDate = document.getElementById("from-date-filter")?.value || "";
      const toDate = document.getElementById("to-date-filter")?.value || "";
      const tableBody = document.getElementById("events-table-body");
      tableBody.innerHTML = "";

      const filteredEvents = allEvents.filter(event => {
          const numDays = calculateDays(event.from_date, event.to_date);

          // MODIFIED: Logic to handle 'Others' filter
          let matchesType = false;
          if (!typeFilter) {
              matchesType = true; // No filter selected
          } else if (typeFilter === 'Others') {
              // Filter for events whose type is NOT one of the standard options
              const standardTypes = ['Workshop', 'Seminar', 'FDP', 'STP', 'Competition', 'Others'];
              matchesType = !standardTypes.includes(event.type);
          } else {
              // Filter for standard type selection
              matchesType = event.type === typeFilter;
          }

          const matchesRole = !roleFilter || event.event_role === roleFilter;
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

          return matchesType && matchesRole && matchesDates && matchesDays;
      });
      
      if (filteredEvents.length > 0) {
          filteredEvents.forEach(event => {
              const row = tableBody.insertRow();
              const numDays = calculateDays(event.from_date, event.to_date);
              
              let participantsText = event.participants || "N/A";
              if (event.event_role === 'Attended') {
                  participantsText = '-';
              }

              // Corrected: Ensure a valid URL is passed to the data-url attribute
              const attachmentsCell = event.attachments
                  ? `<td><button class="btn btn-secondary view-link-btn" data-url="${event.attachments.replace(/[{}]/g, '')}">View Link</button></td>`
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
                  <td><button class="btn btn-secondary btn-edit" data-id="${event.id}">Edit</button></td>
              `;
          });
      } else {
          tableBody.innerHTML = "<tr><td colspan='10'>No events found matching your criteria.</td></tr>";
      }
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
  // Add Event form submission
  // -----------------------------
  document.querySelector("#add-event-form").addEventListener("submit", async function(e) {
      e.preventDefault();
      console.log("Add event form submitted.");

      const eventRole = document.getElementById("eventRole").value;
      const title = document.getElementById("eventTitle").value.trim();
      const selectedType = document.getElementById("eventType").value;
      const customType = document.getElementById("customEventType").value.trim(); // NEW
      
      // Determine the final type to save
      const finalType = (selectedType === 'Others' && customType) ? customType : selectedType;
      
      if (selectedType === 'Others' && !customType) {
          alert("Please specify the custom event type or select a standard type.");
          return;
      }

      const from_date = document.getElementById("fromDate").value;
      const to_date = document.getElementById("toDate").value;
      const participants = eventRole === 'Organized' ? (document.getElementById("participants").value || 0) : null;
      const remarks = document.getElementById("remarks").value;
      const location = document.getElementById("eventLocation").value;
      const attachments = document.getElementById("attachments").value;

      if (!title || !eventRole || !location) {
          alert("Event title, role, and location are required.");
          return;
      }

      if (!attachments) {
          alert("A Drive link for documents/photos is required.");
          return;
      }
      
      const eventData = {
          faculty_id: facultyRowId,
          event_role: eventRole,
          type: finalType, // USE FINAL TYPE
          title: title,
          from_date: from_date,
          to_date: to_date,
          participants: participants,
          remarks: remarks,
          location: location,
          attachments: attachments
      };
      
      const { error: insertError } = await supabase.from("faculty_events").insert([eventData]);

      if (insertError) {
          console.error("Failed to add event:", insertError.message);
          alert("Failed to add event: " + insertError.message);
          return;
      }

      alert("Event added successfully!");
      loadEvents(); // Reload the events list
      document.querySelector("#add-event-form").reset(); // Clear the form
      showSection('events-section');
  });

  // -----------------------------
  // Edit Event Functionality
  // -----------------------------
  async function editEvent(eventId) {
      const { data, error } = await supabase.from('faculty_events').select('*').eq('id', eventId).single();
      if (error) {
          alert('Error fetching event data: ' + error.message);
          return;
      }
      const event = data;
      const standardTypes = ['Workshop', 'Seminar', 'FDP', 'STP', 'Competition'];

      document.getElementById('edit-event-id-hidden').value = event.id;
      document.getElementById('edit-eventRole').value = event.event_role;
      document.getElementById('edit-eventTitle').value = event.title;
      document.getElementById('edit-fromDate').value = event.from_date;
      document.getElementById('edit-toDate').value = event.to_date;
      document.getElementById('edit-participants').value = event.participants;
      document.getElementById('edit-eventLocation').value = event.location;
      document.getElementById('edit-attachments').value = event.attachments;
      document.getElementById('edit-remarks').value = event.remarks;

      // NEW: Handle event type for edit form
      const isStandardType = standardTypes.includes(event.type);
      const editEventTypeSelect = document.getElementById('edit-eventType');
      const editCustomGroup = document.getElementById('editCustomEventTypeGroup');
      const editCustomInput = document.getElementById('editCustomEventType');

      if (isStandardType) {
          editEventTypeSelect.value = event.type;
          editCustomGroup.classList.add('hidden');
          editCustomInput.value = '';
      } else {
          // It's a custom type, so set the dropdown to 'Others' and fill the text box
          editEventTypeSelect.value = 'Others';
          editCustomGroup.classList.remove('hidden');
          editCustomInput.value = event.type;
      }

      if (event.event_role === 'Attended') {
          document.getElementById('edit-participants-group').classList.add('hidden');
      } else {
          document.getElementById('edit-participants-group').classList.remove('hidden');
      }

      showSection('edit-event-section');
  }

  document.getElementById('edit-event-form').addEventListener('submit', async (e) => {
      e.preventDefault();
      const eventId = document.getElementById('edit-event-id-hidden').value;
      const eventRole = document.getElementById("edit-eventRole").value;
      const title = document.getElementById("edit-eventTitle").value.trim();
      const selectedType = document.getElementById("edit-eventType").value;
      const customType = document.getElementById("editCustomEventType").value.trim(); // NEW

      // Determine the final type to save
      const finalType = (selectedType === 'Others' && customType) ? customType : selectedType;
      
      if (selectedType === 'Others' && !customType) {
          alert("Please specify the custom event type or select a standard type.");
          return;
      }

      const from_date = document.getElementById("edit-fromDate").value;
      const to_date = document.getElementById("edit-toDate").value;
      const participants = eventRole === 'Organized' ? (document.getElementById("edit-participants").value || null) : null;
      const location = document.getElementById("edit-eventLocation").value;
      const attachments = document.getElementById("edit-attachments").value;
      const remarks = document.getElementById("edit-remarks").value;

      if (!title || !eventRole || !location) {
          alert("Event title, role, and location are required.");
          return;
      }

      const updateData = {
          event_role: eventRole,
          type: finalType, // USE FINAL TYPE
          title: title,
          from_date: from_date,
          to_date: to_date,
          participants: participants,
          location: location,
          attachments: attachments,
          remarks: remarks
      };
      
      const { error } = await supabase.from('faculty_events').update(updateData).eq('id', eventId);

      if (error) {
          alert('Error updating event: ' + error.message);
      } else {
          alert('Event details updated successfully!');
          showSection('events-section');
          loadEvents();
      }
  });


  // -----------------------------
  // Edit Profile form submission
  // -----------------------------
  document.querySelector("#edit-profile-form").addEventListener("submit", async function(e) {
      e.preventDefault();
      console.log("Edit profile form submitted.");
      
      const name = document.getElementById("firstName").value.trim();
      const gender = document.getElementById("gender").value;
      const school = document.getElementById("school").value;
      const department = document.getElementById("department").value;
      const fileInput = document.getElementById("profilePic");
      let profilePicUrl = null;

      // Upload new profile picture if a file is selected
      if (fileInput.files && fileInput.files[0]) {
          const file = fileInput.files[0];
          const fileExt = file.name.split('.').pop();
          const filePath = `faculty/${facultyRowId}/profile.${fileExt}`;
          let { error: uploadError } = await supabase.storage
              .from('profile-pics')
              .upload(filePath, file, { upsert: true });
          if (uploadError) {
              alert("Profile picture upload failed: " + uploadError.message);
              return;
          }
          const { data } = supabase.storage.from('profile-pics').getPublicUrl(filePath);
          profilePicUrl = data.publicUrl;
      }

      // Update the faculty record
      const updateData = {
          name,
          gender,
          school,
          department
      };
      if (profilePicUrl) updateData.profile_pic = profilePicUrl;

      const { error } = await supabase
          .from("faculty")
          .update(updateData)
          .eq("id", facultyRowId);

      if (error) {
          alert("Update failed: " + error.message);
          console.error("Profile update error:", error);
      } else {
          alert("Profile updated!");
          loadProfile();
          showSection('profile-section');
      }
  });

  // -----------------------------
  // Excel Export
  // -----------------------------
  document.getElementById('export-excel-btn').addEventListener('click', () => {
    exportToExcel('events-table', 'faculty_events');
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
            // Replace the button with a simple text node of the URL
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
  // Excel Import
  // -----------------------------
  document.getElementById('excel-input').addEventListener('change', importExcelEvents);
  document.getElementById('download-template-btn').addEventListener('click', downloadExcelTemplate);
  
  async function importExcelEvents(event) {
    const file = event.target.files[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = async function(e) {
      try {
        const data = new Uint8Array(e.target.result);
        const workbook = XLSX.read(data, { type: 'array' });
        const sheetName = workbook.SheetNames[0];
        const worksheet = workbook.Sheets[sheetName];
        const json = XLSX.utils.sheet_to_json(worksheet);

        if (json.length === 0) {
          alert("No data found in the Excel file.");
          return;
        }

        const eventsToInsert = json.map(row => {
          // Normalize column names to match the database schema
          const eventRole = row['Event Role'] || 'Organized';
          const participants = (eventRole === 'Attended') ? null : (row['No. of Participants'] || null);
          const type = row['Type of Event'] || ''; // Get type as is
          
          // Handle date conversion from Excel numeric format
          const excelDateToJSDate = (serial) => {
            const utc_days = Math.floor(serial - 25569);
            const utc_value = utc_days * 86400;
            const date_info = new Date(utc_value * 1000);
            return new Date(date_info.getFullYear(), date_info.getMonth(), date_info.getDate()).toISOString().split('T')[0];
          };

          const fromDate = row['From Date'] ? excelDateToJSDate(row['From Date']) : null;
          const toDate = row['To Date'] ? excelDateToJSDate(row['To Date']) : null;
          
          return {
            faculty_id: facultyRowId,
            event_role: eventRole,
            type: type, // Store the type from the excel sheet
            title: row['Title of Event'] || '',
            from_date: fromDate,
            to_date: toDate,
            participants: participants,
            remarks: row['Remarks'] || '',
            location: row['Event Location'] || '',
            attachments: row['Attachments Drive Link'] || ''
          };
        }).filter(event => event.title); // Filter out rows with no title

        if (eventsToInsert.length === 0) {
          alert("No valid events found in the Excel file.");
          return;
        }

        const { error } = await supabase.from('faculty_events').insert(eventsToInsert);

        if (error) {
          console.error("Failed to import events:", error.message);
          alert("Failed to import events. Please check the data and try again.");
          return;
        }

        alert(`Successfully imported ${eventsToInsert.length} events!`);
        loadEvents(); // Refresh the event list
        event.target.value = ''; // Clear the file input
        showSection('events-section');
      } catch (e) {
        console.error("Error processing file:", e);
        alert("Error processing file. Please ensure it's a valid Excel file with the correct format.");
      }
    };
    reader.readAsArrayBuffer(file);
  }

function downloadExcelTemplate() {
    const headers = [
        "Event Role",
        "Type of Event",
        "Title of Event",
        "From Date",
        "To Date",
        "No. of Participants",
        "Event Location",
        "Attachments Drive Link",
        "Remarks"
    ];

    const data = [
      headers,
      [
        "Organized or Attended",
        "Workshop, Seminar, FDP, etc. (Can be any custom value)",
        "e.g., Workshop on AI",
        "YYYY-MM-DD",
        "YYYY-MM-DD",
        "e.g., 50",
        "e.g., University Hall",
        "e.g., https://drive.google.com/...",
        "e.g., The event was a huge success."
      ]
    ];
    
    // Create a new workbook and add the data
    const wb = XLSX.utils.aoa_to_sheet(data);

    // Set dropdowns for 'Event Role' and 'Type of Event'
    const dropdowns = {
      'A': ['Organized', 'Attended'],
      // REMOVED dropdown for 'Type of Event' to allow custom/other values from Excel
    };
    
    for (let col in dropdowns) {
      const dropdownData = dropdowns[col];
      wb['!dataValidations'] = wb['!dataValidations'] || [];
      wb['!dataValidations'].push({
        sqref: `${col}2:${col}100`, // Apply to rows 3 to 100
        type: 'list',
        formula1: `"${dropdownData.join(',')}"`
      });
    }

    const ws = XLSX.utils.book_new();
    XLSX.utils.book_append_sheet(ws, wb, 'Events');

    // Generate the file and trigger the download
    XLSX.writeFile(ws, 'faculty_events_template.xlsx');
}

// In faculty.js

async function requestUnflag(flaggedId) {
  const comment = prompt("Please provide a reason for the unflag request (e.g., 'I have corrected the details'):");
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
    loadFlaggedEvents(); // Refresh the list to show the updated status
  }
}
  // -----------------------------
  // Logout button
  // -----------------------------
  document.getElementById("logout").addEventListener("click", async () => {
    console.log("Logging out.");
    localStorage.removeItem("faculty_id");
    localStorage.removeItem("faculty_row_id");
    localStorage.removeItem("faculty_name");
    window.location = "../index.html";
  });
  
  // -----------------------------
  // Event Listeners for Dynamic content
  // -----------------------------
  document.addEventListener('click', (e) => {
    // Handle Edit button click
    if (e.target.classList.contains('btn-edit')) {
      const eventId = e.target.dataset.id;
      editEvent(eventId);
    }
    // Handle View Link button click
    if (e.target.classList.contains('view-link-btn')) {
      const url = e.target.dataset.url;
      if (url) {
        window.open(url, '_blank').focus();
      }
    }
    // Handle request unflag button click
    if (e.target.classList.contains('request-unflag-btn')) {
        const flaggedId = e.target.dataset.id;
        requestUnflag(flaggedId);
    }
  });

  // Toggle participants input based on event role for ADD form
  document.getElementById('eventRole').addEventListener('change', (e) => {
      const participantsGroup = document.getElementById('participants-group');
      const participantsInput = document.getElementById('participants');
      if (e.target.value === 'Attended') {
          participantsGroup.classList.add('hidden');
          participantsInput.required = false;
      } else {
          participantsGroup.classList.remove('hidden');
          participantsInput.required = true;
      }
  });
  
  // Toggle participants input based on event role for EDIT form
  document.getElementById('edit-eventRole').addEventListener('change', (e) => {
      const participantsGroup = document.getElementById('edit-participants-group');
      const participantsInput = document.getElementById('edit-participants');
      if (e.target.value === 'Attended') {
          participantsGroup.classList.add('hidden');
          participantsInput.required = false;
      } else {
          participantsGroup.classList.remove('hidden');
          participantsInput.required = true;
      }
  });

  // NEW: Toggle custom event type input for ADD form
  document.getElementById('eventType').addEventListener('change', (e) => {
      const customGroup = document.getElementById('customEventTypeGroup');
      const customInput = document.getElementById('customEventType');
      if (e.target.value === 'Others') {
          customGroup.classList.remove('hidden');
          customInput.required = true;
      } else {
          customGroup.classList.add('hidden');
          customInput.required = false;
      }
  });

  // NEW: Toggle custom event type input for EDIT form
  document.getElementById('edit-eventType').addEventListener('change', (e) => {
      const customGroup = document.getElementById('editCustomEventTypeGroup');
      const customInput = document.getElementById('editCustomEventType');
      if (e.target.value === 'Others') {
          customGroup.classList.remove('hidden');
          customInput.required = true;
      } else {
          customGroup.classList.add('hidden');
          customInput.required = false;
      }
  });

  // -----------------------------
  // Filter Listeners (Already present, but kept for completeness)
  // -----------------------------
  document.getElementById("type-filter").addEventListener("change", filterAndRenderEvents);
  document.getElementById("days-filter").addEventListener("change", filterAndRenderEvents);
  document.getElementById("event-role-filter").addEventListener("change", filterAndRenderEvents);
  document.getElementById("from-date-filter").addEventListener("change", filterAndRenderEvents);
  document.getElementById("to-date-filter").addEventListener("change", filterAndRenderEvents);

  // -----------------------------
  // Sidebar Navigation
  // -----------------------------
  document.getElementById('profile-link').addEventListener('click', (e) => {
      e.preventDefault();
      showSection('profile-section');
      e.target.classList.add('active');
  });

  document.getElementById('events-link').addEventListener('click', (e) => {
      e.preventDefault();
      showSection('events-section');
      e.target.classList.add('active');
  });
  
  document.getElementById('add-event-link').addEventListener('click', (e) => {
      e.preventDefault();
      showSection('add-event-section');
      document.getElementById('events-link').classList.add('active');
  });
  
  document.getElementById('flagged-link').addEventListener('click', (e) => {
      e.preventDefault();
      showSection('flagged-events-section');
      loadFlaggedEvents();
  });
  
  // Initial data load and section visibility
  loadProfile();
  loadEvents();
  loadFlaggedEvents();
}; // End of window.onload