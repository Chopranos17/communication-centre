# Codebase overview

Communication Centre is a Vite + React 18 SPA with an Express API (`src/api/server.ts`), Prisma + SQLite, outbound messaging via **Resend** (email) and **Twilio** (SMS/WhatsApp), and Socket.IO for live timeline updates. Routes live under `/recruitment/*`, including **Communication Hub** (dashboard widgets) and **Activity Command Center** (filtered activity feed + thread drill-down).

The Vite dev server proxies `/api` and `/socket.io` to `http://localhost:3001` (`vite.config.ts`).

---

## Architecture: messaging and background behavior

| Concern | Behavior |
| --- | --- |
| **Outbound send** | Synchronous: `message-sender.ts` calls Resend (`resend.emails.send`) or Twilio (`client.messages.create`) in the request path, then inserts/updates `Communication`. |
| **Unified wrapper** | `sendMessage({ channel, … })` routes by channel; each vendor has its own function underneath. |
| **Scheduled email** | Rows with `delivery_status: "scheduled"` and `scheduled_for` are sent by `deliverDueScheduledCommunications()` on a **60s** `setInterval` in `server.ts` (same Node process, not a separate worker queue). |
| **Send now** | `POST /api/communications/:communicationId/send-now` calls `deliverSingleScheduledEmailById` → **Resend immediately** in that HTTP request. |
| **Inbound email** | `inbound-poller.ts` polls Resend receiving APIs (~**30s** interval); no Resend webhooks in this repo. |
| **Inbound SMS/WhatsApp** | Same poller lists Twilio inbound messages via REST (~30s); no Twilio status webhooks for delivery. |
| **Delivery status** | Outbound: typically `sent` or `failed` after vendor response; `scheduled` / `cancelled` for scheduled flows. Inbound rows use `delivered` as “stored.” Vendor webhooks for opens/bounces are **not** implemented. |
| **Real-time UI** | Socket.IO emits `new-message` (inbound) and `message-updated` (scheduled send/cancel/edit). |

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
| `vite.config.ts` | Vite bundler, React plugin, dev proxy to API/Socket.IO. |

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
| `DarwinSans-*.otf` | Source copies of Darwin Sans family (same as `public/fonts`). |

### `src/`

| File | Description |
| --- | --- |
| `App.tsx` | React Router routes, `ToastProvider`, `PersonaProvider`, `AppLayout`. |
| `main.tsx` | React root entry: renders `App` and imports global CSS. |
| `index.css` | Global styles, font faces, and Tailwind layers. |
| `vite-env.d.ts` | Vite client type references for TypeScript. |

### `src/api/`

| File | Description |
| --- | --- |
| `server.ts` | Express HTTP API, Socket.IO bootstrap, scheduled-email sweep, REST routes. |
| `db.ts` | Singleton Prisma client for the API (dev reuse on hot reload). |
| `candidatesClient.ts` | Browser `fetch` helpers for candidates and communications APIs. |
| `jobsClient.ts` | Browser `fetch` helpers for jobs APIs. |
| `socket-io.ts` | Holds Socket.IO server instance; emits `new-message` and `message-updated`. |
| `activityCommandCenterClient.ts` | Fetches activity feed and thread for Activity Command Center. |
| `commsHubDashboardClient.ts` | Fetches Communication Hub dashboard and scheduled-messages APIs. |

### `src/api/services/`

| File | Description |
| --- | --- |
| `message-sender.ts` | Resend email, Twilio SMS/WhatsApp; `sendMessage`; scheduled email delivery helpers. |
| `inbound-poller.ts` | Polls Resend + Twilio for inbound mail/messages; matches candidates; emits socket events. |
| `activity-command-center.ts` | Activity feed, dashboard aggregates, scheduled messages page, thread fetch for comms hub. |
| `comms-hub-span.ts` | Job span / env-based filtering for Communication Hub analytics. |

### `src/components/candidate/`

