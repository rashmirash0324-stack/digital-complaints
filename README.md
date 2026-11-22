# Digital Complaint Management System

## Run it

**Backend** (needs MongoDB running locally)
```
cd backend
npm install
npm run dev
```

**Frontend**
```
cd frontend
npm install
npm run dev
```
Open http://localhost:5173

## Create an admin account
Registration always creates a normal user. To make an admin:
```
cd backend
npm run create-admin -- "Admin Name" admin@example.com YourPassword 9876543210
```
(the 10-digit phone at the end is optional)
Then log in with that email; you land on the admin overview.

## Before deploying
Change `JWT_SECRET` in `backend/.env` to a long random string.
Set `VITE_API_URL` in `frontend/.env` (see `.env.example`) if the API is not on localhost:5000.

## Forgot password
On the login page click **Forgot password?**. The user enters their email and the 10-digit phone
number they registered with; if both match, they can set a new password.
Accounts created before the phone field existed have no phone saved, so they cannot use this
(re-run `create-admin` with a phone for admins, or have the user register again).
Sending a reset link/OTP by email or SMS would need an email/SMS provider, which is not set up.

## GPS photos, staff review and WhatsApp
- **Submit complaint**: users can take or upload a photo. The device's GPS location is attached when the
  photo is added (the browser asks for location permission). Photos are compressed in the browser and
  stored in MongoDB as base64 (max about 3 MB each).
- **Staff view** (admin): open a complaint to see the photo with coordinates and an "Open in Maps" link.
  The manage list shows GPS photo / Staff reviewed tags.
- **Staff review** (admin): on the complaint page, add a review note, a GPS-tagged site photo and
  optionally change the status. The user sees this review on their complaint.
- **WhatsApp**: contact button for **+91 9611377970** on Home, footer, submit page and complaint page.
  Admins can also WhatsApp the complainant (if they registered a phone) with a prefilled status message.
  To change the number edit `WHATSAPP_NUMBER` in `frontend/src/utils/format.js`.
- Note: GPS needs HTTPS (or localhost). Browsers block location on plain http sites.

## Staff allocation by category
- Roles are now **user**, **staff** and **admin**. Categories: Water, Electricity, Road, Sanitation,
  Public Services, Other (edit in `frontend/src/utils/format.js` **and** `backend/config/categories.js`).
- **Admin > Users & Staff**: click **Add staff** to create a staff login with one or more categories, or use
  **Make staff** / **Edit categories** on any existing user. The page also shows which staff cover each category.
- **Auto-assignment**: when a complaint is submitted, it goes to the staff member who covers that category and
  has the fewest open (Pending / In Progress) complaints. If nobody covers it, it stays unassigned. When you
  add staff or change categories, unassigned complaints are picked up and open complaints in dropped
  categories are handed to other staff.
- **Manual assignment**: admins can reassign any complaint from the Complaints list or the complaint page,
  and send the assigned staff a WhatsApp message.
- **Staff login** lands on **My work**: only complaints assigned to them (or unassigned in their categories).
  Staff can update status and add the GPS-photo review, but cannot delete complaints or manage users.
- Users can see the assigned staff name and phone on their complaint.
