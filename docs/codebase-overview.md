# Codebase overview

Communication Centre is a Vite + React 18 SPA with an Express API (`src/api/server.ts`), Prisma + SQLite, outbound messaging via Resend (email) and Twilio (SMS/WhatsApp), and Socket.IO for live timeline updates. Routes live under `/recruitment/*`.

---

## Files by directory

One-line descriptions for each tracked project file (paths use `/`).

### `.cursor/rules/`

| File | Description |
| --- | --- |
| `coding-standards.mdc` | Cursor rule: coding conventions for this repo. |
| `project-context.mdc` | Cursor rule: product and architecture context. |
| `sds.mdc` | Cursor rule: Darwinbox SDS (design system) usage. |
| `workflow.mdc` | Cursor rule: development workflow expectations. |

### Root

| File | Description |
| --- | --- |
| `.env.example` | Example environment variables for API keys and database URL. |
| `.gitignore` | Git ignore patterns. |
| `README.md` | Project readme and setup notes. |
| `index.html` | Vite HTML shell; mounts the React app. |
| `package.json` | npm scripts and dependencies. |
| `package-lock.json` | Locked dependency tree. |
| `postcss.config.js` | PostCSS config (Tailwind pipeline). |
| `tailwind.config.js` | Tailwind theme and content paths. |
| `tsconfig.json` | Base TypeScript compiler options. |
| `tsconfig.app.json` | TypeScript config for the React app. |
| `tsconfig.node.json` | TypeScript config for Vite/Node tooling. |
| `vite.config.ts` | Vite bundler configuration and React plugin. |

### `docs/`

| File | Description |
| --- | --- |
| `codebase-overview.md` | This document: structure, models, APIs, and UI map. |
| `internal-prd.md` | Internal product requirements notes. |
| `platform-context.md` | Platform integration context. |
| `prd.md` | Product requirements document. |
| `tasks.md` | Task checklist / backlog. |
| `usecase-task-map.md` | Mapping of use cases to tasks. |

### `docs/design-system/`

| File | Description |
| --- | --- |
| `components.md` | Design-system component notes. |
| `sidebar-icons-reference.svg` | Reference artwork for sidebar icons. |
| `tokens.css` | Design tokens (CSS variables) for the design system. |
| `sapien-colours.pdf` | Brand colour reference (PDF). |
| `sapien-typography.pdf` | Typography reference (PDF). |

### `docs/design-system/icons/`

| File | Description |
| --- | --- |
| `icon-compensation.svg` | Compensation module icon asset. |
| `icon-employees.svg` | Employees module icon asset. |
| `icon-engagement.svg` | Engagement module icon asset. |
| `icon-flows.svg` | Flows module icon asset. |
| `icon-grid.svg` | Grid / apps launcher icon asset. |
| `icon-helpdesk.svg` | Helpdesk module icon asset. |
| `icon-home.svg` | Home icon asset. |
| `icon-orgview.svg` | Org view icon asset. |
| `icon-profile.svg` | Profile icon asset. |
| `icon-recruitment.svg` | Recruitment module icon asset. |
| `icon-shield.svg` | Shield / policies icon asset. |

### `docs/design-system/screenshots/`

| File | Description |
| --- | --- |
| `01-job-openings-list.png` | UI screenshot: job openings list. |
| `02-job-detail-candidates.png` | UI screenshot: job detail candidates. |
| `03-all-candidates-list.png` | UI screenshot: all candidates list. |
| `04-candidate-detail-overview.png` | UI screenshot: candidate overview. |
| `05-candidate-detail-application.png` | UI screenshot: candidate application tab. |
| `06-candidate-list-3dot-menu.png` | UI screenshot: candidate row menu. |
| `07-candidate-profile-form.png` | UI screenshot: candidate profile form. |
| `08-candidate-profile-full.png` | UI screenshot: full candidate profile. |

### `docs/design-system/sds/`

| File | Description |
| --- | --- |
| `COMPONENTS.md` | SDS component documentation. |
| `ICONOGRAPHY.md` | SDS iconography guidelines. |
| `LAYOUT.md` | SDS layout patterns. |
| `SKILL.md` | Agent skill notes for SDS usage. |
| `TOKENS.md` | SDS token documentation. |

