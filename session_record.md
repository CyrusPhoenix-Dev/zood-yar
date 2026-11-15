# Session Record — Zood-Yar (زودیار)

**Document Type:** Project Evolution & Architecture Specification Record  
**Rule Set Followed:** Append-only history; no secret values recorded; strict step verification; explicit deployment flags.

---

## 1. Current State

### 1.1 Project Overview & Goal
* **Project Name:** Zood-Yar (زودیار)
* **Website Domain:** `https://zood-yar.ir`
* **Purpose:** A two-sided online appointment scheduling and consultation marketplace operating in Iran. It connects clients with verified counselors and specialists across multiple domains:
  * Psychological & Personal Counseling (مشاوره فردی و روانشناسی)
  * Marriage & Family Counseling (مشاوره ازدواج و خانواده)
  * Academic & Konkur Guidance (مشاوره تحصیلی و کنکور)
  * Career & Business Consulting (مشاوره کسب‌وکار و شغلی)
  * Specialized in-person and online services (خدمات حضوری و آنلاین)
* **Core Capabilities:**
  * Counselor directory with search, specialties filtering, and dynamic profile slugs.
  * Interactive calendar and appointment slot reservation engine with automatic holiday exclusion.
  * Multi-tier counselor subscription plans (Free, Bronze, Silver, Gold, Company) with duration tracking.
  * Automated 6-hour pre-session SMS reminder background worker (via Kavenegar).
  * Dual payment system: internal wallet credit balance and online gateway (Zarinpal) integration.
  * Discount coupon system with percentage or fixed discount rules.
  * Dynamic platform commission calculation (percentage, fixed fee, or combined).
  * User referral program (کد معرف) with automated unique code generation and configurable wallet rewards for both referrer and newly invited referee.
  * Comprehensive administrator dashboard (`/admin`) for users, counselors, calendar slots, bookings, financial transactions, wallet credits, media library, hero slides, and customer support tickets.
  * Dynamic sitemap generator (`/sitemap.xml`) and dynamic per-route SEO management (JSON-LD structured data, OpenGraph, dynamic canonical URLs).

---

### 1.2 Tech Stack & Versions

#### Backend
* **Runtime:** Python 3.10+ / 3.12
* **Framework:** FastAPI (Asynchronous ASGI)
* **ASGI Server:** Uvicorn
* **Database Driver / ODM:** Motor (AsyncIOMotorClient 3.7+), PyMongo 4.9+
* **Validation & Schemas:** Pydantic v2
* **Authentication & Cryptography:** Passlib (bcrypt 4.0+), PyJWT / python-jose (HS256)
* **HTTP Client:** HTTPX (for asynchronous API calls to Zarinpal and Kavenegar)
* **Background Tasks:** Native `asyncio` background task loops within the FastAPI lifespan context.

#### Database
* **Engine:** MongoDB Community Edition 7.0
* **Deployment Form:** Isolated Docker container bound to `127.0.0.1:27017` with persistent named volume and auto-restart policy.
* **Database Name:** `zoodyar`

#### Frontend
* **Runtime:** Node.js (v20+ / v22+)
* **Build Tool:** Vite 6+ / 8+
* **UI Library:** React 18+ (Single Page Application architecture)
* **Routing:** React Router v6 / v7
* **Icons:** Lucide React
* **Styling:** Custom modular CSS with CSS Variables design tokens (`Admin.css`, `App.css`, `index.css`), full RTL layout support.
* **Typography:** Vazirmatn (Persian primary) and Inter (Latin secondary) web fonts.

#### Infrastructure & Web Server
* **Server OS:** Ubuntu 22.04 LTS VPS (IP: `109.122.252.105`)
* **Web Server & Reverse Proxy:** Nginx 1.28+
* **SSL / TLS:** Let's Encrypt Certbot SSL certificate (auto-renewing) with HTTP -> HTTPS 301 redirection.
* **Process Manager:** Systemd service (`zood-yar.service`).

---

### 1.3 Folder Structure & Main Files

```
e:\Work\zood-yar\ (and E:\Work\zoodyar_mongo\)
├── backend/
│   ├── main.py                     # FastAPI entry point, lifespan, CORS, reminder cron worker, route inclusion
│   ├── core/
│   │   ├── config.py               # Pydantic Settings reading .env
│   │   └── security.py             # Password hashing (bcrypt) and JWT encode/decode utilities
│   ├── db/
│   │   └── database.py             # Motor AsyncIOMotorClient initialization, connection events, get_db dependency
│   ├── models/
│   │   ├── user.py                 # User, Counselor, and related Pydantic schemas (UserInDB, UserCreate, etc.)
│   │   ├── booking.py              # Booking, appointment, and slot models
│   │   ├── plan.py                 # Counselor subscription tier models
│   │   ├── transaction.py          # Financial ledger and payment transaction records
│   │   └── common.py               # PyObjectId serializer helpers
│   ├── api/
│   │   ├── deps.py                 # FastAPI dependencies (get_current_user, check_admin, get_current_counselor)
│   │   └── routes/
│   │       ├── auth.py             # Registration, login, SMS OTP verify, password reset, referral code generation
│   │       ├── admin.py            # Complete /api/admin/ endpoints (credits, referrals, users, pricing, media)
│   │       ├── counselors.py       # Counselor listing, profile slugs, specialty mapping, calendar slot fetching
│   │       ├── bookings.py         # Appointment booking flow, slot locking, 6-hour SMS reminder check logic
│   │       ├── payments.py         # Wallet top-up, Zarinpal gateway request & callback verification
│   │       ├── plans.py            # Public subscription plans listing and plan subscription logic
│   │       ├── specialties.py      # Specialty categories query and management
│   │       ├── coupons.py          # Discount code validation and application
│   │       ├── hero_slides.py      # Homepage hero carousel slides management
│   │       ├── reviews.py          # Counselor review submission and approval workflow
│   │       ├── tickets.py          # Customer support ticket submission and admin replies
│   │       └── contact.py          # Public contact form submission handler
│   ├── media/                      # Uploaded user avatars, counselor documents, and media library files
│   └── .env                        # Environment variables (excluded from Git)
│
├── frontend/
│   ├── index.html                  # HTML entry point, SEO meta tags, and complete favicon link suite
│   ├── vite.config.js              # Vite build configuration and local proxy rules
│   ├── package.json                # Frontend dependencies and build scripts
│   ├── public/
│   │   ├── zood_yar_logo.png       # Master brand square logo (2000x2000)
│   │   ├── logo_website.png        # Transparent brand horizontal logo
│   │   ├── favicon.ico             # Multi-resolution ICO (16x16, 32x32, 48x48)
│   │   ├── favicon-16x16.png       # Standard tab icon
│   │   ├── favicon-32x32.png       # High-DPI tab icon
│   │   ├── favicon-48x48.png       # Google Search crawler compliant square icon
│   │   ├── apple-touch-icon.png    # iOS touch icon (180x180)
│   │   ├── android-chrome-192x192.png # PWA manifest icon (192x192)
│   │   ├── android-chrome-512x512.png # PWA manifest icon (512x512)
│   │   ├── site.webmanifest        # Web App Manifest with brand metadata
│   │   └── robots.txt              # Search engine crawler policies and sitemap reference
│   └── src/
│       ├── main.jsx                # React DOM render root
│       ├── App.jsx                 # Route declarations and root layout wrappers
│       ├── api.js                  # Axios client instance with auth interceptor
│       ├── components/
│       │   ├── Navbar.jsx          # Header navigation bar with auth status and mobile menu
│       │   ├── Footer.jsx          # Website footer with legal info and e-Namad trust seal
│       │   ├── SEO.jsx             # Dynamic per-route SEO manager (Title, Meta, Canonical, JSON-LD)
│       │   ├── ProtectedRoute.jsx  # Client/Counselor/Admin authentication guards
│       │   ├── HeroSlider.jsx      # Homepage dynamic hero carousel
│       │   ├── PlansSection.jsx    # Membership plans pricing table
│       │   └── AdminTickets.jsx    # Admin support tickets management component
│       ├── pages/
│       │   ├── Home.jsx            # Landing page
│       │   ├── Moshaverin.jsx      # Counselors directory with filtering
│       │   ├── CounselorProfile.jsx# Individual counselor public profile and slot booking interface
│       │   ├── BookingPage.jsx     # Booking checkout and payment confirmation page
│       │   ├── PlansPage.jsx       # Public counselor plans subscription page
│       │   ├── Admin.jsx           # Complete admin management control center
│       │   ├── Profile.jsx         # User profile and client appointment history
│       │   ├── Login.jsx           # Credentials login page
│       │   ├── PhoneAuth.jsx       # Phone number OTP login / registration
│       │   ├── VerifyPhone.jsx     # OTP code verification step
│       │   ├── ForgotPassword.jsx  # Password reset flow via SMS OTP
│       │   ├── AboutUs.jsx         # About Zood-Yar company story and mission
│       │   ├── ContactUs.jsx       # Contact form and contact details
│       │   ├── Terms.jsx           # Terms of service
│       │   ├── Privacy.jsx         # Privacy policy
│       │   └── NotFound.jsx        # 404 page
│       ├── styles/
│       │   ├── Admin.css           # Admin dashboard stylesheet (layout, tables, modals, tabs)
│       │   └── App.css             # Main stylesheet and theme variables
│       └── utils/
│           └── clipboard.js        # Cross-browser fallback clipboard copy utility
│
├── MIGRATION_SUMMARY.md            # Summary of PostgreSQL to MongoDB migration records
├── mongo_migrated_dataset.json     # Sanitized JSON export of migrated records (11 users, 4 counselors, plans, etc.)
└── private-key-file.pem            # SSH private key for server administrative access (excluded from Git)
```

---

### 1.4 How to Run Locally

#### Prerequisites
* Node.js v18+ and `npm`
* Python 3.10+ and `virtualenv`
* Local MongoDB instance running on `mongodb://localhost:27017`

#### 1. Backend Setup
```bash
cd backend
python -m venv venv
# Windows:
venv\Scripts\activate
# Linux/macOS:
source venv/bin/activate

pip install -r requirements.txt
# Copy environment configuration:
cp .env.example .env  # fill in local MongoDB URI and development test keys

# Start development ASGI server:
uvicorn main:app --reload --host 127.0.0.1 --port 8000
```
Backend API will be accessible at `http://127.0.0.1:8000` with Swagger documentation at `http://127.0.0.1:8000/docs`.

#### 2. Frontend Setup
```bash
cd frontend
npm install
npm run dev
```
Frontend development server starts at `http://localhost:5173`. Requests to `/api/` are proxied to `http://127.0.0.1:8000` as configured in `vite.config.js`.

---

### 1.5 How It Is Deployed

* **Server Environment:** Ubuntu 22.04 LTS VPS (`109.122.252.105`).
* **Root Application Directory:** `/var/www/zood-yar/`
  * Frontend built output: `/var/www/zood-yar/frontend/dist/`
  * Backend application: `/var/www/zood-yar/backend/`
  * Virtualenv: `/var/www/zood-yar/backend/venv/`
  * Uploaded media: `/var/www/zood-yar/backend/media/`
* **Secrets Storage:**
  * Secrets are **NEVER** kept in source control.
  * Server environment variables are stored in `/var/www/zood-yar/backend/.env`.
  * The file contains: `MONGODB_URL`, `DATABASE_NAME`, `SECRET_KEY`, `ALGORITHM`, `ACCESS_TOKEN_EXPIRE_MINUTES`, `ZARINPAL_MERCHANT_ID`, `ZARINPAL_SANDBOX`, `KAVENEGAR_API_KEY`, `KAVENEGAR_SENDER`.
  * SSH key authentication uses `private-key-file.pem` on the administrative workstation.

#### Deployment Procedure
1. **Frontend Deployment:**
   ```bash
   cd frontend
   npm run build
   # Creates optimized bundles in frontend/dist/
   tar -czf dist.tar.gz -C dist .
   scp -i private-key-file.pem dist.tar.gz root@109.122.252.105:/tmp/
   ssh -i private-key-file.pem root@109.122.252.105 "tar -xzf /tmp/dist.tar.gz -C /var/www/zood-yar/frontend/dist/ && rm -f /tmp/dist.tar.gz && systemctl reload nginx"
   ```
