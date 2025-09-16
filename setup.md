Create a React project called "event-organizer" with the following structure:

event-organizer/
│
├── index.html              # Login + Signup (Faculty/Department/Admin)
├── faculty-dashboard.html  # Faculty dashboard (add events, attended events, profile, settings)
├── dept-dashboard.html     # Department dashboard (organized events, profile, settings)
├── admin-dashboard.html    # Admin dashboard (manage faculty, departments, events)
│
├── css/
│   └── styles.css          # Shared styles (from your <style> in total.html)
│
├── js/
│   ├── supabaseClient.js   # Supabase initialization
│   ├── auth.js             # Signup, login, logout logic for all roles
│   ├── faculty.js          # Faculty event CRUD logic
│   ├── department.js       # Department event CRUD logic
│   ├── admin.js            # Admin controls (view/manage all)
│   └── utils.js            # Validators (email, mobile, password strength)
│
├── assets/
│   └── images.png          # Your university logo
│
├── .env (optional)         # Supabase URL + Anon Key
└── README.md

Requirements:
1. Use **React + Vite** (fast dev environment).
2. Use **react-router-dom** for routing.
3. Use **Tailwind CSS** for styling (minimal, modern UI).
4. Use **Supabase** for:
   - Authentication (signup/login for faculty, department, admin).
   - Database (tables: users, events, organized_events).
   - Storage (upload certificates/photos).
5. Implement role-based navigation:
   - Faculty → `/faculty/dashboard`
   - Department → `/department/dashboard`
   - Admin → `/admin/dashboard`
6. Signup page should validate:
   - Faculty ID (unique, max 10 chars)
   - Mobile (10 digits)
   - Email (must be university email)
   - Password (must contain upper, lower, number, special char, min 8 chars)
7. Faculty can:
   - Add attended events (with certificate upload).
   - See list of attended events.
8. Department can:
   - Add organized events (title, type, participants, output, photos).
   - See list of organized events.
9. Admin can:
   - View/manage all faculty and department accounts.
   - View/manage all events.
10. Include a **Navbar** and **Sidebar** for navigation in dashboards.

Generate the full workspace with placeholder code for each file based on the structure above.