### `prisma/`

| File | Description |
| --- | --- |
| `schema.prisma` | Prisma schema: SQLite datasource and all models. |
| `seed.ts` | Database seed: jobs, candidates, templates, sample communications. |

### `public/fonts/`

| File | Description |
| --- | --- |
| `DarwinSans-Bold.otf` | Darwin Sans Bold webfont. |
| `DarwinSans-Book.otf` | Darwin Sans Book webfont. |
| `DarwinSans-ExtraBold.otf` | Darwin Sans ExtraBold webfont. |
| `DarwinSans-Light.otf` | Darwin Sans Light webfont. |
| `DarwinSans-Medium.otf` | Darwin Sans Medium webfont. |

### `source/fonts/`

| File | Description |
| --- | --- |
| `DarwinSans-Bold.otf` | Source copy of Darwin Sans Bold (same family as `public/fonts`). |
| `DarwinSans-Book.otf` | Source copy of Darwin Sans Book. |
| `DarwinSans-ExtraBold.otf` | Source copy of Darwin Sans ExtraBold. |
| `DarwinSans-Light.otf` | Source copy of Darwin Sans Light. |
| `DarwinSans-Medium.otf` | Source copy of Darwin Sans Medium. |

### `src/`

| File | Description |
| --- | --- |
| `App.tsx` | React Router routes, persona provider, and layout wrapper. |
| `main.tsx` | React root entry: renders `App` and imports global CSS. |
| `index.css` | Global styles, font faces, and Tailwind layers. |
| `vite-env.d.ts` | Vite client type references for TypeScript. |

### `src/api/`

| File | Description |
| --- | --- |
| `server.ts` | Express HTTP API, Socket.IO server bootstrap, and all REST routes. |
| `db.ts` | Singleton Prisma client for the API (dev reuse on hot reload). |
| `candidatesClient.ts` | Browser `fetch` helpers for candidates and communications APIs. |
| `jobsClient.ts` | Browser `fetch` helpers for jobs APIs. |
| `socket-io.ts` | Holds Socket.IO server instance; emits `new-message` to clients. |

### `src/api/services/`

| File | Description |
| --- | --- |
| `message-sender.ts` | Sends email (Resend), SMS, and WhatsApp (Twilio); persists `Communication` rows. |
| `inbound-poller.ts` | Polls Twilio (and related) for inbound SMS/WhatsApp; matches candidates; emits socket events. |

### `src/components/candidate/`

| File | Description |
| --- | --- |
| `BulkChannelMessageModal.tsx` | Modal to send bulk SMS or WhatsApp to selected candidates. |
| `BulkScheduleMeetingModal.tsx` | Modal to schedule 1:1 meetings for multiple candidates. |
| `BulkSelectionSendButton.tsx` | Bottom-bar split button for bulk email / SMS / WhatsApp / meeting actions. |
| `CandidateDetailHeader.tsx` | Candidate profile header with status and quick communication actions. |
| `CandidateDetailSidebar.tsx` | Right sidebar: job summary, tags, notes placeholders. |
| `CandidateDetailTabs.tsx` | Main tab strip: Overview, Application, Activity, Communications, Other Apps. |
| `ChannelTimelineIcon.tsx` | Icon for a timeline row’s channel (email, SMS, etc.). |
| `ChannelTypeBadge.tsx` | Badge showing channel type on timeline rows and modals. |
| `CommunicationFilterPanel.tsx` | Slide-out panel for filtering communications timeline. |
| `CommunicationToolbarIcons.tsx` | SVG icons for reply, follow-up, and overflow on the timeline. |
| `CommunicationsCurrentJobSection.tsx` | Communications hub: search, filters, socket subscription, modals orchestration. |
| `CommunicationsJobEmailSection.tsx` | Renders grouped timeline threads and per-message actions. |
| `ComposeEmailModal.tsx` | Rich-text email compose (Quill), templates, CC, bulk send. |
| `DeliveryStatusGlyph.tsx` | Visual indicator for pending/sent/delivered/failed. |
| `EmailDetailModal.tsx` | Read-only email detail view. |
| `FollowUpEmailModal.tsx` | Follow-up email flow for eligible threads. |
| `HiringFlowPlaceholder.tsx` | Placeholder hiring funnel for the Overview tab. |
| `ReplyThreadModal.tsx` | Reply UI for email threads with `contact@` eligibility rules. |
| `ScheduleMeetingModal.tsx` | Single-candidate meeting scheduler with invite email send. |
| `SendChannelMessageModal.tsx` | SMS or WhatsApp quick-send modal from candidate header. |

