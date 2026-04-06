# Communication Centre — Technical Spec for Cursor
## Recruitment Module | Darwinbox HRMS

> **This is one of three documents. Read them together:**
> - **This file (`prd.md`)** — Technical specs: field types, UI behavior, data model, acceptance criteria. This is what you (Cursor) reference when building.
> - **`internal-prd.md`** — Business case, competitive gap matrix, use cases, persona stories, impact analysis. Read this to understand *why* each feature exists and what problem it solves.
> - **`usecase-task-map.md`** — Maps each use case to specific tasks in `tasks.md`. Read this to understand *what to build in what order* and how to debug when something breaks.

---

## What We're Building (Summary)

We're building a **Communication Centre** — a new "Communications" tab on the Candidate Detail Page that becomes the single place where recruiters manage all candidate communication. It closes four gaps vs competitors (Lever, Greenhouse, SAP, Oracle):

1. **Unified timeline** — Every competitor has a dedicated communication view on the candidate profile. Darwinbox has none. We're adding one.
2. **Ad-hoc email compose** — Competitors let recruiters email candidates from within the product. Darwinbox forces them to switch to external email. We're adding compose with templates, CC, sender selection, and bulk send.
3. **Native WhatsApp + SMS** — Competitors rely on third-party partner extensions. We're building native multi-channel messaging — a leapfrog, especially for India/APAC.
4. **Two-way threading** — Competitors capture candidate replies. Darwinbox doesn't. We're adding email threading with Reply and Follow-Up.

Plus a unique feature no competitor offers: **1:1 meeting scheduling** as a first-class communication type alongside email/SMS/WhatsApp.

**All messages are actually delivered** via Resend (email) and Twilio (SMS + WhatsApp). This is not a mock — the prototype sends real messages.

---

## 1. Problem Statement

Recruiters and Hiring Leads interact with candidates across email, SMS, WhatsApp, and system-triggered notifications. Currently these communications are scattered — there is no unified view of all candidate touchpoints. This forces recruiters to switch between tools, miss follow-ups, and lose communication context.

**This prototype builds a Communication Centre** within the Candidate Detail Page that centralizes all ad-hoc and system-generated communications, enables two-way messaging, and logs 1:1 meetings — all in a single timeline view.

---

## 2. Personas

| Persona | Role in Communication Centre | Access Level |
|---------|------------------------------|-------------|
| **Recruiter** | Primary user. Sends/receives emails, SMS, WhatsApp. Schedules 1:1 meetings. Views full communication history. Sends bulk messages. | Full CRUD |
| **Hiring Lead (HL)** | Same as Recruiter. Co-owns candidate communication. | Full CRUD |
| **Candidate** | Receives messages via Email/SMS/WhatsApp. Replies to emails from contact@darwinbox.in. Views meeting invites in candidate portal. | Receive + Reply |
| **System** | Auto-sends notifications at pipeline stage changes (interview invite, offer letter, rejection, etc.). | Auto-send only |

---

## 3. Touchpoints (Where Communication Is Triggered)

| Page | Path | Actions Available |
|------|------|------------------|
| **Job Detail Page** | Recruitment → Job Openings → Job Detail Page | Send Email (individual), Send Email (bulk via selection), Send Meeting Invite |
| **Candidate List Page** | Recruitment → Candidates | Send Email (3-dot menu), Bulk Email (multi-select) |
| **Candidate Detail Page** | Recruitment → Candidates → Candidate Detail | New "Communications" tab, Send Email, Send SMS, Send WhatsApp, Schedule 1:1 Meeting, View full history, Reply/Follow-up |

---

## 4. Feature Specifications

### 4.1 Ad-hoc Emailing (Individual + Bulk)

**User Story:** As a Recruiter, I want to compose and send emails to one or multiple candidates directly from the recruitment pages, so I don't have to leave Darwinbox.

**Trigger Points:**
- Job Detail Page: "Send Email" per candidate row + bulk action when candidates selected
- Candidate List Page: "Send Email" in 3-dot menu + bulk action
- Candidate Detail Page: "Send Email" button/action

**Compose Email Modal (Right Side Panel):**

