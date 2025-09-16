// js/department.js
// Department dashboard: load department info, add department events, list faculty & department events.
// Place inside js/ with supabaseClient.js

import { supabase } from "./supabaseClient.js";

// Wrap all logic in a window.onload listener to ensure the DOM is ready
window.onload = function() {
    console.log("DOM and script loaded.");

    const departmentRowId = localStorage.getItem("department_row_id");

    if (!departmentRowId) {
      console.error("No department ID found in localStorage. Redirecting to login.");
      try { window.location = "../index.html"; } catch (e) {}
    }

    // -----------------------------
    // Load department profile and faculty list
    // -----------------------------
    async function loadDepartmentInfo() {
      console.log("Loading department info...");
      const nameEl = document.getElementById("department-name-display");
      const emailEl = document.getElementById("department-email-display");
      const idEl = document.getElementById("department-id-display");
      const schoolEl = document.getElementById("department-school-display");
      const headEl = document.getElementById("department-head-display");

      const { data: deptData, error: deptErr } = await supabase.from("departments").select("*, head_name, school").eq("id", departmentRowId).limit(1);
      
      if (deptErr) {
        console.error("Dept load error:", deptErr);
        if (nameEl) nameEl.textContent = "Error loading department.";
      } else {
        const dept = deptData && deptData[0];
        if (dept) {
          if (nameEl) nameEl.textContent = dept.name || "N/A";
          if (idEl) idEl.textContent = dept.department_id || "N/A";
          if (schoolEl) schoolEl.textContent = dept.school || "N/A";
          if (headEl) headEl.textContent = dept.head_name || "N/A";
          if (emailEl) emailEl.textContent = dept.email || "N/A";
        }
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
        const fromDate = document.getElementById("organized-from") ? document.getElementById("organized-from").value : null;
        const toDate = document.getElementById("organized-to") ? document.getElementById("organized-to").value : null;
        const participants = document.getElementById("organized-participants") ? parseInt(document.getElementById("organized-participants").value) || 0 : 0;
        const output = document.getElementById("organized-output") ? document.getElementById("organized-output").value.trim() : "";
        const photos = document.getElementById("organized-photos").files;

        if (!title) {
          alert("Title required.");
          return;
        }
        
        if (photos.length > 10) {
          alert("You can only upload a maximum of 10 images.");
          return;
        }

        // 1. Insert the event record first to get an ID
        const { data: eventData, error: eventError } = await supabase.from("department_events").insert([
            { department_id: departmentRowId, title, type, from_date: fromDate, to_date: toDate, participants, output }
        ]).select().single();

        if (eventError) {
          console.error("Insert event error:", eventError);
          alert("Failed to add event: " + eventError.message);
          return;
        }

        const eventId = eventData.id;
        const uploadedPhotos = [];

        // 2. Upload photos to Supabase Storage
        for (const photo of photos) {
            const filePath = `department_events/${eventId}/${photo.name}`;
            const { error: uploadError } = await supabase.storage.from('event-photos').upload(filePath, photo);
            if (uploadError) {
                console.error("Photo upload error:", uploadError);
                alert(`Failed to upload photo: ${photo.name}. ${uploadError.message}`);
                continue; // Continue with other photos
            }
            const { data: publicUrlData } = supabase.storage.from('event-photos').getPublicUrl(filePath);
            uploadedPhotos.push(publicUrlData.publicUrl);
        }

        // 3. Update the event record with the public URLs using the correct 'attachments' column name
        const { error: updateError } = await supabase.from("department_events").update({ attachments: uploadedPhotos }).eq("id", eventId);
        if (updateError) {
          console.error("Update event error:", updateError);
          alert("Event added, but failed to save photo links: " + updateError.message);
        }
        
        alert("Organized event added successfully!");
        addOrganizedForm.reset();
        loadDepartmentEvents();

        // Show events section
        document.getElementById("organized-events-section").classList.remove("hidden");
        document.getElementById("add-event-section").classList.add("hidden");
        document.getElementById("organized-link").classList.add("active");
        document.getElementById("add-event-link").classList.remove("active");
      });
    }

    // -----------------------------
    // Load department events
    // -----------------------------
    async function loadDepartmentEvents() {
      console.log("Loading department events...");
      const tableBody = document.getElementById("organized-list");
      if (!tableBody) return;
      tableBody.innerHTML = "<tr><td colspan='6'>Loading events...</td></tr>";

      // Use the correct 'attachments' column name in the select query
      const { data, error } = await supabase.from("department_events").select("*, attachments").eq("department_id", departmentRowId).order("from_date", { ascending: false });
      if (error) {
        tableBody.innerHTML = `<tr><td colspan='6'>Error: ${error.message}</td></tr>`;
        console.error("Load events error:", error);
        return;
      }

      tableBody.innerHTML = "";
      if (!data || data.length === 0) {
        tableBody.innerHTML = "<tr><td colspan='6'>No organized events found.</td></tr>";
        console.log("No organized events found.");
        return;
      }

      data.forEach(ev => {
        const row = document.createElement("tr");
        const from = ev.from_date ? new Date(ev.from_date).toLocaleDateString() : "N/A";
        const to = ev.to_date ? new Date(ev.to_date).toLocaleDateString() : "N/A";
        
        const photosCell = ev.attachments && ev.attachments.length > 0
            ? `<td><button class="btn btn-primary download-photos-btn" data-attachments='${JSON.stringify(ev.attachments)}'>Download Images</button></td>`
            : `<td>N/A</td>`;

        row.innerHTML = `
          <td>${ev.title || "N/A"}</td>
          <td>${ev.type || "N/A"}</td>
          <td>${from}</td>
          <td>${to}</td>
          <td>${ev.participants || "N/A"}</td>
          ${photosCell}
        `;
        tableBody.appendChild(row);
      });
      
      // Attach event listeners to all 'Download Images' buttons
      document.querySelectorAll('.download-photos-btn').forEach(button => {
        button.addEventListener('click', (e) => {
            const photos = JSON.parse(e.target.dataset.attachments);
            downloadImagesAsZip(photos);
        });
      });
    }

    // -----------------------------
    // Download Images as Zip
    // -----------------------------
    async function downloadImagesAsZip(urls) {
      console.log("Downloading images as zip...");
      const zip = new JSZip();
      const folderName = "event_images";
      
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
            alert(`Error downloading image: ${filename}. Check the console for details.`);
          });
        promises.push(promise);
      });

      try {
        await Promise.all(promises);
        const content = await zip.generateAsync({ type: "blob" });
        saveAs(content, "event_photos.zip");
        console.log("Zip file generated and download started.");
      } catch (err) {
        console.error("Error generating zip file:", err);
        alert("An error occurred while creating the zip file.");
      }
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

    // Initial load calls
    loadDepartmentInfo();
    loadDepartmentEvents();

}; // End of window.onload listener