| File | Description |
| --- | --- |
| `BulkChannelMessageModal.tsx` | Bulk SMS or WhatsApp to selected candidates. |
| `BulkScheduleMeetingModal.tsx` | Schedule 1:1 meetings for multiple candidates. |
| `BulkSelectionSendButton.tsx` | Bottom-bar split button for bulk email / SMS / WhatsApp / meeting. |
| `CandidateDetailHeader.tsx` | Profile header with status and quick communication actions. |
| `CandidateDetailSidebar.tsx` | Right sidebar: job summary, tags, notes placeholders. |
| `CandidateDetailTabs.tsx` | Tab strip: Overview, Application, Activity, Communications, Other Apps. |
| `ChannelTimelineIcon.tsx` | Channel icon for timeline rows. |
| `ChannelTypeBadge.tsx` | Channel badge on timeline rows and modals. |
| `CommunicationFilterPanel.tsx` | Slide-out panel for filtering communications timeline. |
| `CommunicationToolbarIcons.tsx` | SVG icons for reply, follow-up, overflow. |
| `CommunicationsCurrentJobSection.tsx` | Communications hub: search, filters, socket subscription, modals. |
| `CommunicationsJobEmailSection.tsx` | Grouped timeline threads and per-message actions. |
| `CommunicationsPanel.tsx` | Layout/panel wrapper used in communications views. |
| `ComposeEmailModal.tsx` | Rich-text email compose (Quill), templates, CC, bulk send, schedule. |
| `DeliveryStatusGlyph.tsx` | Visual indicator for pending/sent/delivered/failed/scheduled. |
| `EditScheduledEmailModal.tsx` | Edit subject/body/schedule for queued outbound email. |
| `EmailDetailModal.tsx` | Read-only email detail view. |
| `FollowUpEmailModal.tsx` | Follow-up email for eligible threads. |
| `HiringFlowPlaceholder.tsx` | Placeholder hiring funnel for Overview tab. |
| `ReplyThreadModal.tsx` | Reply in thread with `contact@` eligibility rules. |
| `ScheduleMeetingModal.tsx` | Single-candidate meeting scheduler with invite email. |
| `ScheduledEmailTimelineMenu.tsx` | Overflow actions for scheduled rows (send now, edit, cancel). |
| `SendChannelMessageModal.tsx` | SMS or WhatsApp quick-send from candidate header. |

### `src/components/analytics/`

| File | Description |
| --- | --- |
| `ChannelMixWidget.tsx` | Chart.js channel distribution widget. |
| `MetricsBar.tsx` | Summary metric chips for Communication Hub. |
| `RecentActivityWidget.tsx` | Recent activity list with navigation to Activity view. |
| `ScheduledMessagesWidget.tsx` | Upcoming scheduled comms + meetings teaser. |
| `ScheduledMessagesAllPanel.tsx` | Full-page style list of scheduled items. |
| `ScheduledMessageRowView.tsx` | Single scheduled row presentation. |
| `ScheduledMessageOverflowMenu.tsx` | Actions: send now, edit, cancel (emails/meetings per rules). |
| `scheduledMessageUi.ts` | Shared labels/helpers for scheduled message UI. |

### `src/components/activity-command-center/`

| File | Description |
| --- | --- |
| `ActivityCommunicationListPanel.tsx` | Paginated activity list with filters. |
| `ActivityAdvancedFilterPanel.tsx` | Advanced filter drawer for activity feed. |
| `ActivityRecruitmentBreadcrumbs.tsx` | Hub / Activity navigation breadcrumbs. |

### `src/components/layout/`

| File | Description |
| --- | --- |
| `AppLayout.tsx` | Shell: sidebar, top bar, scrollable `<main>` with `<Outlet />`. |
| `BulkSelectionBar.tsx` | Floating bulk-selection bar (job/candidate list pages). |
| `FilterTabs.tsx` | Horizontal pill tabs for lists and candidate sub-sections. |
| `ListToolbar.tsx` | Toolbar with search and filters for list pages. |
| `PageHeader.tsx` | Page title row with optional badge and actions. |
| `PaginationFooter.tsx` | “Showing X–Y of Z” footer for tables. |
| `Sidebar.tsx` | Collapsible navigation; Recruitment includes Communication Hub link. |
| `SidebarIcons.tsx` | SVG icon components for sidebar (incl. lucide-style composites). |
| `TopBar.tsx` | Top bar with persona switcher and utilities. |

