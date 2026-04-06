# Darwinbox Design Document — Communication Centre

---

| Field | Value |
|---|---|
| Document Title | Communication Centre — Unified Candidate Communication Hub for Recruitment |
| Version | VK.1.0 |
| Design Doc Owner | — |
| Deployment Classification | REQUIRES CONFIGURATION |
| UX Impact | Yes |
| UX Design Owner | Ramu / Kavya Katterapalli |
| Dev Owner | — |
| QA Owner | — |
| Approved By | — |
| Status | DRAFT |
| Last Date Updated | 2026-04-06 |
| Jira ID | TAL-39649 |
| Zeplin Link | — |

---

## 1. Category & Classification

**Category:** New Sub-Module

**Module:** Recruitment (Talent Acquisition)

**Sub-Module:** Communication Centre

**Feature:** Centralized ad-hoc communication hub with multi-channel messaging (Email, SMS, WhatsApp), 1:1 meeting scheduling, email threading, and unified communication timeline on the Candidate Detail Page.

---

## 2. Business Case for Building

| Persona | Why? | How? |
|---|---|---|
| **Recruiter** | • Feature will increase productivity by saving time<br>• Feature will resolve certain existing issue/problem<br>• Feature will solve functionality gap w.r.t competition in the market | A recruiter managing 40+ candidates across 3 open positions currently switches between Darwinbox (for pipeline tracking), Gmail/Outlook (for emails), WhatsApp Web (for quick messages), and a calendar app (for scheduling). When a Hiring Lead asks "what's the last communication with Candidate X?", the recruiter spends 10-15 minutes searching across tools. With the Communication Centre, every touchpoint — system emails, ad-hoc messages, meeting invites — is visible in one chronological timeline on the Candidate Detail Page. The recruiter composes and sends from within Darwinbox without switching context. |
| **Hiring Lead (HL)** | • Feature will enhance accessibility/ease of use<br>• Feature will resolve certain existing issue/problem | A Hiring Lead reviewing candidate progress for a Regional Sales Manager position today has no visibility into what the recruiter communicated to candidates. They see pipeline stage changes in Darwinbox but not the actual messages. With the Communication Centre, the HL opens any candidate's "Communications" tab and sees the full interaction history — who said what, when, via which channel. They can also send their own messages directly, ensuring important candidates get timely, personalized outreach without relying on the recruiter as a middleman. |
| **Candidate** | • Feature will enhance accessibility/ease of use | A candidate applying for a Product Manager role receives a scheduling email from no-reply@darwinbox.in, a WhatsApp message with interview prep instructions, and a follow-up SMS reminder — all from different channels with no connection. They reply to the email but their response goes into a void because it was sent from a no-reply address. With the Communication Centre, emails from contact@darwinbox.in enable two-way replies that thread under the original message. The candidate gets consistent, professional communication, and their responses are captured centrally. |
| **HR Admin** | • Feature will automate or speed up module administration process | An HR Admin today cannot audit what ad-hoc communications went out to candidates. System-triggered notifications are logged, but manual emails sent from personal inboxes are invisible. With the Communication Centre, every ad-hoc email, SMS, and WhatsApp message is logged with sender, timestamp, channel, and delivery status — creating a compliance-ready audit trail. |

---

## 3. Insights from Product Analytics to Support Business Case

- **No existing Communication Centre exists in Darwinbox Recruitment.** The current Candidate Detail Page has tabs for Status, Application Details, Offer Details, and Activity Log — but no dedicated communication view. This is a greenfield gap.
- **Notification Centre logs system-triggered messages** (offer letters, interview invites, rejection emails) but does NOT capture ad-hoc recruiter-initiated communications.
- **Recruitment Email Templates exist** (Settings > Talent > Talent Acquisition > Recruitment Email Templates) but can only be used in system-triggered workflows, not for ad-hoc emailing from the candidate page.
- **Competitor products (Lever, Greenhouse, SAP, Oracle Recruiting) all have dedicated communication or messaging features** within their candidate pages (see Competitive Analysis below). Darwinbox is a notable outlier in missing this capability.

---

## 4. Competitive Analysis — Deep Gap Matrix

### 4a. Feature-by-Feature Comparison

