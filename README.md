# Vibe Coding the Communication Centre — Your Cursor Playbook
## Updated with actual PRD, knowledge graph, and platform context

---

## What's in This Package

This folder is your ready-to-go Cursor project. Copy the entire contents into a new folder, open it in Cursor, and start building.

```
your-project/
  .cursor/
    rules/
      project-context.mdc    ← Tells Cursor what we're building + constraints
      coding-standards.mdc   ← Code quality guardrails
      workflow.mdc            ← How Cursor should approach tasks
  docs/
    prd.md                   ← Enriched PRD with acceptance criteria (from UX PRD)
    platform-context.md      ← Darwinbox platform knowledge (from your KG skill)
    tasks.md                 ← 20 tasks in 6 phases, sequenced with dependencies
    design-system/           ← YOU ADD: Figma tokens + screenshots here
  src/                       ← Cursor creates files here
  prisma/                    ← Cursor creates DB schema here
```

---

## Step-by-Step: Getting Started

### Step 1: Set Up Cursor (one-time, 10 minutes)

1. Download Cursor from cursor.com and install
2. Create a new folder on your machine called `communication-centre`
3. Copy all files from this package into that folder
4. Open the folder in Cursor (File → Open Folder)
5. Go to **Cursor Settings:**
   - Models → Enable Claude Sonnet 4 (for coding) + Claude Opus or o3 (for planning)
   - Features → Enable "Auto-run" (lets Cursor execute terminal commands)
   - Features → Docs → Add: React docs, Tailwind CSS docs, Prisma docs, Socket.io docs
6. Optionally install **Task Master AI** as MCP server for structured task management

### Step 2: Design System — Already Included

The design system is **fully set up** in this package. No action needed from you. Here's what's included:

