# Darwinbox Platform Context — For Cursor AI

This document gives Cursor the context it needs to build the Communication Centre prototype as an extension of the existing Darwinbox HRMS platform.

---

## 1. What is Darwinbox?

Darwinbox is an enterprise HRMS (Human Resource Management System) platform. It has 25+ modules covering the full employee lifecycle. The Communication Centre sits within the **Recruitment** module (also called Talent Acquisition).

---

## 2. Recruitment Module Structure

### Navigation Hierarchy
```
Darwinbox
  └── Recruitment
        ├── Job Openings (list of all open jobs)
        │     └── Job Detail Page (candidates per job, pipeline stages)
        ├── Candidates (master list of all candidates)
        │     └── Candidate Detail Page ← THIS IS WHERE COMM CENTRE LIVES
        │           ├── Status tab
        │           ├── Application Details tab
        │           ├── Offer Details tab
        │           ├── Activity Log tab
        │           ├── Communications tab ← NEW (our feature)
        │           └── Other Apps tab
        ├── Requisitions (approval requests for new hires)
        └── Settings (admin configuration)
```

### Candidate Pipeline Stages
Candidates move through these stages in order:
```
Application → Shortlisting → Screening → Assessment → Interview → Pre-Offer → Offer → Hired
                                                                                         ↓
                                                                              (or Rejected at any stage)
```

### Key Personas in Recruitment
| Persona | What They Do |
|---------|-------------|
| **Recruiter** | Manages postings, pipelines, candidate communication, interview scheduling |
| **Hiring Lead (HL)** | Owns the overall hiring plan; approves requisitions and offers |
| **Hiring Manager** | Raises requisitions; reviews shortlisted candidates; provides interview feedback |
| **Candidate** | External user — applies, attends interviews, receives and responds to offers |
| **Interviewer** | Participates in interview panel; submits feedback form |

---

## 3. Existing Notification Infrastructure

Darwinbox has a centralized **Notification Centre** (horizontal service layer) that delivers messages across 6 channels:

| Channel | Support | Requirements |
|---------|---------|-------------|
| **Email** | Full — always available | Default channel |
| **Mobile Push** | Supported | Darwinbox mobile app installed |
| **Bell (In-App)** | Supported | User logged into web/mobile |
| **SMS** | Supported | Enabled at tenant level; DLT-registered for India |
| **Microsoft Teams** | Supported | Teams integration enabled |
| **WhatsApp** | Supported | WhatsApp Business API enabled at tenant level |

### How Notifications Work
Notifications are event-driven:
1. A module event occurs (e.g., interview scheduled, offer generated)
2. System looks up the corresponding notification template
3. Checks if template is enabled + resolves recipient list
4. Applies variable substitution ({{candidateName}}, {{jobTitle}}, etc.)
5. Dispatches across all enabled channels

### Recruitment-Specific Notification Templates
| Stage | Notification | Recipients |
|-------|-------------|-----------|
| Application | Application Received | Candidate |
| Shortlisting | Shortlisted / Rejected | Candidate |
| Assessment | Assessment Invite | Candidate |
| Interview | Interview Scheduled | Candidate + Interviewer |
| Interview | Feedback Request | Interviewer |
| Offer | Offer Letter Ready | Approver |
| Offer | Offer Sent | Candidate |
| Offer | Offer Accepted/Rejected | Internal Teams / Candidate |
| Pre-Offer | Document Collection Request | Candidate |

### Email Template Variables Available
Templates support these variables: `{{candidateName}}`, `{{interviewDate}}`, `{{offerAmount}}`, `{{jobTitle}}`, `{{recruiterName}}`, `{{companyName}}`, `{{interviewLink}}`, `{{candidateEmail}}`

### Sender Addresses
- `no-reply@darwinbox.in` — One-way only, candidate cannot reply
- `contact@darwinbox.in` — Two-way, candidate replies are captured

---

## 4. Existing Recruitment Email Templates

Templates are configured at: Settings > Talent > Talent Acquisition > Recruitment Email Templates

Operations: Create, Edit, Preview (with sample variables), Delete, Clone

The Communication Centre should reference these existing templates in its compose modal template dropdown.

---

## 5. Interview Scheduling Architecture

The existing interview scheduling system handles:
- Candidate + interviewer availability checks
- Meeting link generation (Google Meet, MS Teams, Zoom)
- Calendar sync (Google, Outlook)
- Cross-timezone time conversion
- Email notifications to all participants

**The 1:1 Meeting feature reuses this same architecture** — it just doesn't require evaluation forms or scoring.

---

## 6. UI Patterns in Darwinbox (For Design Consistency)

### Layout Patterns
- **Candidate Detail Page** uses a tabbed interface (Status, Application Details, Offer Details, Activity Log, Communications, Other Apps)
- **Side modals** (right-side panels) are used for compose/edit actions across the platform
- **Tables** use columnar layout with Sender | Message | Time columns
- **Filters** appear as dropdowns or toggle buttons above table content
- **Bulk actions** appear in a toolbar when multiple items are selected (checkbox pattern)

### Color/Status Patterns (for prototype)
- Primary action: Blue buttons
- Success: Green banners
- Error/Warning: Red/Orange banners
- Status badges: Colored pills (e.g., "Process Ongoing" = blue, "Activated" = green, "Pending" = orange)
- Channel indicators: Email icon, SMS icon, WhatsApp icon, Calendar icon

### Common Components
- Employee search (elastic search with type-ahead)
- Rich text editor (for email body)
- Date-time picker with timezone awareness
- Dropdown selects (single and multi)
- Expandable/collapsible sections with ^ toggle
- "Show more" progressive loading pattern