| Field | Type | Behavior |
|-------|------|----------|
| **Header** | Display | Individual: "Compose New Email - {Candidate Name}". Bulk: "Compose {N} Emails" |
| **Send From** | Single-select dropdown | Options: `no-reply@darwinbox.in` (read-only warning: "Candidate cannot reply"), `contact@darwinbox.in` (info: "Candidate can reply to this") |
| **To** | Display only | Shows candidate email(s). Bulk: shows 2 emails + "+N Recipients" |
| **CC** | Elastic search (Employee search) | Type-ahead employee lookup. Two checkboxes: "Recruiter" and "Hiring Lead" for quick CC |
| **Template** | Dropdown (optional) | Load from Recruitment Email Templates. Inserts subject + body with variables |
| **Subject** | Free text | Supports text, numbers, special characters, template variables |
| **Body** | Rich text area | Supports text, variables ({{Candidate Name}}, {{Job Title}}, etc.), formatting |
| **Preview** | Button | Opens email preview with variables resolved |
| **Send** | Button | Sends email. Shows success banner: "Email successfully sent to N candidates" or "Email sent to X of Y candidates. Z addresses were invalid." |
| **Cancel** | Button | Closes modal, returns to previous page |

**Bulk Email Additional Controls:**
- Checkbox: "Send only one email for each unique candidate" — deduplicates by email ID
- Checkbox: "Don't email candidates with multiple jobs" — skips candidates tagged to multiple jobs

**Acceptance Criteria:**
- [ ] Compose modal opens as right-side panel on all three touchpoints
- [ ] Send From dropdown shows both email options with appropriate warnings
- [ ] CC field supports employee search with type-ahead
- [ ] Template dropdown loads available recruitment email templates
- [ ] Variables in subject/body resolve correctly on Preview
- [ ] Send button triggers email delivery and shows success/failure banner
- [ ] Bulk email respects deduplication and multi-job checkboxes
- [ ] All sent emails are logged in Communication Centre timeline
- [ ] Emails from contact@ are eligible for 2-way replies

---

### 4.2 Ad-hoc WhatsApp / SMS Messaging

**User Story:** As a Recruiter, I want to send ad-hoc WhatsApp or SMS messages to candidates from within Darwinbox, so all communication is logged centrally.

**Trigger:** 3-dot menu or icon on Candidate Detail Page → "Send WhatsApp" / "Send SMS"

**WhatsApp Message Modal:**

| Field | Type | Behavior |
|-------|------|----------|
| **Header** | Display | "Send WhatsApp Message – {Candidate Name}" |
| **From** | Display | WhatsApp Business Account Name (admin-configured) |
| **To** | Display | Candidate name + mobile number(s) |
| **Message** | Text area | Free text compose area |
| **Preview** | Button (optional) | Preview before sending |
| **Send / Cancel** | Buttons | Standard send/cancel behavior |

**SMS Message Modal:**
- Same structure as WhatsApp but Header: "Send SMS – {Candidate Name}"
- From: Sender ID (admin-configured, DLT-registered for India)

**Acceptance Criteria:**
- [ ] WhatsApp and SMS options appear in action menu on Candidate Detail Page
- [ ] Modal opens with pre-filled candidate info
- [ ] Message is sent via configured channel
- [ ] Sent message appears in Communication Centre timeline with channel icon (WhatsApp/SMS)
- [ ] Each persona (Recruiter/HL) gets separate inbox tracking
- [ ] India DLT compliance: messages use registered sender IDs and templates

---

### 4.3 1:1 Meeting Scheduling

**User Story:** As a Recruiter, I want to schedule informal 1:1 meetings with candidates (not formal interviews) from within the Communication Centre.

**Trigger:** Communication Centre → New Message/Action dropdown → "1:1 Meeting" option (or calendar icon in composer bar)

**Schedule Meeting Modal:**

| Field | Type | Behavior |
|-------|------|----------|
| **Title/Purpose** | Free text | e.g., "Candidate Experience Chat" |
| **Participants** | Auto-filled + search | Recruiter + Candidate pre-filled. Add others (Hiring Manager) |
| **Duration** | Dropdown | 15min, 30min, 45min, 60min |
| **Date/Time** | Date-time picker | Same as existing interview scheduling architecture |
| **Channel** | Dropdown | Google Meet / MS Teams / Zoom / Darwinbox Meet / In-person |
| **Message/Description** | Text area | Template-supported |
| **Attachments** | File upload (optional) | |
| **Send Invite** | Button | Creates calendar event + sends notification |

**Post-Scheduling:**
- Meeting appears in Communication Centre timeline as a calendar event
- Status tracked: Scheduled → Rescheduled → Completed
- Calendar integration: Google / Outlook / Darwinbox Meeting Service
- Candidate sees in portal: "🗓 Recruiter invited you for a 1:1 meeting — 30 mins, Google Meet link attached."

**Acceptance Criteria:**
- [ ] 1:1 Meeting option available in Communication Centre action dropdown
- [ ] Meeting modal reuses existing interview scheduling architecture
- [ ] Meeting event appears in timeline with status badge
- [ ] Calendar invite sent to all participants
- [ ] Notification sent via Email + In-App