### `src/components/layout/`

| File | Description |
| --- | --- |
| `AppLayout.tsx` | Shell: sidebar, top bar, and scrollable `<main>` with `<Outlet />`. |
| `FilterTabs.tsx` | Horizontal pill tabs used on lists and candidate sub-sections. |
| `ListToolbar.tsx` | Toolbar with search and filter affordances for list pages. |
| `PageHeader.tsx` | Page title row with optional badge and actions. |
| `PaginationFooter.tsx` | “Showing X–Y of Z” style footer for tables. |
| `Sidebar.tsx` | Collapsible app navigation sidebar with module groups. |
| `SidebarIcons.tsx` | SVG icon components used by the sidebar. |
| `TopBar.tsx` | Top bar with persona switcher and utility actions. |

### `src/components/ui/`

| File | Description |
| --- | --- |
| `LoadingSpinner.tsx` | Accessible loading spinner used on async views. |

### `src/context/`

| File | Description |
| --- | --- |
| `PersonaContext.tsx` | React context: recruiter vs candidate persona and `canManageRecruitment`. |

### `src/lib/`

| File | Description |
| --- | --- |
| `sdsButtonClasses.ts` | Tailwind class strings for SDS button variants. |
| `sdsFormClasses.ts` | Tailwind class strings for form controls. |
| `sdsModalClasses.ts` | Tailwind class strings for modal shells. |
| `sdsTableClasses.ts` | Tailwind class strings for data tables and status pills. |

### `src/pages/`

| File | Description |
| --- | --- |
| `JobOpeningsPage.tsx` | Lists jobs from API with tabs and links to job detail. |
| `JobDetailPage.tsx` | Job detail: candidate table, bulk actions, row menu to candidate. |
| `CandidatesPage.tsx` | All candidates table with selection, bulk actions, row menu. |
| `CandidateDetailPage.tsx` | Candidate profile with tabs; communications tab hosts timeline. |

### `src/types/`

| File | Description |
| --- | --- |
| `persona.ts` | TypeScript types for persona / recruitment permissions. |

### `src/utils/`

| File | Description |
| --- | --- |
| `communicationTimeline.ts` | Timeline grouping, previews, thread actions, meeting footer text. |
| `communicationTimelineRow.ts` | Maps API rows to UI timeline row shape. |
| `communicationsTimelineFilter.ts` | Channel/persona/search filtering for the communications list. |
| `emailTemplateVars.ts` | Template variable substitution for email bodies/subjects. |
| `sendFeedbackMessages.ts` | User-facing strings for send/bulk completion feedback. |
| `smsSegments.ts` | SMS segment counting (GSM-7 / UCS-2) for character limits. |

### Placeholder files

| File | Description |
| --- | --- |
| `src/components/.gitkeep` | Keeps `components` in git when empty (convention). |
| `src/pages/.gitkeep` | Keeps `pages` directory in git when empty. |
| `src/types/.gitkeep` | Keeps `types` directory in git when empty. |

---

## Data model (Prisma)

SQLite via `DATABASE_URL`. Enum-like fields are stored as strings (see comments in schema).

