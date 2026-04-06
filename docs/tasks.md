# Communication Centre — Task Breakdown

Feed tasks to Cursor ONE AT A TIME. Complete and verify each before starting the next.

---

## Phase 1: Foundation (Day 1)

### Task 1: Project Scaffolding
Create a React + TypeScript + Tailwind CSS frontend with a Node.js + Express backend.
- Use Vite for React setup
- Set up Prisma with SQLite
- Create basic folder structure: `/src/components/`, `/src/pages/`, `/src/types/`, `/src/api/`, `/prisma/`
- Install vendor SDKs: `npm install resend twilio`
- Create `.env` file from the template in @.cursor/rules/project-context.mdc (Vendor Integration section)
- Create `.env.example` with placeholder values (no real keys) for reference
- Add `.env` to `.gitignore`
- Verify: app runs on localhost, shows a blank page

### Task 2: Data Models + Seed Data
Define Prisma schema based on the data model in @docs/prd.md Section 5:
- Candidate, Job, Communication, Meeting, EmailTemplate models
- Add `delivery_status` field to Communication model: "pending" | "sent" | "delivered" | "failed"
- Add `vendor_message_id` field to Communication model (stores Resend/Twilio message ID for tracking)
- Create seed script with realistic data:
  - 12 candidates across different pipeline stages (use REAL email addresses for 2-3 candidates that will be used in demo — the PM's email, a colleague's email)
  - 4 job openings (Regional Sales Manager, Product Manager, Software Engineer, HR Business Partner)
  - 40+ communications (mix of email, SMS, WhatsApp, system notifications)
  - 3 meetings (scheduled, completed, rescheduled)
  - 8 email templates (confirmation, rejection, scheduling, offer, follow-up, assessment invite, pre-offer, custom)
  - Some email threads with candidate replies (for 2-way communication testing)
- Verify: `npx prisma db seed` runs successfully

### Task 3: Message Delivery Service
Create a unified message sending service at `/src/api/services/message-sender.ts`:

**Email (via Resend):**
- Import Resend SDK, initialize with RESEND_API_KEY from .env
- Function: sendEmail({ from, to, cc, subject, htmlBody }) returns { success, messageId, error }
- From address: Use "onboarding@resend.dev" for testing, or a verified custom domain
- On success: return Resend message ID
- On failure: return error message

**SMS (via Twilio):**
- Import Twilio SDK, initialize with TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN from .env
- Function: sendSMS({ to, body }) returns { success, messageId, error }
- From: TWILIO_PHONE_NUMBER from .env
- On success: return Twilio message SID
- On failure: return error message

**WhatsApp (via Twilio Sandbox):**
- Same Twilio client as SMS
- Function: sendWhatsApp({ to, body }) returns { success, messageId, error }
- From: TWILIO_WHATSAPP_NUMBER from .env (format: "whatsapp:+14155238886")
- To: must be prefixed with "whatsapp:" (e.g., "whatsapp:+919876543210")
- On success: return Twilio message SID
- On failure: return error message

**Unified wrapper:**
- Function: sendMessage({ channel, to, from, subject, body, cc }) returns { success, messageId, error }
- Routes to the correct vendor based on channel ("email" | "sms" | "whatsapp")
- Always saves the message to the local database REGARDLESS of vendor success/failure
- Sets delivery_status to "sent" or "failed" based on vendor response
- Stores vendor_message_id for sent messages

**Fallback behavior:**
- If .env keys are missing or empty, log a warning and fall back to mock mode (save to DB only, mark as "sent")
- This ensures the app still works without vendor credentials configured

- Verify: Create a simple test route `/api/test-send` that sends a test email, SMS, and WhatsApp. Test each channel individually.

### Task 4: Layout Shell
Build the app layout matching Darwinbox's structure:
- Top header: Darwinbox logo area + role switcher dropdown (Recruiter / Hiring Lead / Candidate)
- Main content area (full-width, no persistent sidebar — matching Darwinbox recruitment pages)
- Page title left-aligned, primary CTA button right-aligned
- Match the tabbed interface pattern from Darwinbox (see @docs/platform-context.md and screenshots in @docs/design-system/screenshots/)
- Verify: navigation between pages works, role switcher changes active persona

### Task 5: Candidate Detail Page Shell
Build the Candidate Detail Page with:
- Blue header banner with avatar circle (initials), candidate name, status badge, job code, job match score
- Below banner: phone, email, date, source type metadata row
- Tab bar: Overview | Application Details | Activity Log | **Communications** | Other Apps
- Only the Communications tab needs to be functional — others can be placeholder
- Right sidebar: Tags, Skills, Feedback sections (can be static/placeholder), "Other Applied Jobs" list
- Match the visual style from screenshots 04 and 05 in @docs/design-system/screenshots/
- Verify: clicking a candidate from list navigates to detail page, tabs switch content

---

## Phase 2: Communication Centre Core (Day 2-3)

