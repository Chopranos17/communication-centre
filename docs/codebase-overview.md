# Codebase overview

Vite + React SPA with an Express API (`src/api/server.ts`), Prisma + SQLite, Resend/Twilio messaging, and Socket.IO for live timeline updates. This document inventories source files, the Prisma data model, HTTP API routes, and where UI components appear.

---

## Files by directory

Paths are relative to the repository root. One-line purpose each.

### `.cursor/rules/`

| File | Description |
|------|-------------|
| `coding-standards.mdc` | Cursor rule: coding conventions for this project. |
| `project-context.mdc` | Cursor rule: product and technical context for the app. |
| `workflow.mdc` | Cursor rule: development workflow expectations. |

### Root

| File | Description |
|------|-------------|
| `.env` | Local environment variables (not committed; copy from `.env.example`). |
| `.env.example` | Example env vars for database URL, Resend, Twilio, ports. |
| `.gitignore` | Git ignore patterns (dependencies, build output, env, DB, etc.). |
| `index.html` | Vite HTML entry; mounts the React app. |
| `package.json` | npm scripts, dependencies, Prisma seed configuration. |
| `package-lock.json` | Locked dependency tree for reproducible installs. |
| `postcss.config.js` | PostCSS config for Tailwind pipeline. |
| `README.md` | Project readme and setup notes. |
| `tailwind.config.js` | Tailwind theme and content paths. |
| `tsconfig.json` | Root TypeScript compiler options. |
| `tsconfig.app.json` | TS config for application source. |
| `tsconfig.node.json` | TS config for Vite/Node tooling. |
| `vite.config.ts` | Vite bundler configuration (React plugin, etc.). |

### `dist/` (build output)

| File | Description |
|------|-------------|
| `dist/index.html` | Production HTML emitted by `vite build`. |
| `dist/assets/index-*.css` | Bundled CSS asset (hashed filename). |
| `dist/assets/index-*.js` | Bundled JavaScript asset (hashed filename). |

### `docs/`

| File | Description |
|------|-------------|
| `codebase-overview.md` | This document: inventory of files, models, routes, and UI. |
| `internal-prd.md` | Internal product requirements notes. |
| `platform-context.md` | Platform and domain context for the Communication Centre. |
| `prd.md` | Product requirements document. |
| `tasks.md` | Task breakdown / backlog aligned with the PRD. |
| `usecase-task-map.md` | Mapping of use cases to implementation tasks. |

### `docs/design-system/`

| File | Description |
|------|-------------|
| `components.md` | Design system component documentation. |
| `tokens.css` | Design tokens (CSS variables) reference or excerpt. |
| `sapien-colours.pdf` | Brand colour reference (PDF). |
| `sapien-typography.pdf` | Typography reference (PDF). |

### `docs/design-system/screenshots/`

| File | Description |
|------|-------------|
| `01-job-openings-list.png` | Screenshot: job openings list UI. |
| `02-job-detail-candidates.png` | Screenshot: job detail with candidates. |
| `03-all-candidates-list.png` | Screenshot: all candidates list. |
| `04-candidate-detail-overview.png` | Screenshot: candidate detail overview. |
| `05-candidate-detail-application.png` | Screenshot: candidate application tab. |
| `06-candidate-list-3dot-menu.png` | Screenshot: candidate row overflow menu. |
| `07-candidate-profile-form.png` | Screenshot: candidate profile form. |
| `08-candidate-profile-full.png` | Screenshot: full candidate profile. |

### `prisma/`

| File | Description |
|------|-------------|
| `schema.prisma` | Prisma schema: SQLite datasource and all models. |
| `seed.ts` | Database seed script: demo jobs, candidates, communications, templates. |
| `dev.db` | Local SQLite database file (generated; may be gitignored). |

### `src/`

| File | Description |
|------|-------------|
| `App.tsx` | React root routes: `BrowserRouter`, `PersonaProvider`, page routes under `AppLayout`. |
| `main.tsx` | ReactDOM entry: mounts `<App />` and global styles. |
| `index.css` | Global CSS imports (Tailwind layers, app styles). |
| `vite-env.d.ts` | Vite client type references for TypeScript. |

### `src/api/`