- **`docs/design-system/tokens.css`** — Complete CSS variables extracted from the official Sapien Design System. Includes the full Charcoal neutral scale, Blue interactive scale, semantic colors (Red/Green/Yellow), alias tokens (text-title, bg-page, border-default, etc.), elevation shadows, and spacing scale. Font is set to **Outfit** (the open-source base of Darwinbox's proprietary Darwin Sans).

- **`docs/design-system/components.md`** — Written descriptions of every UI pattern: bracket-style status badges, stage filter pills, table layout (no visible row borders, generous padding), candidate detail blue banner header, side modal dimensions, button styles, tab bars, form inputs, and spacing rhythm.

- **`docs/design-system/screenshots/`** — 8 production screenshots of the actual Darwinbox Recruitment pages (Job Openings list, Job Detail, All Candidates, Candidate Detail, 3-dot menu, Candidate Profile). Paste these into Cursor prompts when you want pixel-accurate styling.

- **`docs/design-system/sapien-typography.pdf`** and **`sapien-colours.pdf`** — The full Sapien Design System reference with every token name and hex value.

**Tip:** When a component doesn't look right, paste the relevant screenshot into Cursor and say: *"Make this match the style in this screenshot. Reference @docs/design-system/tokens.css for colors and @docs/design-system/components.md for component patterns."*

### Step 3: Set Up Vendor Accounts (15 minutes, one-time)

This prototype sends **real emails, SMS, and WhatsApp messages** for an impactful demo. You need three things:

**Email — Resend (free, 2 minutes):**
1. Go to [resend.com](https://resend.com) → Sign up
2. Go to API Keys → Create API Key → Copy it
3. You'll paste this into your `.env` file as `RESEND_API_KEY` when Cursor creates it in Task 1

**SMS — Twilio (free trial, 5 minutes):**
1. Go to [twilio.com/try-twilio](https://twilio.com/try-twilio) → Sign up → Verify your phone
2. From the Console dashboard, note your **Account SID** and **Auth Token**
3. Get a trial phone number (Twilio assigns one automatically)
4. You'll paste these into `.env` as `TWILIO_ACCOUNT_SID`, `TWILIO_AUTH_TOKEN`, `TWILIO_PHONE_NUMBER`

**WhatsApp — Twilio Sandbox (free, 3 minutes):**
1. In the Twilio Console → Messaging → Try it out → Send a WhatsApp message
2. Confirm terms and activate the sandbox
3. Note the sandbox number (usually +14155238886) and your join code
4. On your personal phone, open WhatsApp and send `join {your-code}` to that number
5. Have 2-3 colleagues do the same (anyone who'll be a "candidate" in the demo)
6. Add the sandbox number to `.env` as `TWILIO_WHATSAPP_NUMBER=whatsapp:+14155238886`

**Total cost: $0.** Resend free tier gives 3,000 emails/month. Twilio free trial gives ~$15 credits. WhatsApp sandbox has no message limits beyond the 50/day trial cap.

### Step 4: Your First Cursor Session

Open Cursor's AI chat (Cmd+L on Mac, Ctrl+L on Windows) and type:

```
Read @docs/prd.md, @docs/platform-context.md, and @docs/tasks.md.
Then look at Task 1 in the tasks file. Explain your plan for project
scaffolding before writing any code.
```

Cursor will read all three documents and propose a plan. Review it, adjust if needed, then say:

```
Go ahead and implement Task 1.
```

After it completes, verify it works by checking the browser preview. Then move to Task 2:

```
Task 1 is complete. Now read Task 2 from @docs/tasks.md and explain
your plan for data models and seed data. Reference the data model
in Section 5 of @docs/prd.md.
```

**Repeat this pattern for all 20 tasks.**

### Step 4: Daily Workflow

```
MORNING PATTERN:
  1. Open Cursor
  2. Start a NEW chat (Cmd+N) — fresh context for each task
  3. Tell Cursor which task you're on, referencing @docs/tasks.md
  4. Ask it to plan before coding
  5. Review plan → approve → let it implement
  6. Verify in browser
  7. Git commit: git add . && git commit -m "Task N: description"
  8. Move to next task

WHEN THINGS BREAK:
  - Screenshot the error/bug
  - Paste into Cursor chat with: "This is broken. Here's the error. Fix only this issue without changing anything else."
  - If the fix makes things worse → click "Restore Checkpoint" to revert
  - If still stuck → start a new chat, explain the problem from scratch

WHEN UI DOESN'T MATCH DESIGN:
  - Paste your Figma screenshot into the chat
  - Say: "The UI should look like this screenshot. Fix only the visual issues. Do not change any logic or data."
```

---

## What I Changed vs the Original UX PRD

The `docs/prd.md` file is your UX PRD restructured for AI consumption. Key changes:

1. **Added acceptance criteria** to every feature (checkboxes Cursor can verify against)
2. **Added a data model section** (Section 5) defining exact entities and fields for the mock database
3. **Added a screen inventory** (Section 6) listing every screen/modal the prototype needs
4. **Added an "Out of Scope" section** (Section 7) so Cursor doesn't over-build
5. **Condensed competitor analysis** into a quick reference table (Section 8) with "what to emulate" column
6. **Structured field specs as tables** (Field | Type | Behavior) which AI parsers handle much better than prose
7. **Added an ASCII wireframe** for the Communications tab layout so Cursor understands the spatial arrangement

No content was removed — everything from the original UX PRD is preserved, just reorganized.

---

## What the Knowledge Graph Gave Us

The `docs/platform-context.md` file was built from your `darwinbox-agent` skill. It provides:

- **Recruitment module navigation** — exact page hierarchy (Job Openings → Job Detail → Candidate Detail)
- **Pipeline stages** — the canonical candidate flow (Application → ... → Hired/Rejected)
- **Notification infrastructure** — the 6 channels, how templates work, variable substitution
- **Email template system** — what exists today for recruitment notifications
- **Interview scheduling architecture** — which the 1:1 Meeting feature reuses
- **UI patterns** — tabbed interfaces, side modals, table layouts, bulk action patterns

This means Cursor will build the prototype as a natural extension of the existing platform rather than inventing its own patterns.

---

## What the Sapien Design System Gave Us

The `docs/design-system/` folder was built from the official Sapien Design System PDFs (Typography + Colours) and 8 production screenshots of your actual Recruitment pages. It provides:

- **Exact hex codes** for every color in the system — Charcoal neutrals, Blue interactive scale, semantic Red/Green/Yellow, with all shade variants (10 through 900)
- **Typography tokens** — Darwin Sans (Outfit as open-source proxy), 3 weights (Book 300, Medium 500, Bold 700), 9 type scales from Title L (40px) down to Caption (10px)
- **Alias tokens** — semantic mappings like `text-neutral-title → charcoal-700`, `bg-page → charcoal-10`, `border-default → charcoal-200`, so Cursor uses the right color for the right purpose
- **Component patterns** — bracket-style status badges, stage filter pills, table layouts, tab bars, side modals, buttons, form inputs — all described in text that Cursor can reference
- **Production screenshots** — 8 images of the actual Job Openings, Job Detail, Candidate List, and Candidate Detail pages for visual matching

---

## Common Questions

**Q: What if Cursor uses a framework/library I don't want?**
A: Before starting, tell Cursor in the project-context rule. For example, add "Do NOT use Material UI or Ant Design. Use only Tailwind CSS utility classes."

**Q: How do I show this to my eng team?**
A: Push to a GitHub repo. They can clone it, run `npm install && npm run dev`, and see the working prototype. The code will need refactoring for production, but the interaction patterns and data model give them a massive head start.

**Q: What if I want to change a feature mid-build?**
A: Update `docs/prd.md` with the change, then tell Cursor: "I've updated the PRD. Read Section X and modify the existing implementation to match the new spec."

**Q: How long will this take?**
A: With focused 3-4 hour sessions, expect 5-7 days for all 20 tasks. Phases 1-3 (foundation + core + compose) are the most valuable — you'll have a demoable prototype after Day 4.