### `Candidate`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | Primary key, `cuid()`. |
| `name` | `String` | Display name. |
| `email` | `String` | Email address. |
| `phone` | `String?` | Phone (SMS). |
| `whatsapp_number` | `String?` | WhatsApp number. |
| `current_stage` | `String` | Pipeline stage: `applied` \| `shortlisting` \| … \| `rejected` (see schema comment). |
| `recruiter_id` | `String?` | Optional recruiter user id. |
| `hiring_lead_id` | `String?` | Optional hiring lead user id. |
| `hiring_manager_id` | `String?` | Optional hiring manager user id. |
| `source` | `String` | Sourcing: `job_portal` \| `referral` \| … (see schema). |
| `created_at` | `DateTime` | Default `now()`. |
| `updated_at` | `DateTime` | Auto-updated. |

Relations: `jobs` → `CandidateJob[]`, `communications` → `Communication[]`, `meetings` → `Meeting[]`.

### `CandidateJob` (join)

| Field | Type | Notes |
| --- | --- | --- |
| `candidate_id` | `String` | FK → `Candidate`. |
| `job_id` | `String` | FK → `Job`. |
| `is_current` | `Boolean` | Default `false`; marks current application. |

Composite primary key `[candidate_id, job_id]`.

### `Job`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | Primary key, `cuid()`. |
| `title` | `String` | Job title. |
| `department` | `String` | Department name. |
| `location` | `String` | Location label. |
| `status` | `String` | `open` \| `closed` \| `on_hold`. |
| `job_code` | `String` | Unique job code. |
| `requisition_id` | `String?` | Optional requisition id. |
| `hiring_lead_id` | `String?` | Optional hiring lead id. |
| `recruiter_ids` | `String?` | JSON array of recruiter ids (text). |
| `hiring_workflow_template_id` | `String?` | Optional workflow template id. |

Relations: `candidates` → `CandidateJob[]`, `communications` → `Communication[]`, `meetings` → `Meeting[]`.

### `Communication`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | Primary key, `cuid()`. |
| `candidate_id` | `String?` | FK → `Candidate` (nullable for unmatched inbound). |
| `job_id` | `String?` | FK → `Job`. |
| `unmatched` | `Boolean` | Inbound not matched to a candidate yet. |
| `channel` | `String` | `email` \| `sms` \| `whatsapp` \| `meeting` \| `system_notification`. |
| `direction` | `String` | Default `outbound`; `inbound` for replies. |
| `sender_type` | `String` | `recruiter` \| `hiring_lead` \| `system` \| `candidate` \| `CRM`. |
| `sender_id` | `String?` | Optional sender id. |
| `sender_name` | `String?` | Display name for sender. |
| `thread_id` | `String?` | Email thread grouping. |
| `from_address` | `String?` | From email / identifier. |
| `to_address` | `String?` | To email / phone. |
| `cc_addresses` | `String?` | JSON array of CC emails (text). |
| `subject` | `String?` | Email subject. |
| `body` | `String` | Body (HTML or text). |
| `template_id` | `String?` | FK → `EmailTemplate`. |
| `delivery_status` | `String` | Default `pending`: `pending` \| `sent` \| `delivered` \| `failed`. |
| `vendor_message_id` | `String?` | External provider message id. |
| `sent_at` | `DateTime` | Default `now()`. |
| `read_at` | `DateTime?` | Read timestamp. |

Relations: `candidate`, `job`, `template`, optional `meeting_detail` → `Meeting?`.

### `Meeting`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | Primary key, `cuid()`. |
| `candidate_id` | `String` | FK → `Candidate`. |
| `job_id` | `String` | FK → `Job`. |
| `communication_id` | `String?` | FK → `Communication` (unique). |
| `title` | `String` | Meeting title. |
| `description` | `String?` | Optional description. |
| `organizer_id` | `String?` | Organizer user id. |
| `participants` | `String` | JSON array of `{ name, email }`. |
| `duration_minutes` | `Int` | Duration. |
| `scheduled_at` | `DateTime` | Start time. |
| `channel` | `String` | `google_meet` \| `ms_teams` \| `zoom` \| `darwinbox_meet` \| `in_person`. |
| `meeting_link` | `String?` | URL when applicable. |
| `status` | `String` | `scheduled` \| `rescheduled` \| `completed` \| `cancelled`. |