| Capability | Lever | Greenhouse | SAP SuccessFactors | Oracle Recruiting | Darwinbox (Current) | Darwinbox (Proposed) |
|---|---|---|---|---|---|---|
| **Dedicated communication tab/page on candidate profile** | Yes — "Emails" tab on candidate page | Yes — "Activity Feed" page with chronological event log | Yes — "Message Centre" tab + "Correspondence" tab | Yes — "Messages" tab with My Emails / All Emails toggle | **No** — no communication tab exists | **Yes** — new "Communications" tab on Candidate Detail Page |
| **Ad-hoc email from candidate page** | Yes — rich text compose with template picker, placeholders, scheduling, CC, sender selection | Yes — email compose from candidate page | Yes — "Send Email" link in candidate correspondence tab | Yes — "Compose" button in Messages tab | **No** — must use external email client | **Yes** — right-side compose modal with rich text, templates, CC, sender selection |
| **Bulk email to multiple candidates** | Yes — bulk select from pipeline, compose with merge fields, deduplication controls | Yes — bulk email with permission checks | Yes — bulk messaging introduced in 24D release | Yes — supported from candidate search results | **No** — no bulk email capability | **Yes** — bulk compose from Job Detail Page and Candidate List with dedup and multi-job controls |
| **Ad-hoc SMS messaging** | Limited — Candidate Texting add-on, US & Canada only, requires consent + DLT, supports templates with variables | Via partner (Grayscale Chrome extension) — syncs back to Activity Feed | Via partners (Grayscale, Sense, ChatINK, Paradox) — not native | Not mentioned in core product | **No** — SMS only via Notification Centre system triggers | **Yes** — native SMS compose from Candidate Detail Page, logged in timeline |
| **Ad-hoc WhatsApp messaging** | Not supported natively | Via Grayscale partner — supports SMS + international + WhatsApp, one-off and bulk | Via partners (Grayscale) — not native | Not mentioned | **No** — WhatsApp only via Notification Centre system triggers | **Yes** — native WhatsApp compose from Candidate Detail Page, logged in timeline |
| **Two-way email threading** | Yes — candidate replies threaded under original email | Yes — conversation history imported into Activity Feed via partner | Yes — Message Centre shows email threads with expand/reply on right panel | Yes — thread view in Messages tab | **No** — no inbound email capture | **Yes** — replies from contact@ threaded, with Reply and Follow-Up actions |
| **Sender identity selection** | Yes — personal email, no-reply, Lever Mail (company branded) | Limited — primarily personal email | Yes — system sender vs personal | Yes — system email | **Partial** — no-reply@darwinbox.in and contact@darwinbox.in exist for system emails | **Yes** — dropdown to select no-reply@ (one-way) or contact@ (two-way) with clear warnings |
| **Template support with variable substitution** | Yes — team templates with candidate/recruiter/company variables, search, preview | Yes — email templates with merge tags | Yes — template picker with tokens | Yes — template + token system | **Partial** — templates exist for system notifications but not for ad-hoc compose | **Yes** — template dropdown in compose modal, auto-populates subject + body with variable substitution |
| **1:1 meeting scheduling (non-interview)** | Not differentiated from interview scheduling | Not differentiated | Not mentioned | Not mentioned | **No** — only formal interview scheduling exists | **Yes** — dedicated 1:1 Meeting option in Communications tab, separate from interview workflow |
| **Cross-job communication visibility** | Yes — candidate profile shows all activity across opportunities | Yes — Activity Feed spans all applications | Yes — Message Centre shows all threads | Yes — Messages tab shows per-job and all | **No** | **Yes** — "Current Job" section (expanded) + "Other Jobs" section (collapsed) |
| **Channel indicator per message** | Partial — emails labeled, SMS separate | Yes — activity type labeled in feed | Yes — channel type shown | Partial | **N/A** | **Yes** — icons for Email, SMS, WhatsApp, Meeting, System per message |
| **Communication log with delivery status** | Partial — sent/open tracking | Limited | Limited | Limited | **No** | **Yes** — sent/delivered/failed status per message with vendor tracking IDs |

### 4b. Key Gaps Darwinbox is Closing

**Gap 1 — No unified communication view.** Every competitor has a dedicated communication tab or activity feed on the candidate profile. Darwinbox has none. This forces recruiters to context-switch to external email/messaging tools, losing visibility and creating compliance gaps. *This is the most fundamental gap.*

