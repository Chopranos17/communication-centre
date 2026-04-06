# Darwinbox UI Component Reference — For Cursor
## Extracted from production screenshots + Sapien Design System

This file describes how existing Darwinbox components look so Cursor can match them.
Reference the screenshots in /docs/design-system/screenshots/ for visual confirmation.

---

## Typography Quick Reference

Font: **Outfit** (open-source base of Darwin Sans, Darwinbox's proprietary font)
Import: `@import url('https://fonts.googleapis.com/css2?family=Outfit:wght@300;500;700&display=swap')`

| Usage | Size | Weight | Token |
|-------|------|--------|-------|
| Page title ("Job Openings", "All Candidates") | 20px | Bold (700) | title-xs-bold |
| Section header ("Email Communication") | 16px | Bold (700) | title-xxs-bold |
| Table column header | 14px | Medium (500) | body-m-medium |
| Table body text | 14px | Book (300) | body-m-book |
| Candidate name (link) | 14px | Medium (500) | body-m-medium, blue-500 |
| Sub-text (Job IDs, timestamps) | 12px | Book (300) | body-s-book |
| Status badge text | 12px | Medium (500) | body-s-medium |
| Caption/metadata | 10px | Book (300) | caption |

---

## Table Pattern

Darwinbox tables follow a consistent pattern across all list pages:

**Structure:**
- White background card on light gray (#F6F6F6) page
- NO visible row borders — rows separated by subtle spacing or alternating hover
- Column headers: 14px medium weight, charcoal-400 (#4D4D4D) color
- Row height: ~56-64px (generous vertical padding)
- Checkbox column on far left
- 3-dot menu (vertical ellipsis) for row actions
- Star/favorite icon column
- Primary identifier (name) as blue link text
- Status badges inline in their own column
- Action button on far right (outline style, e.g., "Shortlist")
- Pagination at bottom: "1 - 10 of N Records" with numbered page nav

**Hover:** Light gray background on row hover (#F6F6F6 or #E9E9E9)
**Selected:** Light blue background (#E6F3FF) with checkbox filled

---

## Status Badges

Darwinbox uses a distinctive "bracket badge" pattern — a colored left border (pipe) with text:

```
[ Open      → Green left border (#00A251), text inside
[ Draft     → Gray left border (#797979), text inside  
[ Shortlisting → Yellow/amber left border (#FFAD0D), text inside
[ Process Ongoing → Blue left border (#0183FF), text inside
[ Pending   → Gray text, no prominent badge
```

Implementation: A span with `border-left: 3px solid {color}; padding: 2px 8px; font-size: 12px; font-weight: 500;`

---

## Stage Filter Pills (Job Detail Page)

Horizontal row of filter pills showing pipeline stages:

- **Active pill:** Blue filled (#0183FF), white text, rounded (radius-full)
- **Inactive pills:** White bg, charcoal border (#D2D2D2), charcoal text, rounded
- Each pill shows: Stage Name + Count (e.g., "Shortlisting 762")
- Clicking a pill filters the candidate table below

Example: `Total Candidates 1105 | Shortlisting 762 | Screening 88 | In Evaluation 93 | Pre-Offer 6 | Offer 13`

---

## Tab Bar

Two patterns observed:

**Pattern 1 — Page-level tabs (Candidate Detail Page):**
- Horizontal text tabs, no background
- Active tab: Black text with dark bottom border/underline
- Inactive tab: Gray text (#4D4D4D), no underline
- Font: 14px medium weight

**Pattern 2 — Sub-section pills (Application Details):**
- Horizontal pills with rounded borders
- Active pill: Blue border, blue text, light blue bg
- Inactive pill: Gray border, gray text, white bg
- Font: 12px medium

---

## Candidate Detail Page Header

- Full-width blue banner (#0183FF) at top
- Left: Circle avatar with initials (white bg, dark text, ~64px diameter)
- Name in white, bold, ~20px
- Status badge next to name (white bg, colored border)
- Below name: Job title, Job Code, Job Match Score (white text, lighter weight)
- Below banner (white bg): Phone icon + number, Email icon + address, Calendar icon + date, Source badge, Tags link
- All metadata items inline, separated by spacing, ~12-14px text

---

## Side Modal (Right Panel)

Used for Compose Email, Send WhatsApp, etc.:

- Slides in from right
- Width: ~450-500px (roughly 1/3 of screen)
- White background
- Header at top with title (bold) + close X button
- Content area with form fields
- Footer with action buttons (Send / Cancel)
- Background overlay: rgba(32, 32, 32, 0.48)
- Shadow: elevation-3

---

## Buttons

| Type | Style |
|------|-------|
| **Primary CTA** ("+ CREATE JOB") | Yellow/gold bg (#FFAD0D), dark text, bold, rounded, uppercase |
| **Primary Action** ("Send") | Blue bg (#0183FF), white text, medium weight, rounded |
| **Secondary/Outline** ("Shortlist", "Cancel") | White bg, charcoal border, charcoal text, rounded |
| **Bulk Action Bar** | Dark bg strip at bottom of page when items selected, white text buttons |
| **3-dot Menu** | Vertical ellipsis icon, opens dropdown on click |

---

## Form Inputs

- Light gray background (#F6F6F6) or white
- Charcoal border (#D2D2D2) default
- Blue border (#0183FF) on focus
- Red border (#FF2323) on error
- Label above field: 12px medium, charcoal-400
- Input text: 14px book, charcoal-500
- Placeholder: 14px book, charcoal-200
- Border radius: 4px
- Padding: 8px 12px
- Dropdowns have a small chevron icon on right

---

## Search Bar

- Rounded input (radius-full or large radius)
- Search icon (magnifying glass) on left inside the input
- Placeholder text: "Search" or "Search by Name, Email, Phone, Candidate ID"
- Light gray background or white with border

---

## Icons & Action Bar

- Filter icon (funnel) — top right of tables
- Bell notification icon with count badge (blue circle with number)
- Eye icon (visibility toggle)
- Export icon (box with arrow)
- 3-dot vertical menu per row
- Star icon (favorite/bookmark) — outline by default, filled blue when active

---

## Page Layout

- **No persistent left sidebar** on recruitment pages — full-width content area
- Top: Page title left-aligned, primary CTA button right-aligned
- Below title: Search bar + filter/view icons
- Below search: Tab/pill filter bar
- Main content: White card with data table
- Pagination: Bottom of card, left-aligned count + right-aligned page controls

---

## Spacing Rhythm

Based on screenshot analysis:
- Page padding (left/right): ~24-32px
- Card padding: ~16-24px
- Between search bar and table: ~16px
- Table row vertical padding: ~12-16px per side
- Between columns: ~16-24px
- Between page title and content: ~16-24px
