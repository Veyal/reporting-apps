# Business Reporting Platform – Functional & Technical Specification

This document reverse‑engineers the existing **reporting-apps** monorepo and captures everything needed to rebuild or redeploy the system reliably on a VPS. It prioritizes configurability (all deployment-specific values **must** come from environment variables), modularity, and operational clarity so the product can be reproduced without inheriting the current bugs.

---

## 1. Product Objectives
- Provide a mobile-optimized business reporting experience covering Opening, Closing, Problem, and Stock workflows plus admin oversight.
- Ensure every configurable value (domain names, ports, secrets, API keys, feature flags, limits) is supplied through environment variables—no hard-coded deployment data.
- Support predictable deployments on single VPS targets with SSL/TLS support and automated database bootstrap.
- Integrate with Olsera’s Open API for automated raw-material stock pulls while allowing manual overrides and photo evidence uploads.

---

## 2. High-Level Architecture
| Tier | Technology | Responsibilities |
|------|------------|------------------|
| Frontend | Next.js 14 (App Router, TypeScript, Tailwind) | Authenticated SPA optimized for mobile. Pages: login, dashboard, report list/create/edit, stock workflow, admin suite, profile, (future) activity feed. Uses Axios to call backend with JWT + refresh logic. |
| Backend | Node.js + Express + Prisma (SQLite) | REST API for auth, reports, photos, admin management, and stock workflows. Handles file uploads, validation (Joi), security middleware (Helmet, CORS, rate-limit placeholders), and Olsera integration. |
| Database | SQLite (dev/prod) via Prisma schema | Users, Reports, Photos, Checklist templates/items, Stock reports/items, System settings, API credentials. |
| Infrastructure | Node.js + start.sh | Single-server deployment with Express serving both API and static frontend assets. Supports SSL/TLS via reverse proxy. |
| External APIs | Olsera Open API | `olseraApiClient` fetches stock movement, handles token lifecycle, stores credentials in DB (with env defaults). |

**Data flow summary**
1. Clients authenticate via `/api/auth/*` to receive JWT + refresh tokens (stored in localStorage).
2. Frontend Axios instance injects JWT in headers and refreshes automatically when 401 occurs.
3. Report flows call `/api/reports` for CRUD, `/api/photos` for media, `/api/stock/*` for stock-specific operations.
4. Admin-only features live under `/api/admin/*`.
5. Olsera API credentials are read from DB (seeded via admin UI) and used server-side only.

---

## 3. Application Modules

### 3.1 Frontend (Next.js)
- **Global layout (`app/layout.tsx`)** – wraps pages with `AuthProvider`, `ToastProvider`, and `ConditionalBottomNavigation`. Theme is dark/gothic via Tailwind tokens in `globals.css`.
- **Auth context (`contexts/AuthContext.tsx`)** – stores user session, persists access/refresh tokens, calls `authAPI` for login/register/logout/verify, exposes `isAdmin`.
- **Toast context (`contexts/ToastContext.tsx`)** – lightweight toaster queue for success/error messaging.
- **Landing (`app/page.tsx`)** – redirects to `/dashboard` when authenticated or `/login` otherwise.
- **Login (`app/login`)** – mobile-first form with password toggle, error banner, and navigation to dashboard on success.
- **Dashboard (`app/dashboard`)** – quick actions for each report type, stats (draft/submitted counts), and a recent report feed (max 5). Uses `reportsAPI.getReports`.
- **Reports list (`app/reports`)** – advanced filtering (type/status/search), grouping by day, inline status badges, and CTA to resume drafts or create new submissions.
- **Report creation/edit (`app/reports/create`, `/reports/[id]`, `/reports/[id]/edit`)**:
  - Auto-creates drafts (especially for stock type) and guards against duplicate drafts per type.
  - Embeds `ChecklistInterface` for opening/closing templates and `PhotoUploadSection` for per-category requirements.
  - Stock mode injects `StockReportForm` which orchestrates Olsera pulls, manual entry, photo uploads, and finalization.
- **Admin area (`app/admin/*`)** – accessible to `isAdmin` only:
  - `/admin/users` manage users (create/update/delete, assign roles).
  - `/admin/checklists` manage templates with drag-and-drop ordering (via `@dnd-kit`).
  - `/admin/photo-categories` configure per-report photo requirements (min/max counts).
  - `/admin/settings` edit `SystemSettings` table (timeouts, toggles, backup cadence, etc.).
  - Dashboard view summarizes counts from `/api/admin/stats/summary`.