**Gap 2 — No ad-hoc email from within the product.** Lever, Greenhouse, SAP, and Oracle all allow composing and sending emails from the candidate page. Darwinbox currently only sends system-triggered notifications. Recruiters cannot send a personalized email without leaving the platform. *This directly impacts recruiter productivity.*

**Gap 3 — No native SMS/WhatsApp.** Competitors rely on partner integrations (Grayscale, Sense, Paradox) for SMS/WhatsApp. Darwinbox already has SMS and WhatsApp infrastructure in the Notification Centre but doesn't expose it for ad-hoc use in Recruitment. *This is an opportunity to leapfrog competitors by offering native multi-channel messaging instead of requiring partners.*

**Gap 4 — No two-way communication.** Candidates cannot reply to system emails and have those replies captured in the platform. Every competitor supports some form of threading. *This creates a broken candidate experience where communication feels one-directional.*

### 4c. Where Darwinbox Leapfrogs

**Native multi-channel messaging.** While Lever limits SMS to US/Canada, and Greenhouse/SAP rely on third-party partner extensions (Grayscale, Sense), Darwinbox's Communication Centre natively integrates Email + SMS + WhatsApp in a single compose experience. No Chrome extensions, no partner fees, no separate vendor contracts. This is especially valuable for the India/APAC market where WhatsApp is the dominant communication channel.

**Cross-job communication visibility.** While most competitors show communication per-opportunity, Darwinbox's design explicitly separates "Current Job" and "Other Jobs" communication — giving recruiters context on the candidate's full interaction history across multiple applications without mixing up job-specific threads.

**1:1 meeting scheduling as a first-class feature.** No competitor explicitly differentiates informal 1:1 meetings from formal interview scheduling. Darwinbox's Communication Centre treats meetings as a communication type alongside email/SMS/WhatsApp, visible in the same timeline.

---

## 5. Use Cases

### Use Case 1 — Recruiter Sends Ad-hoc Email to Candidate from Job Detail Page

- **Persona:** Recruiter
- **Current Challenge:** A recruiter wants to send a pre-screening questionnaire to 5 shortlisted candidates for a Regional Sales Manager role. Today, the recruiter must copy candidate email addresses from Darwinbox, switch to their email client, compose the email, and manually CC the Hiring Lead. There is no record of this communication in Darwinbox.
- **Solution with Feature:** From the Job Detail Page, the recruiter selects 5 candidates using checkboxes → clicks "Send Email" from the bulk action bar → compose modal opens with To pre-filled, template dropdown available, CC checkbox for "Recruiter" and "Hiring Lead" → recruiter picks "Pre-Screening Questionnaire" template → variables auto-resolve → clicks Send. Emails are delivered via Resend API. Each email is logged in the respective candidate's Communication Centre timeline.
- **Expected Outcome:** Total time reduced from ~15 minutes (context-switch + manual compose) to ~2 minutes. 100% of ad-hoc emails now logged in Darwinbox. Hiring Lead visibility without manual CC.
- **Maps to Tasks:** Task 10 (Bulk Email Compose), Task 15 (Job Detail Page — Send Email)

### Use Case 2 — Recruiter Sends WhatsApp Message to Candidate for Quick Follow-up

- **Persona:** Recruiter
- **Current Challenge:** A candidate hasn't responded to an interview scheduling email for 3 days. The recruiter wants to send a quick WhatsApp nudge. Today, the recruiter opens WhatsApp Web, searches for the candidate's number (copied from Darwinbox), sends a personal message, and there is zero record of this in the system.
- **Solution with Feature:** From the Candidate Detail Page, the recruiter opens the 3-dot menu → clicks "Send WhatsApp" → compose modal opens with candidate's WhatsApp number pre-filled → recruiter types a quick message → clicks Send. The message is delivered via Twilio WhatsApp API and logged in the Communication Centre timeline with a WhatsApp channel icon.
- **Expected Outcome:** No context-switching. WhatsApp messages become part of the auditable communication record. Hiring Lead can see the follow-up happened without asking.
- **Maps to Tasks:** Task 11 (WhatsApp & SMS Modals), Task 16 (Candidate List Page — Send Email/SMS/WhatsApp)