### `src/components/ui/`

| File | Description |
| --- | --- |
| `LoadingSpinner.tsx` | Accessible loading spinner. |
| `ToastStack.tsx` | Toast notifications (used with `ToastContext`). |

### `src/context/`

| File | Description |
| --- | --- |
| `PersonaContext.tsx` | Recruiter vs candidate persona and `canManageRecruitment`. |

### `src/contexts/`

| File | Description |
| --- | --- |
| `ToastContext.tsx` | Toast provider and hook for app-wide notifications. |

### `src/hooks/`

| File | Description |
| --- | --- |
| `useDashboardAnalytics.ts` | Debounced Communication Hub dashboard data fetching (Chart.js widgets). |

### `src/lib/`

| File | Description |
| --- | --- |
| `sdsButtonClasses.ts` | Tailwind class strings for SDS button variants. |
| `sdsFormClasses.ts` | Tailwind class strings for form controls. |
| `sdsModalClasses.ts` | Tailwind class strings for modal shells. |
| `sdsTableClasses.ts` | Tailwind class strings for tables and status pills. |
| `activityPresentation.ts` | Presentation helpers for activity feed rows. |
| `metricsBarFormat.ts` | Formatting for dashboard metric bar values. |
| `relativeTime.ts` | Relative time strings for UI. |

### `src/pages/`

| File | Description |
| --- | --- |
| `JobOpeningsPage.tsx` | Lists jobs with tabs and links to job detail. |
| `JobDetailPage.tsx` | Job detail: candidate table, bulk actions, row menu. |
| `CandidatesPage.tsx` | All candidates table with selection, bulk actions. |
| `CandidateDetailPage.tsx` | Candidate profile with tabs; Communications hosts timeline. |
| `CommunicationHubPage.tsx` | Communication Hub dashboard (metrics, charts, scheduled, activity teaser). |
| `ActivityCommandCenterPage.tsx` | Activity Command Center: filters + list + thread side panel. |

### `src/types/`

| File | Description |
| --- | --- |
| `persona.ts` | TypeScript types for persona / recruitment permissions. |

### `src/utils/`

| File | Description |
| --- | --- |
| `communicationTimeline.ts` | Timeline grouping, previews, thread actions, meeting footer text. |
| `communicationTimelineRow.ts` | Maps API rows to UI timeline row shape. |
| `communicationsTimelineFilter.ts` | Channel/persona/search filtering for communications list. |
| `emailTemplateVars.ts` | Template variable substitution for email bodies/subjects. |
| `sendFeedbackMessages.ts` | User-facing strings for send/bulk completion feedback. |
| `smsSegments.ts` | SMS segment counting (GSM-7 / UCS-2) for character limits. |

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
| `current_stage` | `String` | Pipeline stage (see schema comment). |
| `recruiter_id` | `String?` | Optional recruiter user id. |
| `hiring_lead_id` | `String?` | Optional hiring lead user id. |
| `hiring_manager_id` | `String?` | Optional hiring manager user id. |
| `source` | `String` | Sourcing channel (see schema). |
| `created_at` | `DateTime` | Default `now()`. |
| `updated_at` | `DateTime` | Auto-updated. |

Relations: `jobs` → `CandidateJob[]`, `communications` → `Communication[]`, `meetings` → `Meeting[]`.

### `CandidateJob` (join)

Composite primary key `[candidate_id, job_id]`; `is_current` marks the current application.

### `Job`

Standard fields: `title`, `department`, `location`, `status` (`open` \| `closed` \| `on_hold`), `job_code` (unique), optional `requisition_id`, `hiring_lead_id`, `recruiter_ids` (JSON text), `hiring_workflow_template_id`.

### `Communication`