---

### 4.4 Communication Centre (Unified Timeline)

**User Story:** As a Recruiter, I want to see all communications with a candidate in one chronological view, organized by job, so I have full context before any interaction.

**Location:** New "Communications" tab on Candidate Detail Page

**Layout Structure:**

```
┌─────────────────────────────────────────────────────────────┐
│ Candidate Detail Page                                        │
│ [Status] [App Details] [Offer Details] [Activity Log]        │
│ [Communications ●] [Other Apps]                              │
│                                                              │
│ ┌─ Regional Sales Manager (Current Job) ▼ ────────────────┐ │
│ │  Email Type: [All ▼]              [+ New Email]          │ │
│ │  ┌──────────┬───────────────────────────────┬──────────┐ │ │
│ │  │ Sender   │ Message                       │ Time     │ │ │
│ │  │ Atharva M│ Accommodation Details Hello.. │ 7:30 PM  │ │ │
│ │  │ System   │ Pre-Offer Completion Ack...   │ 12 Dec   │ │ │
│ │  │ Atharva M│ Round 4 Interview for PM...   │ 12 Dec   │ │ │
│ │  └──────────┴───────────────────────────────┴──────────┘ │ │
│ │  ▾ Show more                                              │ │
│ └───────────────────────────────────────────────────────────┘ │
│                                                              │
│ ┌─ Product Manager 1 ▶ ────────────────────────────────────┐ │
│ │  (Collapsed — click to expand)                            │ │
│ └───────────────────────────────────────────────────────────┘ │
└─────────────────────────────────────────────────────────────┘
```

**Section 1: Current Job's Email Communication**
- Always present, expanded by default, collapsible
- Header: "{Job Title} (Current Job)"
- Filter: All | System Initiated | User Initiated
- Shows 6 emails by default → "Show more" expands to 10 → scrollable beyond 10
- Reverse chronological order (latest first)

**Each Email Row:**
- **Sender column:** Employee Name if user-sent, "System" if auto-triggered, "CRM" if from Joveo integration
- **Message column:** Subject line (bold) + body preview. Capped at 75 characters total
- **Time column:** "Today" / "Yesterday" for recent, date format per user preference otherwise

**Email Detail Modal (on click):**
- From: sender email ID
- To: recipient email ID
- Subject
- Time + timezone
- Full body content

**Section 2: Other Jobs' Communication**
- Present only when candidate has communication history in other jobs
- Collapsed by default
- Same layout as Current Job section, minus the "New Email" button

**Acceptance Criteria:**
- [ ] Communications tab appears on Candidate Detail Page
- [ ] Current Job section is expanded by default with correct job title
- [ ] Filter toggles between All / System Initiated / User Initiated
- [ ] Email list shows 6 by default, expandable to 10, then scrollable
- [ ] Clicking an email opens detail modal with full content
- [ ] Time displays "Today"/"Yesterday" for recent dates
- [ ] Other Jobs section only appears when relevant, collapsed by default
- [ ] SMS and WhatsApp messages show with channel indicators
- [ ] CRM-originated messages show sender as "CRM"
- [ ] 1:1 Meetings show as timeline events with status

---

### 4.5 Two-Way Communication (Email Threading)

**User Story:** As a Recruiter, I want to see candidate replies threaded under my original emails, and reply/follow-up without leaving the Communication Centre.

**Threading Rules:**
- Only emails from `contact@darwinbox.in` are eligible for replies (not no-reply@)
- Candidate replies are auto-grouped under the original email thread
- Multiple threads per candidate across different jobs are supported
- Threads are expandable/collapsible

**Thread Display:**
- Sender column shows "{Sender Name} (N)" where N = total emails in thread
- When candidate has replied: show as "{Candidate Name} (2)" indicating thread count
- Thread ordered by latest reply; within thread, ordered by date

**Actions per Thread:**
- **Follow Up** button: For emails from contact@ with NO candidate reply yet. Opens compose modal with From field frozen to contact@, previous message visible and expandable
- **Reply** button: For threads where candidate HAS replied. Opens threaded view with all messages, each expandable/collapsible with ^ toggle. Reply compose at bottom.

**Visual Design:**
- Indentation or visual markers to differentiate original messages from replies
- Sender icons (candidate / recruiter / system) for clarity
- Timestamps aligned next to each message (chat-like)