### Use Case 3 — Hiring Lead Reviews Full Candidate Communication History Before Decision

- **Persona:** Hiring Lead
- **Current Challenge:** Before making an offer decision, the Hiring Lead wants to understand the candidate's communication journey — were there delays? Did the candidate seem engaged? Were there any red flags in email exchanges? Today, the HL has zero visibility into this. They must ask the recruiter to forward email threads, which is time-consuming and incomplete.
- **Solution with Feature:** The Hiring Lead opens the Candidate Detail Page → clicks the "Communications" tab → sees the full timeline: system-triggered emails (application received, interview scheduled), ad-hoc recruiter emails, WhatsApp messages, SMS, and 1:1 meeting logs. They can filter by "All" / "System Initiated" / "User Initiated" and expand any email thread to read the full exchange including candidate replies.
- **Expected Outcome:** Decision-making context available in <30 seconds instead of 30+ minutes of back-and-forth with recruiter. Full audit trail for compliance.
- **Maps to Tasks:** Task 6 (Communications Tab — Email Timeline), Task 7 (Other Jobs Section), Task 8 (Email Detail Modal), Task 12 (Email Threading Display)

### Use Case 4 — Recruiter Replies to Candidate Email Within Thread

- **Persona:** Recruiter
- **Current Challenge:** A candidate replies to an interview scheduling email with a question about office location. Today, this reply goes to the recruiter's personal inbox (if it was sent from a personal address) or to a shared inbox (if contact@darwinbox.in was used). Either way, the reply is not visible in Darwinbox, and the threaded context is lost.
- **Solution with Feature:** The candidate's reply appears as a new message in the email thread within the Communication Centre. The thread count updates (e.g., "Atharva M (2)" becomes "Savannah Nguyen (3)"). The recruiter clicks the thread → sees the full exchange → clicks "Reply" → compose opens with previous messages visible and expandable → types response → sends. The reply is delivered via Resend and added to the thread.
- **Expected Outcome:** Zero email replies lost. Full threaded context preserved. Recruiter handles candidate queries without leaving Darwinbox.
- **Maps to Tasks:** Task 12 (Email Threading Display), Task 13 (Reply & Follow-Up Actions)

### Use Case 5 — Recruiter Schedules Informal 1:1 Meeting with Candidate

- **Persona:** Recruiter
- **Current Challenge:** A recruiter wants to schedule a quick 15-minute call with a promising candidate to discuss role expectations before moving to formal interviews. Today, the only scheduling mechanism in Darwinbox is the formal interview scheduling workflow (which requires evaluation forms, interviewer assignment, etc.). For an informal call, the recruiter must use an external calendar app.
- **Solution with Feature:** From the Communication Centre action dropdown, the recruiter selects "1:1 Meeting" → fills in title ("Role Discussion"), selects duration (15 min), picks Google Meet as channel, adds a brief description → clicks "Send Invite". A real email invite is sent to the candidate via Resend. The meeting appears in the Communications timeline as a calendar event with status "Scheduled".
- **Expected Outcome:** Informal meetings captured in the same timeline as all other communication. No gap between "formal" interview workflow and "informal" recruiter-candidate conversations.
- **Maps to Tasks:** Task 14 (1:1 Meeting Scheduling)

### Use Case 6 — Recruiter Sends Bulk Rejection Emails with Personalization

- **Persona:** Recruiter
- **Current Challenge:** After final interviews for a Software Engineer role, 20 candidates need rejection emails. Today, this is either handled by a system-triggered notification (generic, impersonal) or manually composed in an external email client (time-consuming, error-prone).
- **Solution with Feature:** From the Job Detail Page, the recruiter selects all rejected candidates → clicks "Send Email" → selects "Rejection — After Final Interview" template → the template body includes personalized variables (candidate name, job title, interview round) → enables "Send only one email for each unique candidate" → clicks Send. 20 personalized rejection emails are sent in one action.
- **Expected Outcome:** Mass personalized communication in <3 minutes. Professional candidate experience even in rejection. All communications logged.
- **Maps to Tasks:** Task 10 (Bulk Email Compose), Task 9 (Compose Email Modal — template selection)

---