| File | Description |
|------|-------------|
| `server.ts` | Express HTTP server: REST API, Socket.IO, Twilio inbound poller startup. |
| `db.ts` | Singleton `PrismaClient` instance for the API. |
| `candidatesClient.ts` | Browser fetch helpers and types for candidate APIs. |
| `jobsClient.ts` | Browser fetch helpers and types for job APIs. |
| `socket-io.ts` | Holds Socket.IO server ref; emits `new-message` to connected clients. |

### `src/api/services/`

| File | Description |
|------|-------------|
| `message-sender.ts` | Sends email (Resend), SMS, and WhatsApp (Twilio); persists `Communication` rows. |
| `inbound-poller.ts` | Polls Twilio/Resend for inbound messages and writes unmatched/inbound comms. |

### `src/components/candidate/`

| File | Description |
|------|-------------|
| `CandidateDetailHeader.tsx` | Candidate profile header: avatar, stage, SMS/WhatsApp actions. |
| `CandidateDetailSidebar.tsx` | Right column: tags and other jobs summary for a candidate. |
| `CandidateDetailTabs.tsx` | Tab bar for candidate sections (overview, application, communications, etc.). |
| `ChannelTimelineIcon.tsx` | Icon by channel type for timeline rows (email, SMS, meeting, etc.). |
| `ChannelTypeBadge.tsx` | Small badge label for channel type on the timeline. |
| `CommunicationsCurrentJobSection.tsx` | Communications tab body: timeline, modals, Socket.IO refresh. |
| `CommunicationsJobEmailSection.tsx` | Threaded timeline table, filters, and row actions for current/other jobs. |
| `CommunicationToolbarIcons.tsx` | SVG icons: reply, follow-up, more menu. |
| `ComposeEmailModal.tsx` | Rich-text email composer (React Quill), templates, CC, bulk recipients. |
| `DeliveryStatusGlyph.tsx` | Visual indicator for pending/sent/delivered/failed delivery. |
| `EmailDetailModal.tsx` | Read-only modal for full email/meeting body and metadata. |
| `FollowUpEmailModal.tsx` | Follow-up email flow within a thread (contact@ rules). |
| `HiringFlowPlaceholder.tsx` | Placeholder hiring funnel visualization on candidate overview. |
| `ReplyThreadModal.tsx` | Reply-in-thread email composer with threading validation. |
| `ScheduleMeetingModal.tsx` | Form to schedule 1:1 meetings and send invite emails. |
| `SendChannelMessageModal.tsx` | SMS or WhatsApp compose modal for a single candidate. |

### `src/components/layout/`

| File | Description |
|------|-------------|
| `AppLayout.tsx` | Shell: `AppHeader` + `<Outlet />` for nested routes. |
| `AppHeader.tsx` | Top nav, persona switcher, links to job openings and candidates. |
| `FilterTabs.tsx` | Horizontal pill tabs with optional counts (jobs page, application sub-tabs). |
| `ListToolbar.tsx` | Toolbar for lists: search placeholder, select-all, bulk actions area. |
| `PageHeader.tsx` | Page title row with optional badge and right-side actions. |
| `PaginationFooter.tsx` | Footer pagination controls (demo/static page sizes). |

### `src/components/ui/`

| File | Description |
|------|-------------|
| `LoadingSpinner.tsx` | Accessible loading spinner used during data fetches. |

### `src/context/`

| File | Description |
|------|-------------|
| `PersonaContext.tsx` | React context: recruiter vs candidate persona and capability flags. |

### `src/pages/`

| File | Description |
|------|-------------|
| `JobOpeningsPage.tsx` | Lists jobs from API with filters and links to job detail. |
| `JobDetailPage.tsx` | Single job with candidate list and bulk/row email compose. |
| `CandidatesPage.tsx` | All candidates table with selection, compose, SMS/WhatsApp modals. |
| `CandidateDetailPage.tsx` | Full candidate profile with tabs and communications timeline. |

### `src/types/`

| File | Description |
|------|-------------|
| `persona.ts` | `Persona` union type and display labels for the persona switcher. |

### `src/utils/`

