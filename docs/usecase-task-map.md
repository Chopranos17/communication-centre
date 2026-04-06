# Use Cases → Tasks: The Build Map

This document connects **why** we're building each feature to **what** Cursor actually builds and **in what order**. If the prototype isn't working right, this is your debugging guide — trace the broken experience back to its task and fix that specific piece.

---

## How to Read This Document

Each section follows this structure:
1. **The Use Case** — what the user is trying to do
2. **Why It Matters** — competitive context and business justification
3. **Which Tasks Build It** — the specific tasks from tasks.md, in order
4. **What "Done" Looks Like** — how to verify it works
5. **If It Breaks** — what to tell Cursor to fix

---

## Use Case 1: See All Candidate Communications in One Place

### The Experience
A recruiter or Hiring Lead opens a candidate's profile and clicks the "Communications" tab. They see every touchpoint — system emails (interview invites, offer letters), ad-hoc emails from recruiters, SMS messages, WhatsApp messages, and 1:1 meeting events — in a single reverse-chronological timeline. If the candidate applied to multiple jobs, communication is separated by job with the current job expanded and other jobs collapsed.

### Why It Matters
This is the **foundational gap**. Every competitor (Lever, Greenhouse, SAP, Oracle) has this. Darwinbox is the only major HRMS without a unified communication view on the candidate profile. Without this, nothing else in the Communication Centre makes sense — you need the timeline before you can build compose, threading, or meetings on top of it.

### Which Tasks Build It

| Build Order | Task | What It Creates | Depends On |
|---|---|---|---|
| **Phase 1** | Task 2: Data Models + Seed Data | Communication database table with 40+ seed records across channels | Task 1 (scaffolding) |
| **Phase 1** | Task 5: Candidate Detail Page Shell | Blue header, tab bar with "Communications" tab, page layout | Task 4 (layout shell) |
| **Phase 2** | Task 6: Communications Tab — Email Timeline | The actual timeline table: Sender / Message / Time columns, filters, reverse chronological, "Show more" progressive loading | Task 5 (page shell) + Task 2 (data) |
| **Phase 2** | Task 7: Other Jobs Section | Collapsed section below Current Job showing cross-job communication | Task 6 (timeline) |
| **Phase 2** | Task 8: Email Detail Modal | Click-to-expand detail view for any message | Task 6 (timeline) |
| **Phase 6** | Task 17: Channel Indicators & Delivery Status | Icons (email/SMS/WhatsApp/meeting/system) and delivery status badges per message | Task 6 (timeline) |

### What "Done" Looks Like
- Open any candidate → click Communications tab → see a populated timeline
- Filter between All / System Initiated / User Initiated → table updates
- See "Current Job" section expanded with 6 messages → click "Show more" → see 10 → scroll for more
- See "Other Jobs" section collapsed → click to expand → see communication for a different job
- Click any message row → detail modal opens with full content
- Each message has the correct channel icon (envelope/phone/WhatsApp/calendar/gear)

### If It Breaks
- **Timeline is empty:** Check Task 2 seed data — are Communications linked to the right candidate_id and job_id?
- **Filter doesn't work:** Check Task 6 — the filter logic should query by sender_type ("system" vs "recruiter"/"hiring_lead")
- **Other Jobs section doesn't appear:** Check Task 7 — it only renders when the candidate has communications in a job_id different from their current job
- **Channel icons missing:** Check Task 17 — it adds icons to the existing timeline from Task 6

---

## Use Case 2: Send an Ad-hoc Email to a Candidate

### The Experience
From the Candidate Detail Page, Job Detail Page, or Candidate List Page, the recruiter clicks "Send Email." A right-side compose modal opens with the candidate's email pre-filled, a sender dropdown (no-reply vs contact@), template picker, CC field with employee search, rich text editor, and Preview/Send buttons. Clicking Send delivers a real email and logs it in the timeline.

### Why It Matters
This is the **highest-frequency action** in the Communication Centre. Every competitor has it. It's also the most visible improvement over the current state (where recruiters must leave Darwinbox entirely to email a candidate). The compose experience needs to feel polished because it's what recruiters will use daily.

### Which Tasks Build It

| Build Order | Task | What It Creates | Depends On |
|---|---|---|---|
| **Phase 1** | Task 3: Message Delivery Service | Backend service that calls Resend API to actually send emails | Task 1 (scaffolding + SDK install) |
| **Phase 3** | Task 9: Compose Email Modal | The full compose UI: sender dropdown, To/CC fields, template picker, rich text editor, Preview, Send, Cancel | Task 3 (delivery service) + Task 6 (timeline to show sent message) |
| **Phase 3** | Task 10: Bulk Email Compose | Extension of compose for multi-candidate selection with dedup controls and progress indicator | Task 9 (individual compose) |
| **Phase 5** | Task 15: Job Detail Page — Send Email | "Send Email" action in candidate row 3-dot menu + bulk action bar on Job Detail Page | Task 9 + Task 10 (compose modals) |
| **Phase 5** | Task 16: Candidate List Page — Send Email | "Send Email" in 3-dot menu + bulk action on Candidate List Page | Task 9 + Task 10 (compose modals) |