## 6. Pages We Are Building and Why

### 6a. Page Inventory

This prototype touches **5 pages** — 1 new tab and 4 enhanced existing pages:

| # | Page | What We're Adding | Why This Page |
|---|---|---|---|
| 1 | **Candidate Detail Page — Communications Tab** (NEW) | Entire new tab with unified timeline, compose actions, threading, meeting scheduling | This is the **core of the Communication Centre**. Every competitor has a dedicated communication view on the candidate profile. This is the single highest-impact page. |
| 2 | **Job Detail Page** (ENHANCED) | "Send Email" per candidate row + bulk email action bar when candidates selected | Recruiters live on this page during active hiring. They need to email candidates in-context without navigating away. Lever, Greenhouse, and Oracle all support this. |
| 3 | **Candidate List Page** (ENHANCED) | "Send Email", "Send WhatsApp", "Send SMS" in 3-dot menu + bulk email action | The master candidate list is where cross-job communication happens — e.g., re-engaging candidates from past jobs. Adding send actions here mirrors what SAP's Message Centre offers. |
| 4 | **Compose Email Modal** (NEW) | Right-side panel for individual + bulk email compose with rich text, templates, CC, sender selection | The compose experience is shared across all three pages above. It's the "Send" workhorse. |
| 5 | **Compose WhatsApp/SMS/Meeting Modals** (NEW) | Right-side panels for WhatsApp, SMS, and 1:1 Meeting scheduling | These extend the Communication Centre beyond email to truly multi-channel — the key differentiator over competitors who rely on partner extensions. |

### 6b. Why This Scope — What We're NOT Building and Why

| Deliberately Excluded | Rationale |
|---|---|
| Candidate Portal view of communications | The prototype focuses on the recruiter/HL experience. Candidate-side can be a fast follow. |
| Real calendar integration (Google/Outlook sync) | Meeting scheduling works via email invites. True calendar sync is an engineering integration effort beyond prototype scope. |
| Inbound WhatsApp/SMS reply capture | Inbound requires webhook infrastructure. For the prototype, we demonstrate outbound. Two-way email is built because it's architecturally simpler (Resend handles inbound). |
| AI-drafted message suggestions | Valuable but orthogonal to the core hub. Can be layered on later. |
| Automated stage-triggered messaging rules | The UX PRD mentions this as future scope. The Communication Centre logs system-triggered messages but doesn't configure new automation rules. |
| Email scheduling (send later) | Nice-to-have. Lever supports it. Can be added post-prototype. |
| Attachment upload/download | Adds file handling complexity. Out of scope for prototype. |

---

## 7. Persona-Specific User Stories

### 7a. Recruiter

**Navigation Path:** Recruitment > Job Openings > Job Detail Page > Candidate Detail Page > Communications tab
**Alternative Path:** Recruitment > Candidates > Candidate Detail Page > Communications tab

**Detailed Flow:**

The recruiter lands on the Candidate Detail Page and sees the familiar blue banner header with candidate info. They click the "Communications" tab (new). The tab shows:

1. **Current Job section** (expanded by default): Job title in header with "(Current Job)" suffix. A filter bar: All | System Initiated | User Initiated. Below, a table with Sender | Message | Time columns showing the communication history in reverse chronological order. A "+ New Email" button in the section header.

2. **Other Jobs section** (collapsed, only if the candidate has communications in other jobs): Clicking expands to show the same table layout for each other job.

3. **Action dropdown**: Email | SMS | WhatsApp | 1:1 Meeting — triggering the respective compose modal.

The recruiter clicks "+ New Email" → right-side compose modal slides in → they select sender (contact@ for two-way), pick a template, customize the body, click Send → email is delivered → success banner appears → new email shows in the timeline immediately.

For WhatsApp/SMS: 3-dot menu → "Send WhatsApp" → compose modal → type message → Send → delivered → appears in timeline with channel icon.

For meetings: Action dropdown → "1:1 Meeting" → schedule modal → fill details → Send Invite → email invite sent → meeting event appears in timeline with "Scheduled" badge.

**Design Decisions:**
- Chose a tab (not a sidebar or overlay) because the communication history can be extensive and needs full-width space.
- Right-side modal for compose (not a new page) to maintain context — recruiter can see the timeline while composing.
- Sender selection with explicit warnings (no-reply vs contact@) to prevent accidental use of one-way email when two-way is intended.