| File | Description |
|------|-------------|
| `communicationTimeline.ts` | Pure helpers: thread grouping, previews, time formatting, thread actions. |
| `communicationTimelineRow.ts` | Maps API email rows to timeline row shape for grouping. |
| `emailTemplateVars.ts` | Substitutes template variables in subject/body for compose. |
| `sendFeedbackMessages.ts` | User-facing strings for send success/partial/error toasts. |

### Placeholder files

| File | Description |
|------|-------------|
| `src/components/.gitkeep` | Keeps empty `components` folder in git when needed. |
| `src/pages/.gitkeep` | Keeps empty `pages` folder in git when needed. |
| `src/types/.gitkeep` | Keeps empty `types` folder in git when needed. |

---

## Data model (Prisma)

Database: **SQLite** via `DATABASE_URL`. Enum-like fields are stored as **strings** (see comments in schema and seed data).

### `Candidate`

| Field | Type | Notes |
|-------|------|--------|
| `id` | `String` | Primary key, `cuid()`. |
| `name` | `String` | Display name. |
| `email` | `String` | Email address. |
| `phone` | `String?` | Phone (optional). |
| `whatsapp_number` | `String?` | WhatsApp identifier (optional). |
| `current_stage` | `String` | Pipeline stage: `applied`, `shortlisting`, `screening`, `assessment`, `interview`, `pre_offer`, `offer`, `hired`, `rejected`. |
| `recruiter_id` | `String?` | Optional recruiter user id. |
| `hiring_lead_id` | `String?` | Optional hiring lead user id. |
| `hiring_manager_id` | `String?` | Optional hiring manager user id. |
| `source` | `String` | Source: `job_portal`, `referral`, `external_recruiter`, `IJP`, `CRM`. |
| `created_at` | `DateTime` | Default `now()`. |
| `updated_at` | `DateTime` | Auto-updated. |

**Relations:** `jobs` → `CandidateJob[]`, `communications` → `Communication[]`, `meetings` → `Meeting[]`.

### `CandidateJob` (join)

| Field | Type | Notes |
|-------|------|--------|
| `candidate_id` | `String` | FK → `Candidate.id`, part of `@@id`. |
| `job_id` | `String` | FK → `Job.id`, part of `@@id`. |
| `is_current` | `Boolean` | Default `false`; marks current application. |

**Relations:** `candidate`, `job`. Composite primary key `[candidate_id, job_id]`.

### `Job`

| Field | Type | Notes |
|-------|------|--------|
| `id` | `String` | Primary key, `cuid()`. |
| `title` | `String` | Job title. |
| `department` | `String` | Department name. |
| `location` | `String` | Location string. |
| `status` | `String` | `open`, `closed`, `on_hold`. |
| `job_code` | `String` | Unique job code. |
| `requisition_id` | `String?` | Optional requisition id. |
| `hiring_lead_id` | `String?` | Optional hiring lead id. |
| `recruiter_ids` | `String?` | JSON text: array of recruiter user ids. |
| `hiring_workflow_template_id` | `String?` | Optional workflow template id. |

**Relations:** `candidates` → `CandidateJob[]`, `communications` → `Communication[]`, `meetings` → `Meeting[]`.

### `Communication`

| Field | Type | Notes |
|-------|------|--------|
| `id` | `String` | Primary key, `cuid()`. |
| `candidate_id` | `String?` | FK → `Candidate` (nullable for unmatched inbound). |
| `job_id` | `String?` | FK → `Job`. |
| `unmatched` | `Boolean` | Inbound SMS/WhatsApp not matched to a candidate yet. |
| `channel` | `String` | `email`, `sms`, `whatsapp`, `meeting`, `system_notification`. |
| `direction` | `String` | Default `outbound`; `inbound` for replies. |
| `sender_type` | `String` | `recruiter`, `hiring_lead`, `system`, `candidate`, `CRM`. |
| `sender_id` | `String?` | Optional sender id. |
| `sender_name` | `String?` | Display name for sender. |
| `thread_id` | `String?` | Email thread grouping id. |
| `from_address` | `String?` | From address (email). |
| `to_address` | `String?` | To address. |
| `cc_addresses` | `String?` | JSON array of CC emails (text). |
| `subject` | `String?` | Email subject. |
| `body` | `String` | Body (HTML or text). |
| `template_id` | `String?` | FK → `EmailTemplate`. |
| `delivery_status` | `String` | Default `pending`: `pending`, `sent`, `delivered`, `failed`. |
| `vendor_message_id` | `String?` | External provider message id. |
| `sent_at` | `DateTime` | Default `now()`. |
| `read_at` | `DateTime?` | Optional read timestamp. |

