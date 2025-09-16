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
    tableBody.innerHTML = "<tr><td colspan='7'>Loading events...</td></tr>";

    const { data: events, error } = await supabase
      .from("faculty_events")
      .select("title, type, from_date, to_date, participants, event_role, attachments")
      .eq("faculty_id", facultyRowId)
      .order("from_date", { ascending: false });

    if (error) {
      console.error("Error fetching events:", error.message);
      tableBody.innerHTML = `<tr><td colspan='7'>Error loading events.</td></tr>`;
      return;
    }

    tableBody.innerHTML = "";
    if (events && events.length > 0) {
      events.forEach(event => {
        const row = tableBody.insertRow();
        const attachmentsCell = event.attachments && event.attachments.length > 0
          ? `<td><button class="btn btn-primary download-attachments-btn" data-attachments='${JSON.stringify(event.attachments)}'>Download Images</button></td>`
          : `<td>N/A</td>`;
        
        row.innerHTML = `
          <td>${event.title || "N/A"}</td>
          <td>${event.type || "N/A"}</td>
          <td>${event.from_date || "N/A"}</td>
          <td>${event.to_date || "N/A"}</td>
          <td>${event.participants || "N/A"}</td>
          <td>${event.event_role || "N/A"}</td>
          ${attachmentsCell}
        `;
        tableBody.appendChild(row);
      });
      
      // Attach event listeners to all 'Download Images' buttons
      document.querySelectorAll('.download-attachments-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const attachments = JSON.parse(e.target.dataset.attachments);
            downloadImagesAsZip(attachments);
        });
      });
      
    } else {
      tableBody.innerHTML = "<tr><td colspan='7'>No events found.</td></tr>";
    }
  }
  
  // -----------------------------
  // Add Event form submission
  // -----------------------------
  document.querySelector("#add-event-form").addEventListener("submit", async function(e) {
      e.preventDefault();
      console.log("Add event form submitted.");

      const title = document.getElementById("eventTitle").value.trim();
      const type = document.getElementById("eventType").value;
      const from_date = document.getElementById("fromDate").value;
      const to_date = document.getElementById("toDate").value;
      const participants = document.getElementById("participants").value;
      const remarks = document.getElementById("remarks").value;
      const eventRole = document.getElementById("eventRole").value;
      const photos = document.getElementById("photos").files;

      if (!title || !eventRole) {
          alert("Event title and role are required.");
          return;
      }
      
      if (photos.length > 10) {
          alert("You can only upload a maximum of 10 images.");
          return;
      }

      // 1. Insert the event record first to get a unique ID
      const eventData = {
          faculty_id: facultyRowId,
          event_role: eventRole,
          type: type,
          title: title,
          from_date: from_date,
          to_date: to_date,
          participants: participants,
          remarks: remarks
      };
      const { data: eventResult, error: insertError } = await supabase.from("faculty_events").insert([eventData]).select().single();

      if (insertError) {
          console.error("Failed to add event:", insertError.message);
          alert("Failed to add event: " + insertError.message);
          return;
      }

      const eventId = eventResult.id;
      const uploadedAttachments = [];

      // 2. Upload attachments to Supabase Storage
      if (photos.length > 0) {
        for (const file of photos) {
            const filePath = `faculty-events/${eventId}/${file.name}`;
            const { error: uploadError } = await supabase.storage.from('faculty-events').upload(filePath, file);
            if (uploadError) {
                console.error("Upload failed:", uploadError);
                alert(`Failed to upload ${file.name}: ${uploadError.message}`);
                continue;
            }
            const { data: publicUrlData } = supabase.storage.from('faculty-events').getPublicUrl(filePath);
            uploadedAttachments.push(publicUrlData.publicUrl);
        }

        // 3. Update the event record with the attachment URLs
        const { error: updateError } = await supabase.from("faculty_events").update({ attachments: uploadedAttachments }).eq("id", eventId);
        if (updateError) {
            console.error("Update failed:", updateError);
            alert("Event added, but failed to save attachment links: " + updateError.message);
        }
      }

      alert("Event added successfully!");
      loadEvents(); // Reload the events list
      document.querySelector("#add-event-form").reset(); // Clear the form
      document.getElementById('events-section').classList.remove('hidden'); // Go back to events table
      document.getElementById('add-event-section').classList.add('hidden');
      document.querySelector('.nav-links a[id=\'events-link\']').classList.add('active');
  });
  
  // -----------------------------
  // Download Images as Zip
  // -----------------------------
  async function downloadImagesAsZip(urls) {
    console.log("Downloading images as zip...");
    const zip = new JSZip();
    const folderName = "event_attachments";
    
    let promises = [];
    urls.forEach((url, index) => {
      const filename = url.substring(url.lastIndexOf('/') + 1);
      const promise = fetch(url)
        .then(res => {
          if (!res.ok) throw new Error(`Failed to fetch ${url}: ${res.statusText}`);
          return res.blob();
        })
        .then(blob => {
          zip.file(`${folderName}/${filename}`, blob);
        })
        .catch(err => {
          console.error(err);
          alert(`Error downloading file: ${filename}. Check the console for details.`);
        });
      promises.push(promise);
    });

    try {
      await Promise.all(promises);
      const content = await zip.generateAsync({ type: "blob" });
      saveAs(content, "event_attachments.zip");
      console.log("Zip file generated and download started.");
    } catch (err) {
      console.error("Error generating zip file:", err);
      alert("An error occurred while creating the zip file.");
    }
  }


  // -----------------------------
  // Edit Profile form submission
  // -----------------------------
  document.querySelector("#edit-profile-section form").addEventListener("submit", async function(e) {
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
          document.getElementById('profile-section').classList.remove('hidden');
          document.getElementById('edit-profile-section').classList.add('hidden');
          document.querySelector('.nav-links a[id=\'profile-link\']').classList.add('active');
      }
  });

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
  // Sidebar Navigation
  // -----------------------------
  const sections = {
      'profile-link': 'profile-section',
      'events-link': 'events-section',
      'add-event-link': 'add-event-section',
      'edit-profile-link': 'edit-profile-section'
  };

  document.querySelectorAll('.nav-links a, .btn').forEach(link => {
      link.addEventListener('click', (e) => {
          const sectionId = sections[e.target.id];
          if (sectionId) {
              e.preventDefault();
              document.querySelectorAll('section').forEach(section => {
                  section.classList.add('hidden');
              });
              document.getElementById(sectionId).classList.remove('hidden');
              
              document.querySelectorAll('.nav-links a').forEach(navLink => navLink.classList.remove('active'));
              if (e.target.id.includes('link')) {
                  e.target.classList.add('active');
              } else if (e.target.id === 'add-event-link') {
                  document.getElementById('events-link').classList.add('active');
              } else if (e.target.id === 'edit-profile-link') {
                  document.getElementById('profile-link').classList.add('active');
              }
          }
      });
  });

  // Initial data load and section visibility
  loadProfile();
  loadEvents();
}; // End of window.onload