- **Profile (`app/profile`)** – displays user metadata, supports password change (via `/api/auth/change-password`) and logout.
- **Activity (`app/activity`)** – currently a placeholder (coming soon).
- **Shared UI components** – `PhotoUpload` (dropzone), `PhotoUploadSection` (per-category tracking), `ChecklistInterface` (progress bars & toggles), `StockSection` cards, `LoadingSpinner`, `BottomNavigation`, `ResolutionModal`, `AuthenticatedImage`.
- **API clients (`lib/api.ts`, `lib/stockApi.ts`)** – wrap Axios with interceptors for token injection + refresh, exposing typed method groups (`authAPI`, `reportsAPI`, `photosAPI`, `adminAPI`, `stockAPI`).

### 3.2 Backend (Express + Prisma)
- **Server bootstrap (`backend/server.js`)**
  - Loads env (.env), ensures upload/data directories exist.
  - Applies Helmet, CORS (prod origins via `CORS_ORIGIN` env), JSON body limits, static `/uploads`.
  - Registers routers: `/api/auth`, `/api/reports` (JWT required), `/api/photos`, `/api/admin` (JWT + admin), `/api/stock`.
  - `/health` endpoint for monitoring.
- **Auth routes (`routes/auth.js`)**
  - Login/Register with Joi validation + bcrypt hashing.
  - Refresh tokens (type=refresh) share same `JWT_SECRET`.
  - `verify`, `logout`, and `change-password` endpoints.
- **Report routes (`routes/reports.js`)**
  - List with pagination/filter/sorting.
  - Draft creation/updating/deletion keyed by user; admin bypasses user filter.
  - Submission validation for checklists/photos; `resolve` reserved for admins.
  - Checklist toggle endpoint and stock sub-resource to enforce arithmetic validation (`opening - out = closing`).
- **Photo routes (`routes/photos.js`)**
  - Handles uploads via Multer to `${UPLOAD_DIR}/reports/<reportId>` with MIME checks and 10-file batch limit.
  - Validates category allowances (min/max) from `PhotoCategory`.
  - Provides secure file GET endpoints and listing/deletion.
- **Admin routes (`routes/admin.js`)**
  - User CRUD with role enforcement.
  - Checklist template CRUD + reorder transaction.
  - Photo category CRUD.
  - System settings GET/PUT.
  - Stats summary (report & user aggregates via Prisma groupBy).
- **Stock routes (`routes/stock.js`)**
  - Initialize stock report by calling `stockService.initializeStockReport(reportId, stockDate)` (fetches Olsera data, resets prior entries if date changes, enforces same-day restriction for non-admins).
  - Retrieve stock report + stats, update items, upload per-item photos, fetch summary, finalize after all items completed.
  - Sanitizes sensitive calculations for non-admin users.
- **Services**
  - `stockService.js` – all business logic for stock item ingestion, difference calculations, stats, completion checks.
  - `olseraApiClient.js` – token acquisition, pagination, filtering to “Bahan Baku”, automatic token refresh, uses DB-stored credentials or env fallbacks (`OLSERA_APP_ID`, `OLSERA_SECRET_KEY`).
- **Middleware**
  - `auth.js` – JWT verification, attaches user, enforces admin-only gates.
  - `errorHandler.js` – consistent JSON responses for Prisma/JWT/Multer/validation errors.
- **Prisma schema (`backend/prisma/schema.prisma`)** – defines models listed in Section 5.
- **Database seeding (`backend/prisma/seed.js`)** – creates default admin/user accounts, photo categories, checklist templates, and sample reports.

---

## 4. API Surface

### 4.1 Authentication (`/api/auth`)
- `POST /login` – { username, password } → { user, accessToken, refreshToken }.
- `POST /register` – creates USER role with password policy.
- `POST /refresh` – requires refresh token of type `refresh`.
- `POST /logout` – stateless acknowledgement.
- `GET /verify` – validates access token and returns user context.
- `POST /change-password` – requires JWT; validates old password and new-complexity rule.

### 4.2 Reports (`/api/reports`)
- `GET /` – query params: `type`, `status`, `page`, `limit`, `search`, `sortBy`, `sortOrder`.
- `GET /:id` – includes user, photos, checklist templates, stock report.
- `POST /` – create draft (type ∈ {OPENING, CLOSING, PROBLEM, STOCK}, optional metadata JSON).
- `PATCH /:id` – update draft fields.
- `DELETE /:id` – delete draft.
- `POST /:id/submit` – enforces checklist completion + mandatory fields.
- `POST /:id/resolve` – admin-only, provide resolution text.
- `POST /:id/checklist/:checklistId` – toggle completion.
- `POST /:id/stock` – create/update simple stock summary (legacy vs. the richer `/api/stock` flow).

### 4.3 Photos (`/api/photos`)
- `POST /:reportId` – multipart form with `photos[]`, requires `category`, enforces per-category max counts.
- `GET /:reportId` – optional `category` filter.
- `GET /file/:reportId/:filename` – secure file delivery (auth required).
- `DELETE /:reportId/:photoId` – removes DB record + file.
- `GET /categories/:reportType` – public list of active categories for client-side validation.