**Relations:** `candidate`, `job`, `template`, optional one-to-one `meeting_detail` → `Meeting`.

**Indexes:** `[candidate_id, job_id]`, `[thread_id]`.

### `Meeting`

| Field | Type | Notes |
|-------|------|--------|
| `id` | `String` | Primary key, `cuid()`. |
| `candidate_id` | `String` | FK → `Candidate`. |
| `job_id` | `String` | FK → `Job`. |
| `communication_id` | `String?` | Unique FK → `Communication` (meeting row linked to comm). |
| `title` | `String` | Meeting title. |
| `description` | `String?` | Optional description. |
| `organizer_id` | `String?` | Organizer user id. |
| `participants` | `String` | JSON text: `[{ "name", "email" }, ...]`. |
| `duration_minutes` | `Int` | Duration in minutes. |
| `scheduled_at` | `DateTime` | Scheduled start. |
| `channel` | `String` | `google_meet`, `ms_teams`, `zoom`, `darwinbox_meet`, `in_person`. |
| `meeting_link` | `String?` | Video link if applicable. |
| `status` | `String` | `scheduled`, `rescheduled`, `completed`, `cancelled`. |

**Relations:** `candidate`, `job`, optional `communication`.

### `EmailTemplate`

| Field | Type | Notes |
|-------|------|--------|
| `id` | `String` | Primary key, `cuid()`. |
| `name` | `String` | Template display name. |
| `category` | `String` | `confirmation`, `rejection`, `scheduling`, `offer`, `follow_up`, `assessment_invite`, `pre_offer`, `custom`. |
| `subject_template` | `String` | Subject with `{{variables}}`. |
| `body_template` | `String` | Body template. |
| `variables` | `String` | JSON text: list of variable keys. |
| `channel` | `String` | Default `email`; also `sms`, `whatsapp` in schema. |

**Relations:** `communications` → `Communication[]`.

---

## API routes

Base URL in development: `http://localhost:3001` (see `PORT` in `.env`). All paths below are relative to that origin.

| Method | Path | Description |
|--------|------|-------------|
| `GET` | `/api/health` | Liveness check; returns `{ ok: true }`. |
| `GET` | `/api/candidates` | List candidates with current job summary for the list view. |
| `GET` | `/api/candidates/:id` | Candidate detail for profile page (jobs, stage, counts). |
| `GET` | `/api/candidates/:candidateId/communications` | Timeline for a candidate; optional `?jobId=`; returns `currentJob`, `emails`, `otherJobEmailSections`. |
| `POST` | `/api/candidates/:candidateId/compose-email` | Send or thread an email (body: `jobId`, `fromAddress`, `subject`, `htmlBody`, `cc`, `templateId`, `senderName`, `threadId`). |
| `POST` | `/api/candidates/:candidateId/compose-sms` | Send SMS (`jobId`, `text`, `senderName`). |
| `POST` | `/api/candidates/:candidateId/compose-whatsapp` | Send WhatsApp (`jobId`, `text`, `senderName`). |
| `POST` | `/api/candidates/:candidateId/schedule-meeting` | Create meeting + communication and send invite emails (`jobId`, `title`, `description`, `durationMinutes`, `scheduledAt`, `channel`, `participants`, `senderName`). |
| `GET` | `/api/jobs` | List all jobs (id, title, job_code, status, location, department). |
| `GET` | `/api/jobs/:jobId` | Job detail plus candidates applied to that job with job counts. |
| `GET` | `/api/email-templates` | List email templates (`channel: email`) for compose UI. |
| `GET` | `/api/employees` | Mock employee directory for CC type-ahead; optional `?q=` filter. |
| `GET` | `/api/test-send` | Dev-only test send: `?channel=email|sms|whatsapp` and optional `?to=` override. |

**WebSocket:** Socket.IO on the same server emits `new-message` with a payload when inbound poller or sends update the timeline (client subscribes in `CommunicationsCurrentJobSection`).

---

## React components and pages