**Default State on Launch:** Communications tab shows "No communications yet. Send the first message." with a compose CTA.

### 7b. Hiring Lead (HL)

**Navigation Path:** Same as Recruiter.

**Detailed Flow:** Identical to Recruiter. Full send/receive/view/reply access. The Hiring Lead's key use case is *reviewing* communication history before making decisions (offer, rejection, escalation). They also send direct emails to high-priority candidates.

**Design Decisions:** HL and Recruiter have identical permissions in this prototype. In production, RBAC may differentiate (e.g., HL can view but not delete communications).

### 7c. Candidate (Receive-only in Prototype)

**Experience:** The candidate receives emails, SMS, and WhatsApp messages on their personal channels. For emails from contact@darwinbox.in, they can reply normally from their email client. Their replies are threaded in the recruiter's Communication Centre.

In a future phase, the Candidate Portal would show a "Messages" section with their communication history. This is out of scope for the prototype.

---

## 8. Edge Cases & Error Handling

| Scenario | Expected Behavior | Error Message |
|---|---|---|
| Candidate has no email address | "Send Email" action hidden or disabled for that candidate | "Email address not available for this candidate" |
| Candidate has no phone number | "Send SMS" and "Send WhatsApp" actions hidden or disabled | "Phone number not available for this candidate" |
| Bulk email with some invalid addresses | Send succeeds for valid addresses, fails for invalid | "Email sent to 72 of 77 candidates. 5 addresses were invalid." |
| WhatsApp recipient hasn't joined sandbox (prototype-specific) | Send fails via Twilio API | "Recipient has not joined the WhatsApp sandbox. Ask them to send 'join {code}' to +14155238886." |
| Vendor API key missing in .env | Fall back to mock mode — save to DB, mark as "sent" | Console warning: "RESEND_API_KEY not configured. Running in mock mode." |
| Vendor API rate limit hit | Retry with backoff, then fail gracefully | "Message sending temporarily delayed. It will be retried automatically." |
| Email body exceeds Resend size limit | Block send, show validation error | "Email body is too large. Please reduce content and try again." |
| Two-way reply received for no-reply@ email | Should not happen (no-reply@ is not replyable) | N/A — architecturally prevented |
| Candidate tagged to 0 jobs (prospect) | Communications tab still works, but "Current Job" section shows "No job assigned" | N/A |
| Same email sent to same candidate twice (dedup) | "Send only one email for each unique candidate" checkbox prevents this when enabled | N/A |

---

## 9. Other Impact Areas