**Acceptance Criteria:**
- [ ] Candidate replies are threaded under original email
- [ ] Thread count shown in sender column
- [ ] Follow Up button appears for unreplied contact@ emails
- [ ] Reply button appears for threads with candidate responses
- [ ] Threaded view shows all messages in chronological order
- [ ] Previous messages are expandable/collapsible
- [ ] Reply compose pre-fills From as contact@darwinbox.in
- [ ] Replies are automatically linked to original message thread

---

## 5. Data Model (For Mock Database)

### Entities

**Candidates**
- id, name, email, phone, whatsapp_number
- current_stage: applied | shortlisting | screening | assessment | interview | pre_offer | offer | hired | rejected
- job_ids[] (candidate can be tagged to multiple jobs)
- recruiter_id, hiring_lead_id, hiring_manager_id
- source: job_portal | referral | external_recruiter | IJP | CRM
- created_at, updated_at

**Jobs (Job Openings)**
- id, title, department, location, status: open | closed | on_hold
- job_code (auto-generated), requisition_id
- hiring_lead_id, recruiter_ids[]
- hiring_workflow_template_id

**Communications**
- id, candidate_id, job_id
- channel: email | sms | whatsapp | meeting | system_notification
- direction: outbound | inbound
- sender_type: recruiter | hiring_lead | system | candidate | CRM
- sender_id, sender_name
- thread_id (null for standalone, references parent for threads)
- from_address (email: no-reply@darwinbox.in or contact@darwinbox.in)
- to_address
- cc_addresses[]
- subject (for email)
- body (message content)
- template_id (if sent from template)
- status: sent | delivered | failed | read
- sent_at, read_at

**Meetings (1:1)**
- id, candidate_id, job_id, communication_id (links to Communications)
- title, description
- organizer_id, participants[]
- duration_minutes
- scheduled_at, channel: google_meet | ms_teams | zoom | darwinbox_meet | in_person
- meeting_link
- status: scheduled | rescheduled | completed | cancelled

**Email Templates**
- id, name, category: confirmation | rejection | scheduling | offer | custom
- subject_template, body_template
- variables[] (candidate_name, job_title, interview_date, company_name, recruiter_name)
- channel: email | sms | whatsapp

---

## 6. Screen Inventory

| # | Screen | Description |
|---|--------|-------------|
| 1 | Job Detail Page (enhanced) | Existing page + "Send Email" per candidate row + bulk email action bar |
| 2 | Candidate List Page (enhanced) | Existing page + "Send Email" in 3-dot menu + bulk action |
| 3 | Candidate Detail Page - Communications Tab | NEW tab with unified timeline, filters, compose actions |
| 4 | Compose Email Modal | Right-side panel with From, To, CC, Template, Subject, Body, Preview, Send |
| 5 | Compose Bulk Email Modal | Same as #4 + dedup checkbox + multi-job checkbox |
| 6 | Send WhatsApp Modal | Right-side panel for WhatsApp message compose |
| 7 | Send SMS Modal | Right-side panel for SMS compose |
| 8 | Schedule 1:1 Meeting Modal | Right-side panel with meeting details form |
| 9 | Email Detail Modal | View full email content when clicking a row in timeline |
| 10 | Email Thread View | Expanded thread with all messages, reply/follow-up compose |

---

## 7. Out of Scope (for Prototype)

- Authentication / RBAC (use role-switcher instead)
- Real email/SMS/WhatsApp delivery (simulate with mock)
- Real calendar integration (mock meeting creation)
- Bulk meeting scheduling
- AI-drafted responses
- Candidate portal view (prototype focuses on recruiter experience)
- DLT compliance validation (UI only, no real DLT check)
- CRM (Joveo) integration (mock CRM messages in seed data)
- Attachment upload/download
- Email scheduling (send later)

---

## 8. Competitor Reference (Condensed for Cursor Context)

| Competitor | Key Pattern | What to Emulate |
|-----------|-------------|-----------------|
| **Lever** | Separate "Emails" tab on candidate page. Rich text editor. Template picker with variable insertion. Bulk email with dedup. Sender ID selection (personal/no-reply/company mail). Scheduled sending. | Template picker UX, sender selection pattern |
| **Greenhouse** | Activity Feed page with chronological event log. Texting via Grayscale partner (Chrome extension). Bulk email with permissions. | Activity feed timeline UX |
| **SAP/SuccessFactors** | "Message Centre" tab — email thread list on left, detail on right. "Correspondence" tab in candidate profile. SMS via partner integrations (Grayscale, Sense, Paradox). | Two-panel email thread layout |
| **Oracle Recruiting** | Messages tab with "My Emails" / "All Emails" toggle. Template + token system. Bulk messaging. | My/All filter pattern |