Routes are defined in `src/App.tsx`. Layout route wraps all pages with `AppLayout` (`AppHeader` + main content).

| Route | Page component |
|-------|----------------|
| `/` | Redirect → `/recruitment/job-openings` |
| `/recruitment/job-openings` | `JobOpeningsPage` |
| `/recruitment/jobs/:jobId` | `JobDetailPage` |
| `/recruitment/candidates` | `CandidatesPage` |
| `/recruitment/candidates/:candidateId` | `CandidateDetailPage` |
| `*` | Redirect → `/recruitment/job-openings` |

### Components by page / scope

| Component | Where it appears |
|-----------|------------------|
| `App` | Root; wraps router and `PersonaProvider`. |
| `PersonaProvider` | All routes; provides persona and `canManageRecruitment`. |
| `AppLayout` | All main routes (shell). |
| `AppHeader` | All main routes (inside `AppLayout`). |
| **JobOpeningsPage** | `/recruitment/job-openings` |
| `PageHeader` | Job Openings page title row. |
| `FilterTabs` | Job openings status tabs (All / Open / Hold / etc.). |
| `ListToolbar` | Job list toolbar. |
| `PaginationFooter` | Job list footer. |
| `StatusBadge` | **Local** to `JobOpeningsPage` (not a separate file). |
| **JobDetailPage** | `/recruitment/jobs/:jobId` |
| `PageHeader` | Job title and back link. |
| `LoadingSpinner` | Loading state. |
| `ComposeEmailModal` | Bulk or single-candidate email from job’s candidate list. |
| **CandidatesPage** | `/recruitment/candidates` |
| `PageHeader` | Candidates title. |
| `ListToolbar` | Search/select/bulk area. |
| `PaginationFooter` | List footer. |
| `LoadingSpinner` | Loading state. |
| `ComposeEmailModal` | Compose to selected or single candidate. |
| `SendChannelMessageModal` | SMS or WhatsApp from row menu (two instances by `variant`). |
| **CandidateDetailPage** | `/recruitment/candidates/:candidateId` |
| `LoadingSpinner` | Initial load. |
| `CandidateDetailHeader` | Profile header and channel shortcuts. |
| `CandidateDetailTabs` | Section tabs. |
| `HiringFlowPlaceholder` | **Overview** tab. |
| `FilterTabs` | **Application** tab: sub-pills (snapshot, resume, etc.). |
| `TabPanelPlaceholder` | **Local** placeholders for non-snapshot application sections, Activity, Other Apps. |
| `CommunicationsCurrentJobSection` | **Communications** tab only. |
| `SendChannelMessageModal` | SMS/WhatsApp (when recruitment actions enabled). |
| `CandidateDetailSidebar` | Right column on all tabs’ layout. |

### Nested under Communications (Candidate detail → Communications tab)

| Component | Used in |
|-----------|---------|
| `CommunicationsCurrentJobSection` | `CandidateDetailPage` |
| `CommunicationsJobEmailSection` | `CommunicationsCurrentJobSection` |
| `ComposeEmailModal` | `CommunicationsCurrentJobSection` |
| `EmailDetailModal` | `CommunicationsCurrentJobSection` |
| `FollowUpEmailModal` | `CommunicationsCurrentJobSection` |
| `ReplyThreadModal` | `CommunicationsCurrentJobSection` |
| `ScheduleMeetingModal` | `CommunicationsCurrentJobSection` |
| `ChannelTimelineIcon` | `CommunicationsJobEmailSection` |
| `ChannelTypeBadge` | `CommunicationsJobEmailSection` |
| `DeliveryStatusGlyph` | `CommunicationsJobEmailSection` |
| `CommunicationToolbarIcons` (`IconReply`, `IconFollowUp`, `IconMoreVertical`) | `CommunicationsJobEmailSection` |
| `LoadingSpinner` | `CommunicationsJobEmailSection` (loading/empty states) |

### Shared UI

| Component | Typical use |
|-----------|-------------|
| `LoadingSpinner` | `CandidateDetailPage`, `CandidatesPage`, `JobDetailPage`, timeline loading inside `CommunicationsJobEmailSection`. |

---

*Generated for the Communication Centre prototype. Regenerate or extend this file when adding routes, models, or major folders.*