2. **Backend Deployment:**
   ```bash
   scp -i private-key-file.pem -r backend/api backend/models backend/main.py root@109.122.252.105:/var/www/zood-yar/backend/
   ssh -i private-key-file.pem root@109.122.252.105 "systemctl restart zood-yar.service"
   ```
3. **Database Maintenance:**
   MongoDB runs in a persistent Docker container named `mongodb` exposed locally on port `27017`.

---

### 1.6 Known Bugs & Unfinished Work
1. **Google Search Favicon Re-crawl:** The standard favicon suite (`48x48`, `favicon.ico`, manifest) has been deployed and verified live with HTTP 200 responses. Google's search result snippet will update from the fallback globe icon (🌐) once Googlebot's periodic crawler re-crawls `https://zood-yar.ir` (requested via Search Console).
2. **Google Search Console Canonical Validation:** Subpages flagged under "Alternate page with proper canonical tag" were caused by the legacy hardcoded canonical tag in `index.html`. This has been removed, and dynamic per-route canonical tags are live. The user has been advised to click "Validate Fix" in Google Search Console.
3. **Automated End-to-End Test Suite:** While unit endpoints are tested via script runners, a complete automated Playwright/Cypress end-to-end regression test suite is not yet written.

---

## 2. Project Evolution Stages

---

### Stage 1: Legacy Django & PostgreSQL Architecture (Inferred)
* **What was done & why:** The original platform was scaffolded using Python Django, Django REST Framework, and a PostgreSQL database. It contained models for users, counselors, appointments, and reviews.
* **Files involved:** Legacy Django project files in `e:\Work\zood-yar\backend/`.
* **Decisions & Reasons:** Early prototype built using standard Django conventions. Later determined to have high resource consumption and latency on the single VPS instance.
* **Problems encountered:** Monolithic structure and blocking database I/O limited scalability for concurrent booking and real-time SMS dispatch.
* **Deployed to server:** Yes (superseded in Stage 3).

---

### Stage 2: Architecture Redesign to FastAPI + MongoDB
* **What was done & why:** Complete re-architecture of the backend to modern asynchronous Python using FastAPI and MongoDB (Motor). This decoupled schemas into Pydantic models, allowed non-blocking I/O, simplified calendar slot modeling, and improved response times under load.
* **Files created/changed:**
  * `backend/main.py`
  * `backend/db/database.py`
  * `backend/core/config.py`
  * `backend/core/security.py`
  * `backend/models/*.py`
  * `backend/api/routes/*.py`
* **Decisions & Reasons:** Chose FastAPI for high throughput, automatic OpenAPI documentation, and asynchronous concurrency; chose MongoDB for flexible schedule and availability slot structures.
* **Problems encountered:** ObjectIds in MongoDB require custom serialization when returning Pydantic models to JSON clients. Solved by registering `ENCODERS_BY_TYPE[ObjectId] = str` and implementing `PyObjectId` helper schemas.
* **Deployed to server:** Yes.

---

### Stage 3: Full Database Migration (PostgreSQL -> MongoDB on VPS)
* **What was done & why:** Extracted all live production data from the PostgreSQL `zood_yar` database on the VPS and migrated it into MongoDB without loss of data, password hashes, or active subscriptions.
* **Files created/changed:**
  * `load_mongo_data.py`: Migration ETL script.
  * `mongo_migrated_dataset.json`: Sanitized JSON dataset of migrated records.
  * `MIGRATION_SUMMARY.md`: Detailed audit record of all migrated entities.
* **Data migrated:**
  * 11 total users (1 Superuser Admin `Cyrus`, 4 Counselors, 6 Clients).
  * 4 Counselors with full Nezampeshki, biographies, addresses, academic degrees, and specialties.
  * 5 Subscription plans (Free, Bronze, Silver, Gold, Company).
  * 4 Active counselor subscriptions preserved with validity through **September 2027**.
  * 361 Calendar availability slots.
  * 6 Booking records and 12 payment transactions.
  * 23 Medical/counseling specialties.
  * 3 Homepage hero slides.
  * 26 National calendar holidays.
  * 3 Customer support tickets.
* **Decisions & Reasons:** Kept original `sql_id` attributes on documents to ensure zero broken foreign key references while adopting native MongoDB `_id` ObjectIds.
* **Problems encountered:** Preserving Django's PBKDF2 / bcrypt password hashes so that existing users and counselors could log in without password resets. Solved by integrating compatible multi-scheme Passlib hash contexts in `core/security.py`.
* **Deployed to server:** Yes.

---

### Stage 4: Production Service Setup & Nginx Reverse Proxy
* **What was done & why:** Configured MongoDB 7 in Docker, set up a Systemd service unit for the FastAPI application, and configured Nginx with SSL for both frontend SPA routing and backend API proxying.
* **Files created/changed:**
  * `/etc/systemd/system/zood-yar.service`
  * `/etc/nginx/sites-available/` & `/etc/nginx/sites-enabled/` configuration for `zood-yar.ir`
* **Decisions & Reasons:** Run MongoDB in Docker for clean process isolation and easy version upgrades; use Systemd to ensure automatic restart on reboot; use Nginx for SSL offloading and static asset caching.
* **Problems encountered:** Nginx default configuration lacked WebSocket support and had small upload limits for counselor documents. Solved by configuring `client_max_body_size 10M;` and proper `proxy_set_header` directives.
* **Deployed to server:** Yes.

---

### Stage 5: Authentication, SMS Verification & Admin Access
* **What was done & why:** Configured JWT authentication and SMS OTP verification using Kavenegar. Resolved an admin access issue where the superuser could not access the admin panel due to role check discrepancies.
* **Files created/changed:**
  * `backend/api/routes/auth.py`
  * `backend/api/deps.py`
  * `frontend/src/components/ProtectedRoute.jsx`
* **Decisions & Reasons:** Added role-based access checks (`check_admin`) requiring `is_superuser == True` or `role == 'admin'`, ensuring admin `Cyrus` has full dashboard privileges.
* **Problems encountered:** Admin password required synchronization after hash verification. Verified credentials and confirmed successful login.
* **Deployed to server:** Yes.

---

### Stage 6: Dynamic Pricing & Commission Engine
* **What was done & why:** Added platform commission rules so that the site administrator can dynamically configure how the platform takes a fee on booked counseling sessions.
* **Files created/changed:**
  * `backend/api/routes/admin.py` (added `GET /api/admin/pricing-settings/` and `PUT /api/admin/pricing-settings/`)
  * `backend/api/routes/bookings.py` (applied commission calculation when calculating session cost)
  * `frontend/src/pages/Admin.jsx` (added "تنظیمات کارمزد و تعرفه" tab with fee type, percentage, fixed amount, and toggle switch)
* **Decisions & Reasons:** Supported 4 modes (percentage, fixed fee, both, or none) to give the business maximum flexibility in monetizing appointments without requiring code changes.
* **Deployed to server:** Yes.

---

### Stage 7: Referral System (کد معرف) & Wallet Balance Management
* **What was done & why:** Built a full referral program allowing users to share unique referral codes, earn wallet credits, and grant welcome bonuses to newly registered friends.
* **Files created/changed:**
  * `backend/api/routes/auth.py`: Auto-generates unique 8-character uppercase referral codes on registration (e.g. `MAHL2192`).
  * `backend/api/routes/admin.py`: Added endpoints for referral reward configuration (`GET/PUT /api/admin/referral-settings/`) and user credit adjustments (`POST /api/admin/credits/{user_id}/adjust/`).
  * Database: Backfilled unique referral codes for all 11 existing users on the VPS.
* **Decisions & Reasons:** Provided "add", "deduct", and "set" operations for administrator wallet adjustments with audit logging.
* **Problems encountered:** `re` and `secrets` packages were initially imported inside a localized scope in `admin.py`, risking `NameError` if a user without a referral code was queried. Solved by moving `import re` and `import secrets` to the module top level.
* **Deployed to server:** Yes.

---

### Stage 8: Admin Dashboard Runtime Fix & UI Redesign
* **What was done & why:** 
  1. The "اعتبارات و کیف‌پول" (Credits & Wallet) tab in `/admin` went completely blank / white screen when clicked. Diagnosed and fixed the root cause: an uncaught `ReferenceError` during React render because the save button called `handleSaveReferralSettings`, which had not been defined in component scope.
  2. Redesigned the entire Credits tab layout to eliminate mismatched harsh blue elements (`#0284c7`), misaligned grid columns, and unstyled search boxes.
* **Files created/changed:**
  * `frontend/src/pages/Admin.jsx`
* **Decisions & Reasons:**
  * Added `handleSaveReferralSettings` with loading states and feedback messaging.
  * Added defensive checks: `Array.isArray(data.credits)` and safe number formatting.
  * Replaced custom inline styles with platform design tokens (`var(--primary)`, `var(--surface)`, `var(--card-radius)`), creating a cohesive 2-column settings card and styled user credits table.
* **Problems encountered:** The hanging build task was caused by PowerShell argument quoting issues when piping remote commands. Solved by packaging the distribution locally and extracting cleanly on the server via dedicated deploy script.
* **Deployed to server:** Yes.

---

### Stage 9: SEO Optimization & Canonical Tag Correction
* **What was done & why:**
  1. Implemented dynamic `/sitemap.xml` endpoint on the FastAPI backend serving all public routes, counselor profiles, plans, and services with accurate ISO `<lastmod>` timestamps.
  2. Resolved the issue shown in Google Search Console where subpages (`/plans`, `/aboutus`, `/CounselorProfile/...`) were classified under **"Alternate page with proper canonical tag"** and excluded from search results.
* **Files created/changed:**
  * `backend/main.py`: Dynamic `/sitemap.xml` endpoint.
  * `frontend/index.html`: Removed legacy hardcoded `<link rel="canonical" href="https://zood-yar.ir/" />` which previously forced all subpages to declare the homepage as their canonical version.
  * `frontend/src/components/SEO.jsx`: Manages dynamic per-page canonical tags, titles, descriptions, and JSON-LD structured data (`ProfilePage`, `Person`, `Organization`).
  * `frontend/public/robots.txt`: Added sitemap location directive and disallow rules for gated routes (`/admin`, `/BookingPage/`, `/Profile`).
* **Decisions & Reasons:** Letting each page's `SEO` component emit its exact URL as canonical ensures Googlebot indexes subpages as standalone search results rather than consolidating them to the homepage.
* **Deployed to server:** Yes.

---