| Impact Area | Has Impact (Yes/No) | Comments |
|---|---|---|
| Impact on mobile | 🔍 [PM REVIEW — decision needed: Is mobile prototype in scope? Recruitment pages are used on desktop primarily, but Communication Centre could be valuable on mobile for on-the-go recruiters.] | |
| Impact on other modules | Yes | Notification Centre (existing system notifications flow into Communication Centre timeline). Onboarding module may be impacted in future if Communication Centre extends to onboarding communication. |
| Changes to Imports | No | No bulk data import for communication records in v1. |
| Changes to Reports | Yes | New communication metrics: messages sent per recruiter, channel distribution, response times. 🔍 [PM REVIEW — assumed: Report attributes added to existing Recruitment Reports cluster.] |
| Changes to Forms Dashboard | No | |
| Changes to Multi-language framework | Yes | New UI strings: "Communications", "Compose New Email", "Send WhatsApp Message", "Send SMS", "1:1 Meeting", "Follow Up", "Reply", filter labels, success/error messages. |
| Changes to Audit Trail | Yes | All ad-hoc communications logged: who sent, to whom, via which channel, when, content. |
| Impact of time zone | Yes | Message timestamps displayed in user's timezone preference. Meeting scheduling uses cross-timezone logic (existing interview scheduling architecture). |
| Changes to Email Logs | Yes | All emails sent from Communication Centre should be captured in Email Logs service. |
| Changes to Chatbot Intents | No | |
| Changes to the Forms Framework | No | |
| Changes to Tasks | No | |
| Changes to Email Notifications | Yes | Meeting invites sent as email notifications to participants. |
| Changes to Bell Notifications | 🔍 [PM REVIEW — decision needed: Should the recruiter get a bell notification when a candidate replies to an email?] | |
| Changes to Mobile Push Notifications | No | |
| Changes to SMS Notifications | Yes | Ad-hoc SMS sent from Communication Centre uses SMS notification infrastructure. |
| Changes to WhatsApp Notifications | Yes | Ad-hoc WhatsApp sent from Communication Centre uses WhatsApp notification infrastructure. |
| Changes to Role-Based Access Controls / Permissions | Yes | New permissions: "Send Email from Communication Centre", "Send SMS/WhatsApp from Communication Centre", "View Communication Centre". 🔍 [PM REVIEW — assumed: Added under existing Recruitment permission cluster.] |
| Changes to Reports Controls / Permissions | 🔍 [PM REVIEW — decision needed: Are communication reports part of Recruitment Reports or a separate cluster?] | |
| Changes to Custom Fields | No | |
| Changes to HR Letters | No | |
| Impact on User Assignments | No | |
| Changes in Integration Framework | 🔍 [PM REVIEW — decision needed: Should Communication Centre data be available via push/pull APIs for external CRM integrations?] | |
| Impact on Workflows | No | |
| Changes in Aliases | Yes | "Communications" tab name should be aliasable per tenant. |
| Changes in Profile View Settings | No | |
| Changes in Profile Tags | No | |
| Changes in Org View | No | |
| Changes to Master Data at Platform Level | No | |
| Changes to Module Dashboards | 🔍 [PM REVIEW — assumed: New "Communication Insights" widget on Recruitment Dashboard showing messages sent, channel distribution, avg response time.] | |
| Helptexts | Yes | Helptexts for: Communications tab, Compose Email modal fields, WhatsApp sandbox info, sender selection warning. |

---

## 11. Measuring Success

| Metric | Definition | Target | Timeframe |
|---|---|---|---|
| Communication Centre adoption | % of active recruiters who use the Communications tab at least once per week | 60% of active recruiters | 60 days post-launch |
| Ad-hoc emails sent from platform | # of emails sent via Communication Centre vs. estimated external emails (baseline survey) | 50% shift from external to in-platform | 90 days post-launch |
| Multi-channel usage | % of Communication Centre users who use 2+ channels (email + SMS or WhatsApp) | 30% of users | 90 days post-launch |
| Avg time to send communication | Time from clicking "Compose" to clicking "Send" | <2 minutes for individual email, <5 minutes for bulk | 30 days post-launch |
| Two-way thread engagement | % of contact@ emails that receive at least one candidate reply | 20% reply rate (baseline, industry benchmark) | 90 days post-launch |

---

## 12. Assessing Design for Scale

| Risk Area | Description | Remedial Measure |
|---|---|---|
| Heavy communication timeline for long-tenured candidates | A candidate applied to 10+ jobs over 2 years could have 200+ communications across all jobs | Progressive loading: 6 shown by default → 10 on expand → scrollable. Separate "Current Job" from "Other Jobs" to reduce noise. |
| Bulk email sending rate limits | Sending 500 bulk emails in one action could hit Resend rate limits (5 req/sec) | Sequential sending with progress indicator. Queue-based architecture for production. |
| Employee search in CC field for large orgs | 50,000+ employees in CC type-ahead dropdown | Elastic search with debounced input (existing pattern from Employee Search component). |
| Template library growth | Orgs may create 100+ custom templates | Search/filter within template dropdown. Category-based grouping. |

---

## 🔍 PM Review Summary

### Product Functionality Assumptions
- Report attributes added to existing Recruitment Reports cluster
- "Communication Insights" widget on Recruitment Dashboard
- Communication Centre data aliasable per tenant

### Module & Integration Assumptions
- Bell notification on candidate reply — decision needed
- Communication Centre data via push/pull APIs — decision needed
- Communication reports cluster placement — decision needed
- Mobile prototype scope — decision needed

### Standard BRD Template Sections
- Audit Trail, Email Logs, MLF, Aliases, RBAC sections included as standard practice

### Data Assumptions
- Seed data includes realistic candidate names, email addresses, and phone numbers for demo purposes

*Authored under Golden BRD Standard — VK*