### What "Done" Looks Like
- Click "+ New Email" on Communications tab → compose modal slides in from right
- Select "contact@darwinbox.in" as sender → see info pop-up about two-way replies
- Pick a template → Subject and Body auto-populate with variables resolved
- Click Send → **real email arrives in the candidate's inbox** → success banner shows → new message appears in timeline with "sent" status
- From Job Detail Page: select 3 candidates → "Send Email" in bulk bar → compose opens with "Compose 3 Emails" header and dedup checkbox
- From Candidate List: click 3-dot menu → "Send Email" → compose opens for that candidate

### If It Breaks
- **Email doesn't actually arrive:** Check Task 3 — is RESEND_API_KEY set in .env? Test with `/api/test-send` route
- **Compose modal doesn't open:** Check Task 9 — is the modal triggered by the correct button/action?
- **Template doesn't populate:** Check Task 9 — does the template dropdown query EmailTemplate from the database? Do seed templates exist (Task 2)?
- **Bulk email sends duplicates:** Check Task 10 — is the "Send only one email for each unique candidate" checkbox logic working?
- **"Send Email" not visible on Job Detail Page:** Check Task 15 — is the action added to the 3-dot menu / bulk action bar?

---

## Use Case 3: Send WhatsApp or SMS to a Candidate

### The Experience
From the Candidate Detail Page 3-dot menu (or Candidate List Page 3-dot menu), the recruiter selects "Send WhatsApp" or "Send SMS." A compose modal opens with the candidate's phone number pre-filled. They type a message, click Send, and it's delivered to the candidate's actual phone via Twilio.

### Why It Matters
This is where Darwinbox **leapfrogs competitors**. Lever only supports SMS in US/Canada. Greenhouse and SAP require third-party partner extensions (Grayscale, Sense). Darwinbox's Communication Centre offers native WhatsApp + SMS without any partner dependency. This is especially critical for the India/APAC market where WhatsApp is the dominant channel (Darwinbox's core geography).

### Which Tasks Build It

| Build Order | Task | What It Creates | Depends On |
|---|---|---|---|
| **Phase 1** | Task 3: Message Delivery Service | Backend functions for sendSMS (Twilio) and sendWhatsApp (Twilio Sandbox) | Task 1 |
| **Phase 3** | Task 11: WhatsApp & SMS Modals | Compose UIs for WhatsApp and SMS with channel-specific fields, sandbox info banner for WhatsApp | Task 3 (delivery service) + Task 6 (timeline) |
| **Phase 5** | Task 16: Candidate List Page | "Send WhatsApp" and "Send SMS" options in 3-dot menu | Task 11 (modals) |

### What "Done" Looks Like
- 3-dot menu on Candidate Detail Page shows "Send WhatsApp" and "Send SMS" options
- Click "Send WhatsApp" → modal with "Send WhatsApp Message – {Name}" header → type message → Send → **message arrives on candidate's actual WhatsApp**
- Click "Send SMS" → modal with "Send SMS – {Name}" header → type message → Send → **SMS arrives on candidate's actual phone**
- Both messages appear in Communications timeline with correct channel icons
- WhatsApp modal shows sandbox info banner

### If It Breaks
- **WhatsApp message doesn't arrive:** Most likely the recipient hasn't joined the Twilio sandbox. Check if they sent "join {code}" to the sandbox number. Also verify TWILIO_ACCOUNT_SID and TWILIO_AUTH_TOKEN in .env
- **SMS doesn't arrive:** Check TWILIO_PHONE_NUMBER in .env. Twilio trial accounts can only send to verified numbers — verify the recipient's number in Twilio Console
- **Messages don't appear in timeline:** Check Task 11 — does the send function save to the database with the correct channel type ("sms" or "whatsapp")?

---

## Use Case 4: Reply to or Follow Up on a Candidate Email

### The Experience
In the Communications timeline, a recruiter sees that a candidate replied to a scheduling email. The thread shows "Savannah Nguyen (3)" indicating 3 messages in the thread. They click to expand, see the full exchange, click "Reply," and type a response. For emails without a reply, they see a "Follow Up" button that opens a compose with the previous message quoted.

### Why It Matters
Two-way communication is table stakes — Lever, Greenhouse, and SAP all support it. Without threading, the Communication Centre is just a log. Threading turns it into a conversation. The Reply/Follow-Up distinction is a UX decision that makes the recruiter's intent clear: "I'm continuing a conversation" vs "I'm nudging because I haven't heard back."

### Which Tasks Build It

| Build Order | Task | What It Creates | Depends On |
|---|---|---|---|
| **Phase 4** | Task 12: Email Threading Display | Thread grouping by thread_id, thread count in Sender column, expand-to-show-all-messages, ordering by latest reply | Task 6 (timeline) + Task 2 (seed data with threads) |
| **Phase 4** | Task 13: Reply & Follow-Up Actions | Reply button (for threads with candidate response) and Follow Up button (for unreplied contact@ emails), compose with previous messages visible, real email delivery | Task 12 (threading) + Task 3 (delivery service) |