### Task 6: Communications Tab — Email Timeline
Build the main Communications tab content per PRD Section 4.4:
- "Current Job" section: expanded by default, with job title in header + "(Current Job)" suffix
- Email Type filter: All | System Initiated | User Initiated
- Email list as columnar table: Sender | Message | Time
- Show 6 emails by default, "Show more" expands to 10, then scrollable
- Reverse chronological order
- Time formatting: "Today" / "Yesterday" for recent, date otherwise
- Sender: Employee Name for user-sent, "System" for auto-triggered
- Message: Bold subject + body preview, capped at 75 chars
- Verify: Communications tab loads with seed data, filter toggles work

### Task 7: Other Jobs Section
Below Current Job, add "Other Jobs" section per PRD:
- Only visible if candidate has communications in other jobs
- Collapsed by default, expandable on click
- Same table layout as Current Job, minus the "New Email" button
- Header shows job title
- Verify: section appears/hides based on data, expand/collapse works

### Task 8: Email Detail Modal
When clicking any email row in the timeline:
- Right-side modal opens showing: From, To, Subject, Time + timezone, full Body
- Show delivery_status indicator (sent checkmark, delivered double-checkmark, failed X) next to the timestamp
- Close button (X)
- Verify: clicking an email row opens detail modal with correct content

---

## Phase 3: Compose & Send — With Real Delivery (Day 3-4)

### Task 9: Compose Email Modal
Build the "Compose New Email" right-side panel per PRD Section 4.1:
- Header: "Compose New Email - {Candidate Name}"
- Send From: dropdown with no-reply@darwinbox.in and contact@darwinbox.in + warning pop-ups
- To: display-only with candidate email
- CC: employee search field with type-ahead (mock with seed employees) + Recruiter/HL checkboxes
- Template: dropdown that loads email templates from DB and populates Subject + Body
- Subject: free text field
- Body: rich text editor (use TipTap or React-Quill)
- Preview button
- **Send button: calls the message-sender service (Task 3) which sends a REAL email via Resend AND saves to DB. Shows success/error banner based on vendor response.**
- Cancel button
- Trigger: "+ New Email" button on Communications tab
- After successful send, the new email appears in the timeline immediately
- Verify: compose modal opens, template loads, **send actually delivers an email to the recipient's inbox**, message appears in timeline with delivery status

### Task 10: Bulk Email Compose
Extend compose for bulk email scenarios:
- Header changes to "Compose {N} Emails"
- To field shows 2 emails + "+N Recipients"
- Additional checkboxes: "Send only one email for each unique candidate", "Don't email candidates with multiple jobs"
- **Send calls Resend API for each recipient (sequentially to respect rate limits). Show progress: "Sending 3 of 15..."**
- Trigger: from Job Detail Page when multiple candidates selected
- Verify: bulk compose works from job page, dedup checkbox logic works, emails actually arrive

### Task 11: WhatsApp & SMS Modals
Build the WhatsApp and SMS compose modals per PRD Section 4.2:
- WhatsApp: Header "Send WhatsApp Message – {Name}", From (WhatsApp Business Account), To (mobile), Message text area, Send/Cancel
- SMS: Header "Send SMS – {Name}", From (Sender ID), To (mobile), Message text area, Send/Cancel
- **Send buttons call the message-sender service (Task 3) which sends REAL WhatsApp/SMS via Twilio**
- Trigger: 3-dot menu on Candidate Detail Page
- Sent messages appear in Communications timeline with channel icon and delivery status
- **WhatsApp caveat: show a small info banner in the WhatsApp modal: "Recipients must have joined the WhatsApp sandbox to receive messages."**
- Verify: both modals work, **SMS arrives on recipient's phone, WhatsApp arrives on sandbox-joined recipient's phone**, messages saved to DB with correct channel type and delivery status

---

## Phase 4: Threading & 2-Way Communication (Day 4-5)

### Task 12: Email Threading Display
Implement email threading per PRD Section 4.5:
- Threads: group replies under original message using thread_id
- Sender column shows "{Name} (N)" where N = count of emails in thread
- When candidate replied: show "{Candidate Name} (2)"
- Threads ordered by latest reply; within thread, by date
- Clicking a threaded row expands to show all messages in thread
- Verify: seed data threads display correctly, thread counts are accurate

### Task 13: Reply & Follow-Up Actions
Add Reply and Follow Up buttons per PRD:
- **Follow Up**: appears for contact@ emails with NO candidate reply. Opens compose with From frozen to contact@, previous message visible and expandable below
- **Reply**: appears for threads WITH candidate reply. Opens threaded view with reply compose at bottom. Each previous message expandable/collapsible with ^ toggle
- **Reply and Follow-up both send REAL emails via Resend (using the message-sender service)**
- Visual: sender icons (recruiter/candidate/system), indentation for replies, timestamps aligned
- Verify: Follow Up and Reply buttons appear in correct contexts, compose pre-fills correctly, **sent replies actually arrive in recipient's inbox**