| Field | Type | Notes |
| --- | --- | --- |
| `id` | `String` | Primary key, `cuid()`. |
| `candidate_id` | `String?` | FK → `Candidate` (nullable for unmatched inbound). |
| `job_id` | `String?` | FK → `Job`. |
| `unmatched` | `Boolean` | Inbound not matched to a candidate. |
| `channel` | `String` | `email` \| `sms` \| `whatsapp` \| `meeting` \| `system_notification`. |
| `direction` | `String` | `outbound` \| `inbound`. |
| `sender_type` | `String` | `recruiter` \| `hiring_lead` \| `system` \| `candidate` \| `CRM`. |
| `sender_id` / `sender_name` | `String?` | Optional sender metadata. |
| `thread_id` | `String?` | Thread grouping (email and cross-channel anchor). |
| `from_address` / `to_address` | `String?` | From / to. |
| `cc_addresses` | `String?` | JSON array of CC emails (text). |
| `subject` | `String?` | Email subject. |
| `body` | `String` | Body (HTML or text). |
| `template_id` | `String?` | FK → `EmailTemplate`. |
| `delivery_status` | `String` | `pending` \| `sent` \| `delivered` \| `failed` \| `scheduled` \| `cancelled` (see architecture section for usage). |
| `vendor_message_id` | `String?` | Resend id or Twilio SID. |
| `sent_at` | `DateTime` | Default `now()`. |
| `scheduled_for` | `DateTime?` | When `delivery_status` is `scheduled`, email send time (server sweep + validations). |
| `read_at` | `DateTime?` | Optional read timestamp (not wired to vendor webhooks in this codebase). |

### `Meeting`

`title`, `description`, `organizer_id`, `participants` (JSON), `duration_minutes`, `scheduled_at`, `channel` (video/in-person enum), `meeting_link`, `status` (`scheduled` \| `rescheduled` \| `completed` \| `cancelled`). Optional `communication_id` links to a parent `Communication` row for invites.

### `EmailTemplate`

`name`, `category`, `subject_template`, `body_template`, `variables` (JSON text), `channel` (`email` \| `sms` \| `whatsapp`).

---

## HTTP API routes

Base URL in development: **`http://localhost:3001`** (`PORT` env). The Vite app typically calls `/api` via proxy.

| Method | Path | Description |
| --- | --- | --- |
| `GET` | `/api/health` | Liveness check. |
| `GET` | `/api/candidates` | All Candidates table data. |
| `GET` | `/api/candidates/:id` | Candidate detail. |
| `GET` | `/api/candidates/:candidateId/communications` | Timeline; optional `?jobId=`. |
| `GET` | `/api/jobs` | Job list. |
| `GET` | `/api/jobs/:jobId` | Job detail with candidates. |
| `GET` | `/api/email-templates` | Templates for compose UI. |
| `GET` | `/api/employees` | Mock employee directory for CC type-ahead; optional `?q=`. |
| `POST` | `/api/candidates/:candidateId/compose-email` | Send or **schedule** email (`scheduledFor` → `scheduled` + `scheduled_for`). |
| `POST` | `/api/candidates/:candidateId/scheduled-emails/:communicationId/cancel` | Cancel scheduled email (candidate-scoped). |
| `POST` | `/api/communications/:communicationId/send-now` | Send scheduled email immediately via Resend. |
| `POST` | `/api/communications/:communicationId/cancel-scheduled` | Cancel scheduled message (email/SMS/WhatsApp row). |
| `PATCH` | `/api/communications/:communicationId` | Edit scheduled message (subject/body/`scheduledFor` when allowed). |
| `POST` | `/api/candidates/:candidateId/compose-sms` | Send SMS. |
| `POST` | `/api/candidates/:candidateId/compose-whatsapp` | Send WhatsApp (Twilio). |
| `POST` | `/api/candidates/:candidateId/schedule-meeting` | Create `Communication` + `Meeting`, email invites. |
| `POST` | `/api/meetings/:meetingId/cancel-scheduled` | Cancel meeting + related communication status. |
| `GET` | `/api/test-send` | Test harness: `?channel=email|sms|whatsapp`, optional `?to=`. |
| `GET` | `/api/v1/recruitment/comms-hub/analytics/activity` | Paginated activity feed (filters: period, status, job, channel, search, sort). |
| `GET` | `/api/v1/recruitment/comms-hub/analytics/dashboard` | Dashboard metrics + charts data; optional `job_opening_id`. |
| `GET` | `/api/v1/recruitment/comms-hub/analytics/scheduled` | Paginated scheduled comms + meetings. |
| `GET` | `/api/v1/recruitment/comms-hub/thread` | Thread detail: requires `candidate_id`, `job_opening_id`. |