### What "Done" Looks Like
- Timeline shows thread counts: "Atharva M (2)" for a 2-message thread
- Click thread → expands to show all messages chronologically with sender icons and timestamps
- Thread with candidate reply → "Reply" button visible → click → compose opens at bottom with previous messages expandable above → type → Send → **reply arrives in candidate's inbox** → thread count increments
- Thread without candidate reply (from contact@) → "Follow Up" button visible → click → compose opens with From frozen to contact@, previous message quoted below

### If It Breaks
- **Threads not grouping:** Check Task 12 — are messages in seed data linked via thread_id? Is the grouping logic correct?
- **Reply/Follow Up buttons not appearing:** Check Task 13 — Reply appears when thread has a message with sender_type="candidate". Follow Up appears when all messages are from sender_type="recruiter" or "system" AND from_address is contact@darwinbox.in
- **Reply email doesn't arrive:** Check Task 13 + Task 3 — is the send function called with the correct Resend parameters?

---

## Use Case 5: Schedule an Informal 1:1 Meeting

### The Experience
From the Communication Centre action dropdown, the recruiter selects "1:1 Meeting" and fills in meeting details (title, duration, channel, description). An email invite is sent to all participants, and the meeting appears in the timeline as a calendar event.

### Why It Matters
No competitor explicitly differentiates informal 1:1 meetings from formal interviews. This is a uniquely Darwinbox feature. It matters because recruiters have many touchpoints with candidates beyond formal interviews — role discussions, salary negotiations, offer clarifications, culture chats. Today these happen outside the system and are invisible.

### Which Tasks Build It

| Build Order | Task | What It Creates | Depends On |
|---|---|---|---|
| **Phase 5** | Task 14: 1:1 Meeting Scheduling | Meeting compose modal (title, participants, duration, date/time, channel, description), real email invite via Resend, timeline event with status badge | Task 3 (delivery service) + Task 6 (timeline) |

### What "Done" Looks Like
- Action dropdown in Communications tab shows "1:1 Meeting" option
- Click → meeting modal opens → fill title, pick 30 min, select Google Meet, add description → Send Invite
- **Email invite arrives in participant inboxes** with meeting details
- Timeline shows a calendar event: "Role Discussion — 30 min, Google Meet" with "Scheduled" badge
- Meeting status can be updated: Scheduled → Rescheduled → Completed

### If It Breaks
- **Meeting modal doesn't open:** Check Task 14 — is the action dropdown wired correctly?
- **Invite email doesn't arrive:** Check Task 14 + Task 3 — is sendEmail called with the meeting details as HTML body?
- **Meeting doesn't appear in timeline:** Check Task 14 — is a Communication record created with channel="meeting" and a linked Meeting record?

---

## Build Order Rationale

The 21 tasks are sequenced to deliver **demoable value as early as possible** while respecting dependencies:

```
PHASE 1 (Day 1): Foundation
├── Task 1: Scaffolding          ← Everything depends on this
├── Task 2: Data Models + Seed   ← Timeline needs data to show
├── Task 3: Delivery Service     ← Compose needs this to send real messages
├── Task 4: Layout Shell         ← Pages need a container
└── Task 5: Candidate Detail     ← Communications tab needs a page to live on

PHASE 2 (Day 2-3): Core Timeline — USE CASE 3 (HL reviews history) IS DEMOABLE
├── Task 6: Timeline             ← The core view
├── Task 7: Other Jobs           ← Cross-job visibility
└── Task 8: Email Detail         ← Click-to-read

PHASE 3 (Day 3-4): Compose & Send — USE CASES 1, 2, 6 ARE DEMOABLE
├── Task 9: Compose Email        ← Individual email with real delivery
├── Task 10: Bulk Email          ← Multi-candidate email
└── Task 11: WhatsApp & SMS      ← Multi-channel messaging

    ★ DEMO CHECKPOINT: After Phase 3, you have a working prototype
      that shows timeline + sends real emails/SMS/WhatsApp.
      This is enough for a compelling first demo.

PHASE 4 (Day 4-5): Threading — USE CASE 4 IS DEMOABLE
├── Task 12: Threading Display   ← Visual thread grouping
└── Task 13: Reply & Follow-Up   ← Two-way conversation

PHASE 5 (Day 5-6): Meetings + Page Integration — USE CASES 5, 1 (bulk) DEMOABLE
├── Task 14: Meeting Scheduling  ← 1:1 meetings
├── Task 15: Job Detail Page     ← Send from job context
└── Task 16: Candidate List Page ← Send from candidate list

PHASE 6 (Day 6-7): Polish
├── Tasks 17-21: Icons, empty states, banners, role switcher, demo cleanup
```

**Key insight:** After Phase 3 (Day 4), you have a prototype that can send real emails, SMS, and WhatsApp messages from a unified timeline. That's enough to demo the core value proposition. Phases 4-6 add depth (threading, meetings, page integration, polish) but the fundamental "wow factor" — *a recruiter sends a WhatsApp message from inside Darwinbox and it arrives on the candidate's phone* — is ready by Day 4.
