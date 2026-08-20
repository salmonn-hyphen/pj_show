# Taxi-MeikSwe

A car rental marketplace connecting taxi car owners with drivers in Myanmar.

Drivers browse and rent vehicles; owners list cars and review applications; admins verify users, cars, payments, and deposits. The platform covers the full journey: registration with OTP, KYC verification, car listing, booking applications, e-agreements, payment receipts, deposits, disputes, and reviews.

---

## Table of Contents

- [Tech Stack](#tech-stack)
- [Architecture](#architecture)
- [Repository Structure](#repository-structure)
- [Getting Started](#getting-started)
- [Project Workflow](#project-workflow)
- [API Reference](#api-reference)
- [Database Schema](#database-schema)
- [Frontend Routing](#frontend-routing)
- [Development Commands](#development-commands)
- [Current State & Next Steps](#current-state--next-steps)

---

## Tech Stack

### Backend (`backend/`)
| Layer | Technology |
| :--- | :--- |
| Runtime | Node.js + TypeScript (ESM, `tsx`) |
| Framework | Express 5 |
| ORM | Prisma 7 (`@prisma/client`, `@prisma/adapter-pg`, `@prisma/adapter-neon`) |
| Database | PostgreSQL (local dev via `PrismaPg`; Neon supported) |
| Auth | Better Auth (`better-auth`) + cookie sessions |
| Uploads | Multer (KYC docs, car photos, payment screenshots, profile photos) |
| AI | Groq SDK (owner -> driver matchmaking) |
| Security | Helmet, CORS, express-rate-limit |
| Misc | nodemailer, `ws` |

### Frontend (`frontend/`)
| Layer | Technology |
| :--- | :--- |
| Framework | React 19 + TypeScript |
| Build | Vite 8 + SWC plugin |
| Styling | Tailwind CSS v4, Radix UI primitives, `lucide-react` icons |
| Routing | React Router 7 |
| Data | Axios (`@/api/*` modules) + Better Auth client |
| Forms | React Hook Form + Zod |
| Charts | Recharts |
| Animation | framer-motion |

---

## Architecture

```
+--------------------+         +--------------------------+
|  React SPA (Vite)  |  HTTP   |  Express API (port 3000) |
|  frontend/         | ------> |  backend/src/index.ts    |
|  Port 5173         |  JSON   |                          |
+--------------------+         |  routes/ -> controllers/ |
                               |  lib/     -> Prisma + auth|
                               |  service/ -> business     |
                               |  respositry/ -> queries   |
                               +-----------+--------------+
                                           | Prisma
                                           v
                                    +--------------+
                                    | PostgreSQL   |
                                    +--------------+
```

- **Frontend** is a role-based SPA: public pages, auth pages, and three dashboards (owner / driver / admin) guarded by route guards.
- **Backend** is a modular Express app. `backend/src/index.ts` is a thin entrypoint that mounts routers; business logic lives in `controllers`, `service`, and `respositry` layers; shared helpers in `lib/`.
- **Auth** is cookie-based via Better Auth; custom OTP endpoints handle phone-verified registration.
- **Uploads** are served statically from `backend/uploads/*` (`/uploads/...`).

---

## Repository Structure

```
pj_show/
+-- backend/
|   +-- prisma/
|   |   +-- schema.prisma          # DB models, enums, relations
|   |   +-- seed.ts                # seed data
|   |   +-- migrations/
|   +-- src/
|   |   +-- index.ts               # Express entrypoint (mounts routers)
|   |   +-- routes/                # Express routers (one per domain)
|   |   +-- controllers/           # Request handlers
|   |   +-- lib/                   # auth, serializers, uploads, finance helpers
|   |   +-- middleware/            # auth guard, zod validation
|   |   +-- service/               # business logic (auth, admin, AI matching, car)
|   |   +-- respositry/            # raw SQL / Prisma data access
|   |   +-- generated/prisma/      # generated Prisma client
|   +-- scripts/show-otp.ts        # print OTP codes (dev SMS simulation)
|   +-- uploads/                   # KYC, car, payment, profile uploads
+-- frontend/
|   +-- src/
|   |   +-- routes/                # router + ProtectedRoute / GuestRoute
|   |   +-- layouts/               # PublicLayout, AuthLayout, DashboardLayout
|   |   +-- features/              # pages grouped by role (public/auth/owner/driver/admin/shared)
|   |   +-- api/                   # typed API client modules
|   |   +-- components/            # layout, shared, ui (Radix)
|   |   +-- providers/             # AuthProvider, ToastProvider
|   |   +-- hooks/ lib/ utils/ types/ constants/ mock-data/
|   |   +-- App.tsx, main.tsx
+-- api_and_state_design.md        # DB + API + state-flow design doc
+-- current_state.md               # live implementation progress
+-- coding-agent-memory.md         # refactoring log (backend extraction)
```

---

## Getting Started

### Prerequisites
- Node.js 20+ and npm
- PostgreSQL running locally (for dev)

### 1. Environment setup

Backend — copy `.env.example` to `.env` and fill in:

```env
PORT=3000
DATABASE_URL=postgresql://user:pass@localhost:5432/taxi_meikswe
BETTER_AUTH_SECRET=<generate a random secret>
BETTER_AUTH_URL=http://localhost:3000
GROQ_API_KEY=<for AI matchmaker>
```

Frontend — optional `.env.local`:

```env
VITE_API_URL=http://localhost:3000/api
```

### 2. Install & migrate

```bash
cd backend
npm install
npx prisma migrate dev      # apply migrations
npm run seed                # optional: seed demo data
npm run dev                 # API on http://localhost:3000
```

```bash
cd frontend
npm install
npm run dev                 # SPA on http://localhost:5173
```

---

## Project Workflow

The platform's full user journey, from registration to completed rental.

### 1. Registration & Login (OTP)

```
[Register page] --phone + role + details--> POST /api/register-request
        |                                     . 6-digit OTP generated
        |                                     . stored in otp_codes (Verification)
        |                                     . SMS simulated: printed in terminal
        v
[OTP modal] --6-digit code--> POST /api/register-verify
        |                     . validates code against DB
        |                     . creates user via auth.api.signUpEmail
        v
[Login] --> POST /api/auth/login --> cookie session
        |
        v
[GuestRoute] redirects authenticated users to their role dashboard
[ProtectedRoute] blocks unauthenticated access to /owner, /driver, /admin
```

- OTP codes are viewable with `npm run otp` (backend) or `npm run otp` (frontend), which runs `scripts/show-otp.ts`.
- Rate limited (10 attempts / 15 min) via `express-rate-limit`.
- Roles map to Prisma enums: `OWNER`, `DRIVER`, `ADMIN`.

### 2. Driver KYC Verification

```
[Driver dashboard -> Documents (KYCPage)]
        |
        v
GET /api/driver/kyc                     # current KYC state
POST /api/driver/kyc/upload             # multer multipart:
        |                                 nrcFront, nrcBack, selfie,
        |                                 drivingLicenseFront, drivingLicenseBack
        v
driver_profiles.kyc_status = PENDING
        |
        v
[Admin -> Verifications -> Drivers]     GET /api/admin/verifications/drivers
        |
        v
PUT /api/admin/verifications/drivers/:id  # APPROVED / REJECTED
        |
        v
[Driver approved -> can apply for rentals]
```

### 3. Owner Registration & Car Listing

```
[Register as OWNER] --> user.role = OWNER, verificationStatus = PENDING

[Owner -> Profile/Documents]            GET/PUT /api/owner/profile
                                        GET/POST /api/owner/documents   (NRC uploads)
        |
        v
[Admin -> Verifications -> Owners]      GET /api/admin/verifications/owners
        |
        v
POST /api/admin/verifications/owners/:userId   # approve -> ownerProfile approved

[Owner -> Cars -> Add Car]              POST /api/owner/cars
        |                                 brand, model, licenseNumber, fuelType,
        |                                 rentalPrice, depositAmount, rentalPeriod,
        |                                 rentalPaymentType, rentalType, ownerBook
        v
car.adminApprovalStatus = PENDING
        |
        v
[Admin -> Verifications -> Cars]        GET /api/admin/verifications/cars
        |
        v
POST /api/admin/verifications/cars/:carId  # approve -> AVAILABLE for drivers
```

Owner car management endpoints: `GET/PUT/DELETE /api/owner/cars/:carId`, `POST /api/owner/cars/:carId/toggle-availability`.

### 4. Driver Booking Application

```
[Driver -> Browse Cars]                 GET /api/cars   (approved + AVAILABLE only)
        |
        v
[Driver -> Car Detail -> Apply]         POST /api/driver/bookings
        |                                 creates CarApplication
        |                                 ownerApprovalStatus = PENDING
        v
[Owner -> Bookings]                     GET /api/owner/bookings
        |                                 shows driver info: name, phone, email,
        |                                 verification status, requested car, dates, total
        |
        +-- POST /api/owner/bookings/:id/reject  --> REJECTED (end)
        |
        +-- POST /api/owner/bookings/:id/accept  --> adminApprovalStatus = APPROVED
                                                     notification sent to driver
```

### 5. Admin Booking Approval & E-Agreement

```
[Admin -> Bookings]                     GET /api/admin/bookings
        |
        +-- POST /api/admin/bookings/:id/reject
        |
        +-- POST /api/admin/bookings/:id/accept   --> application accepted
        |
        v
POST /api/admin/bookings/:id/send-agreement      # generates e-agreement
        |
        v
[Owner & Driver -> Agreements]          GET /api/agreements
        |
        v
[Agreement detail]                      GET /api/agreements/:id
        |                                 contract text + signature slots
        |
        v
POST /api/agreements/:id/agree         # each party signs
        |                                 tracks ownerAgreementAgreedAt /
        |                                 driverAgreementAgreedAt
        v
[Both signed -> agreement COMPLETED -> rental can start]
```

### 6. Payments (Rental Fee + Deposit)

```
[Driver pays -> upload receipt]         POST /api/bookings/:id/payments  (multipart screenshot)
        |                                 payments row: status = PENDING
        v
[Admin -> Payments]                     GET /api/admin/payments/pending
        |
        +-- POST /api/admin/payments/:id/reject
        |
        +-- POST /api/admin/payments/:id/confirm  --> payment COMPLETED
                                                     notification to driver
```

Deposits:

```
[Driver pays deposit]                   POST /api/bookings/:id/deposits  (receipt upload)
        |
[Admin -> Deposits]                     GET /api/driver/deposits
                                        GET /api/owner/deposits
        |
        +-- POST /api/admin/deposits/:id/freeze    # freeze on dispute
        +-- POST /api/admin/deposits/:id/deduct    # penalty deduction
        +-- POST /api/admin/deposits/:id/release   # return at end of rental
        |
POST /api/bookings/:id/cancel          # cancel rental (handles deposit refund path)
```

### 7. Disputes & Reviews (after rental)

```
[Driver / Owner -> Disputes]            raise dispute on a rental
        |
[Admin -> Disputes]                     review and resolve (deposit freeze/deduct/release)
        |
[Driver / Owner -> Reviews]             review counterpart after completed rental
                                        (ReviewDirection: OWNER_TO_DRIVER / DRIVER_TO_OWNER)
```

### 8. AI Driver Matchmaker (Owner)

```
[Owner -> AI Matchmaker]                POST /api/owner/ai-matchmaker/search
        |                                 natural-language query -> Groq SDK
        |                                 ranks matching drivers from DB
        v
[Owner reviews candidates -> shortlists]
```

### 9. Notifications & Profile

- `GET /api/notifications`, `GET /api/notifications/unread-count`, `POST /:id/read`, `POST /read-all`, `DELETE /:id` — bell dropdown in dashboard navbar.
- `GET/PUT /api/driver/profile`, `GET/PUT /api/owner/profile`, `GET /api/user/profile`, `POST /api/user/profile/photo` — profile management.
- `POST /api/contact` — public contact form (nodemailer).

### Booking Status State Machine

```
 PENDING --owner accept--> APPROVED --admin accept--> AGREEMENT_PENDING
    |                          |                            |
    |                          v                            v
    +--owner reject--> REJECTED (end)              [Owner signs] [Driver signs]
                                                            |
                                                            v
                                                  [Payment receipt PENDING]
                                                            | admin confirm
                                                            v
                                                          PAID / ACTIVE rental
                                                            |
                                              COMPLETED --> disputes / reviews / deposit release
```

---

## API Reference

All routes are mounted under `/api`. Authentication is cookie-based; guarded routes use `authMiddleware` (owner/driver/admin role checks inside controllers).

### Auth & Registration
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| POST | `/api/register-request` | - | Request OTP for registration (rate limited) |
| POST | `/api/register-verify` | - | Verify OTP + create user |
| GET | `/api/get-email-by-phone` | - | Lookup email by phone |
| POST | `/api/auth/login` | - | Login (rate limited) |
| POST | `/api/auth/refresh` | - | Refresh session |
| POST | `/api/auth/logout` | yes | Logout |
| GET | `/api/auth/session` | yes | Current session |
| * | `/api/auth/*` | - | Better Auth passthrough |

### Public
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/cars` | - | Approved + available cars |
| GET | `/api/cars/:carId` | - | Car detail |
| POST | `/api/contact` | - | Contact form |

### User
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/user/profile` | yes | User profile |
| POST | `/api/user/profile/photo` | yes | Upload profile photo |

### Driver
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| PUT | `/api/driver/profile` | yes | Update profile |
| GET | `/api/driver/kyc` | yes | Get KYC state |
| POST | `/api/driver/kyc/upload` | yes | Upload KYC documents (multipart) |
| POST | `/api/driver/bookings` | yes | Apply to rent a car |
| GET | `/api/driver/bookings` | yes | My applications |
| GET | `/api/driver/bookings/:id` | yes | Application detail |
| GET | `/api/driver/payments` | yes | My payments |
| GET | `/api/driver/deposits` | yes | My deposits |

### Owner
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| GET/PUT | `/api/owner/profile` | yes | Owner profile |
| GET/POST | `/api/owner/documents` | yes | Owner documents / upload |
| GET/POST | `/api/owner/cars` | yes | List / create car |
| GET/PUT/DELETE | `/api/owner/cars/:carId` | yes | Car CRUD |
| POST | `/api/owner/cars/:carId/toggle-availability` | yes | Toggle availability |
| GET | `/api/owner/bookings` | yes | Incoming applications |
| GET | `/api/owner/bookings/:id` | yes | Application detail |
| POST | `/api/owner/bookings/:id/accept` | yes | Accept application |
| POST | `/api/owner/bookings/:id/reject` | yes | Reject application |
| GET | `/api/owner/payments` | yes | Payments received |
| GET | `/api/owner/deposits` | yes | Deposits held |
| POST | `/api/owner/ai-matchmaker/search` | yes | AI driver search (Groq) |

### Admin
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/admin/verifications/owners` | yes | Pending owner verifications |
| POST | `/api/admin/verifications/owners/:userId` | yes | Approve/reject owner |
| GET | `/api/admin/users/:userId/owner-documents` | yes | Owner document review |
| GET | `/api/admin/verifications/cars` | yes | Pending car verifications |
| POST | `/api/admin/verifications/cars/:carId` | yes | Approve/reject car |
| GET | `/api/admin/verifications/drivers` | yes | Pending driver KYC |
| GET | `/api/admin/verifications/drivers/history` | yes | KYC history |
| PUT | `/api/admin/verifications/drivers/:id` | yes | Review driver KYC |
| GET | `/api/admin/bookings` | yes | All applications |
| POST | `/api/admin/bookings/:id/accept` | yes | Admin accept |
| POST | `/api/admin/bookings/:id/reject` | yes | Admin reject |
| POST | `/api/admin/bookings/:id/send-agreement` | yes | Generate/send e-agreement |
| GET | `/api/admin/payments/pending` | yes | Pending payment receipts |
| POST | `/api/admin/payments/:id/confirm` | yes | Confirm payment |
| POST | `/api/admin/payments/:id/reject` | yes | Reject payment |
| POST | `/api/admin/deposits/:id/freeze` | yes | Freeze deposit |
| POST | `/api/admin/deposits/:id/release` | yes | Release deposit |
| POST | `/api/admin/deposits/:id/deduct` | yes | Deduct penalty |

### Shared
| Method | Path | Auth | Description |
| :--- | :--- | :--- | :--- |
| GET | `/api/agreements` | yes | My agreements |
| GET | `/api/agreements/:id` | yes | Agreement detail |
| POST | `/api/agreements/:id/agree` | yes | Sign agreement |
| POST | `/api/bookings/:id/payments` | yes | Submit payment receipt |
| GET | `/api/bookings/:id/payments` | yes | Payments for a booking |
| POST | `/api/bookings/:id/deposits` | yes | Submit deposit receipt |
| GET | `/api/bookings/:id/deposits` | yes | Deposit for a booking |
| POST | `/api/bookings/:id/cancel` | yes | Cancel booking |
| GET | `/api/notifications` | yes | Notifications |
| GET | `/api/notifications/unread-count` | yes | Unread count |
| POST | `/api/notifications/:id/read` | yes | Mark read |
| POST | `/api/notifications/read-all` | yes | Mark all read |
| DELETE | `/api/notifications/:id` | yes | Delete notification |

---

## Database Schema

Core tables (PostgreSQL, Prisma-managed):

| Table | Purpose | Key Fields |
| :--- | :--- | :--- |
| `users` | All accounts | `role` (DRIVER/OWNER/ADMIN), `phone`, `verificationStatus`, `isVerified` |
| `driver_profiles` | Driver KYC | `nrcText`, NRC images, license URLs, `kycStatus`, `adminApprovalStatus` |
| `owner_profiles` | Owner KYC | `nrcText`, NRC images, `adminApprovalStatus` |
| `driver_licenses` | License records | `licenseNumber`, `licenseClass`, `expiryDate`, `status` |
| `cars` | Listed vehicles | `brand`, `model`, `rentalPrice`, `depositAmount`, `availabilityStatus`, `adminApprovalStatus` |
| `car_images` | Car photos | front/back/left/right images (1:1 with car) |
| `car_applications` | Driver booking requests | `ownerApprovalStatus`, `adminApprovalStatus`, agreement timestamps |
| `car_rentals` | Active/completed rentals | `rentalStartDate`, `rentalEndDate`, `status` (ACTIVE/COMPLETED/CANCELLED) |
| `payments` | Rental fee receipts | `amount`, `receiptPhotoUrl`, `status` (PENDING/COMPLETED/FAILED/REFUNDED) |
| `deposits` | Deposit receipts | `amount`, `status` (frozen/released/deducted flows) |
| `reviews` | Ratings | `direction` (OWNER_TO_DRIVER / DRIVER_TO_OWNER), `rating` |
| `notifications` | In-app alerts | `receiverId`, `title`, `message`, `isRead` |
| `otp_codes` | OTP flow | `phone`, `code`, `purpose`, `expiresAt`, `consumedAt` |
| `sessions` / `accounts` | Better Auth | cookie sessions, provider accounts |
| `verifications` | Better Auth | verification tokens |

Full schema: `backend/prisma/schema.prisma` (also mirrored in `api_and_state_design.md`).

---

## Frontend Routing

```
/                      PublicLayout
+-- /                  Landing (GuestRoute)
+-- /about  /contact  /faq  /terms  /privacy
+-- /cars/:id          Public car details

/login  /register  /forgot-password  /reset-password/:token    AuthLayout (GuestRoute)

/owner/*                ProtectedRoute [OWNER]  + DashboardLayout
+-- /                  Owner dashboard (stats, earnings chart, recent bookings)
+-- /cars  /cars/new  /cars/:id/edit
+-- /bookings          incoming applications
+-- /ai-matchmaker     AI driver search
+-- /earnings  /payments  /deposits  /reviews  /disputes
+-- /documents  /profile  /notifications
+-- /agreements  /agreements/:id

/driver/*               ProtectedRoute [DRIVER] + DashboardLayout
+-- /                  Driver dashboard (active bookings, verification, recommendations)
+-- /cars  /cars/:id   browse + apply
+-- /bookings  /bookings/:id
+-- /payments  /deposits  /documents(KYC)  /disputes  /reviews
+-- /profile  /notifications
+-- /agreements  /agreements/:id

/admin/*                ProtectedRoute [ADMIN]  + DashboardLayout
+-- /                  Admin dashboard
+-- /verifications/owners | /drivers | /cars
+-- /users  /bookings  /payments  /deposits  /disputes  /audit-log
+-- /notifications
+-- /agreements  /agreements/:id
```

Route guards:
- `ProtectedRoute` — requires auth + role match (RBAC).
- `GuestRoute` — redirects authenticated users to their role dashboard.
- `PublicRoute` — public pages.

---

## Development Commands

### Backend (`cd backend`)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Start API with hot reload (nodemon + tsx) |
| `npm start` | Start API |
| `npm run seed` | Seed demo data |
| `npm run otp` | Print current OTP codes (SMS simulation) |
| `npx prisma migrate dev` | Apply schema migrations |
| `npx prisma studio` | Browse database |
| `npx tsc --noEmit` | Typecheck |

### Frontend (`cd frontend`)
| Command | Description |
| :--- | :--- |
| `npm run dev` | Start Vite dev server |
| `npm run build` | Typecheck + production build |
| `npm run lint` | ESLint |
| `npm run preview` | Preview production build |
| `npm run otp` | Print current OTP codes (runs backend script) |

---

## Current State & Next Steps

Live progress is tracked in `current_state.md`. Summary:

**Done**
- Better Auth integration + OTP registration flow (SMS simulated in terminal, codes via `npm run otp`).
- Prisma `PrismaPg` local PostgreSQL setup with migrations and seed.
- Full route/controller architecture extracted (`routes/`, `controllers/`, `service/`, `respositry/`, `lib/`).
- React Router with `ProtectedRoute` (RBAC) + `GuestRoute`, role mapping fixed.
- Owner and Driver dashboards (UI + mocked data), registration page connected to OTP flow.

**In progress / planned**
1. Twilio SMS — awaiting credentials to replace simulated OTP printing.
2. Backend queries for Owner/Driver dashboard APIs to replace frontend mocks.
3. Admin dashboard workflows — verifications, payments, deposits, disputes.