### Real-time (not REST)

| Mechanism | Description |
| --- | --- |
| Socket.IO | Same HTTP server as Express; CORS allows Vite origin. Events: **`new-message`**, **`message-updated`**. |

---

## React routes and pages

Defined in `src/App.tsx`. Layout: `ToastProvider` → `PersonaProvider` → `AppLayout` (sidebar + top bar + outlet).

| Route | Page component | File |
| --- | --- | --- |
| `/` | Redirect | → `/recruitment/job-openings` |
| `/recruitment/job-openings` | `JobOpeningsPage` | `pages/JobOpeningsPage.tsx` |
| `/recruitment/jobs/:jobId` | `JobDetailPage` | `pages/JobDetailPage.tsx` |
| `/recruitment/candidates` | `CandidatesPage` | `pages/CandidatesPage.tsx` |
| `/recruitment/candidates/:candidateId` | `CandidateDetailPage` | `pages/CandidateDetailPage.tsx` |
| `/recruitment/communication-hub` | `CommunicationHubPage` | `pages/CommunicationHubPage.tsx` |
| `/recruitment/communication-hub/activity` | `ActivityCommandCenterPage` | `pages/ActivityCommandCenterPage.tsx` |
| `/recruitment/communication-analytics` | Redirect | → `/recruitment/communication-hub` |
| `/recruitment/communication-analytics/activity` | Redirect | → `/recruitment/communication-hub/activity` |
| `*` | Redirect | → `/recruitment/job-openings` |

### Page-level components (summary)

| Area | Notable components |
| --- | --- |
| **Job Openings** | `PageHeader`, `ListToolbar`, `FilterTabs`, `PaginationFooter` |
| **Job Detail** | Bulk modals (`ComposeEmailModal`, `BulkChannelMessageModal`, `BulkScheduleMeetingModal`), `BulkSelectionSendButton`, `BulkSelectionBar` |
| **All Candidates** | Same bulk patterns as job detail |
| **Candidate Detail** | `CandidateDetailHeader`, `CandidateDetailTabs`, `CommunicationsCurrentJobSection` (Communications tab), `SendChannelMessageModal`, `CandidateDetailSidebar` |
| **Communication Hub** | `MetricsBar`, Chart.js widgets (`ChannelMixWidget`), `RecentActivityWidget`, `ScheduledMessagesWidget`, `ScheduledMessagesAllPanel`, `useDashboardAnalytics` |
| **Activity Command Center** | `ActivityCommunicationListPanel`, `ActivityAdvancedFilterPanel`, `ActivityRecruitmentBreadcrumbs`; uses `activityCommandCenterClient` |

### Communications tab (candidate detail)

`CommunicationsCurrentJobSection` orchestrates search/filters, Socket.IO, `CommunicationsJobEmailSection`, email modals (`ComposeEmailModal`, `ReplyThreadModal`, `FollowUpEmailModal`, `ScheduleMeetingModal`), `ScheduledEmailTimelineMenu`, `EditScheduledEmailModal`, `EmailDetailModal`, etc.

---

## Related client modules (not components)

| Module | Role |
| --- | --- |
| `candidatesClient.ts` | Candidates, communications, compose, scheduled email helpers. |
| `jobsClient.ts` | Jobs list and detail. |
| `activityCommandCenterClient.ts` | Activity feed + thread API. |
| `commsHubDashboardClient.ts` | Dashboard + scheduled messages API. |
| Timeline / filter utils | `communicationTimeline*`, `communicationsTimelineFilter`. |
| SDS `lib/*` classes | Shared Tailwind strings for buttons, tables, forms, modals. |

---

*Update this file when adding routes, models, major UI surfaces, or background jobs.*