### `EmailTemplate`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | Primary key, `cuid()`. |
| `name` | `String` | Template display name. |
| `category` | `String` | e.g. `confirmation`, `rejection`, `scheduling`, … |
| `subject_template` | `String` | Subject with `{{variables}}`. |
| `body_template` | `String` | Body with placeholders. |
| `variables` | `String` | JSON list of variable keys. |
| `channel` | `String` | Default `email`; also `sms` \| `whatsapp` in principle. |

Relation: `communications` → `Communication[]`.

---

## HTTP API routes

Base URL in development: `http://localhost:3001` (see `PORT` in `server.ts`). The Vite dev server proxies or clients call this origin per `candidatesClient` / `jobsClient`.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check; returns `{ ok: true }`. |
| `GET` | `/api/candidates` | Lists candidates with current job summary and counts for the All Candidates table. |
| `GET` | `/api/candidates/:id` | Candidate detail for profile page (jobs, stage, communication count). |
| `GET` | `/api/candidates/:candidateId/communications` | Timeline for a candidate: optional `?jobId=`; returns current job info, flattened timeline rows, and `otherJobEmailSections` for non-current jobs. |
| `GET` | `/api/jobs` | Lists all jobs (id, title, code, status, location, department). |
| `GET` | `/api/jobs/:jobId` | Job header plus candidates applied to that job (with job-count per candidate). |
| `GET` | `/api/email-templates` | Email templates (`channel: email`) for compose UI. |
| `GET` | `/api/employees` | Mock employee directory for CC type-ahead; optional `?q=` search. |
| `POST` | `/api/candidates/:candidateId/compose-email` | Sends email via Resend; validates from-address, job link, optional `threadId` for replies/follow-ups; persists `Communication`. |
| `POST` | `/api/candidates/:candidateId/compose-sms` | Sends SMS via Twilio; persists `Communication`. |
| `POST` | `/api/candidates/:candidateId/compose-whatsapp` | Sends WhatsApp via Twilio; persists `Communication`. |
| `POST` | `/api/candidates/:candidateId/schedule-meeting` | Creates `Communication` + `Meeting`, sends invite emails to participants, updates delivery status. |
| `GET` | `/api/test-send` | Test harness: `?channel=email|sms|whatsapp` and optional `?to=`; uses first seeded candidate/job pair. |

### Real-time (not REST)

| Mechanism | Description |
| --- | --- |
| Socket.IO | Server attaches to the same HTTP server; CORS allows the Vite origin. Clients listen for `new-message` (see `socket-io.ts`, `inbound-poller.ts`, `CommunicationsCurrentJobSection.tsx`). |

---

## React components and pages

Routes are defined in `src/App.tsx`. Every main view uses `AppLayout` (sidebar + top bar + outlet).

### Shell and providers

| Component | File | Where it appears |
| --- | --- | --- |
| `App` | `App.tsx` | Root; wraps all routes. |
| `PersonaProvider` | `PersonaContext.tsx` | Wraps all routes; provides persona and permissions. |
| `AppLayout` | `AppLayout.tsx` | `/recruitment/*` (all four main pages). |
| `Sidebar` | `Sidebar.tsx` | Inside `AppLayout` on every main page. |
| `TopBar` | `TopBar.tsx` | Inside `AppLayout` on every main page. |

### Page components (route elements)

| Page | Route path | File |
| --- | --- | --- |
| Job Openings | `/recruitment/job-openings` | `JobOpeningsPage.tsx` |
| Job Detail | `/recruitment/jobs/:jobId` | `JobDetailPage.tsx` |
| All Candidates | `/recruitment/candidates` | `CandidatesPage.tsx` |
| Candidate Detail | `/recruitment/candidates/:candidateId` | `CandidateDetailPage.tsx` |

`/` and unknown paths redirect to `/recruitment/job-openings`.

### Components by page

**`/recruitment/job-openings` — `JobOpeningsPage`**

| Component | Notes |
| --- | --- |
| `PageHeader` | Title “Job Openings”, badge, create actions. |
| `ListToolbar` | Search bar. |
| `FilterTabs` | All Openings / Open / Drafts / On Hold / Archived (client-side filter). |
| `PaginationFooter` | Result range footer. |
| `StatusBadge` | Local helper in file; status pill per row. |