---

## Phase 5: Meeting Scheduling + Job Page Actions (Day 5-6)

### Task 14: 1:1 Meeting Scheduling
Build the meeting schedule modal per PRD Section 4.3:
- Action dropdown in Communications tab: Email | SMS | WhatsApp | 1:1 Meeting
- Meeting modal: Title, Participants (auto-filled), Duration dropdown, Date/Time picker, Channel dropdown (Google Meet/Teams/Zoom/In-person), Description, Send Invite button
- Meeting appears in timeline as calendar event with status badge (Scheduled/Rescheduled/Completed)
- **Send Invite sends a REAL email notification to all participants via Resend with meeting details (date, time, channel, description). If Google Meet/Zoom selected, include a placeholder meeting link.**
- Verify: meeting created, visible in timeline with correct status, **invite email arrives in participant inboxes**

### Task 15: Job Detail Page — Send Email
Add email actions to the Job Detail Page:
- "Send Email" action per candidate row (3-dot menu or inline button)
- Bulk action bar appears when candidates are selected (checkboxes)
- Both trigger the compose modal (individual or bulk)
- Match the visual style from screenshot 02 in @docs/design-system/screenshots/
- Verify: email compose accessible from Job Detail Page for single and bulk

### Task 16: Candidate List Page — Send Email
Add email actions to the Candidate List Page:
- "Send Email" in 3-dot menu per candidate (alongside existing View Application, View Application Log)
- "Send WhatsApp" and "Send SMS" also in 3-dot menu
- Bulk select + "Send Email" bulk action
- Match the visual style from screenshots 03 and 06 in @docs/design-system/screenshots/
- Verify: email compose accessible from Candidate List Page

---

## Phase 6: Polish & Demo-Ready (Day 6-7)

### Task 17: Channel Indicators & Delivery Status
Add visual channel indicators across the timeline:
- Email icon (envelope), SMS icon (phone), WhatsApp icon (WhatsApp logo), Meeting icon (calendar), System icon (gear/bell)
- Color-coded or labeled badges per channel type
- **Delivery status indicators: single checkmark for Sent (gray), double checkmark for Delivered (blue), X for Failed (red) — next to each message timestamp**
- Verify: each communication type has the correct icon, delivery status is visible

### Task 18: Empty States & Loading
Add empty states for:
- Communications tab with no messages: "No communications yet. Send the first message."
- Other Jobs section when empty: (don't show section)
- Loading spinners for data fetches
- **Loading state on Send button: show spinner while vendor API call is in progress, disable button to prevent double-sends**
- Verify: empty states display correctly for new candidates

### Task 19: Success/Error Banners
Implement toast/banner notifications per PRD:
- Send success: "Email successfully sent to N candidates"
- Partial failure: "Email sent to X of Y candidates. Z addresses were invalid."
- **Vendor error: "Failed to send email: [vendor error message]. Message saved as draft."**
- **WhatsApp-specific error: "Recipient has not joined the WhatsApp sandbox. Ask them to send 'join {code}' to +14155238886."**
- Verify: banners appear after send actions with correct messages, **vendor errors surface clearly**

### Task 20: Role Switcher Behavior
Make the role switcher functional:
- Recruiter view: full access to all features
- Hiring Lead view: same as Recruiter (for prototype)
- Candidate view: read-only timeline showing received messages only, no compose actions
- Verify: switching roles changes available actions

### Task 21: Demo Data Cleanup & Walkthrough
- Update seed data to include 2-3 candidates with REAL email addresses (for live demo)
- Update seed data to include 1-2 candidates with REAL phone numbers that have joined the WhatsApp sandbox
- Ensure demo flow works end-to-end:
  1. Open candidate → see timeline with historical messages
  2. Compose email → send → **email arrives in real inbox** → see in timeline with sent status
  3. Send WhatsApp → **message arrives on real phone** → see in timeline
  4. Send SMS → **SMS arrives on real phone** → see in timeline
  5. View thread → reply → **reply arrives in inbox**
  6. Schedule 1:1 meeting → **invite email arrives**
- Fix any visual inconsistencies
- Verify: full end-to-end demo works with real message delivery

---

## Pre-Demo Checklist

Before running the demo, ensure:
- [ ] `.env` has valid Resend API key
- [ ] `.env` has valid Twilio credentials (Account SID, Auth Token, phone number)
- [ ] Twilio WhatsApp sandbox is activated
- [ ] Demo recipients have joined the WhatsApp sandbox (sent "join {code}" to sandbox number)
- [ ] Seed data includes real email addresses and phone numbers for demo candidates
- [ ] Test: send one email, one SMS, one WhatsApp manually to confirm all channels work
- [ ] Resend daily limit not exhausted (100/day on free tier)
- [ ] Twilio trial balance has credits remaining