### 4.4 Admin (`/api/admin`)
- Users: `GET`, `POST`, `PATCH`, `DELETE /users`.
- Checklists: `GET /checklists`, `POST /checklists`, `PATCH /checklists/reorder`, `PATCH/DELETE /checklists/:id`.
- Photo categories: full CRUD under `/photo-categories`.
- Settings: `GET /settings`, `PUT /settings`.
- Stats: `GET /stats/summary` returns counts by type/status plus recent reports and user role distribution.

### 4.5 Stock (`/api/stock`)
- `POST /reports/:reportId/initialize` – body `{ stockDate }`, restricts non-admins to today; fetches Olsera raw materials.
- `GET /reports/:reportId` – returns sanitized report + stats.
- `PATCH /items/:itemId` – body `{ actualClosing, notes, photoId? }`, recalculates difference and completion.
- `POST /items/:itemId/photo` – multipart single-photo upload; associates with `report_photos`.
- `GET /photos/:photoId` – serve stored stock photo.
- `GET /reports/:reportId/summary` – aggregated list with statuses.
- `POST /reports/:reportId/finalize` – sets report status to SUBMITTED once all items completed.

---

## 5. Data Model (Prisma)
| Model | Purpose | Key Fields / Notes |
|-------|---------|--------------------|
| `User` | Auth principals | `username` unique, `role` (USER/ADMIN), `passwordHash`, `lastLogin`. |
| `Report` | Core entity per submission | `type`, `status` (DRAFT/SUBMITTED/RESOLVED), `metadata` JSON (stringified), relations to `User`, `ReportPhoto`, `ReportChecklist`, optional `StockReport`. |
| `ReportPhoto` | Uploaded evidence | `category`, `filename`, `checksum`, timestamps. |
| `PhotoCategory` | Admin-managed rules | `code` unique, `reportType`, `minRequired`, `maxAllowed`, `active`, ordering. |
| `ChecklistTemplate` | Opening/closing templates | `type`, `title`, `order`, `required`. |
| `ReportChecklist` | Instance of template per report | `completed` flag. |
| `StockReport` | Extended stock workflow | `reportId` unique FK, `stockDate`, `syncedAt`, `completedAt`. |
| `StockReportItem` | Per-product entry | `productId`, `openingStock`, `expectedOut`, `actualClosing`, `difference`, `photoId`, `notes`, `completed`. |
| `SystemSettings` | Misc. configurable toggles | `systemName`, `maxFileSize`, `sessionTimeout`, `backupFrequency`, etc. |
| `ApiCredentials` | External provider secrets | `provider` unique (`olsera`), `appId`, `secretKey`, `accessToken`, `tokenExpiry`, `active`. |

---

## 6. External Integration – Olsera Open API
- **Endpoints**:
  - `POST /api/open-api/v1/id/token` – obtains access + refresh tokens (expires_in ~ 86400s).
  - `GET /api/open-api/v1/en/inventory/stockmovement` – accepts `start_date`, `end_date`, `page`; returns paginated raw-material movement.
- **Client Behavior** (`services/olseraApiClient.js`):
  - Loads credentials from `api_credentials` table; falls back to `OLSERA_APP_ID` / `OLSERA_SECRET_KEY` env when none exist.
  - Maintains Axios instance with Bearer token; auto-refreshes when expired.
  - Filters results to `product_group_name === 'Bahan Baku'`.
  - Supports pagination until `meta.last_page`.
- **Stock initialization**:
  - `stockService.initializeStockReport` wipes prior items when date changes, seeds new report/items, and calculates expected outflows.
  - Pulls previous day’s closing stock from most recent completed stock report, else uses `beginning_qty`.
  - Non-admin users may only initialize for today (validated in router).

---

## 7. Configuration & Environment Policy
> **Requirement:** Every environment-specific value must be expressed as an environment variable (.env for dev, secrets in deployment orchestrator). Hard-coded constants (domains, file paths, credentials, feature flags) are prohibited.