**`/recruitment/jobs/:jobId` — `JobDetailPage`**

| Component | Notes |
| --- | --- |
| `PageHeader` | Job title and meta. |
| `LoadingSpinner` | Loading state. |
| `ComposeEmailModal` | Bulk email when candidates selected (recruiter persona). |
| `BulkChannelMessageModal` | Bulk SMS or WhatsApp. |
| `BulkScheduleMeetingModal` | Bulk meeting scheduling. |
| `BulkSelectionSendButton` | Fixed bottom bar actions. |

**`/recruitment/candidates` — `CandidatesPage`**

| Component | Notes |
| --- | --- |
| `PageHeader` | Title “All Candidates”. |
| `ListToolbar` | Search placeholder. |
| `LoadingSpinner` | Table loading row. |
| `PaginationFooter` | Result range. |
| `ComposeEmailModal` | Bulk or (intended) single-recipient flows when selection is active. |
| `BulkChannelMessageModal` | Bulk SMS or WhatsApp. |
| `BulkScheduleMeetingModal` | Bulk meetings. |
| `BulkSelectionSendButton` | Fixed bottom bar actions. |

**`/recruitment/candidates/:candidateId` — `CandidateDetailPage`**

| Component | Notes |
| --- | --- |
| `LoadingSpinner` | Initial load. |
| `CandidateDetailHeader` | Profile header and SMS/WhatsApp buttons. |
| `CandidateDetailTabs` | Main tabs. |
| `HiringFlowPlaceholder` | **Overview** tab. |
| `FilterTabs` | **Application** tab: snapshot / resume / etc. sub-pills. |
| `TabPanelPlaceholder` | Local; **Application** (non-snapshot), **Activity**, **Other Apps**. |
| `CommunicationsCurrentJobSection` | **Communications** tab only: full timeline stack. |
| `SendChannelMessageModal` | SMS and WhatsApp modals from header (when job + persona allow). |
| `CandidateDetailSidebar` | Right column for all tabs; layout adjusts on Communications. |

**`CommunicationsCurrentJobSection` only (Candidate Detail → Communications tab)**

These are not mounted on other pages:

| Component | Role |
| --- | --- |
| `FilterTabs` | Job switcher when multiple applications exist. |
| `CommunicationFilterPanel` | Advanced filters drawer. |
| `CommunicationsJobEmailSection` | Thread list, message actions, “load more”. |
| `ComposeEmailModal` | New email from timeline. |
| `EmailDetailModal` | Open a message for reading. |
| `FollowUpEmailModal` | Follow-up from eligible threads. |
| `ReplyThreadModal` | Reply in thread when allowed. |
| `ScheduleMeetingModal` | Schedule 1:1 from communications. |
| `IconSearchOutline`, `IconFilterFunnelOutline` | Local icons inside `CommunicationsCurrentJobSection`. |

**Nested under `CommunicationsJobEmailSection` (same tab)**

| Component | Role |
| --- | --- |
| `CommunicationToolbarIcons` | Reply / follow-up / overflow icons. |
| `ChannelTimelineIcon` | Channel glyph per row. |
| `ChannelTypeBadge` | Channel label badge. |
| `LoadingSpinner` | Inline loading where used. |

**Modals that embed timeline bits**

| Component | Used inside |
| --- | --- |
| `DeliveryStatusGlyph` | `EmailDetailModal`, `FollowUpEmailModal`, `ReplyThreadModal`. |

### `SidebarIcons`

Imported only by `Sidebar` for navigation module icons.

---

## Related client modules (not components)

| Module | Role |
| --- | --- |
| `candidatesClient.ts` | Fetches candidates, detail, communications; normalizes API types. |
| `jobsClient.ts` | Fetches job list and job detail. |
| Timeline / filter utils | Used by `CommunicationsCurrentJobSection` and `CommunicationsJobEmailSection`. |
| SDS `lib/*` classes | Shared Tailwind strings for buttons, tables, forms, modals across pages. |

---

*Generated for the Communication Centre prototype. Update this file when adding routes, models, or major UI surfaces.*