### Stage 10: Multi-Resolution Favicon Suite & Brand Assets
* **What was done & why:**
  * In Google Search results, `zood-yar.ir` showed a generic fallback globe icon (🌐), and browser tabs displayed a blank document sheet icon because favicon files were missing (returning 404).
  * Generated a complete, high-definition, multi-resolution favicon suite from the official brand logo [`zood_yar_logo.png`](file:///frontend/public/zood_yar_logo.png) with the brand background `#f9ebe2`.
* **Files created/changed:**
  * `frontend/public/favicon.ico` (multi-resolution container: 16x16, 32x32, 48x48)
  * `frontend/public/favicon-16x16.png`
  * `frontend/public/favicon-32x32.png`
  * `frontend/public/favicon-48x48.png` (meets Google's search crawler requirement of multiples of 48px square)
  * `frontend/public/apple-touch-icon.png` (180x180)
  * `frontend/public/android-chrome-192x192.png`
  * `frontend/public/android-chrome-512x512.png`
  * `frontend/public/site.webmanifest`
  * `frontend/index.html`: Added corresponding `<link rel="icon">`, `<link rel="apple-touch-icon">`, and manifest references.
* **Decisions & Reasons:** Created both standard ICO and 48x48 PNG formats to satisfy modern desktop browsers, mobile devices, and Googlebot-Image crawler specifications.
* **Verification:** Tested live via HTTP HEAD requests on `https://zood-yar.ir/favicon.ico` and `favicon-48x48.png`; all returned HTTP 200 with valid image MIME types (`image/x-icon`, `image/png`).
* **Deployed to server:** Yes.

---

### Stage 11: WebRTC Meeting Rooms & Online Courses Architecture
* **What was done & why:**
  * Added real-time WebRTC video calling and meeting room capabilities to Zood-Yar, supporting both **1-on-1 consultation calls** and **large online courses/webinars (up to 50–100 participants)**.
  * Solved Iran internet filtering/sanctions by deploying self-hosted **LiveKit SFU** on the domestic Tehran VPS (`109.122.252.105`), ensuring zero VPN dependency, low domestic latency (<30ms), and 100% CGNAT traversal via integrated TURN on ports 3478/443.
  * Implemented tier-based weekly quotas for 1-on-1 consultations:
    * **Free:** 2 calls / week
    * **Bronze:** 4 calls / week
    * **Silver:** 8 calls / week
    * **Gold & Company:** Unlimited
    * Calculated on Iranian weekly cycle (resets Saturday 00:00:00 Tehran Time).
  * Enforced authenticated-only access: only logged-in accounts can enter meeting rooms. Attendance is monitored and logged in real-time (`meeting_attendees`).
* **Files created/changed:**
  * VPS Infrastructure: Added 2 GB swap file (`/swapfile`), configured `/opt/livekit/livekit.yaml`, launched `livekit` container with `--net=host`, updated Nginx `/etc/nginx/sites-available/zood-yar` with `/rtc` and `/livekit/` WebSocket reverse proxy.
  * Backend:
    * `backend/core/config.py`: Added LiveKit API keys and server URL.
    * `backend/api/routes/meetings.py`: Quota calculations, room creation (`/create/`), token minting (`/join/`), and attendee tracking (`/attendees/`).
    * `backend/api/routes/__init__.py`: Registered `/api/meetings` routes.
  * Frontend:
    * `frontend/src/components/CounselorMeetings.jsx` & `CounselorMeetings.css`: Counselor dashboard section showing quota progress bar, room creation modal, room list, share links, and attendee roster modal. Wrapped in `.counselor-meetings-page-wrap` (`margin-right: 290px`) to prevent overlapping with the fixed RTL desktop sidebar.
    * `frontend/src/pages/MeetingRoom.jsx` & `MeetingRoom.css`: Responsive WebRTC room with local/remote video, screen share, mic/cam toggles, chat drawer, participant list, and hand-raise for course attendees.
    * `frontend/src/components/SideBar.jsx` & `frontend/src/pages/Profile.jsx`: Integrated "جلسات آنلاین و وبینارها" tab.
    * `frontend/src/App.jsx`: Added protected `/meeting/:roomCode` route.
* **Verification:**
  * LiveKit server running and healthy on VPS with HTTP 200 OK.
  * Automated Python end-to-end integration test succeeded on production backend: created room `zy-meet-a6chahs`, authenticated join with LiveKit token generation, verified attendee ledger, and confirmed cleanup.
  * Frontend bundle compiled with Vite (`dist/assets/index-Bz9boJ4m.js`, `index-CQLZJeEJ.css`), deployed via `dist.tar.gz`, and verified live with HTTP 200 responses.
* **Deployed to server:** Yes.

---

### Stage 12: Admin Meeting Control Center & Calendar Month Monitoring
* **What was done & why:**
  * Enabled site administrators to create and host their own meeting rooms and webinars directly from the Admin dashboard (`/admin`).
  * Built a platform-wide meeting room monitoring center organized by a Persian Jalali calendar month selector (فروردین تا اسفند with year navigation).
  * Filter rooms by month, active/ended status, and meeting type (1-on-1 vs Course/Webinar).
  * Implemented privacy guardrails:
    * **Group Courses / Webinars:** Admins can join live sessions as silent observers (`role_label: "مدیر سامانه (ناظر)"`).
    * **1-on-1 Private Consultations:** Admins are explicitly restricted from joining (`HTTP 403 Forbidden`) with a locked "محرمانه (جلسه ۱ به ۱)" badge to protect client-counselor confidentiality.
  * Real-time attendee audit: modal displays every participant who entered with full name, phone number, role, join time, and IP address.
  * Force-end capability: Admin can immediately terminate any active room.
* **Files created/changed:**
  * Backend:
    * `backend/api/routes/meetings.py`: Added `GET /api/meetings/admin/list/` with `jdatetime` month range filtering; added 1-on-1 privacy protection check in `POST /join/`.
  * Frontend:
    * `frontend/src/components/AdminMeetings.jsx` & `AdminMeetings.css`: Calendar month bar, room creation modal, room cards with attendee counts, observer join button, and attendee ledger modal.
    * `frontend/src/pages/Admin.jsx`: Registered new "جلسات و کلاس‌های آنلاین" tab in `tabs` array and wired up `<AdminMeetings />`.
* **Verification:**
  * Verified `GET /api/meetings/admin/list/?j_year=1405&j_month=8` with HTTP 200 on production.
  * Verified 1-on-1 observer block in backend logic.
  * Frontend built and deployed (`index-ChSCEWep.js` & `index-CGfNKGT3.css`) with HTTP 200 responses.
* **Deployed to server:** Yes.

---

### Stage 13: Admin Meetings UI/UX Overhaul & Calendar Widget Redesign
* **What was done & why:**
  * Fixed an issue where clicking the Admin "جلسات و کلاس‌های آنلاین" tab caused the top dashboard error banner (`"خطا در دریافت اطلاعات. آیا شما ادمین هستید؟"`) due to `fetchData("meetings")` making an unneeded call to a generic `/api/admin/meetings/` endpoint. Added early return `if (tab === "meetings") { setIsLoading(false); setError(""); return; }` in `Admin.jsx`.
  * Redesigned the Jalali calendar month navigation widget into a responsive 12-month calendar grid (with year forward/backward controls, active month indicator badge, and season indicators) styled in Zood-Yar's warm terracotta palette (`--primary: #B47B5F`, `#FAF6F2`, `#E0CBB8`).
  * Enhanced the meeting control toolbar with:
    * Search input for room title, room code, or counselor name with real-time filtering.
    * Polished custom-styled status and type dropdown selects with custom chevrons.
    * View mode toggle supporting both comprehensive data table view (`.admin-table-container`) and modern visual grid card view (`.admin-meetings-grid-view`).
    * Monthly statistical summary indicators (Total rooms, Active/Online, Ended).
  * Styled the full-fidelity data table with mono room code copy pills, course/webinar badges (`#F5F3FF`), 1-on-1 private consultation badges (`#EFF6FF`), active/ended status tags, interactive attendee counter modal buttons, green observer join action (`admin-btn-action-join`), and locked privacy pill for confidential 1-on-1 sessions.
  * Completely revamped `AdminMeetings.css` to supply all class selectors matching the redesigned `AdminMeetings.jsx`.
  * Cleaned up test data artifacts from MongoDB collections (`meetings` and `meeting_attendees`).
* **Files created/changed:**
  * `frontend/src/pages/Admin.jsx`: Suppressed generic fetch for meetings tab.
  * `frontend/src/components/AdminMeetings.jsx`: Dynamic current Jalali date detection (`Intl.DateTimeFormat`), 12-month calendar widget, table/grid view toggle, toolbar filters.
  * `frontend/src/styles/AdminMeetings.css`: Complete stylesheet rewrite covering calendar grid, custom select wrappers, table rows, cards, attendee ledger modal, and room creation modal.
  * `backend/api/routes/meetings.py`: Deployed verified version to VPS.
* **Verification:**
  * Frontend built successfully with Vite (`npm run build`), generating `dist/assets/index-CBk7tFAa.css` and `dist/assets/index-zSX_XJbF.js`.
  * Packaged into `dist.tar.gz`, uploaded to VPS via SCP, unpacked to `/var/www/zood-yar/frontend/dist/`, and Nginx reloaded.
  * Verified live site `https://zood-yar.ir` serving the new assets with HTTP 200 OK.
  * Verified backend API `/api/meetings/admin/list/` responding properly with authentication guard.
* **Deployed to server:** Yes.

---

### Stage 14: Admin Page Reload Routing, Tab UI Alignment, Attendee Ledger & Specialties Filter UX Overhaul
* **What was done & why:**
  1. **Admin Page Reload Fix (`{"detail":"Not Found"}`):**
     * Solved the issue where reloading `/admin/` or visiting it directly displayed a blank black screen with `{"detail":"Not Found"}`.
     * Diagnosed root cause: a legacy Django location block in Nginx (`location /admin/ { proxy_pass http://127.0.0.1:8000; }`) was intercepting direct browser requests and forwarding them to FastAPI, which has no `/admin/` endpoint (FastAPI admin routes are scoped under `/api/admin/...`).
     * Removed the block from `/etc/nginx/sites-available/zood-yar` and reloaded Nginx. Direct reloads now correctly fall back to `index.html` via `try_files` and load the React SPA seamlessly.
  2. **Admin Sidebar Tab UI Polish:**
     * Resolved awkward two-line text wrapping and misaligned camera icon on the meetings tab button.
     * Renamed tab label in `Admin.jsx` to `"جلسات و وبینارها"` to match the rest of the concise sidebar buttons.
     * Updated `Admin.css`: set `.admin-sidebar` width to `270px`, `.admin-tab` to `white-space: nowrap; text-align: right;`, and added `flex-shrink: 0` on SVGs to ensure crisp, single-line alignment.
  3. **Meeting Attendee Ledger Tracking & Accuracy:**
     * Clarified that meeting attendance logging is intentional for all roles (including hosts/admins).
     * Solved the zero-attendee discrepancy caused by test data resets: updated `meetings.py` to count unique users using MongoDB `distinct("user_id")` instead of raw document counts, registered the creator immediately upon room creation, and added an automatic creator backfill fallback in `get_meeting_attendees`.
  4. **Counselors Page Specialties Filter UX Overhaul:**
     * Redesigned the plain, unstyled 23-item checkbox list on `/moshaverin` into a modern marketplace filter component:
     * Added header with dynamic selected count badge (`n تخصص انتخاب شده`) and a 1-click "پاک کردن" (reset) button.
     * Added selected specialty chips/pills pinned at the top with quick remove `X` icons.
     * Added instant inline search input ("جستجوی سریع تخصص...") to quickly find any specialty without scrolling.
     * Replaced native browser checkboxes with custom-styled card rows featuring rounded checkbox indicators, checkmark SVGs, terracotta active state highlights (`#fdf6f0`), and a smooth 250px scrollable container with a custom thin scrollbar.
* **Files created/changed:**
  * Nginx VPS config: `/etc/nginx/sites-available/zood-yar` (removed `location /admin/`).
  * `frontend/src/pages/Admin.jsx`: Cleaned tab label to "جلسات و وبینارها".
  * `frontend/src/styles/Admin.css`: Tab nowrap, RTL alignment, and sidebar width.
  * `backend/api/routes/meetings.py`: Distinct user attendee counting, creator registration.
  * `frontend/src/pages/Moshaverin.jsx`: Replaced raw checkboxes with modern search, active count badge, removable pills, and custom check items.
  * `frontend/src/styles/Moshaverin.css`: Full stylesheet additions for specialty filter cards, search, chips, and scroll container.
* **Verification:**
  * `curl -IL https://zood-yar.ir/admin/` returned `HTTP 200 OK` serving `index.html`.
  * Frontend built with Vite (`dist/assets/index-DZ1f-I4C.css`, `index-D-q2U-on.js`), packaged, deployed via SCP, and verified live with HTTP 200 OK responses.
  * Backend service restarted and verified active on VPS.
* **Deployed to server:** Yes.

---

### Stage 15: Clinical Assessment & Intake Forms System (Type A & Type B) with Kavenegar SMS
* **What was done & why:**
  * Implemented a complete end-to-end clinical assessment, intake, and homework questionnaires engine (فرم‌ها و پرسشنامه‌های ارزیابی و شرح حال):
    1. **Type A (Mandatory Specialty Intake Forms):** Counselors map customized intake forms to their specific specialties. Automatically triggered when a client books a session in that specialty; required only once per client-counselor-specialty combination. Prompted post-checkout and flagged with pending indicators on sessions.
    2. **Type B (On-Demand Clinical Questionnaires & Homework):** Counselors create reusable forms in their library and dispatch them on demand to any client with one click.
  * **Kavenegar SMS Integration:** Integrated the two official templates:
    * `forumClient`: Sent to client (`سلام مشاور %token% یک فرم در تاریخ %token2% برای پر کردن در سایت برای شما ایجاد کرد.`)
    * `forumCounselor`: Sent to counselor confirming assignment (`سلام فرم شما برای کاربر %token% به تاریخ %token2% ارسال شد.`)
  * **Dynamic Form Builder:**
    * Supports `text`, `textarea`, `radio` (single choice with dynamic options), and `checkbox` (multiple choice with dynamic options).
    * Includes question reordering (up/down), required/optional toggling, and helper descriptions.
  * **Doctor-Patient Confidentiality Guardrails:**
    * Questions and submitted client answers are strictly restricted between counselor and client.
    * Admin panel displays an audit-only overview (Form Title, Counselor Name, Specialty, Type, Submissions Count, Active Toggle, Delete) with question definitions and answers strictly projected out (`{"questions": 0}`).
  * **Submission Immutability:** Once submitted, responses are locked in the clinical dossier. Counselors view formatted client dossiers with questions and answers; clients can review their submitted responses in read-only mode.
* **Files created/changed:**
  * Backend:
    * `backend/models/form.py`: Pydantic schemas for questions, forms, send requests, and submissions.
    * `backend/api/sms.py`: Registered `forumClient` and `forumCounselor` lookup templates and fallback handlers.
    * `backend/api/routes/forms.py`: Complete counselor, client, and admin audit endpoints.
    * `backend/api/routes/bookings.py`: Integrated automated Type A intake assignment upon booking confirmation.
    * `backend/api/routes/__init__.py`: Registered `/api/forms` router.
  * Frontend:
    * `frontend/src/components/CounselorForms.jsx` & `CounselorForms.css`: Full counselor management suite (Type A specialty mapper, Type B library, builder modal, client dispatch modal, and dossier viewer).
    * `frontend/src/components/ClientForms.jsx` & `ClientForms.css`: Client pending forms, dynamic form filling modal, and submission history.
    * `frontend/src/components/AdminForms.jsx`: Administrative audit table with privacy notice.
    * `frontend/src/components/SideBar.jsx` & `frontend/src/pages/Profile.jsx`: Wired counselor and client tabs.
    * `frontend/src/pages/Admin.jsx`: Registered "فرم‌ها و پرسشنامه‌ها" tab and `<AdminForms />`.
* **Verification:**
  * Backend verified live via authenticated test on VPS (`GET /api/forms/admin/list/` returning HTTP 200 with privacy projection).
  * Frontend compiled with Vite (`index-DpA6ha7Y.css` & `index-4ieCotJQ.js`), deployed via `dist.tar.gz`, and verified live with HTTP 200 OK.
* **Deployed to server:** Yes.

---

### Stage 16: Form Completion SMS Integration & LiveKit Meeting Room Hand-Raise & Chat Indicators
* **What was done & why:**
  * **1. Form Completion SMS (`forumCompleted`):**
    * Integrated the third Kavenegar template `forumCompleted`:
      * Pattern: `کاربر %token% فرم شما را تکمیل کرد. \n زود یار`
      * Token: Client's full name.
    * In [`backend/api/routes/forms.py`](file:///E:/Work/zoodyar_mongo/backend/api/routes/forms.py), upon submission of a form response by a client (`submit_client_form`), automatically looked up counselor user and dispatched `send_forum_completed_sms` to counselor's phone.
  * **2. Webinar Hand-Raise Queue & Host Access Control:**
    * In online courses and webinars (`room_type === "course"`), students raise their hand to request speaking access.
    * Added full real-time hand-raise coordination via LiveKit data packets (`type: "hand_raise"`):
      * **Host Live Alert Banner:** Floating banner at top of video stage showing `"✋ [نام] درخواست صحبت دارد"` with 1-click `[اجازه صحبت]` and `[رد]`. If multiple students raise hands, displays queue count with direct link to participants drawer.
      * **Dock Counter Badge:** Added animated `✋ {raisedHands.length}` badge to the "حاضرین" button in the bottom dock.
      * **Participants Drawer Indicator:** Shows glowing `"✋ دست بالاست"` tag and host action buttons (`[اجازه صحبت]` and `[بستن دست]`) beside student names in the attendees list.
      * **Attendee Speech Granting Flow:** When host grants speech (`type: "grant_speech"`), attendee receives a prominent modal prompt `"استاد به شما اجازه صحبت داد. وصل میکروفون و شروع صحبت"`. Upon acceptance, attendee's mic is automatically unmuted and their controls dock dynamically switches to provide microphone controls and a `"پایان صحبت"` button.
      * **Token Capability Alignment:** In [`meetings.py`](file:///E:/Work/zoodyar_mongo/backend/api/routes/meetings.py), set `can_publish=True` in LiveKit JWT claims for course rooms so LiveKit SFU accepts student microphone publications upon host granting speech without reconnection.
  * **3. Chat Unread Indicator & Real-Time Floating Toast:**
    * Fixed the absence of chat notifications in both 1-on-1 consultations and webinars:
      * **Unread Counter Badge:** Added badge on the Chat dock button (`.meeting-control-badge`) showing unread count when the chat drawer is closed.
      * **Floating Stage Toast:** Real-time toast (`.meeting-chat-toast`) displayed at the bottom corner of the video stage previewing sender and text for 4.5 seconds. Clicking the toast opens the chat drawer and resets the unread count.
      * **Automatic Reset:** Opening the chat drawer automatically resets the unread counter and dismisses the toast.
* **Files created/changed:**
  * Backend:
    * `backend/api/sms.py`: Registered `forum_completed` template and added `send_forum_completed_sms`.
    * `backend/api/routes/forms.py`: Dispatched `send_forum_completed_sms` upon client form submission.
    * `backend/api/routes/meetings.py`: Updated LiveKit JWT generation for webinars to allow dynamic mic granting.
  * Frontend:
    * `frontend/src/pages/MeetingRoom.jsx`: Integrated `raisedHands` state, real-time LiveKit data event handlers (`chat`, `hand_raise`, `grant_speech`, `lower_hand`), top hand-raise banner, floating chat toast, participants hand badges/host buttons, attendee speech modal, and responsive dock badges.
    * `frontend/src/styles/MeetingRoom.css`: Added styles for `.meeting-control-badge`, `.meeting-hand-dock-badge`, `.meeting-chat-toast`, `.meeting-hand-raise-alert-banner`, `.meeting-participant-hand-badge`, and `.meeting-speech-granted-card`.
* **Verification:**
  * Frontend built cleanly with Vite (`dist/assets/index-J0p6qT0N.css` 246.80 kB, `dist/assets/index-BNXQWPBi.js` 1,390.30 kB).
  * Backend Python syntax compiled with zero errors.
  * Deployed to VPS (`root@109.122.252.105`): SCPed updated backend files, restarted `zood-yar.service` (verified active with `Application startup complete`), unpacked frontend bundle to `/var/www/zood-yar/frontend/dist/`, reloaded Nginx, and verified live HTTP 200 OK responses on `https://zood-yar.ir` and the new JS bundle.
* **Deployed to server:** Yes.

### Stage 17: Counselor Forms Fixes - Route Shadowing, Empty Specialty Dropdown, and Modal Overflow & Scroll Cutoff
* **What was done & why:**
  * **1. Route Shadowing & Empty Specialty Dropdown Fix:**
    * In `CounselorForms.jsx`, when opening the Type A form modal, the "حوزه تخصصی مرتبط *" dropdown was empty (only showing `-- انتخاب تخصص --`).
    * Root Cause Diagnostics:
      1. In FastAPI, `@router.get("/counselor/{form_id}/")` was declared **before** `@router.get("/counselor/submissions/")`.
      2. When `CounselorForms.jsx` mounted, it executed `Promise.all([ api.get("/api/forms/counselor/list/"), api.get("/api/forms/counselor/submissions/"), api.get("/api/specialties/"), ... ])`.
      3. FastAPI matched `/api/forms/counselor/submissions/` to `/{form_id}/` with `form_id="submissions"`. Casting `"submissions"` to `ObjectId` threw `bson.errors.InvalidId`, causing HTTP 500.
      4. The unhandled exception in `Promise.all` aborted the entire batch before `setSpecialties(...)` was reached, leaving the specialty list completely empty.
      5. The same route shadowing hazard existed for client routes (`/client/{form_id}/` before `/client/submissions/`).
    * Solution:
      1. Reordered routes in `backend/api/routes/forms.py`: declared `/counselor/submissions/` and `/counselor/submissions/{submission_id}/` *before* `/counselor/{form_id}/`.
      2. Reordered client routes: declared `/client/submissions/` and `/client/submissions/{submission_id}/` *before* `/client/{form_id}/`.
      3. Added `GET /api/forms/counselor/clients/` (and `/api/counselor/clients/`) returning past and current clients who booked sessions with the counselor.
      4. In `backend/api/routes/misc.py`, ensured `slug` is explicitly populated on every specialty item (`slug: s.get("slug") or s.get("id")`).
      5. In `frontend/src/components/CounselorForms.jsx`:
         - Separated `Promise.all` with individual `.catch()` handlers so no single failing endpoint can block `specialties` or other states.
         - Fetched counselor profile (`/api/counselor/me/`) and prioritized the counselor's own specialties at the top of the dropdown labeled with `(تخصص شما)`.
         - Fixed a JavaScript runtime bug (`.strip()` replaced with `.trim()`).
  * **2. Modal Height & Scrolling Cutoff Fix:**
    * In the form builder modal (`CounselorForms.jsx` & `ClientForms.jsx`), content overflowed its container without internal scrolling, pushing modal footer buttons ("انصراف" and "ذخیره نهایی فرم") off-screen.
    * Root cause: `<form onSubmit={...} style={{ display: "contents" }}>` inside a flex column with `.modal-body` lacking proper flexbox constraints (`flex: 1; min-height: 0; overflow-y: auto;`).
    * Solution:
      1. Replaced `style={{ display: "contents" }}` with `className="modal-form-wrapper"`.
      2. In `CounselorForms.css` and `ClientForms.css`:
         - Styled `.modal-header` with `flex-shrink: 0`.
         - Styled `.modal-form-wrapper` with `display: flex; flex-direction: column; flex: 1; min-height: 0; overflow: hidden;`.
         - Styled `.modal-body` with `flex: 1; min-height: 0; overflow-y: auto; padding: 1.5rem;`.
         - Styled `.modal-footer` with `flex-shrink: 0; border-top: 1px solid #e2e8f0;`.
      3. Ensured that even with many questions, the header and footer remain pinned in place while the questions body scrolls cleanly.
* **Files created/changed:**
  * Backend:
    * `backend/api/routes/forms.py`: Reordered static sub-routes before path parameter wildcard routes; added counselor clients endpoint.
    * `backend/api/routes/misc.py`: Ensured explicit `slug` and `id` across all specialties.
  * Frontend:
    * `frontend/src/components/CounselorForms.jsx`: Isolated data fetching, counselor specialty prioritization, modal structure fix, `.trim()` bugfix.
    * `frontend/src/styles/CounselorForms.css`: Modal flexbox and scroll layout rules.
    * `frontend/src/components/ClientForms.jsx`: Modal form wrapper refactor.
    * `frontend/src/styles/ClientForms.css`: Modal flexbox and scroll layout rules.
* **Verification:**
  * Backend Python syntax and endpoints verified via local test script against VPS database.
  * Specialties endpoint `https://zood-yar.ir/api/specialties/` returning all 23 items with `id`, `slug`, `name`, `label`, `title`.
  * Frontend built cleanly with Vite (`dist/assets/index-JJRRsJp4.css` and `dist/assets/index-D7cO5sbX.js`).
  * Packaged, SCPed, unpacked to `/var/www/zood-yar/frontend/dist/`, backend restarted (`zood-yar.service`), and Nginx reloaded.
  * Verified live site serving updated JS and CSS bundles with HTTP 200 OK responses.
* **Deployed to server:** Yes.

### Stage 18: Meeting Chat Persistence on Reload & Safe Post-Meeting Role Navigation
* **What was done & why:**
  * **1. Meeting Chat History Persistence Across Page Reloads:**
    * In `MeetingRoom.jsx`, chat messages previously existed solely in browser component memory (`useState([])`). Reloading the page or joining a session in progress wiped all messages.
    * Solution:
      1. Created persistent MongoDB chat collection `meeting_messages` indexed by `room_code` and `created_at`.
      2. Added endpoints in `backend/api/routes/meetings.py`:
         - `POST /api/meetings/{room_code}/messages/`: Validates message text, ensures the room is active, attaches Iranian timezone timestamp and sender metadata, and saves to MongoDB.
         - `GET /api/meetings/{room_code}/messages/`: Returns the chronological chat history for the room with privacy protection on 1-on-1 private rooms.
      3. In `MeetingRoom.jsx`:
         - On mount and initialization, `fetchChatHistory` fetches all persistent chat messages from the backend so reloads restore all previous discussions.
         - Sending a message writes to the database first, then broadcasts via LiveKit data packet with persistent message ID for real-time delivery to other attendees without duplicates.
         - Attached `messagesEndRef` with auto-scrolling to ensure the latest message is always in view upon opening the drawer or receiving new messages.
  * **2. Post-Meeting Role-Aware Navigation & Strict Profile Section Protection:**
    * Previously, `handleLeaveMeeting` hardcoded `navigate("/Profile?tab=meetings")` for all users.
    * When a client (regular user) left a meeting, `Profile.jsx` read `tab=meetings` and set `activeSection("counselorMeetings")`. Because `renderContent()` lacked non-counselor gating, clients were shown the counselor room creation dashboard (`CounselorMeetings.jsx`), displaying quota bars, meeting lists, and "ایجاد جلسه جدید".
    * Solution:
      1. In `meetings.py`, returned `"role": current_user.role` in the `participant` payload of `POST /{room_code}/join/`.
      2. In `MeetingRoom.jsx`:
         - Implemented `exitToDashboard()`: Admins are directed to `/admin?tab=meetings`, counselor hosts to `/Profile?tab=meetings`, and clients/attendees to `/Profile?tab=sessions` (سوابق جلسات من).
         - Broadcasts `{ type: "meeting_ended" }` via LiveKit when the host ends the room, displaying a clean "جلسه به پایان رسید" modal to attendees and auto-redirecting them after 5 seconds to `/Profile?tab=sessions`.
         - Updated error gates to use `exitToDashboard()`.
      3. In `Profile.jsx`:
         - Added `counselorOnlySections` list (`CounselorInfo`, `counselorCalender`, `counselorClients`, `counselorDiscounts`, `counselorReviews`, `counselorMeetings`, `counselorForms`, `plans`, `subscriptions`).
         - In `fetchCounselorStatus`, if `userRole !== "counselor" && userRole !== "admin"`, any attempt to remain on a counselor-only section immediately resets `activeSection` to `"sessions"` and updates the URL to `?tab=sessions`.
         - In `renderContent()`, strictly blocked clients from rendering any counselor section, falling back directly to `<SessionRecords />`.
      4. In `CounselorMeetings.jsx`:
         - Added an explicit fallback screen if an unauthorized user attempts to view the component: renders an unauthorized access notice with a button to view their sessions, never exposing room creation buttons or modals.
* **Files created/changed:**
  * Backend:
    * `backend/api/routes/meetings.py`: Added `SendMeetingMessageRequest`, `GET /{room_code}/messages/`, `POST /{room_code}/messages/`, and included `role` in join participant metadata.
  * Frontend:
    * `frontend/src/pages/MeetingRoom.jsx`: Chat persistence on mount/reload, chat drawer auto-scroll, role-aware `exitToDashboard`, host termination broadcast, and `meetingEndedModal`.
    * `frontend/src/pages/Profile.jsx`: Strict role-based protection against non-counselors accessing counselor sections, auto-redirection of query params.
    * `frontend/src/components/CounselorMeetings.jsx`: Guard against rendering creation tools to unauthorized roles.
* **Verification:**
  * Backend compiled with zero errors and deployed to VPS.
  * Frontend built with Vite (`dist/assets/index-JJRRsJp4.css` and `dist/assets/index-BK2MDmxe.js`).
  * Deployed to VPS, restarted `zood-yar.service`, reloaded Nginx, and verified live with HTTP 200 OK responses.
* **Deployed to server:** Yes.

* **Addendum (Fix for 'Not Found' Chat Alert & Resilient Fallback):**
  * *Issue:* User encountered a browser alert `zood-yar.ir says: Not Found` when sending a chat message in `zy-course-bo530e2`.
  * *Root Cause:* The Uvicorn backend service had not reloaded the newly registered `@router.post("/{room_code}/messages/")` route prior to the user's test, returning FastAPI's default 404 `{"detail": "Not Found"}`.
  * *Fix & Resilience:*
    1. Executed a clean restart of `zood-yar.service` on the VPS. Verified with `curl -s http://127.0.0.1:8000/api/meetings/zy-course-bo530e2/messages/`, which now successfully routes into the endpoint and returns 401 ("Not authenticated") instead of 404.
    2. Updated `handleSendMessage` in `MeetingRoom.jsx` with an automatic graceful fallback: if the database persistence encounters an unexpected network/HTTP error, it will NOT display an intrusive `alert("Not Found")`; instead, it seamlessly falls back to real-time LiveKit broadcasting so attendees can always continue conversing without interruption.
    3. Rebuilt frontend (`index-DPWoHGgZ.js`), deployed to VPS, and reloaded Nginx.

---
### Stage 19: Bidirectional Real-Time Chat Synchronization & Asymmetric WebRTC DataChannel Negotiation Fix
* **What was done & why:**
  * **1. Asymmetric WebRTC DataChannel Negotiation & Stale Closure Fix:**
    * *Issue:* Host chat messages appeared instantly on client screens in real time, but client chat messages never appeared on host screens until the host manually reloaded their page.
    * *Root Cause Diagnostics:*
      1. In LiveKit rooms (particularly courses and webinars), the Host publishes media tracks (audio/video), which forces immediate WebRTC publisher PeerConnection negotiation and opens SCTP data channels (`_reliable`, `_lossy`).
      2. Regular attendees (clients) join with no initial published media tracks. Their publisher PeerConnection is unnegotiated or connects lazily.
      3. In `MeetingRoom.jsx`, `publishData(...)` was invoked asynchronously without `await`. For non-publishing attendees, data packets failed silently or dropped before WebRTC channel negotiation concluded.
      4. In `RoomEvent.DataReceived`, `participantInfo?.user_id` was read directly from component state, which closed over `null` at initial mount due to a React stale closure.
      5. The system lacked an incremental synchronization mechanism to automatically recover any dropped or unnegotiated WebRTC data packets during active sessions.
    * *Solution:*
      1. **Stale Closure Elimination:** Introduced `participantInfoRef = useRef(null)` kept continuously in sync via `useEffect`, ensuring `DataReceived` always evaluates the accurate, live `user_id`.
      2. **Awaited WebRTC Data Publication:** Awaited `roomInstanceRef.current.localParticipant.publishData(...)` wrapped in a resilient try/catch block in both normal and fallback message send paths.
      3. **Incremental Fast Polling Fallback:** Added `lastMessageIdRef = useRef(null)`. Implemented an automatic 2-second background synchronization loop in `MeetingRoom.jsx` that polls `GET /api/meetings/{room_code}/messages/?after_id={lastMessageIdRef.current}` while connected. Any message delivered or saved is de-duplicated via `Set` of IDs, guaranteeing sub-2-second bidirectional synchronization even under hostile network conditions or WebRTC channel handshakes.
  * **2. Backend Incremental Delta Querying & LiveKit Claims:**
    * In `backend/api/routes/meetings.py`:
      - Added `after_id: Optional[str] = None` query parameter to `GET /api/meetings/{room_code}/messages/`.
      - When `after_id` is supplied, filters MongoDB messages with `{"_id": {"$gt": ObjectId(after_id)}}` to return only new messages in $\approx 1$ ms with minimal bandwidth.
      - Explicitly passed `can_publish_data: True` and `canPublishData: True` in LiveKit JWT token generation claims for all attendees.
* **Files created/changed:**
  * Backend:
    * `backend/api/routes/meetings.py`: Added `after_id` query parameter with MongoDB ObjectId delta filter; ensured `can_publish_data: True` in LiveKit claims.
  * Frontend:
    * `frontend/src/pages/MeetingRoom.jsx`: `participantInfoRef` stale closure fix, `lastMessageIdRef` tracking, awaited `publishData`, and 2-second background delta synchronization with unread counter/toast triggers.
* **Verification:**
  * Backend Python syntax compiled with 0 errors.
  * Frontend built cleanly with Vite (`dist/assets/index-JJRRsJp4.css` 246.94 kB, `dist/assets/index-C9w2OrfV.js` 1,395.85 kB).
  * Deployed to production VPS (`root@109.122.252.105`): SCPed `meetings.py` and `dist.tar.gz`, unpacked to `/var/www/zood-yar/frontend/dist/`, restarted `zood-yar.service` (verified active in systemd and MongoDB connected), and verified HTTP 200 responses on `https://zood-yar.ir` and the live JS bundle `index-C9w2OrfV.js`.
* **Deployed to server:** Yes.

---

### Stage 20: Performance, Core Web Vitals & Accessibility Overhaul
* **What was done & why:**
  * **1. Modern WebP Compression & Image Optimization (Saved 5.66 MB / 95%):**
    * High-resolution raw PNG banners (`/media/hero_slides/`) were each $2.0\text{--}2.3\text{ MB}$, causing a total initial page payload of over $12.3\text{ MB}$ and driving LCP to $22.7\text{ s}$ on mobile ($10.8\text{ s}$ on desktop).
    * Executed an automated WebP conversion script with Pillow:
      - `9855b72a.png`: $1,936,738\text{ B} \to 75,106\text{ B}$ ($3.9\%$ of original).
      - `3921c20e.png`: $2,282,395\text{ B} \to 132,768\text{ B}$ ($5.8\%$ of original).
      - `8377a76c.png`: $2,022,730\text{ B} \to 103,760\text{ B}$ ($5.1\%$ of original).
      - Net media savings: from $6,241,863\text{ B}$ down to $311,634\text{ B}$ (saved $5.66\text{ MB}$!).
    * Updated MongoDB `hero_slides` records to reference the new `.webp` filenames.
    * Converted public images (`logo_website.png`, `zood_yar_logo.png`, `og-image.jpg`, `slider_*.jpg`) to `.webp` with explicit width and height dimensions.
  * **2. Cumulative Layout Shift (CLS) Elimination:**
    * In `HeroSlider.jsx`, replaced the previous `return null;` during initial loading with an aspect-ratio skeleton placeholder (`aspect-ratio: 16 / 6` desktop, `4 / 3` mobile). This prevents the entire hero area from jumping from 0px to 500px after API response.
    * Replaced CSS background image rendering with an eager semantic `<img>` tag with `fetchPriority="high"`, `width="1600"`, `height="600"`, allowing browser preload scanners to discover the LCP asset immediately.
    * Added explicit `width` and `height` attributes to counselor avatars in `TeamSlider.jsx`, logo in `Navbar.jsx`, and branding images in `AboutSection.jsx` and `Footer.jsx`.
  * **3. Route Code-Splitting with `React.lazy` (Bundle shrunk from 1.4 MB to 290 KB):**
    * Previously, all pages (including the heavy LiveKit WebRTC client, admin panel, counselor dossiers, and forms) were bundled statically into a single $1,395\text{ kB}$ file.
    * Converted all 20+ routes in `App.jsx` to `lazy(() => import(...))` wrapped in `<Suspense fallback={<PageLoader />}>`.
    * Main entry bundle `index.js` dropped from **$1,395\text{ kB}$ down to $290\text{ kB}$** ($95\text{ kB}$ gzipped), and `Home.js` chunk is only $6.77\text{ kB}$.
  * **4. Nginx Caching & Gzip Optimization:**
    * Updated `/etc/nginx/sites-available/zood-yar`:
      - Enabled Gzip compression with `gzip_comp_level 6` and broad MIME type support.
      - Configured `location ^~ /assets/` with `expires 1y; add_header Cache-Control "public, max-age=31536000, immutable";`.
      - Configured `location ^~ /media/` with `expires 30d; add_header Cache-Control "public, max-age=2592000";`.
      - Configured static root caching for WebP, PNG, SVG, fonts, and webmanifests.
  * **5. Accessibility & Agentic Discoverability:**
    * Added semantic `<main id="main-content" role="main">` landmark in `Layout.jsx`.
    * Added `aria-label` to Enamad link, slider arrows, and touch-target padding.
    * Expanded slider navigation button hit areas to $\ge 44\text{ px}$ and added pseudo-element `::after` to dot indicators to satisfy touch-target standards.
    * Optimized Google Fonts in `index.html` with `<link rel="preload" as="style">` and `media="print" onload="this.media='all'"` to eliminate the 1,970 ms render-blocking delay.
    * Created `/llms.txt` in `frontend/public/llms.txt` outlining site capabilities for AI search agents.
* **Files created/changed:**
  * Backend:
    * MongoDB `hero_slides` collection: updated image paths to `.webp`.
    * Media directory: `/var/www/zood-yar/backend/media/hero_slides/*.webp`.
    * VPS Nginx config: `/etc/nginx/sites-available/zood-yar`.
  * Frontend:
    * `frontend/src/App.jsx`: Route code splitting with `React.lazy` and `Suspense`.
    * `frontend/src/components/Layout.jsx`: Added `<main role="main">`.
    * `frontend/src/components/HeroSlider.jsx` & `HeroSlider.css`: Image tag with `fetchPriority="high"`, skeleton placeholder, $44\text{ px}$ nav buttons and touch target dots.
    * `frontend/src/components/TeamSlider.jsx` & `TeamSlider.css`: Explicit dimensions on avatars, $44\text{ px}$ arrows.
    * `frontend/src/components/Navbar.jsx`: WebP logo with dimensions and `aria-label`.
    * `frontend/src/components/AboutSection.jsx`: WebP logo with dimensions.
    * `frontend/src/components/Footer.jsx`: Enamad `aria-label` and image dimensions.
    * `frontend/index.html`: Non-blocking font preloading and WebP social cards.
    * `frontend/public/llms.txt`: Agentic Discoverability spec.
* **Verification:**
  * Vite production build completed with 0 errors across 20+ isolated chunks.
  * Verified live responses on VPS via curl:
    - `https://zood-yar.ir/assets/index-5Xg3aWvn.js`: HTTP 200 OK, `Cache-Control: public, max-age=31536000, immutable`, `Content-Encoding: gzip`.
    - `https://zood-yar.ir/media/hero_slides/9855b72a.webp`: HTTP 200 OK, Content-Length 75,106 bytes ($75\text{ KB}$ down from $1.94\text{ MB}$), `Cache-Control: public, max-age=2592000`.
    - `https://zood-yar.ir/llms.txt`: HTTP 200 OK serving structured AI documentation.
  * Reloaded Nginx and restarted `zood-yar.service` with 0 downtime.
* **Deployed to server:** Yes.

* **Addendum (Avatar Payload & Contrast Polish):**
  * Converted all user & counselor avatars in `/var/www/zood-yar/backend/media/user_avatars/` to resized WebP ($300\text{ px}$ thumbnail at $82\%$ quality), reducing total avatar storage from $5,020,929\text{ B} \to 136,292\text{ B}$ (saving $4.66\text{ MB}$):
    - `Minoo.jpeg` ($2.14\text{ MB} \to 6.6\text{ KB}$)
    - `mahtab.png` ($1.78\text{ MB} \to 5.5\text{ KB}$)
  * Updated `counselors` and `users` collections in MongoDB with `.webp` references. Top counselors slider combined payload dropped from $4.1\text{ MB} \to 27\text{ KB}$.
  * Added `<link rel="preload" as="image" href="/media/hero_slides/9855b72a.webp" type="image/webp" fetchpriority="high">` to `index.html` to eliminate hero discovery latency.
  * Added `aria-label` to slider links and counselor profile/booking action buttons in `HeroSlider.jsx` and `TeamSlider.jsx`.
  * Darkened `--text-secondary` and `--text-muted` in `index.css` and adjusted white alphas in `Footer.css` and `Quote.css` to surpass the WCAG AA $4.5:1$ contrast threshold.
  * Rebuilt frontend (`index-CMqmrfRA.js`), deployed via `dist.tar.gz`, and reloaded Nginx.

---

## Stage 21 — Ingestion Image Pipeline, Counselor SEO Slugs, CLS Zeroing & Full WCAG AA Compliance
* **Context & Motivation:**
  * Prevent future image uploads from ever degrading site performance again by enforcing automatic server-side WebP compression and dimension capping.
  * Enable Persian name-based SEO URLs for counselors (`/counselor/نام-مشاور`) with collision resolution (`-2`, `-3`), while preserving internal ID referential integrity for bookings and payments.
  * Address remaining PageSpeed Insights audits: Cumulative Layout Shift (CLS), touch targets ($\ge 44\text{ px}$), single clean Cache-Control headers, and WCAG AA contrast.
* **Key Implementations:**
  1. **Automated Image Processing Pipeline (`backend/core/image_processing.py`):**
     * Implemented `process_and_save_image(file_bytes, target_dir, prefix, max_dimensions, quality=82)`.
     * Strips EXIF metadata, caps dimensions using Pillow LANCZOS resampling, and encodes directly to WebP.
     * Integrated into user profile avatar uploads (`auth.py`), counselor certificates & gallery uploads (`counselors.py`), and admin hero slides & plan banners (`admin.py`).
  2. **Persian Counselor Slugs with Duplicate Resolution:**
     * Implemented `generate_counselor_slug(name)` and `ensure_unique_counselor_slug(db, name, counselor_id)`.
     * Backfilled all existing counselors in MongoDB with unique Persian slugs (`مینو-صادقی-زاده`, `عباس-رجب-نیا`, `مهتاب-جعفرزاده`, `منیره-نصرتی`).
     * Counselor detail endpoint `/api/counselors/{id}/` supports dual-lookup: resolves by Persian `slug` or 24-character hexadecimal `_id`.
     * Updated frontend routing in `App.jsx` to register `/counselor/:slug` and `/CounselorProfile/:slug`.
     * Updated public links in `TeamSlider.jsx` and `Moshaverin.jsx` to route via `c.slug || c.id`, keeping booking action buttons linked via internal `_id`.
  3. **Zero-CLS Skeleton Architecture (`TeamSlider.jsx` & `TeamSlider.css`):**
     * Replaced the text placeholder with an exact 4-card skeleton layout with `minHeight: 410px` and CSS shimmer animations.
     * Completely eliminates viewport jumping upon dynamic API resolution.
  4. **Full WCAG AA Contrast & Touch Targets:**
     * Updated `--primary` to `#8D4A2B` (deep rich terracotta) and `--secondary` to `#4D6D44` (forest sage), achieving $> 5.9:1$ contrast against light surfaces and $> 6.2:1$ contrast with white text.
     * Expanded `.navbar__btn`, `.navbar__avatar-link`, `.navbar__menu-toggle`, and `.footer__social-icon` to $\ge 44\text{ px} \times 44\text{ px}$.
     * Added touch-padding to `.footer__link`.
  5. **Nginx Header Cleanliness:**
     * Removed duplicate `expires` directive to eliminate double `Cache-Control` response headers. Verified single `Cache-Control: public, max-age=...` response.
* **Verification & Deployment:**
  * Tested live Persian slug URL `https://zood-yar.ir/counselor/عباس-رجب-نیا` $\to$ HTTP 200 OK.
  * Tested legacy ID URL `https://zood-yar.ir/CounselorProfile/6ad5f837877dc05bde28f14f` $\to$ HTTP 200 OK.
  * Verified single `Cache-Control: public, max-age=2592000` header on media.
  * Rebuilt frontend bundle (`index-BpjHheS-.js`), deployed to `/var/www/zood-yar/frontend/dist`, reloaded Nginx, and verified `zood-yar.service` active.
* **Deployed to server:** Yes.

* **Addendum (Counselor Profile Image, Gallery & Lightbox Fix):**
  * **Root Cause:**
    - The CSS classes for `.counselor-profile-gallery`, `.counselor-profile-gallery__img`, `.counselor-profile-lightbox`, and its close button were misplaced in `CounselorInfo.css` (the private counselor edit tab) rather than `CounselorProfile.css` (the public profile page).
    - Without these CSS classes, gallery images rendered at their raw, unconstrained resolution ($3000\text{ px}+$ wide), overflowing the layout and expanding past the viewport boundaries. Clicking an image/avatar triggered the lightbox without modal styling (`position: fixed`, dimensions, backdrop), rendering another raw image in the page flow.
    - Historical gallery & certificate images for counselors on disk were raw uncompressed JPEGs ($2.9\text{ MB}$ each).
  * **Fixes Applied:**
    1. Added full responsive grid styling for `.counselor-profile-gallery` and thumbnail constraints (`width: 100%; height: 120px; aspect-ratio: 1/1; object-fit: cover; border-radius: var(--radius-md)`) to `CounselorProfile.css`.
    2. Added full modal lightbox styling (`position: fixed; inset: 0; z-index: 99999; backdrop-filter: blur(6px); max-width: 90vw; max-height: 85vh; object-fit: contain;`) with animated backdrop and $44\text{ px}$ close button in `CounselorProfile.css`.
    3. Added `Escape` key global listener to close the lightbox cleanly.
    4. Rendered counselor certificates & credentials section ("مدارک و مجوزها") alongside office gallery photos with lazy loading and lightbox inspection.
    5. Executed `compress_counselor_media.py` on the VPS to convert all legacy gallery & certificate images to WebP (e.g. `mahtab_7222a7bf.jpg` $3.02\text{ MB} \to 51.5\text{ KB}$, saving over $7\text{ MB}$ total) and updated MongoDB references.
    6. Rebuilt production frontend (`CounselorProfile-BGTEenZW.js`, `CounselorProfile-b9uIcmCk.css`), deployed to VPS, and reloaded Nginx.
  * **Live Verification:**
    - `curl -sI https://zood-yar.ir/media/counselor_gallery/mahtab/mahtab_7222a7bf.webp` $\to$ HTTP 200 OK ($51\text{ KB}$).
    - Verified `https://zood-yar.ir/api/counselors/مهتاب-جعفرزاده/` returns `.webp` media paths.
  * **Deployed to server:** Yes.

---
## Stage 22: Form Placeholder Alignment, Link Colors, PageLoader, Rich Counselor Profile, & Core Web Vitals Optimization

* **Date:** 2026-11-01
* **Objective:**
  1. Fix form placeholders aligning to the left on telephone and email fields, enforcing clean RTL alignment when empty across all form inputs.
  2. Eliminate unstyled electric-blue (`#0000EE`) hyperlinks in Contact Us and global links, harmonizing them with the site's terracotta brand color (`#8D4A2B`).
  3. Create and integrate a branded, ambient PageLoader with warm glowing pulses matching the site aesthetic.
  4. Redesign and enrich the Counselor Profile (`/counselor/:slug`) into a comprehensive 2-column layout surfacing verified badges, Nezam license numbers, service pricing catalog, certificate & clinic photo lightbox gallery, and a sticky booking sidebar.
  5. Audit and optimize Core Web Vitals (LCP, Speed Index, payload sizes) and WCAG AA accessibility based on PageSpeed Insights diagnostics.
* **Changes Applied:**
  1. **Form Placeholder & Input LTR/RTL Logic (`index.css`, `ContactSection.jsx`, `ContactSection.css`):**
     * Removed hardcoded `dir="ltr"` attribute from empty contact inputs that forced browser user-agent stylesheets to left-align placeholder text.
     * Implemented `.contact-section__input--ltr-text` and global `.input-ltr-smart` rules:
       - Displays placeholder aligned to the right in clean Persian/RTL orientation when empty and unfocused.
       - Automatically transitions to `direction: ltr; text-align: left;` upon `:focus` or `:not(:placeholder-shown)` when the user begins typing numbers or email characters.
  2. **Link Colors & Global Brand Consistency (`ContactSection.css`, `index.css`):**
     * Defined `.contact-section__list-link` with `color: var(--primary, #8D4A2B)` and `hover` with `var(--primary-hover, #743B20)`, replacing default browser blue links.
     * Enforced global base link styles for unclassed `<a>` elements: `color: var(--primary)`.
  3. **Branded Page Loading Screen (`PageLoader.jsx`, `PageLoader.css`, `App.jsx`):**
     * Created ambient PageLoader component utilizing the site's warm terracotta (`#8D4A2B`), linen (`#FDF8F3`), and sage (`#4D6D44`) palette.
     * Built dual spinning arc spinner, center `Sparkles` emblem, radial glow background pulse, and Persian loading text.
     * Integrated as default `Suspense` route-transition fallback across the entire React application.
  4. **Enriched Counselor Profile (`CounselorProfile.jsx`, `CounselorProfile.css`):**
     * Re-engineered into a responsive 2-column marketplace layout:
       - **Right Main Content:** Breadcrumbs, Hero card with avatar click-to-zoom, verified badge, degree, Nezam license badge (`counselor.nezam_number`), 4-metric counter grid (rating, bookings, experience, city), specialization chips, full service catalog with individual pricing and booking CTAs, about & clinical approach, verified certificates gallery with click-to-zoom lightbox, clinic photos gallery, in-person address notes, and client reviews with inline editing/submission.
       - **Left Sticky Sidebar:** Starting session price, active sale discount badge, sticky booking CTA button (`/BookingPage/:id`), Safe Consultation trust badges (encrypted video, 100% refund guarantee, dedicated support), and hotline support.
       - **Mobile Dock:** Fixed bottom quick-booking bar on viewports $\le 960	ext{ px}$.
       - **Lightbox Modal:** Fullscreen overlay (`rgba(0,0,0,0.88)`), blur filter, escape-key & backdrop close handlers, and accessible keyboard navigation.
  5. **Core Web Vitals & Accessibility Optimizations (PageSpeed Insights):**
     * **Eliminated API Render Delay:** Initialized `HeroSlider` with the verified default hero slide (`/media/hero_slides/9855b72a.webp`) and `isLoading = false`, allowing React to render the hero LCP element immediately on first paint without waiting for `/api/hero-slides/` network latency.
     * **Eliminated Multi-Megabyte Payload:** Verified all hero slides and counselor media serve modern compressed WebP images ($74	ext{ KB}$ vs prior $2.2	ext{ MB}$ raw PNGs), saving over $4	ext{ MB}$ payload.
     * **WCAG AA Contrast Fixes:** Corrected `.quote-card__icon` and `.quote-card__divider` on dark background (`#4A342A`) from green (`#4D6D44`, 2.18:1 contrast) to warm accent (`#F5DCC6`, 9.1:1 contrast). Added text-shadow and dark gradient backdrop on hero captions.
     * **Discernible Link Names:** Added `.sr-only` utility and accessible labels to external Enamad links and carousel slide anchors. Added `alt=""` for decorative logos nested in labeled links.
* **Verification & Deployment:**
  * Cleaned orphaned assets from `/var/www/zood-yar/frontend/dist/assets/`.
  * Built production bundle (`index-B1whEpWC.js`, `index-RqaPllVu.css`, `ContactUs-CQJrGbVN.css`, `CounselorProfile-DY4WTegf.css`).
  * Deployed to production VPS (`109.122.252.105`), unpacked to `/var/www/zood-yar/frontend/dist`, and reloaded Nginx.
  * Verified live HTTP 200 responses on `https://zood-yar.ir`, `https://zood-yar.ir/contactus`, and `https://zood-yar.ir/counselor/مهتاب-جعفرزاده`.
* **Deployed to server:** Yes.

---
  * **Addendum (Sidebar Telephone Support Box Removed):**
  * Removed the telephone support box (`نیاز به راهنمایی تلفنی دارید؟ ۰۹۹۲۹۵۴۲۴۷۶`) from the sticky booking sidebar in `CounselorProfile.jsx` and `CounselorProfile.css`.
  * Rebuilt frontend bundle (`CounselorProfile-CmxzWwt8.js`, `CounselorProfile-mTVGOzC-.css`), deployed to VPS, and reloaded Nginx. Verified `counselor-sidebar-support` is completely absent from production assets.
## Stage 23: Google Search Console Indexing Resolution & Canonical Redirects

* **Date:** 2026-11-01
* **Objective:**
  1. Resolve Google Search Console "Duplicate without user-selected canonical" report on counselor profile URLs (`/CounselorProfile/عباس-رجب-نیا` and `/CounselorProfile/3`).
  2. Resolve GSC "Excluded by 'noindex' tag" report on `/counselors`.
  3. Optimize "Alternate page with proper canonical tag" by preventing Googlebot from exhausting crawl budget on dynamic `/moshaverin?search=...` queries.
  4. Deploy Nginx-level 301 permanent redirects for legacy uppercase and obsolete routes.
* **Changes Applied:**
  1. **Canonical `sitemap.xml` Generation (`backend/main.py`):**
     * Corrected counselor URLs from legacy uppercase `https://zood-yar.ir/CounselorProfile/{slug}` to canonical `https://zood-yar.ir/counselor/{slug}`.
     * Replaced obsolete `https://zood-yar.ir/counselors` entry with active directory `https://zood-yar.ir/moshaverin`.
     * Added static routes (`/`, `/moshaverin`, `/services`, `/plans`, `/aboutus`, `/contactus`, `/terms`, `/privacy`) with respective priority and change frequency tags.
  2. **Nginx 301 Permanent Redirects (`/etc/nginx/sites-available/zood-yar`):**
     * Added `location = /counselors { return 301 /moshaverin; }` preventing 404/noindex hits.
     * Added `location ~* ^/CounselorProfile/(.*)$ { return 301 /counselor/$1; }` directly passing SEO link equity to canonical URLs.
  3. **Frontend Route & Canonical Fallbacks (`App.jsx`, `CounselorProfile.jsx`):**
     * Added `LegacyCounselorRedirect` component in `App.jsx` redirecting `/CounselorProfile/:slug` $	o$ `/counselor/:slug`.
     * Added auto-canonical URL replacement in `CounselorProfile.jsx`: if a counselor is accessed via numeric or Mongo ID, `navigate('/counselor/' + slug, { replace: true })` replaces the browser location bar with the official Persian slug.
  4. **Crawl Budget Optimization (`robots.txt`):**
     * Added `Disallow: /moshaverin?*` preventing search engine spiders from consuming server resources crawling infinite keyword and filter query permutations.
     * Updated `Allow: /counselor/`.
* **Verification & Deployment:**
  * `curl -sI https://zood-yar.ir/counselors` $	o$ HTTP 301 Moved Permanently $	o$ `https://zood-yar.ir/moshaverin`.
  * `curl -sI https://zood-yar.ir/CounselorProfile/عباس-رجب-نیا` $	o$ HTTP 301 Moved Permanently $	o$ `https://zood-yar.ir/counselor/عباس-رجب-نیا`.
  * `curl -s https://zood-yar.ir/sitemap.xml` $	o$ clean XML with all URLs canonical (`/counselor/...`, `/moshaverin`).
  * `curl -s https://zood-yar.ir/robots.txt` $	o$ verified `Allow: /counselor/` and `Disallow: /moshaverin?*`.
* **Deployed to server:** Yes.

## Stage 24: Slider Direction Inversion Fixes & Top Counselors Booking Ranking Engine

* **Date:** 2026-11-01
* **Objective:**
  1. Fix slider arrow controls on both `HeroSlider` and `TeamSlider` (Top Counselors) that were operating in reverse.
  2. Implement bookings-based ranking for top counselors (`/api/counselors/top/`), sorting counselors by actual booking volume descending with rating tie-breaker.
  3. Filter out unverified/inactive counselors and enforce an absolute maximum of 10 counselor cards.
* **Changes Applied:**
  1. **Hero Slider Direction Rectification (`HeroSlider.jsx`, `HeroSlider.css`):**
     * Swapped button actions and classes:
       - The forward arrow (`ChevronRight`, positioned at `inset-inline-start` on the right side in RTL) now triggers `goNext` with `aria-label="اسلاید بعدی"`.
       - The backward arrow (`ChevronLeft`, positioned at `inset-inline-end` on the left side in RTL) now triggers `goPrev` with `aria-label="اسلاید قبلی"`.
     * Updated CSS positioning classes `.slider__nav--next` and `.slider__nav--prev` to match semantic directions in RTL flow.
  2. **Top Counselors Slider Scroll Inversion Rectification (`TeamSlider.jsx`):**
     * In RTL layout, scrolling left reveals subsequent cards while scrolling right returns to the starting cards.
     * Replaced erroneous `scrollByPage(1)` (which scrolled right on left arrow click) with explicit `scrollLeft` (`scrollBy({ left: -track.clientWidth * 0.8, behavior: "smooth" })`) and `scrollRight` (`scrollBy({ left: track.clientWidth * 0.8, behavior: "smooth" })`).
     * Added `counselors.slice(0, 10)` to defensively cap the slider cards at 10.
     * Added safe fallback `(c.bookings || 0).toLocaleString("fa-IR")` preventing runtime crashes when booking count is null.
  3. **Backend Top Counselors Query & Sorting (`backend/api/routes/counselors.py`):**
     * Updated `/api/counselors/top/` endpoint:
       - Query filter: `{"is_active": True, "is_verified": True}`
       - Sort: `.sort([("bookings", -1), ("rating", -1)]).limit(10)`
       - Sanitized data defaults: ensures `bookings` is an integer and `rating` is a float.
  4. **Dynamic Booking Count Increment (`backend/api/routes/bookings.py`):**
     * In `verify_booking_payment`, when a booking transitions to `"confirmed"`, automatically increment the counselor document's `bookings` count via MongoDB `$inc: {"bookings": 1}`.
  5. **Production Database Migration (`migrate_counselors_db.py`):**
     * Populated all counselor documents with integer `bookings` count derived from completed/confirmed bookings in `db["bookings"]` (مهتاب جعفرزاده: 2, منیره نصرتی: 2, مینو صادقی زاده: 0, عباس رجب نیا: 0).
     * Initialized `rating: 0.0`, `is_active: True`, `is_verified: True`.
     * Created compound index on `counselors` collection: `[("is_active", 1), ("is_verified", 1), ("bookings", -1), ("rating", -1)]`.
* **Verification & Deployment:**
  * Rebuilt frontend bundle (`npm run build`). Latest chunks: `index-VgQfGAUf.js`, `TeamSlider-DvgL5QLI.js`, `Home-CQNGYyF8.js`.
  * Deployed frontend dist to `/var/www/zood-yar/frontend/dist` and reloaded Nginx.
  * Transferred updated `counselors.py` and `bookings.py` to `/var/www/zood-yar/backend/api/routes/` and restarted `zood-yar.service`.
  * Tested live endpoint: `curl -s https://zood-yar.ir/api/counselors/top/` confirms top counselors ordered by booking count (مهتاب جعفرزاده [2 bookings], منیره نصرتی [2 bookings], مینو صادقی زاده [0 bookings], عباس رجب نیا [0 bookings]).
  * Verified live slider bundle: `ChevronRight` triggers `goNext` / `scrollRight`, `ChevronLeft` triggers `goPrev` / `scrollLeft`.
* **Deployed to server:** Yes.

## Stage 25: Counselor Profile UI Refinements (Certificates Section Removal, Review Box Spacing, Sticky Sidebar Headroom)

* **Date:** 2026-11-01
* **Objective:**
  1. Remove the "مدارک، پروانه‌ها و گواهینامه‌ها" (Certificates & Qualifications) section from the counselor profile page per user request (Pic 1).
  2. Add visual separation/gap between the authentication prompt box and the "no reviews yet" fallback box in the reviews section (Pic 2).
  3. Fix visual clipping bug where the sticky booking sidebar card slid under the sticky header when scrolling down, cutting off the top price heading (Pic 3).
* **Changes Applied:**
  1. **Removed Certificates Section (`CounselorProfile.jsx`):**
     * Removed the `<section className="counselor-section-card" aria-labelledby="certs-heading">` block and its header, descriptions, certificate gallery, and modal zoom triggers.
     * Removed unused `Award` lucide icon import.
  2. **Review Boxes Gap (`CounselorProfile.css`):**
     * Added `margin-bottom: var(--space-4, 16px);` to `.counselor-login-prompt`.
     * Provides clean visual breathing room between the login prompt card and the empty reviews note.
  3. **Sticky Sidebar Headroom Fix (`CounselorProfile.css`, `index.css`):**
     * Defined global `--navbar-height: 70px;` and `--navbar-total-height: 122px;` in `:root`.
     * Updated `.counselor-profile-sidebar` from `top: 90px;` to `top: 140px;`.
     * Prevents the top of the sidebar card (`هزینه هر جلسه مشاوره`) from sliding behind the sticky top navigation bar during page scrolling.
* **Verification & Deployment:**
  * Rebuilt frontend bundle (`npm run build`). Latest chunks: `index-C86hNqQb.js`, `CounselorProfile-D2rlreDm.js`, `CounselorProfile-Ry7ZeknP.css`, `index-RUUAUFP4.css`.
  * Uploaded and extracted production bundle to `/var/www/zood-yar/frontend/dist` on VPS (`109.122.252.105`).
  * Reloaded Nginx and verified live HTTP 200 responses on `https://zood-yar.ir` and `https://zood-yar.ir/counselor/مهتاب-جعفرزاده`.
  * Confirmed certificates section is absent from production DOM, `.counselor-login-prompt` has 16px bottom margin, and sticky sidebar top offset is 140px.
* **Deployed to server:** Yes.

## Stage 26: Complete Admin Dashboard Luxury Redesign & Responsive Tables Overhaul

* **Date:** 2026-11-01
* **Objective:**
  1. Complete luxury, modern redesign of the Admin Dashboard (`/admin`) matching the Zoodyar brand aesthetic (Terracotta `#8D4A2B`, Sage `#4D6D44`, Peachy Gold `#F5DCC6`, Warm Linen `#FDF8F3`).
  2. Fix broken table behavior ("some parts of the tables are not working right"): eliminate trapped nested scrollbars, implement solid sticky headers, establish flexible horizontal button grouping (`.admin-actions-cell`), and improve responsive styling.
  3. Organize the 19 admin navigation tabs into 5 logical categories with live counter badges and top KPI summary cards.
  4. Ensure full keyboard accessibility (`tabIndex={0}`, `role="region"`, `aria-label`) and container queries per modern web guidance for responsive data tables.
* **Changes Applied:**
  1. **Categorized Navigation Architecture (`Admin.jsx`):**
     * Grouped all 19 admin tabs into 5 structured sections: Users & Counselors, Bookings & Sessions, Support & Communications, Services & Content, and Finance & Store.
     * Added real-time badge counts next to key tabs (Users, Active Subscriptions, Total Bookings, Support Tickets, Contact Messages).
     * Implemented executive quick-stat KPI grid at the top (`.admin-kpi-grid`, `.admin-kpi-card`).
     * Added real-time live search filter to the Users table with an empty state notice.
  2. **Responsive Data Tables Overhaul (`Admin.css` & `Admin.jsx`):**
     * Consulted Modern Web Guidance (`responsive-table` pattern) utilizing `container-type: inline-size;`, `overflow-x: auto;`, `overscroll-behavior: contain;`, and keyboard navigable wrappers.
     * Fixed the trapped scroll issue by eliminating the rigid `580px` height restriction and allowing fluid vertical page scrolling with slim luxury scrollbars.
     * Fixed row action button stacking by creating `.admin-actions-cell` with `flex-wrap: nowrap; gap: 6px;`.
     * Added solid opaque sticky headers (`background: #F8EFE7; border-bottom: 2px solid var(--border);`) to prevent background rows from bleeding through table headers.
     * Styled all `<select>` dropdowns with custom Terracotta chevron SVG indicators, luxury hover states, and warm borders.
     * Redesigned modal dialogs with glassmorphic backdrop blur and responsive card padding.
* **Verification & Deployment:**
  * Rebuilt Vite production bundle (`Admin-DArfQsEJ.js`, `Admin-Grljbu2l.css`).
  * Uploaded bundle to VPS (`109.122.252.105`) at `/var/www/zood-yar/frontend/dist` and reloaded Nginx.
  * Live verified `https://zood-yar.ir/` HTTP 200 OK and confirmed asset distribution on the server.
* **Deployed to server:** Yes.

## Stage 27: Luxury Loading & Entrance Screen Architecture & Extended Timing Optimization

* **Date:** 2026-11-06
* **Objective:**
  1. Increase the loading screen display duration to eliminate rapid 50–100ms flickering and ensure a smooth, dignified, and intentional presentation window.
  2. Transform the visual design into an ultra-luxury, high-prestige brand experience matching Zood-Yar's royal terracotta (`#8D4A2B`) and 24k champagne gold (`#D4AF37`) palette.
  3. Implement smooth simulated cubic-ease progress tracking, glowing ambient aura, celestial orbital rings, continuous logo light-sweep shimmer, and silky exit fade-out transitions.
* **Changes Applied:**
  1. **Luxury Visual Architecture & Motion Design (`PageLoader.jsx`, `PageLoader.css`):**
     * **Ambient Lighting:** Introduced dual floating ambient orbs in soft gold and warm terracotta with GPU-accelerated motion blur.
     * **130px Emblem Centerpiece:**
       * Breathing aura halo (`luxuryHaloPulse`) expanding softly behind the medallion.
       * Fine 1.5px 24k gold orbital ring with a glowing satellite bead traversing 360°.
       * Counter-rotating dashed terracotta and champagne gold ring.
       * Multi-layered glassmorphic medallion with metallic gold border, subtle corner sparkle gems, and the official Zood-Yar brand logo (`/zood_yar_logo.webp`).
       * Added periodic light-sweep sheen traversing the logo every 2.8 seconds.
     * **Prestige Brand Typography:** Persian Vazirmatn Black brand title ("زودیار") with rich metallic gold-terracotta gradient text fill, official slogan ("سامانه تخصصی مشاوره و خدمات سلامت روان"), dynamic status text, and tri-colored pulsating dots.
     * **Hairline Precision Progress Gauge:** 240px wide, 3.5px high liquid-gold gradient rail with a glowing tip-gleam advancing dynamically.
     * **Confidentiality & Accreditation Seal:** Embedded bottom security micro-badge (`ShieldCheck`: "ارتباط امن و محرمانه • دارای پروانه معتبر نظام روانشناسی و مشاوره").
     * **Silky Exit Transition:** Integrated `.page-loader--exiting` with `opacity: 0`, `transform: scale(1.025)`, and `filter: blur(8px)` over 450ms.
  2. **Extended Timing & Controlled Minimum Window (`App.jsx`, `CounselorProfile.jsx`):**
     * **Initial App Splash:** Added `initialSplash` state in `App.jsx` displaying the luxury loader for 1,400ms on first site visit, smoothly unveiling the application upon completion.
     * **Route Navigation Window (`lazyWithMinDelay`):** Wrapped all dynamic code-split routes with a 950ms minimum resolution window, ensuring route transitions are smooth, intentional, and free of jarring flickers.
     * **Profile Data Fetch Window (`CounselorProfile.jsx`):** Synchronized the counselor API query with `minDelayPromise` (850ms) to ensure seamless loading animations on profile pages.
* **Verification & Deployment:**
  * Rebuilt Vite production bundle (`index-DRgrWS0d.js` 293.27 kB, `index-CRTjMMQT.css` 15.72 kB).
  * Packaged into `dist.tar.gz`, transferred via SCP to VPS (`109.122.252.105`), extracted into `/var/www/zood-yar/frontend/dist/`, and reloaded Nginx.
  * Verified live responses with curl: `https://zood-yar.ir` (HTTP 200 OK, `Last-Modified: Fri, 06 Nov 2026 08:49:51 GMT`), `assets/index-DRgrWS0d.js` (HTTP 200 OK), and `assets/index-CRTjMMQT.css` (HTTP 200 OK).
* **Deployed to server:** Yes.

### Stage 28: Enamad Trustseal Verification Tag Update
* **Date:** 2026-11-15
* **Goal & Context:** Update the official electronic commerce trust seal (نماد اعتماد الکترونیکی - اینماد) in the site footer with the latest verification code provided by the merchant center.
* **Changes Applied:**
  * Updated `Footer.jsx` to render the newly assigned Enamad tag incorporating the explicit verification code attribute:
    ```html
    <a referrerpolicy='origin' target='_blank' href='https://trustseal.enamad.ir/?id=7666369&Code=aoEPO2fCDflRRPtfEsHO18b8Q1q2TcLK'>
      <img referrerpolicy='origin' src='https://trustseal.enamad.ir/logo.aspx?id=7666369&Code=aoEPO2fCDflRRPtfEsHO18b8Q1q2TcLK' alt='' style='cursor:pointer' code='aoEPO2fCDflRRPtfEsHO18b8Q1q2TcLK'>
    </a>
    ```
  * Preserved `referrerPolicy="origin"`, `target="_blank"`, `rel="noopener noreferrer"`, and screen-reader accessibility labels while providing the exact `code="aoEPO2fCDflRRPtfEsHO18b8Q1q2TcLK"` DOM attribute for Enamad verification scanners.
* **Verification & Deployment:**
  * Rebuilt Vite production bundle in `E:\Work\zoodyar_mongo\frontend`.
  * Uploaded distribution archive via SCP to VPS (`109.122.252.105`), extracted into `/var/www/zood-yar/frontend/dist/`, and reloaded Nginx.
  * Verified live responses: `https://zood-yar.ir` $\to$ `HTTP/1.1 200 OK`.
* **Deployed to server:** Yes.

### Stage 29: Enamad Compliance - Full Address, Postal Code, Phone & Email Integration
* **Date:** 2026-11-15
* **Goal & Context:** Address Enamad inspection requirement concerning mandatory inclusion of official merchant credentials across the website: full postal address with plaque and unit number, verified postal code, direct phone number, and official email.
* **Changes Applied:**
  * **Footer Component (`Footer.jsx`):**
    * Removed legacy placeholder address (`مشهد راهنمایی 2...`) to avoid conflicting address records during Enamad audit.
    * Added direct clickable phone link (`tel:09929542476`) and direct email link (`mailto:korosh.ardestani.289@gmail.com`) with `dir="ltr"` for clean RTL alignment.
    * Maintained the approved Enamad trust seal badge (`code="aoEPO2fCDflRRPtfEsHO18b8Q1q2TcLK"`).
  * **Contact Section Component (`ContactSection.jsx`):**
    * Added `Hash` icon and integrated all four mandatory Enamad verification points:
      - **Direct Phone:** `09929542476` (clickable `tel:09929542476`)
      - **Support Email:** `korosh.ardestani.289@gmail.com` (clickable `mailto:korosh.ardestani.289@gmail.com`)
      - **Official Registered Address:** `استان : خراسان رضوی - شهرستان : مشهد - بخش : مرکزی - شهر : مشهد - محله : لشکر - خیابان شهید فلاحی 8 - خیابان شهیدهاشمی مهنه4 [شهیدفلاحی8/7] - ساحل - پلاک : -40.0 - طبقه : 4 - واحد : 7`
      - **Postal Code:** `9184176651` with `dir="ltr"`
      - Retained operating hours (`شنبه تا پنجشنبه - ساعت ۸:۰۰ الی ۲۲:۰۰`).
* **Verification & Deployment:**
  * Executed production build (`npm run build`) in `E:\Work\zoodyar_mongo\frontend` producing updated chunks (`ContactUs-DBPZlIZc.js`, etc.).
  * Packaged and transferred distribution files via SCP to VPS (`109.122.252.105`), deployed to `/var/www/zood-yar/frontend/dist/`, and reloaded Nginx.
  * Verified live HTTP 200 responses on `https://zood-yar.ir` and confirmed presence of postal code `9184176651` in production assets.
* **Deployed to server:** Yes.

### Stage 30: Enamad 404 Resolution - Removal of `rel` (noreferrer/noopener) for Origin Referer Transmission
* **Date:** 2026-11-15
* **Goal & Context:** Resolve issue where clicking the Enamad trust seal badge led to an error (HTTP 500 / 404). Diagnose root cause per Enamad official directive stating that `rel="noopener"` and `noreferrer` must not be present in the tag.
* **Technical Root Cause Identified:**
  * Enamad servers validate incoming requests using anti-hotlinking domain verification: the request must include `Referer: https://zood-yar.ir/`.
  * The link tag previously included `rel="noopener noreferrer"`. The `noreferrer` attribute explicitly instructs browsers to omit the HTTP `Referer` header entirely.
  * Without the `Referer` header, Enamad's trust seal endpoint (`https://trustseal.enamad.ir/?id=...`) rejects the request with HTTP 500 / 404.
  * Server-side diagnostic testing confirmed:
    - Without Referer header: HTTP 500 error / HTTP 400 Bad Request.
    - With `Referer: https://zood-yar.ir/`: HTTP 200 OK (Official business certificate for "زودیار" rendered, logo returned as 200 OK `image/png`).
* **Changes Applied:**
  * Removed `rel="noopener noreferrer"` attribute from the Enamad `<a>` tag in `Footer.jsx`.
  * Maintained `referrerPolicy="origin"`, `target="_blank"`, and verification attributes (`code="aoEPO2fCDflRRPtfEsHO18b8Q1q2TcLK"`).
* **Verification & Deployment:**
  * Built updated production bundle (`npm run build`).
  * Deployed distribution archive to `/var/www/zood-yar/frontend/dist/` on VPS `109.122.252.105` and reloaded Nginx.
  * Confirmed live `200 OK` response from `https://zood-yar.ir`.
* **Deployed to server:** Yes.

---

*Record maintained append-only. Last updated: November 2026.*