### 7.1 Core Variables
| Variable | Scope | Default | Description / Notes |
|----------|-------|---------|---------------------|
| `NODE_ENV` | Global | `development` or `production` | Controls CORS, logging, error detail. |
| `DOMAIN` | Global | `yourdomain.com` | Used for routing rules & generated URLs. |
| `HOST` | Backend | `0.0.0.0` | Bind host for Express server. |
| `PORT` | Backend | `5001` | Express listening port. |
| `DATABASE_URL` | Backend | `file:./data/dev.db` | SQLite location (change per env). |
| `JWT_SECRET` | Backend | _required_ | Use `openssl rand -base64 32`. Never commit. |
| `ACCESS_TOKEN_TTL_MIN` | Backend | `15` | Minutes for access token validity. |
| `REFRESH_TOKEN_TTL_DAYS` | Backend | `7` | Days for refresh token validity. |
| `UPLOAD_DIR` | Backend | `./uploads` | Relative path for report photos. |
| `MAX_FILE_SIZE` | Backend | `52428800` | Bytes; ensure aligns with SystemSettings defaults. |
| `CORS_ORIGIN` | Backend | `https://yourdomain.com` | List or array for prod origins; dev defaults to `http://localhost:3000`. |
| `NEXT_PUBLIC_API_URL` | Frontend build-time | `http://localhost:5001/api` | API URL for frontend. |
| `NEXT_PUBLIC_BACKEND_HOST/PORT` | Frontend | `localhost/5001` | Used when `NEXT_PUBLIC_API_URL` absent. |
| `OLSERA_APP_ID`, `OLSERA_SECRET_KEY` | Backend | _required for Olsera_ | Provide per store; stored in DB via admin UI for rotation. |
| `SESSION_SECRET`, `FORCE_HTTPS`, `LOG_LEVEL`, `ENABLE_REQUEST_LOGGING` | Backend | Optional toggles for future middleware. |
| `AUTO_MIGRATE`, `AUTO_SEED` | Backend scripts | `true/false` | Determines whether to run Prisma migrations/seeding at startup. |
| `HEALTH_CHECK_TIMEOUT` | Infra | `5000` | Timeout for health probes / scripts. |

### 7.2 Secrets Management Guidance
- Store `.env` files outside VCS.
- Use different `JWT_SECRET`, `SESSION_SECRET`, and Olsera credentials per environment.

---

## 8. Deployment & Operations (VPS-Friendly)
1. **Prerequisites** – Node.js 18+, ports 80/443 available (if using reverse proxy), DNS A record pointing to VPS IP.
2. **Bootstrap** – Copy repo, run `./init.sh` for dev (installs deps, copies env templates, runs Prisma). For production, configure `.env` with required values (domain, API URL, JWT secret, Olsera keys, etc.).
3. **Build & Run** – Execute `chmod +x start.sh` then `./start.sh`. Script builds frontend, copies assets to backend, and starts the Express server.
4. **Persistent Data** – SQLite DB at `./data/prod.db`. Uploaded photos in `./uploads`. Create regular backups:
   ```bash
   sqlite3 ./data/prod.db ".backup ./backups/backup-$(date +%Y%m%d).db"
   ```
5. **Health & Logs** – `/health` endpoint for monitoring. View logs directly from the Node.js process or use a process manager like PM2.
6. **Database Migrations** – Run `npx prisma migrate deploy` when schema changes; seed via `npm run db:seed` if needed.
7. **Scaling considerations** – Current architecture is single-instance. For multi-instance, replace SQLite with Postgres and move uploads to object storage (S3) with signed URLs.

---

## 9. Security & Compliance Guidelines
- Enforce strong secrets (JWT, session) and rotate regularly.
- Use HTTPS exclusively (configure reverse proxy like Nginx for TLS; set `FORCE_HTTPS=true` if adding middleware).
- Password policy enforced via Joi regex; keep consistent between frontend validation and backend rules.
- JWT tokens stored in browser `localStorage`; consider migrating to HttpOnly cookies for higher security in future iteration.
- Helmet is enabled with `crossOriginResourcePolicy` override to permit CDN use; adjust if hosting assets elsewhere.
- Rate limiting middleware exists but is disabled for development; re-enable before production with env-driven thresholds (see `.env.example` for `API_RATE_LIMIT`, etc.).
- File uploads restrict MIME types and file counts; ensure `MAX_FILE_SIZE` env aligns with reverse proxy body limits.
- Audit Olsera credentials: store encrypted at rest if migrating away from SQLite; restrict admin UI access.

---

## 10. Known Gaps & Future Enhancements
1. **Activity feed** – `/activity` page is a placeholder; define backend event storage if notifications are required.
2. **Error-resilient Olsera sync** – Add retry/backoff, partial failure handling, and alerting when API credentials expire.
3. **Observability** – Implement structured logging, metrics (Prometheus), and uptime alerts.
4. **Multi-tenant support** – Currently single organization; add tenant IDs if multiple stores/domains are needed.
5. **File storage strategy** – Consider S3-compatible storage for scaling and CDN delivery; update env schema accordingly.

---

### Usage
- Treat this spec as the contract for rebuilding or refactoring the platform.
- Before deployment to any VPS, review Section 7 to ensure **all** environment variables are set; missing secrets are the leading cause of previous deployment bugs.
- Keep this document alongside the repo (`specs.md`) so future engineers have a single source of truth. Continuous updates are encouraged when models/API/contracts change.
