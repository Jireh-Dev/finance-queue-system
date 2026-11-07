# University of the Assumption — Finance Office Appointment & Queue Management System

A production-ready, full-stack web application designed for the **University of the Assumption (UA)** Finance and Accounting Office. Provides streamlined appointment scheduling, cryptographically secure QR ticket generation, real-time multi-counter live queue management, and comprehensive administrative audit governance.

---

## 🏛️ 1. Institutional Branding & Colors
* **Primary Color:** UA Royal Blue (`#004B87` / `#003366`) and Crisp White
* **Secondary / Accent Colors:** Fire Red (`#C62828`) and Yellow Gold (`#D97706` / `#F59E0B`)
* **Design Philosophy:** Clean, institutional, responsive layout optimized for smartphones, tablets, desktop cashier counters, and lobby TV signage boards.

---

## 🚀 2. System Accounts & Access

Accounts for institutional operations (Administrator, Cashier, Door Kiosk) are provisioned via database seed scripts or the Administration portal.

| Role | Default Email | Full Name & Details |
| :--- | :--- | :--- |
| **Student** | Registered via `/register` | Self-service registration |
| **Parent** | Registered via `/register` | Self-service registration |
| **Cashier / Staff** | `cashier@ua.edu.ph` | Window 1 Cashier |
| **Door Kiosk** | `kiosk@ua.edu.ph` | Door Scanner Terminal |
| **Administrator** | `admin@ua.edu.ph` | Finance Director |

> **Note:** Initial passwords should be set via environment variables in production (`INITIAL_ADMIN_PASSWORD`, etc.) or configured securely by the system administrator upon first setup.

---

## 🔐 3. Security & QR Code Specification

* **CSPRNG 256-bit Security:** QR codes strictly contain cryptographically secure pseudo-random hex tokens (`crypto.randomBytes(32).toString('hex')`).
* **Zero PII in QR Codes:** Personal identification information (PII) and raw database IDs are never stored in plain text inside QR codes.
* **Tamper-Evident Verification:** The backend verifies whether a token is valid, expired, already completed, or previously cancelled. Any unauthorized or invalid QR scan attempt is flagged and logged in the immutable `AuditLog` table with IP address and timestamp.
* **Password Hashing:** Industry-standard `bcryptjs` salted password hashing.
* **Role-Based Access Control (RBAC):** Students and parents can only view their own bookings; cashier staff can validate check-ins and advance queues; administrators manage governance and audit trails.

---

## 📋 4. Key Functional Modules

### A. Authentication & Role Portal (`/login`, `/register`)
* Role-specific registration and logins (Student, Parent, Cashier/Staff, Administrator).
* One-click demo sign-in for seamless mid-term evaluation.

### B. Student / Parent Dashboard (`/dashboard`) & Booking (`/book`)
* Schedule finance appointments with customizable purposes:
  * Tuition Fee Payment (Full / Installment)
  * Downpayment / Enrollment Assessment
  * Miscellaneous & Lab Fees
  * Graduation & Diploma Clearance
  * Transcript of Records (TOR) & Certification Fee
  * Scholarship & Grant Verification
  * Refund & Account Overpayment Inquiries
* Digital QR ticket modal with **High-Resolution QR display**, **PNG Download**, and **Print Ticket** layout.
* Live queue status widget showing current serving queue number and estimated waiting time.
* Ability to reschedule or cancel eligible appointments.

### C. Cashier & Staff Terminal (`/staff`)
* Multi-window counter selector (Window 1 to 4).
* Built-in QR scanner interface and manual simulation validator.
* One-click check-in assigns sequential daily queue numbers (`#101`, `#102`, etc.).
* "Call Next in Line" quick button with visual pulse notification.
* Mark transactions as "Completed" with official receipt remarks or mark "Missed".
* Automatic rejection of expired, cancelled, or reused QR tokens.

### D. Public Live Queue Display Board (`/queue`)
* Fullscreen-ready digital signage board for lobby TV displays.
* Real-time polling mechanism (every 3 seconds) for live queue updates without page reloads.
* Multi-window "Now Serving" counter cards and "Next in Line" waiting list.

### E. Administrator Console (`/admin`)
* **Reports & Analytics:** Today's visitors, throughput, transaction purpose breakdown bar charts.
* **Security & Audit Trail:** Filter logs by `QR_INVALID`, `QR_SCANNED_SUCCESS`, `STATUS_UPDATED`, `USER_LOGIN`.
* **User Governance:** View all registered accounts, change roles, search by student ID.

---

## 🛠️ 5. Tech Stack & Architecture

* **Framework:** Next.js 14 App Router (React 18, TypeScript)
* **Styling:** Tailwind CSS with custom UA color extensions
* **Database & ORM:** Prisma ORM with PostgreSQL (Supabase / serverless compatible)
* **QR Generation:** `qrcode` high-density SVG/PNG renderer
* **Icons:** `lucide-react`
* **Security:** Node `crypto`, `bcryptjs`, `jsonwebtoken`

---

## 🏃 6. Running the Application Locally

1. **Install Dependencies:**
   ```bash
   npm install
   ```

2. **Database Migration & Seeding:**
   ```bash
   npx prisma generate
   npx prisma db push
   node prisma/seed.js
   ```

3. **Start the Development Server:**
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000` in your web browser.

4. **Production Build & Start:**
   ```bash
   npm run build
   npm start
   ```

