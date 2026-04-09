# SDS Components

All UI component specifications for the Sapien Design System. Always apply SDS tokens (colors, radius, shadows, typography) from `tokens/TOKENS.md`.

---

## Button

```tsx
// Sizes
// sm: h-6 px-2 text-body-s
// md: h-9 px-3 text-body-m  ← default

// Base (always apply):
// rounded-sds-4 font-darwin font-medium transition-colors duration-150
// focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1
// disabled:cursor-not-allowed disabled:pointer-events-none disabled:opacity-50

// Variants:
// primary:     bg-[#131313] text-white hover:bg-[#292929] active:bg-black
// secondary:   bg-white border border-[#e0e0e0] text-[#131313] hover:bg-[#f5f5f5]
// theme:       bg-white border border-[#0183FF] text-[#0183FF] hover:bg-[#E6F3FF]
// tertiary:    bg-transparent text-[#4d4d4d] hover:bg-[#f5f5f5]
// link:        bg-transparent text-[#0183FF] hover:underline p-0
// subtle-link: bg-transparent text-[#4d4d4d] hover:underline p-0
```

---

## Input / Form Field

```tsx
// Input element:
// border border-[#e0e0e0] rounded-sds-4 px-2 py-1.5
// text-body-m font-darwin font-book placeholder-[#aaaaaa]
// hover:border-[#0183FF] focus:border-[#0183FF] focus:outline-none
// disabled:bg-[#f5f5f5] disabled:text-[#aaaaaa] disabled:cursor-not-allowed
// aria-invalid → border-red-500 in all states

// Surrounding field structure:
// Label:     text-body-s font-medium text-[#131313]
// Required:  <span className="text-red-500 ml-0.5">*</span>
// Help text: text-body-s text-[#4d4d4d] mt-0.5
// Error:     text-body-s text-red-500 mt-0.5
```

---

## Textarea

```tsx
// Shares all Input / Form Field styles. Additional:
// min-h-[80px] resize-y  (vertical resize only)
// py-2 (instead of py-1.5 for single-line input)
// All states identical to Input: hover, focus, disabled, error
```

---

## Card

```tsx
// Sizes
// sm: max-w-[170px] rounded-sds-8
// md: max-w-[374px] rounded-sds-12
// lg: rounded-sds-16

// States
// default:   bg-white border border-[#e0e0e0]
// selected:  bg-white border-2 border-[#0183FF]
// disabled:  bg-[#f5f5f5] border-[#e0e0e0] opacity-50 pointer-events-none
// hoverable: transition-shadow duration-200 hover:shadow-sds-2 cursor-pointer

// Sections
// Card.Header: min-h-[76px] px-6 py-[7px] border-b border-[#e0e0e0] flex items-center
// Card.Body:   p-6 flex flex-col gap-1
// Card.Footer: min-h-[72px] px-6 py-2 border-t border-[#e0e0e0] flex items-center justify-end gap-2
// Card.Title:    text-title-xs font-medium text-[#131313]
// Card.Subtitle: text-body-s font-book text-[#4d4d4d]
```

---

## Modal

```tsx
// Backdrop:  fixed inset-0 z-50 bg-black/40 flex items-center justify-center p-4
// Container: bg-white rounded-sds-8 shadow-sds-2 w-full flex flex-col
//   sm: max-w-[400px]   md: max-w-[816px]
// Header: flex items-center justify-between px-6 py-3 border-b border-[#e0e0e0]
//   Title:     text-title-xs font-medium text-[#131313]
//   Close btn: w-7 h-7 rounded-sds-4 hover:bg-[#f5f5f5] flex items-center justify-center
// Body:   px-6 py-4 text-body-m font-book text-[#4d4d4d] flex-1 overflow-y-auto
// Footer: flex justify-end gap-2 px-6 py-3 border-t border-[#e0e0e0]
```

---

## Tabs

```tsx
// Sizes
// M (default): h-12 (48px) — prominent designs, top-level navigation
// S (compact): h-8  (32px) — dense layouts, secondary navigation

// Horizontal Tab (default)
// Container:  flex border-b border-[#e0e0e0]
// Tab item:   flex items-center gap-1 px-2 text-left
//   Gap between icon/label/badge: gap-1 (4px) to gap-2 (8px)
//   Min spacing between tab items: 16px
// Active:   border-b-2 border-[#0183FF] -mb-px text-[#0183FF] font-medium
// Inactive: border-b-2 border-transparent text-[#4d4d4d] hover:bg-[#f5f5f5] hover:text-[#131313]
// Disabled: opacity-40 cursor-not-allowed pointer-events-none
// Focus:    ring-2 ring-[#0183FF] ring-offset-1 rounded-sds-24

// Vertical Tab
// Active:   border-l-2 border-[#0183FF] bg-[#E6F3FF] text-[#0183FF] font-medium pl-2
// Inactive: border-l-2 border-transparent text-[#4d4d4d] hover:bg-[#f5f5f5] hover:text-[#131313] pl-2
// Disabled: opacity-40 cursor-not-allowed pointer-events-none
// Nested vertical: 2 levels max; child tabs indented pl-4

// Optional Elements
// Leading icon:   w-4 h-4 (16px) before label, gap-1
// Trailing badge: bg-[#E6F3FF] text-[#0183FF] rounded-sds-24 px-1.5 text-body-s font-medium

// Typography
// M active:   text-body-m font-bold
// M inactive: text-body-m font-book
// S active:   text-body-s font-bold
// S inactive: text-body-s font-book

// Content Guidelines
// ✅ Title Case ("Leave Balance", "My Tasks")
// ✅ 1–2 words, nouns preferred
// ❌ No sentence case, no ALL CAPS, no prepositions
// ❌ Don't repeat the page title in a tab label

// Overflow: tabs exceeding container width collapse into "More" (secondary button + chevron + dropdown)
// Responsive: horizontal tabs switch to vertical on sm breakpoint
```

---

## Pill / Badge

```tsx
// Selection pill (toggleable):
// Base: inline-flex items-center rounded-sds-24 border font-darwin font-book
// m: h-8 py-1 pl-2 pr-3 gap-1 text-body-m
// l: h-10 py-2 pl-3 pr-4 gap-1.5 text-body-l
// Selected:   border-[#0183FF] bg-[#E6F3FF] text-[#0183FF] hover:border-[#0169CC]
// Unselected: border-[#e0e0e0] bg-white text-[#4d4d4d] hover:border-[#0183FF]

// Input pill (dismissable):
// inline-flex items-center rounded-sds-24 border border-[#e0e0e0] bg-white text-[#131313]
// Dismiss btn: ml-0.5 w-4 h-4 rounded-full text-[#4d4d4d] hover:text-[#131313] hover:bg-[#f5f5f5]
```

---

## Toast

```tsx
// Wrapper: fixed top-16 left-1/2 -translate-x-1/2 z-[9999] flex flex-col gap-2
// Each:    min-w-[240px] max-w-[480px] px-4 py-2 rounded-sds-8 shadow-sds-1
//          flex items-center gap-1 animate-fadeSlideIn
// neutral: bg-[#131313] text-white
// success: bg-[#1a7f4b] text-white
// error:   bg-[#d32f2f] text-white
// Auto-dismiss: 4000ms default  (0 = persistent)
```

---

## Select / Dropdown

```tsx
// Trigger: h-8 px-2 py-1.5 rounded-sds-4 border border-[#e0e0e0]
//   hover:border-[#0183FF]  focus:border-[#0183FF]  error:border-red-500
//   Chevron icon rotates 180° when open
// Dropdown panel: absolute z-50 w-full max-h-[280px] overflow-y-auto
//   bg-white border border-[#e0e0e0] rounded-sds-4 shadow-sds-2 py-2
// Option: px-3 py-2 text-body-m font-book transition-colors duration-100
//   selected: bg-[#E6F3FF] text-[#0183FF]
//   hover:    bg-[#F5FAFF]
```

---

## Context Menu

```tsx
// Container: w-60 border border-[#e0e0e0] rounded-sds-4 shadow-sds-2 bg-white px-1 py-1.5 z-[1000]
// Item: h-8 px-2 rounded-sds-4 flex items-center gap-4 text-body-m font-book text-[#131313]
//   hover:       bg-[#f5f5f5]
//   disabled:    cursor-not-allowed opacity-50 text-[#aaaaaa]
//   destructive: text-red-600
//   icon:        w-4 h-4 text-[#4d4d4d]
```

---

## Accordion

```tsx
// standalone: each item rounded-sds-4 border border-[#e0e0e0], gap-2 between items
// group:      outer border rounded-sds-4, items share container with border-b separators
// Header: px-4 py-3 flex items-center gap-2.5 text-body-m font-book transition-colors duration-150
//   open (blue): bg-[#E6F3FF] text-[#0183FF] hover:bg-[#d9edff]
//   open (grey): bg-[#f5f5f5] text-[#131313]
//   closed:      bg-white hover:bg-[#f5f5f5]
// Content: px-4 py-3 border-t border-[#e0e0e0] text-body-m font-book
```

---

## Checkbox

```tsx
// Box: w-4 h-4 (16x16) rounded-sds-2 border transition-colors duration-150
// Gap between box and label: gap-2
// Label: text-body-m font-book text-[#131313]
// Sub-label / description: text-body-s font-book text-[#4d4d4d]

// States:
// unselected:        border border-[#e0e0e0] bg-white
// unselected hover:  border border-[#0183FF] bg-white
// selected:          bg-[#0183FF] border-[#0183FF]  → white checkmark inside
// selected hover:    bg-[#0169CC] border-[#0169CC]
// indeterminate:     bg-[#0183FF] border-[#0183FF]  → white dash inside
// focus:             ring-2 ring-[#0183FF] ring-offset-1
// disabled:          border-[#e0e0e0] bg-[#f5f5f5] opacity-50 cursor-not-allowed
// disabled+selected: bg-[#aaaaaa] border-[#aaaaaa] cursor-not-allowed
// error:             border-red-500 (unselected); bg-red-500 border-red-500 (selected)

// Stacking — vertical group (default): flex flex-col gap-2
// Stacking — horizontal group:         flex flex-wrap gap-x-4 gap-y-2
// Error message below group: text-body-s text-red-500 mt-1
// Group label: text-body-s font-medium text-[#131313] mb-2
// Wrapping: long labels wrap naturally; box stays top-aligned → items-start
```

---

## Toggle / Switch

```tsx
// Track sizes:
//   large: w-10 h-5 (sds-20 height) rounded-sds-24
//   small: w-6  h-3 (sds-12 height) rounded-sds-24
// Thumb: rounded-full bg-white shadow-sds-1
//   large thumb: w-4 h-4  |  small thumb: w-2.5 h-2.5
// Thumb translate:
//   off: translate-x-0.5  |  on: translate-x-[calc(100%+2px)]

// States:
//   default off:  bg-[#e0e0e0]
//   default on:   bg-[#0183FF]
//   hover off:    bg-[#aaaaaa]
//   hover on:     bg-[#0169CC]
//   pressed off:  bg-[#aaaaaa] scale-95
//   pressed on:   bg-[#014F99] scale-95
//   disabled:     opacity-50 cursor-not-allowed pointer-events-none
//   focus:        ring-2 ring-[#0183FF] ring-offset-1

// Label positions:
//   right (default): flex flex-row items-center gap-1
//   left:            flex flex-row-reverse items-center gap-1
// Label: text-body-m font-book text-[#131313]
// Sub-label: text-body-s font-book text-[#4d4d4d]

// Content guidelines:
// ✅ Statement labels, not questions ("Email notifications" not "Send emails?")
// ✅ No punctuation, no articles, positive phrasing
// ✅ Use for settings that take effect immediately
// ❌ Don't use for actions requiring save/submit
```

---

## Avatar

```tsx
// Sizes:
// XS:  w-4  h-4   (16px) — icon only
// S:   w-6  h-6   (24px) — icon only
// M:   w-8  h-8   (32px) — initials (1 char) or image
// L:   w-10 h-10  (40px) — initials (2 chars) or image  ← default
// XL:  w-12 h-12  (48px)
// 2XL: w-14 h-14  (56px)
// 3XL: w-16 h-16  (64px)
// 4XL: w-20 h-20  (80px)
// 5XL: w-24 h-24  (96px)
// All: rounded-full overflow-hidden flex items-center justify-center

// Content Variants:
// Image:    <img className="w-full h-full object-cover rounded-full" />
// Initials: bg-[#E6F3FF] text-[#0183FF] font-medium font-darwin
//   M → 1 char text-body-s  |  L/XL → 2 chars text-body-m  |  2XL+ → text-body-l
// Icon:     w-1/2 h-1/2 text-[#4d4d4d]

// Status Dot:
// absolute bottom-0 right-0 translate-x-0.5 translate-y-0.5
// w-2.5 h-2.5 rounded-full ring-2 ring-white
// Active: bg-[#1a7f4b]  |  Away: bg-[#f59e0b]  |  Absent: bg-[#d32f2f]

// AvatarGroup: flex flex-row-reverse; each avatar after first: -ml-2 ring-2 ring-white
// Overflow count: bg-[#f5f5f5] text-[#4d4d4d] font-medium rounded-full

// Interaction States:
// hover:  ring-2 ring-[#0183FF] ring-offset-1 cursor-pointer
// active: ring-2 ring-[#0183FF] ring-offset-2
// focus:  ring-2 ring-[#0183FF] ring-offset-1
```

---

## Status Tag

```tsx
// Anatomy: inline-flex items-center gap-1 rounded-sds-4
// Sizes:
//   Standard: h-5 (20px) px-1.5 text-body-s font-medium
//   S:        h-4 (16px) px-1   text-body-s font-medium

// Color Variants:
// neutral:  bg-[#f5f5f5]  text-[#4d4d4d]   dot: bg-[#4d4d4d]
// blue:     bg-[#E6F3FF]  text-[#0183FF]   dot: bg-[#0183FF]
// green:    bg-[#e6f4ee]  text-[#1a7f4b]   dot: bg-[#1a7f4b]
// amber:    bg-[#fef9e6]  text-[#b45309]   dot: bg-[#b45309]
// red:      bg-[#fde8e8]  text-[#d32f2f]   dot: bg-[#d32f2f]
// purple:   bg-[#f3e8ff]  text-[#7c3aed]   dot: bg-[#7c3aed]
// teal:     bg-[#e6f7f7]  text-[#0e7490]   dot: bg-[#0e7490]
// pink:     bg-[#fce8f3]  text-[#be185d]   dot: bg-[#be185d]

// Status Dot: w-1.5 h-1.5 rounded-full — optional, appears before label

// Semantic usage:
// green  → Completed/Approved/Done
// amber  → Pending/In Progress/Processing
// red    → Rejected/Failed/Overdue
// neutral→ Draft/Inactive/Archived
// blue   → New/Updated/Synced
// purple/teal → Intermediate (Under Review, Shortlisted)

// ⚠️ Status Tag (rounded-sds-4) ≠ Pill/Badge (rounded-sds-24)
// Status Tags: system-assigned, read-only. Pills: user-selectable filters.

// Content Guidelines:
// ✅ Title Case, 1–2 words
// ❌ No sentence case, no ALL CAPS, no vague labels like "N/A"
```

---

## Loading Dots

```tsx
// 5 dots in a row, wave animation
// Each dot: w-1.5 h-1.5 rounded-full bg-[#0183FF]
// Container: flex items-center gap-1
// Animation: translateY(0) → translateY(-5px) → translateY(0)
//   duration: 1.2s ease-in-out infinite
//   stagger delays: [0s, 0.12s, 0.24s, 0.36s, 0.48s]

// CSS:
// @keyframes sds-dot-wave {
//   0%, 60%, 100% { transform: translateY(0); }
//   30% { transform: translateY(-5px); }
// }
// .sds-dot { animation: sds-dot-wave 1.2s ease-in-out infinite; }
// .sds-dot:nth-child(1) { animation-delay: 0s; }
// .sds-dot:nth-child(2) { animation-delay: 0.12s; }
// .sds-dot:nth-child(3) { animation-delay: 0.24s; }
// .sds-dot:nth-child(4) { animation-delay: 0.36s; }
// .sds-dot:nth-child(5) { animation-delay: 0.48s; }
```

---

## Data Table

```tsx
// Row Heights (density):
// Double Line Primary (name + sub-label in first col):
//   Compact: h-10 (40px)  |  Comfort: h-13 (52px) ← default  |  Relaxed: h-16 (64px)
// Single Line Primary:
//   Compact: h-8  (32px)  |  Comfort: h-10 (40px)             |  Relaxed: h-13 (52px)

// Row Anatomy (left → right):
// 1. Checkbox          — w-4 h-4, pl-3
// 2. Expand chevron    — w-4 h-4 text-[#4d4d4d], rotates 90° when expanded
// 3. Bookmark/star     — optional, w-4 h-4 text-[#aaaaaa], filled gold when active
// 4. Primary text col  — text-body-m font-medium text-[#0183FF] (linked) truncate
//    Sub-label below   — text-body-s font-book text-[#4d4d4d] truncate
// 5. Data columns      — text-body-m font-book text-[#131313]
// 6. Row-level actions — rightmost, appears on hover; secondary/tertiary buttons
// 7. Overflow menu ⋮   — context menu trigger, always visible in actions col

// Header Row:
// bg-white border-b border-[#e0e0e0] sticky top-0 z-10
// Header cell: text-body-s font-medium text-[#4d4d4d] uppercase tracking-wide px-3 py-2
// Sortable header: flex items-center gap-1 cursor-pointer hover:text-[#131313]

// Row States:
// default:   bg-white border-b border-[#e0e0e0]
// hover:     bg-[#F5FAFF] — action buttons become visible
// selected:  bg-[#E6F3FF] border-l-2 border-l-[#0183FF]
// expanded:  bg-[#F5FAFF]
// disabled:  opacity-50 pointer-events-none

// Column Types:
// Text:       truncate, title tooltip on overflow
// Linked:     text-[#0183FF] hover:underline
// Number:     text-right tabular-nums font-book
// Date:       text-body-m font-book text-[#131313] (DD/MM/YYYY)
// Status Tag: StatusTag component inline
// Avatar+name: Avatar (S) + text-body-m font-medium gap-2

// Table Toolbar:
// flex items-center justify-between px-3 py-2 border-b border-[#e0e0e0]
// Left:  search (w-56) + active filter pills
// Right: filter icon + column visibility + expand/collapse all + export
// Search highlights: bg-[#fef9e6] text-[#131313]

// Bulk Selection:
// Header checkbox: indeterminate when partial rows selected
// Bulk actions bar: bg-[#E6F3FF] px-3 py-2 flex items-center gap-2

// Pagination:
// flex items-center justify-between px-3 py-2 border-t border-[#e0e0e0]
// Left: "1–10 of 103 records" — text-body-s text-[#4d4d4d]
// Center: page numbers, active: bg-[#0183FF] text-white rounded-sds-4
// Right: per-page select
// Hide pagination when ≤ 10 records total

// Empty State: centered illustration + text-body-m text-[#4d4d4d]
// Group header row: bg-[#f5f5f5] text-body-s font-medium text-[#4d4d4d] px-3 py-1.5

// Editable Variants:
// 1. Editable rows (1 at a time): edit icon on hover → inline inputs → Save/Cancel in actions col
// 2. Full table edit mode: "Edit Table" button → all cells editable → bg-[#FFFDF0] tint
// 3. Some editable fields upfront: specific cols always render Input/Select/Toggle

// Mobile: each row becomes a Card; tap → Row Details slide-in drawer

// Max Column Widths:
// Primary/linked: max-w-[280px]  |  Data cols: max-w-[160px]
// Narrow (numbers): max-w-[80px] |  Actions: min-w-[120px]
```

---

## Alert

Alerts communicate important messages to users — errors, warnings, information and success states. They are persistent inline banners (not toasts) and remain visible until dismissed or the condition is resolved.

### Variants

| Variant         | Icon color      | Background      | Border          | Title / Body color |
|-----------------|-----------------|-----------------|-----------------|-------------------|
| **Error**       | `text-red-600`  | `bg-red-50`     | `border-red-200`| `text-[#131313]`  |
| **Warning**     | `text-[#b45309]`| `bg-[#fef9e6]`  | `border-[#f59e0b]/40` | `text-[#131313]` |
| **Information** | `text-[#0183FF]`| `bg-[#E6F3FF]`  | `border-[#CCE6FF]` | `text-[#131313]`|
| **Success**     | `text-[#1a7f4b]`| `bg-[#e6f4ee]`  | `border-[#bbdecb]` | `text-[#131313]`|
| **Neutral**     | `text-[#4d4d4d]`| `bg-[#f5f5f5]`  | `border-[#e0e0e0]` | `text-[#131313]`|

### Anatomy

```
┌─────────────────────────────────────────────────────┐
│ [Icon]  Title text                        [Counter] [×]│
│         Body description text (optional)              │
│         • Bullet item (optional list)                 │
│         Show More ↓ (if overflow)                     │
│                              [Link Button] [Button]   │
└─────────────────────────────────────────────────────┘
```

| Element                   | Description                                                                      |
|---------------------------|----------------------------------------------------------------------------------|
| **Container**             | Full-width inline banner; clips to the content area it sits within               |
| **Icon**                  | 16px status icon (error-circle, warning-triangle, info-circle, check-circle)     |
| **Title**                 | `text-body-m font-medium text-[#131313]` — concise, action-oriented phrase       |
| **Body** *(optional)*     | `text-body-m font-book text-[#131313]` — supporting detail below the title       |
| **Actions** *(optional)*  | 1–2 buttons, right-aligned in the footer row; use `secondary` or `primary sm`   |
| **Dismiss button** *(optional)* | `×` close icon button top-right; `w-5 h-5 rounded-sds-4 hover:bg-black/10` |
| **Counter** *(optional)*  | Pagination indicator e.g. `< 1/3 >` for cycling through multiple alerts         |
| **Overflow link** *(optional)* | "Show More" / "Show Less" `link` button to expand/collapse a long list      |

### Specs

```tsx
// Container:
// w-full rounded-sds-4 border px-4 py-3 flex flex-col gap-2
// (apply variant-specific bg and border from table above)

// Header row (always present):
// flex items-start justify-between gap-2

// Icon + title group:
// flex items-start gap-2
// Icon: w-4 h-4 mt-0.5 flex-shrink-0  (variant color from table)
// Title: text-body-m font-medium text-[#131313]

// Body text (optional):
// text-body-m font-book text-[#131313] ml-6  (indented to align with title)

// Bullet list (optional, inside body):
// list-disc list-inside text-body-m font-book text-[#131313] ml-6 space-y-0.5

// "Show More" / "Show Less" overflow link:
// ml-6 text-body-s font-medium text-[#0183FF] hover:underline cursor-pointer

// Dismiss button (top-right):
// w-5 h-5 flex items-center justify-center rounded-sds-4
// text-[#4d4d4d] hover:bg-black/10 flex-shrink-0

// Counter (e.g. "< 1/3 >"):
// flex items-center gap-1 text-body-s font-book text-[#4d4d4d]
// chevron buttons: w-4 h-4 text-[#4d4d4d] hover:text-[#131313]

// Actions row (optional, bottom of alert):
// flex items-center justify-end gap-2 mt-1
```

### Modifiers / Configurations

Alerts can be composed from these optional parts — combine as needed:

| Modifier               | Notes                                                                    |
|------------------------|--------------------------------------------------------------------------|
| Body only              | Title + body paragraph, no buttons                                       |
| Actions only           | Title + 1–2 action buttons, no body                                      |
| Body + Actions         | Full alert with title, body, and buttons                                 |
| Dismiss button         | Adds `×` close button; alert is user-dismissible                         |
| Overflow link          | "Show More" expands a collapsed list of items; "Show Less" collapses it  |
| Count                  | Pagination `< 1/3 >` when multiple alerts are queued in the same slot    |
| Bullet list body       | Body rendered as a `<ul>` list instead of a paragraph                    |

### Behaviour — Placement & Stacking

- **Placement:** Alerts appear inline within the page or form they relate to — not fixed/floating. Place them above the affected content (e.g. above a form, above a table).
- **Stacking:** When multiple alerts appear together, stack them vertically with `gap-2` between each. Limit to 3 visible at once — use the counter modifier if more exist.
- **Persistence:** Alerts do not auto-dismiss. They stay until the user resolves the condition or manually closes them (if dismiss button is shown).
- **Width:** Full width of their parent container. Do not use a fixed max-width.

### Writing Guidelines

```
Title:  Use noun-based labels ("Leave Policy Violation Error", "Information Message")
        Keep to one line — max ~60 characters
        ✅ "6 Errors need fixing to proceed"
        ❌ "There was an error and you need to fix some things before you can proceed"

Body:   One concise sentence explaining what happened and what the user can do
        ✅ "Please check your credentials and try again."
        ❌ "The application was unable to connect to the database server, often due to..."

Lists:  Use bullet lists when there are 2+ discrete items to communicate
        Always use "Show More" when the list exceeds 3 items

Buttons: Use action-oriented labels — "Retry", "View Details", "Dismiss"
         Avoid generic "OK" or "Close" on action buttons
```

### Do's and Don'ts

| ✅ Do                                                      | ❌ Don't                                              |
|------------------------------------------------------------|-------------------------------------------------------|
| Use the standard title for inline error banners            | Write vague or generic titles like "Error"            |
| Use noun-based titles for informative banners              | Repeat the page title in the alert title              |
| Keep body text concise — one actionable sentence           | Attach technical details in the link button           |
| Use bullet lists for multiple discrete errors              | Write alerts in first person ("I found 3 errors")     |
| Use "Show More" when list > 3 items                        | Stack more than 3 alerts without using counter        |
| Place alert above the form or content it relates to        | Use alerts as floating toasts (use Toast for that)    |

---

## Stepper (Progress Indicator)

The Stepper communicates progress through a multi-step flow. It shows where the user is, what is complete, and what remains. It is always read-only — users cannot click steps to navigate unless the flow explicitly allows it.

### Step States

| State        | Node style                                       | Line style              |
|--------------|--------------------------------------------------|-------------------------|
| **Complete** | `bg-[#0183FF]` filled circle + white check icon  | `bg-[#0183FF]` (solid)  |
| **Active**   | `bg-[#0183FF]` filled circle + white step number | `bg-[#e0e0e0]` (dashed or solid) |
| **Pending**  | `bg-white border border-[#e0e0e0]` circle + grey number | `bg-[#e0e0e0]`   |
| **Error**    | `bg-red-500` filled circle + white `!` icon      | `bg-[#e0e0e0]`          |
| **Skipped**  | `bg-white border border-[#e0e0e0]` circle + slash icon (muted) | `bg-[#e0e0e0]` |

### Anatomy

```
Horizontal:
  ●────────●────────○────────○
  Title    Title    Title    Title
  Desc.    Desc.    Desc.    Desc.

Vertical:
  ● Title
  │ Description (optional)
  │
  ● Title
  │ Description
  │
  ○ Title
```

| Element              | Description                                                            |
|----------------------|------------------------------------------------------------------------|
| **Step node**        | Circular indicator — 24px diameter, `rounded-full`                     |
| **Connector line**   | 1px horizontal (or vertical) line between step nodes                   |
| **Step title**       | Required — short label above/beside the node                           |
| **Step description** | Optional — secondary line below the title                              |
| **Step number**      | Shown inside node for `pending` steps; replaced by icon on other states|

### Specs

```tsx
// ─── Step Node ──────────────────────────────────────────────────
// All nodes: w-6 h-6 rounded-full flex items-center justify-center flex-shrink-0
// complete:  bg-[#0183FF]           → white check icon w-3 h-3
// active:    bg-[#0183FF]           → white step number text-body-s font-bold
// pending:   bg-white border border-[#e0e0e0] → grey step number text-body-s text-[#aaaaaa]
// error:     bg-red-500             → white exclamation icon w-3 h-3
// skipped:   bg-white border border-[#e0e0e0] → slash icon text-[#aaaaaa]

// ─── Connector Line ─────────────────────────────────────────────
// Horizontal: h-px flex-1 mx-1
//   complete segment: bg-[#0183FF]
//   incomplete segment: bg-[#e0e0e0]
// Vertical:   w-px flex-grow my-1 ml-3
//   complete segment: bg-[#0183FF]
//   incomplete segment: bg-[#e0e0e0]

// ─── Step Title ─────────────────────────────────────────────────
// text-body-s font-medium
// complete:  text-[#131313]
// active:    text-[#0183FF] font-bold
// pending:   text-[#4d4d4d]
// error:     text-red-600

// ─── Step Description (optional) ────────────────────────────────
// text-body-s font-book text-[#4d4d4d]
// error state: text-red-500

// ─── Gap & Spacing ──────────────────────────────────────────────
// Between node and label (horizontal, label below): gap-y-1 (4px)
// Between node and label (vertical, label right):   gap-x-2 (8px)
// Between steps (horizontal): flex-1 with connector line stretching between
// Between steps (vertical):   gap-y-2 between each step item
```

### Directions

#### Horizontal Stepper
```tsx
// Container: flex items-start w-full
// Each step:  flex flex-col items-center  (node on top, label below)
// Connector:  h-px flex-1 mt-3 mx-1      (vertically centred with node)
// Steps flex: flex items-start w-full
// No text wrapping on labels — truncate if needed
// Max recommended steps: 7 (beyond that, consider vertical or collapsing)
```

#### Vertical Stepper
```tsx
// Container: flex flex-col
// Each step:  flex items-start gap-x-2
// Connector:  w-px flex-grow ml-3 my-1   (left-aligned under node)
// Label:      flex flex-col (title + description stacked)
// Text wrapping allowed on labels in vertical mode
```

### Modifiers / Configurations

| Modifier            | Notes                                                                     |
|---------------------|---------------------------------------------------------------------------|
| **With description**| Each step has an optional 2nd line of description text below the title    |
| **Without description** | Title only — more compact; suits 5+ step horizontal flows             |
| **Numbered steps**  | Pending/active steps show step number inside node                         |
| **Icon steps**      | Completed steps always show a check; error steps show `!`                 |
| **Clickable steps** | Completed steps may be clickable to allow backward navigation (flow-dependent) |
| **Error on step**   | Step node turns red + `!`; description shows the error message            |

### Step Completion Behaviour

- A step only becomes `complete` when the user confirms and moves forward — not on field change
- The active step stays `active` (not `error`) while it has validation issues — error state is for server-confirmed failures
- Allow the user to move to the next step even if the current step has minor warnings, if the flow accepts it
- Do not block navigation unless errors are critical and must be fixed immediately

### Content Guidelines

| Element     | Style                 | Character limit     | Notes                                  |
|-------------|-----------------------|---------------------|----------------------------------------|
| Title       | Title Case (NP style) | 30 chars / ~3 words | Propositions always lowercase          |
| Description | Sentence case         | 40 chars            | Optional — only add if it aids clarity |

```
✅ "Basic Details"
✅ "Workflow and Approval Settings"
✅ "Review and Preview"
❌ "Add Basic Details for the Journey"  (too long, verb-led)
❌ "BASIC DETAILS"                       (ALL CAPS)
❌ "basic details"                       (all lowercase)
```

### Placement

- **Horizontal stepper:** Appears at the top of a full-page multi-step form or wizard. Stays fixed/sticky so users can always see their progress as they scroll the step content below.
- **Vertical stepper:** Appears as a left-side progress rail within a panel or sidebar, or as a standalone timeline within a page (e.g. recruitment pipeline, hiring flow).

### Do's and Don'ts

| ✅ Do                                                                  | ❌ Don't                                                      |
|------------------------------------------------------------------------|---------------------------------------------------------------|
| Use consistent labelling style throughout the progress indicator        | Mix action-led and object-led labels in the same flow         |
| Change step state to Current when the user returns to a step with errors | Don't set error state while a step is still active           |
| Use page-level error messaging or field highlights to show validation issues | Overload the step label with error messages              |
| Validate the current step only when the user clicks to move forward    | Trigger validation on every field change within the step      |
| Allow the user to move to the next step if the flow permits non-critical errors | Block navigation unless errors are critical          |
| Keep horizontal stepper labels short — no wrapping                     | Use long descriptive labels that force wrapping on horizontal |

---

## Segmented Control

Segmented Control allows users to toggle between two or more options within a compact horizontal layout. It is a mutually exclusive selection mechanism — only one option can be active at a time.

### Anatomy

| Element              | Description                                                                          |
|----------------------|--------------------------------------------------------------------------------------|
| **Container**        | Outer frame holding all segments; provides background and border structure            |
| **Stroke**           | Border or outline around the selected segment to enhance visibility and focus         |
| **Label** *(optional)*| Text inside each segment describing the option                                      |
| **Icon** *(optional)*| Optional graphical element placed before the segment label                           |
| **Badge** *(optional)*| Small indicator displayed on the segment, often used to show counts                 |

### Specs

| Attribute            | Value           |
|----------------------|-----------------|
| Height               | 32px            |
| Width                | Dynamic         |
| Left-Right padding   | 16px            |
| Top-Bottom padding   | 6px             |
| Gap between elements | 4px             |
| Label font size      | 14px (`text-body-m`) |
| Label font weight    | `font-medium`   |
| Icon size            | 16px (`w-4 h-4`)|
| Border radius        | `rounded-sds-4` (all corners) |

### Tokens

| Attribute          | Token / Value                                               |
|--------------------|-------------------------------------------------------------|
| `paddingTop`       | 2px / 4px / 4px (size variants)                            |
| `paddingRight`     | 16px / 12px / 8px / 4px (size + config variants)           |
| `paddingLeft`      | 16px / 12px / 8px / 4px                                    |
| `paddingBottom`    | 2px / 4px / 4px                                            |
| `itemSpacing`      | `gap-1` (4px) default; `gap-2` (8px) with icon             |
| Fill — default     | `bg-white` (neutral/white-default)                          |
| Fill — active      | `bg-[#E6F3FF]` (theme-bg-default)                           |
| Fill — pressed     | `bg-[#CCE6FF]` (icon-pressed tint)                          |
| Text — default     | `text-[#4d4d4d]`                                            |
| Text — disabled    | `text-[#aaaaaa]`                                            |
| Border — container | `border-[#e0e0e0]` (neutral-grey-light2)                    |
| Border — active    | `border-[#0183FF]` (theme-border-default)                   |
| Border — hover     | `border-[#CCE6FF]` (neutral-grey-light3)                    |
| Typography         | `text-body-m font-medium` (active) / `text-body-m font-book` (inactive) |

### States

```tsx
// Container (outer wrapper):
// inline-flex items-center rounded-sds-4 border border-[#e0e0e0] bg-white overflow-hidden

// Segment (each option):
// h-8 px-4 py-1.5 flex items-center gap-1 cursor-pointer
// text-body-m font-darwin transition-colors duration-150
// rounded-sds-4

// Default (inactive):
// bg-white text-[#4d4d4d] font-book
// hover: bg-[#f5f5f5] border border-[#CCE6FF]

// Active (selected):
// bg-[#E6F3FF] text-[#0183FF] font-medium
// border border-[#0183FF] rounded-sds-4

// Pressed:
// bg-[#CCE6FF] text-[#0169CC]

// Disabled:
// opacity-50 cursor-not-allowed pointer-events-none text-[#aaaaaa]

// Focus:
// ring-2 ring-[#0183FF] ring-offset-1
```

### Sizes

| Size | Height | Padding (L/R) | Padding (T/B) | Font          |
|------|--------|---------------|---------------|---------------|
| M    | 32px   | 16px          | 6px           | `text-body-m` |
| S    | 24px   | 12px          | 4px           | `text-body-s` |

### Modifiers / Configurations

#### Label
- **With label:** Text label shown in each segment — default
- **No label, icon only:** Icon only, no text — use sparingly; always add a tooltip

#### Leading Icon
- **Icon on left:** `w-4 h-4` icon placed before the label, `gap-1` between icon and label
- **Icon only:** Single icon per segment with no label — must include accessible `aria-label`

#### Trailing Badge
- Badge on the right of the label — typically used for counts (e.g. number of items/units)
- Badge style: `text-body-s font-medium bg-[#E6F3FF] text-[#0183FF] rounded-sds-24 px-1.5`

#### Selection Status
- **Active:** Currently selected segment — highlighted to indicate active status
- **Inactive:** Segments not currently selected — styled in neutral

### Behaviour

#### Overflow
- Additional tabs that cannot fit the available width go to the overflow menu (⋮)
- The selected tab from the menu replaces the last tab of the visible group
- Context menu opens on clicking the overflow menu button
- On selection from overflow menu: the last visible tab is replaced by the selection

#### Responsive (Mobile)
- Segmented control fills the container width on mobile
- With 4+ options: only 2 tabs shown upfront followed by an overflow menu button
- On tapping the rest: overflow tabs appear in a bottom sheet

### Usage Rules

- ✅ Use for 2–5 mutually exclusive options that all need to be visible
- ✅ Use when switching between views, modes, or filter states within the same page context
- ✅ Keep labels short — 1–2 words, Title Case
- ✅ Use icon-only variant only when icons are universally understood and tooltips are present
- ❌ Don't use as a substitute for Tabs when navigating between distinct pages/routes
- ❌ Don't use for more than 5 options without the overflow pattern
- ❌ Don't use for actions (use Button Group instead)
- ❌ Don't mix icon-only and label-only segments in the same control

---
## Divider

A visual separator used to create clear distinctions between certain blocks, sections, or groups within a scroll.

### Specs

| Attribute | Value    |
|-----------|----------|
| Height    | Dynamic  |
| Stroke    | 1px      |

### Tokens

| Attribute | Token / Value                                        |
|-----------|------------------------------------------------------|
| `stroke`  | `border-[#e0e0e0]` (dark) / `border-[#f5f5f5]` (haze) |

### Modifiers / Configurations

#### Thickness

| Variant   | Class / style         | When to use                                                                    |
|-----------|-----------------------|--------------------------------------------------------------------------------|
| **Thin**  | `border-t` (1px)      | Separating closely related subsections; less important separations; dense UIs  |
| **Thick** | `border-t-2` (2px)    | Dividing large sections, forms, or tables; strong visual separation needed     |

#### Colour

| Variant  | Value         | When to use                                                                         |
|----------|---------------|-------------------------------------------------------------------------------------|
| **Dark** | `border-[#e0e0e0]` | Standard — clearly visible between sections and container areas              |
| **Haze** | `border-[#f5f5f5]` | Subtle/transparent — for less important separations or softer classification   |

#### Orientation

| Variant        | Class              | When to use                                  |
|----------------|--------------------|----------------------------------------------|
| **Horizontal** | `w-full border-t`  | Default — separating stacked content blocks  |
| **Vertical**   | `h-full border-l`  | Separating side-by-side layout sections      |

#### Line Type

| Variant    | Class                | When to use                                                                                    |
|------------|----------------------|------------------------------------------------------------------------------------------------|
| **Solid**  | `border-solid`       | Default — lists, sidebars, sections, panels, tables, forms; any continuous separation         |
| **Dashed** | `border-dashed`      | Temporary or draft-like contexts — drag-and-drop targets, placeholder zones, draft sections   |

### Spec Combinations

```tsx
// Horizontal solid dark thin (default):
// <hr className="w-full border-t border-solid border-[#e0e0e0]" />

// Horizontal solid haze thin:
// <hr className="w-full border-t border-solid border-[#f5f5f5]" />

// Horizontal solid dark thick:
// <hr className="w-full border-t-2 border-solid border-[#e0e0e0]" />

// Horizontal dashed dark:
// <hr className="w-full border-t border-dashed border-[#e0e0e0]" />

// Vertical solid dark:
// <div className="h-full border-l border-solid border-[#e0e0e0]" />

// Vertical solid haze:
// <div className="h-full border-l border-solid border-[#f5f5f5]" />
```

### Layout Examples

- **Cards:** Horizontal solid dividers separate card header, body, and footer
- **Vertical dividers:** Used in side-by-side panels (e.g. edit / preview split view)
- **Graphs / dashboards:** Haze dividers between metric blocks to keep the layout clean
- **Tables:** Thin solid dark dividers between rows and between header and body

### Do's and Don'ts

| ✅ Do                                                                             | ❌ Don't                                                                          |
|-----------------------------------------------------------------------------------|-----------------------------------------------------------------------------------|
| Choose line type, thickness, and colour based on visual hierarchy                 | Use thin dashed dividers in compact UI spaces — they appear too heavy/distracting |
| Use `solid` for all standard separations (lists, tables, forms, panels)           | Apply dashed lines without a contextual purpose — they imply temporary content    |
| Use `haze` for subtle separations between closely related content                 | Use thick dividers between every section — reserve for major structural breaks    |
| Use `dashed` only for drag targets, placeholder zones, or draft-state contexts    | Mix line types within the same content region without a clear reason              |

---

## Left Navigation (Nav / Tab Strip)

The Left Navigation provides primary navigation across all modules within an application. It supports two states — a collapsed icon-only rail and an expanded panel — and adapts to different user personas (Employee, Manager, Admin).

> ⚠️ The Left Navigation uses a **dark colour scheme** — it does not use the standard SDS light token set. All colours below are specific to this component.

### Overview

```
Collapsed rail:         Expanded panel:
┌────┐                  ┌──────────────────┐
│ ⊞  │                  │ ⊞  [Search...]   │
│────│                  │──────────────────│
│ 🏠 │                  │ 🏠  Dashboard    │
│ 👤 │                  │ 👤  Profile    ∨ │
│ 🕐 │                  │ 🕐  Time Mgmt  ∨ │
│ ⚡ │                  │ ⚡  Performance ∨ │
│ …  │                  │ …               │
│────│                  │──────────────────│
│ [d]│                  │ [d] Privacy | ToU│
└────┘                  └──────────────────┘
```

### Anatomy

| # | Element                              | Description                                                                    |
|---|--------------------------------------|--------------------------------------------------------------------------------|
| 1 | **Alpha (top area)**                 | Top section of the nav — contains the app switcher grid icon                  |
| 2 | **Module icon (collapsed)**          | Icon-only representation of each module visible when rail is collapsed         |
| 3 | **Module icon (expanded)**           | Icon + label shown when rail is fully expanded                                 |
| 4 | **Temporary module** *(optional)*    | Globally available module not configured by default; shown as placeholder      |
| 5 | **Expand/Collapse button**           | Control that expands or collapses the nav width; chevron `>` / `<`            |
| 6 | **Brand area**                       | Bottom area for the Darwinbox or client branding logo                          |
| 7 | **Expand/Collapse chevron** *(optional)* | Separate chevron to expand/collapse individual module sections             |
| 8 | **Sub-items** *(optional)*           | Child pages shown inside an expanded module section                            |
| 9 | **Footer**                           | Bottom strip — "Privacy Policy \| Terms of Use"                               |

### Dimensions

| Attribute             | Value          |
|-----------------------|----------------|
| Collapsed width       | Icon rail only (~48px) |
| Expanded width        | 244px          |
| Max expanded width    | 344px          |
| Expand/collapse icon  | 36px hit area  |
| Nav background        | `#1C1C28` (dark navy) |
| Item row height       | 36px           |

### Colour Tokens (Dark Nav)

| Element                     | Value                        |
|-----------------------------|------------------------------|
| Nav background              | `#1C1C28`                    |
| Active item bg              | `rgba(1, 131, 255, 0.15)`    |
| Active item left border     | `border-l-2 border-[#0183FF]`|
| Active item text/icon       | `text-white`                 |
| Hover item bg               | `rgba(255,255,255,0.06)`     |
| Inactive item text          | `text-[#aaaaaa]` (muted)     |
| Inactive item icon          | `text-[#aaaaaa]`             |
| Footer text                 | `text-[#4d4d4d]` or muted    |
| Brand/logo area             | bottom of nav, `#1C1C28`     |

### States

```tsx
// ─── Collapsed Rail ─────────────────────────────────────────────
// w-12 flex flex-col items-center bg-[#1C1C28]
// Module icon item: w-full h-9 flex items-center justify-center
//   default:  text-[#aaaaaa]
//   hover:    bg-white/[0.06] text-white + tooltip (module name) on right
//   selected: border-l-2 border-[#0183FF] bg-[#0183FF]/15 text-white

// ─── Expanded Panel ─────────────────────────────────────────────
// w-[244px] flex flex-col bg-[#1C1C28]
// Module row: h-9 px-3 flex items-center gap-2 w-full
//   default:  text-[#aaaaaa] text-body-m font-book
//   hover:    bg-white/[0.06] text-white
//   selected: border-l-2 border-[#0183FF] bg-[#0183FF]/15 text-white font-medium
// Expand chevron: w-4 h-4 ml-auto text-[#aaaaaa] rotate-0 / rotate-180 when open

// ─── Sub-items (nested pages) ───────────────────────────────────
// pl-10 h-8 flex items-center text-body-s font-book
//   default:  text-[#aaaaaa]
//   hover:    text-white bg-white/[0.06]
//   selected: text-white font-medium

// ─── Nested Paged Dropdown ─────────────────────────────────────
// Appears as a floating panel to the right of the collapsed icon
// bg-[#1C1C28] border border-white/10 rounded-sds-4 shadow-sds-2
// Contains: module title + list of page names
```

### Nav Item States

| State            | Style                                                          |
|------------------|----------------------------------------------------------------|
| **Default**      | Icon + label in muted grey (`#aaaaaa`), no background         |
| **Hover**        | Subtle white overlay bg (`rgba(255,255,255,0.06)`), text turns white; shows tooltip on collapsed rail |
| **Selected**     | Blue left border (`border-l-2 border-[#0183FF]`), blue tint bg, white text |
| **Selected Hover** | Same as selected + slightly brighter bg overlay            |

### Configurations

#### Persona Variants
| Persona      | Nav items shown                                                         |
|--------------|-------------------------------------------------------------------------|
| **Employee** | Dashboard, Profile, Time Management, Performance Management, Journeys, VibeX, Travel & Expense, Compensation, Org View, Helpdesk |
| **Manager**  | Exit to Dashboard, [Employee Avatar], Time Management, Performance Management, Journeys, Travel & Expense |
| **Third Party** | Additional partner app icons (e.g. Plum, Darwinbox Academy, 1to1help) with their own branded icons |

#### Expanded + Nested Paged Dropdown
- When a module has sub-pages and user hovers the collapsed icon: a floating panel appears to the right listing the module name and all its sub-pages
- On the expanded panel: the module row expands inline, showing sub-pages below with additional left indent

#### Guide Item
- Special item (collapsed: icon only / expanded: icon + "Guide" label + description tooltip)
- Shows tooltip on hover in collapsed mode: `text-body-s text-[#aaaaaa]`
- Selected state: same blue left-border + tint as regular items

#### Search Bar
- Appears at the top of expanded nav, below the app switcher
- States: Default (`placeholder: "All Apps"`) → Hover → Active (cursor) → Typing → Completed
- `← [All Apps____________] 🔍`
- Empty state: illustration + "No apps found" + "Try different keywords to find what you need"

### Footer

```
[d logo]  Privacy Policy  |  Terms of Use
```
- Pinned to the bottom of the nav
- `text-body-s text-[#4d4d4d]`
- Collapsed: shows logo icon only
- Expanded: shows logo + Privacy Policy | Terms of Use

### Behaviour

- **Fixed:** The left nav is always fixed to the left side of the viewport — it does not scroll with page content
- **Collapse/Expand:** Toggled by the `>` / `<` chevron button; persisted per user session
- **Tooltip on hover (collapsed):** Shows module name in a tooltip to the right of the icon when hovering
- **Active module persist:** The selected/active module state is retained on page reload
- **Third-party apps:** Shown as circular branded icons in the collapsed rail; appear in the expanded list with name + chevron
- **Nested dropdown (collapsed):** Hovering a module with sub-pages in collapsed mode shows a paged dropdown panel to the right
- **Transition:** Smooth width transition on collapse/expand (`transition-width duration-200`)

---

## Label

A standalone form label component used above input fields, selects, textareas, and other form controls. Labels communicate what information is expected and can carry additional context via optional modifiers.

### Anatomy

```
1. Label  *  ⓘ  ?
   Description text
   ┌─────────────────────────────┐
   │ Enter here                  │
   └─────────────────────────────┘
   Help text here
```

| Element                    | Description                                                                      |
|----------------------------|----------------------------------------------------------------------------------|
| **Number** *(optional)*    | Step/question number prefix — `1.` — used in questionnaires and multi-step forms |
| **Label text**             | The field name — always present                                                  |
| **Required indicator** `*` | Red asterisk suffix for mandatory fields                                         |
| **Info icon** `ⓘ` *(optional)* | Triggers a tooltip with additional context on hover/click                   |
| **Help icon** `?` *(optional)*  | Triggers a help popover or links to documentation                           |
| **Description** *(optional)*    | Secondary line below the label — provides clarifying detail                 |

### Specs

```tsx
// Label text (default):
// text-body-s font-medium text-[#131313]

// Label text (bold/emphasis):
// text-body-s font-bold text-[#131313]

// Required indicator:
// <span className="text-red-500 ml-0.5">*</span>

// Info icon (ⓘ):
// w-4 h-4 text-[#4d4d4d] ml-1 cursor-pointer hover:text-[#131313]

// Help icon (?):
// w-4 h-4 text-[#4d4d4d] ml-0.5 cursor-pointer hover:text-[#131313]

// Number prefix (e.g. "1."):
// text-body-s font-bold text-[#131313] mr-1

// Description (below label):
// text-body-s font-book text-[#4d4d4d] mt-0.5

// Help text (below input, not part of label):
// text-body-s font-book text-[#4d4d4d] mt-0.5

// Full label row layout:
// flex items-center gap-0.5 mb-1
```

### Weight Variants

| Variant   | Class                          | When to use                                      |
|-----------|--------------------------------|--------------------------------------------------|
| **Regular** | `text-body-s font-medium`   | Standard form labels — default                   |
| **Bold**    | `text-body-s font-bold`     | Emphasis labels, numbered questions, section headers within a form |

### Modifiers

| Modifier          | Rendered as                        | Notes                                                  |
|-------------------|------------------------------------|--------------------------------------------------------|
| Required `*`      | `<span class="text-red-500">*</span>` | Always immediately after the label text             |
| Info icon `ⓘ`    | 16px icon, muted grey              | Tooltip on hover showing additional guidance           |
| Help icon `?`     | 16px icon, muted grey              | Opens a help popover or links to documentation         |
| Number prefix     | `1.` bold, before label            | Used in questionnaires, surveys, or wizard forms       |
| Description       | Second line below label, `text-body-s font-book text-[#4d4d4d]` | Optional clarifying text |

### Full Form Field Structure

```tsx
// Standard field with label:
<div className="flex flex-col gap-1">
  <label className="flex items-center gap-0.5 text-body-s font-medium text-[#131313]">
    Label
    <span className="text-red-500 ml-0.5">*</span>
    <InfoIcon className="w-4 h-4 text-[#4d4d4d] ml-1" />
    <HelpIcon className="w-4 h-4 text-[#4d4d4d] ml-0.5" />
  </label>
  <input placeholder="Enter here" className="..." />
  <span className="text-body-s text-[#4d4d4d]">Help text here</span>
</div>

// Numbered label with description:
<div className="flex flex-col gap-1">
  <label className="flex items-center gap-0.5 text-body-s font-bold text-[#131313]">
    <span>1.</span>
    Label
    <span className="text-red-500 ml-0.5">*</span>
    <InfoIcon className="w-4 h-4 text-[#4d4d4d] ml-1" />
    <HelpIcon className="w-4 h-4 text-[#4d4d4d] ml-0.5" />
  </label>
  <span className="text-body-s font-book text-[#4d4d4d]">Description</span>
</div>
```

### Usage Rules

- ✅ Always pair a label with its form control using `htmlFor` / `id`
- ✅ Use `*` for all mandatory fields — place immediately after the label text
- ✅ Use `ⓘ` for guidance that helps the user fill in the field correctly
- ✅ Use `?` when linking to external documentation or a help article
- ✅ Use the numbered variant for questionnaires, surveys, and multi-step forms
- ❌ Don't use placeholder text as a substitute for a label
- ❌ Don't use ALL CAPS for label text
- ❌ Don't omit the required indicator on mandatory fields

## Carousel

A component that allows the display and navigation of a track of content items — typically images or cards — within a limited space. Often used to display multiple pieces of content in a reusable, repeating manner.

### Overview

Carousels are used for rich-media content such as birthday/celebration banners, event announcements, featured content cards, and onboarding or recommendation panels.

### Anatomy

| # | Element          | Description                                                                                                                          |
|---|------------------|--------------------------------------------------------------------------------------------------------------------------------------|
| 1 | **Indicator**    | Pagination dots at the bottom centre. Shows total count and current position; replaces the "next" button on the last item            |
| 2 | **Controls/Nav** | Arrow buttons at the corners — navigates to the previous or next slide                                                               |
| 3 | **Start (prev)** | Left arrow control — navigates to the previous slide                                                                                 |

```
┌──────────────────────────────────────────┐
│                                          │
│          [  Slide Content  ]             │
│                                          │
│  ‹            ● ○ ○ ○             ›     │
└──────────────────────────────────────────┘
```

### Specs

| Attribute                   | Value                          |
|-----------------------------|--------------------------------|
| Height                      | Dynamic (`size-fit`)           |
| Width                       | Dynamic — full container width |
| Border radius (all corners) | `rounded-sds-8`                |
| Padding top                 | 0–8px                          |
| Padding right / left        | 8px each                       |
| Padding bottom              | 24px (space for indicator dots)|
| Gap between slides          | 8px (`gap-2`)                  |
| Nav button size             | Medium, `font-medium`          |
| Icon size                   | 16px (`w-4 h-4`)               |
| Nav position                | Bottom centre                  |

### Tokens

| Attribute      | Value                                                      |
|----------------|------------------------------------------------------------|
| `fill`         | `bg-white`                                                 |
| `borderColour` | `border-[#e0e0e0]` default / `border-[#0183FF]` active    |
| `borderRadius` | `rounded-sds-8` all corners                                |
| `typography`   | Slide title: `text-title-l/m/s font-medium`; body: `text-body-m/s font-book` |

### Specs (TSX)

```tsx
// ─── Carousel wrapper ─────────────────────────────────────────
// relative w-full overflow-hidden rounded-sds-8

// ─── Slide track ─────────────────────────────────────────────
// flex transition-transform duration-300 ease-in-out

// ─── Individual slide ────────────────────────────────────────
// flex-shrink-0 w-full px-2 pt-2 pb-6

// ─── Nav buttons (prev / next) ───────────────────────────────
// absolute top-1/2 -translate-y-1/2
// prev: left-2  |  next: right-2
// w-8 h-8 rounded-full bg-white/80 hover:bg-white shadow-sds-1
// flex items-center justify-center text-[#131313]
// Hide prev on first slide; hide next on last slide

// ─── Indicator dots ──────────────────────────────────────────
// absolute bottom-2 left-1/2 -translate-x-1/2
// flex items-center gap-1.5
// active dot:   w-3 h-1.5 rounded-full bg-[#0183FF]  (pill shape)
// inactive dot: w-1.5 h-1.5 rounded-full bg-[#e0e0e0]
```

### Behaviour

- **Loop:** Slides wrap from last back to first (infinite loop)
- **Last slide:** "Next" button hidden; indicator shows final dot active
- **First slide:** "Prev" button hidden
- **Auto-advance:** Optional; pause on hover; minimum 4s interval
- **Touch/swipe:** Supports swipe gestures on mobile
- **Dot navigation:** Each dot is clickable to jump directly to that slide

### Usage Rules

- ✅ Use for promotional, celebratory, or featured content (birthday banners, announcements, onboarding)
- ✅ Always show indicator dots — users need to know how many slides exist
- ✅ Support keyboard navigation (← →) and touch swipe
- ✅ Limit to 3–6 slides; add "view all" for more
- ❌ Don't use for critical information — carousel content is easily missed
- ❌ Don't auto-advance faster than 4 seconds

---

## Panel (Drawer)

A Panel is a side panel that slides in from the right edge of the viewport, layering over the main content with a backdrop overlay. It is used for forms, filters, detail views, and multi-step flows without navigating away from the current page.

### Overview

```
Main content (dimmed)   │ Panel
─────────────────────── │ ┌──────────────────────────┐
                        │ │ ‹  Panel Title          × │  ← Header (fixed)
                        │ ├──────────────────────────┤
                        │ │                          │
                        │ │   Body Content           │  ← Scrollable
                        │ │   (form / data / info)   │
                        │ │                          │
                        │ ├──────────────────────────┤
                        │ │  [Button]    [Button]    │  ← Footer (fixed)
                        │ └──────────────────────────┘
```

### Anatomy

| Element                     | Description                                                                          |
|-----------------------------|--------------------------------------------------------------------------------------|
| **Header**                  | Fixed top bar containing title, optional back button, and close button               |
| **Back button** `‹` *(opt)* | Appears in multi-step panels; navigates to the previous step                         |
| **Panel title**             | `text-title-xs font-medium text-[#131313]`                                           |
| **Close button** `×`        | Always present — `w-7 h-7 rounded-sds-4 hover:bg-[#f5f5f5]` top-right              |
| **Breadcrumb** *(optional)* | Navigation path shown below the title for deep-nested panels                        |
| **Body content**            | Scrollable area — contains form fields, tables, read-only content, or rich layouts   |
| **Footer**                  | Fixed bottom bar with 1–2 action buttons, right-aligned                              |

### Specs

| Attribute              | Value                                              |
|------------------------|----------------------------------------------------|
| Position               | Fixed, slides in from the **right**                |
| Width (single col)     | ~320px                                             |
| Width (dual col)       | ~480px                                             |
| Width (multi col)      | ~640px+                                            |
| Max width              | Dynamic (content-dependent)                        |
| Height                 | 100vh (full viewport height)                       |
| Border radius          | `rounded-tl-sds-8 rounded-bl-sds-8` (left corners only; right edge is flush to viewport) |
| Header height          | Fixed — `min-h-[52px]`                             |
| Footer height          | Fixed — `min-h-[60px]`                             |
| Body                   | `flex-1 overflow-y-auto`                           |
| Backdrop               | `fixed inset-0 bg-black/40 z-40`                   |
| Panel z-index          | `z-50`                                             |
| Transition             | `translate-x-0` open / `translate-x-full` closed, `duration-300 ease-in-out` |

### Tokens

| Attribute            | Value                                               |
|----------------------|-----------------------------------------------------|
| Background           | `bg-white`                                          |
| Border               | `border-l border-[#e0e0e0]`                         |
| Border radius        | `rounded-tl-sds-8 rounded-bl-sds-8` (top-left & bottom-left only) |
| Shadow               | `shadow-sds-3`                                      |
| Header border        | `border-b border-[#e0e0e0]`                         |
| Footer border        | `border-t border-[#e0e0e0]`                         |
| Title typography     | `text-title-xs font-medium text-[#131313]`          |
| Body typography      | `text-body-m font-book text-[#131313]`              |

### Specs (TSX)

```tsx
// ─── Backdrop ───────────────────────────────────────────────────
// fixed inset-0 bg-black/40 z-40
// onClick → close panel

// ─── Panel container ────────────────────────────────────────────
// fixed top-0 right-0 h-full z-50 bg-white
// border-l border-[#e0e0e0]
// rounded-tl-sds-8 rounded-bl-sds-8
// shadow-sds-3 flex flex-col
// transition-transform duration-300 ease-in-out
// open:  translate-x-0
// closed: translate-x-full

// ─── Width variants ─────────────────────────────────────────────
// Single column:  w-[320px]
// Dual column:    w-[480px]
// Multi column:   w-[640px] or w-[800px]

// ─── Header ─────────────────────────────────────────────────────
// flex items-center justify-between px-6 py-3
// min-h-[52px] border-b border-[#e0e0e0] flex-shrink-0
// Back btn (optional): w-7 h-7 mr-2 rounded-sds-4 hover:bg-[#f5f5f5] flex items-center justify-center text-[#4d4d4d]
// Title: text-title-xs font-medium text-[#131313] flex-1
// Close btn: w-7 h-7 rounded-sds-4 hover:bg-[#f5f5f5] flex items-center justify-center text-[#4d4d4d]

// ─── Body ───────────────────────────────────────────────────────
// flex-1 overflow-y-auto px-6 py-4

// ─── Footer ─────────────────────────────────────────────────────
// flex items-center justify-end gap-2 px-6 py-3
// min-h-[60px] border-t border-[#e0e0e0] flex-shrink-0
```

### Width & Layout Variants

| Variant          | Width   | Body layout                    | Typical use                               |
|------------------|---------|--------------------------------|-------------------------------------------|
| **Single column**| ~320px  | Single form column             | Simple filters, compact forms             |
| **Dual column**  | ~480px  | Two side-by-side form columns  | Standard forms (Attendance, Leave)        |
| **Multi column** | ~640px+ | 3+ columns or rich layout      | Complex forms, data tables, dashboards    |

### Panel Configurations

#### Standard Panel
- Header (title + close) + scrollable body + fixed footer

#### Panel with Back Button
- Header (back `‹` + title + close) — used in multi-step flows where the user drills into a nested view and needs to return

#### Tabbed Panel
- Header with tabs below the title row (Details / Key Results / Notes / Journal)
- Tab content is the scrollable body; footer persists across all tabs

#### Read-only / Info Panel
- Header + scrollable body with read-only content (FAQs, policy text, key-value data)
- Footer may have a single action button or be omitted

#### Filter Panel
- Single or dual column layout
- Body contains filter form fields (Select, Date, Input)
- Footer: **Cancel** (secondary) + **Apply / Submit** (primary)

### Behaviour

- **Entry:** Panel slides in from the right (`translateX` from off-screen)
- **Exit:** Panel slides out to the right; backdrop fades
- **Backdrop click:** Closes the panel (same as clicking close `×`)
- **Escape key:** Closes the panel
- **Scroll:** Only the body area scrolls — header and footer remain fixed
- **Focus trap:** Keyboard focus is trapped within the panel while open
- **Multi-step:** The back button `‹` navigates to the previous panel view without closing; the close button always exits completely

### Do's and Don'ts

| ✅ Do                                                                 | ❌ Don't                                                            |
|-----------------------------------------------------------------------|---------------------------------------------------------------------|
| Use for forms, filters, and detail views that need context from the page behind | Use a panel for primary navigation or full-page actions  |
| Fix header and footer — only scroll the body                          | Make the entire panel scroll including header/footer                |
| Use the back button for multi-step flows within the panel             | Open a new panel on top of another panel (max 1 panel at a time)    |
| Match panel width to content complexity (single → dual → multi col)   | Use an oversized panel for a simple filter with 2 fields            |
| Always show a footer with at least a Cancel/close action              | Omit a way to dismiss the panel                                     |
| Use tabbed layout when content has multiple distinct sections          | Stack all content in a single column when dual-column fits better   |

---

## Components Pending Figma Specs

The following components exist in Figma but full specs are not yet documented. Apply core SDS tokens consistently until specs are added.

| Component    | Notes                                               |
|--------------|-----------------------------------------------------|
## Notification

Notifications inform users about events, updates, and actions within the application. They appear in a notification panel (accessible via the bell icon in the top nav) and differ from Toasts — they are persistent, grouped, and actionable rather than transient.

### Overview

```
[🔔 3]  ← Bell icon with unread count badge (top nav)

┌─────────────────────────────────────────┐
│ Notifications        Mark all as read ⋮ │  ← Header
├─────────────────────────────────────────┤
│ [All] [Unread]              ⊿ Filters   │  ← Filter tabs
├─────────────────────────────────────────┤
│ [●] Title text                        • │  ← Unread item
│     Description text here...            │
│     1 day ago           View More →     │
├─────────────────────────────────────────┤
│ [●] Title text                          │  ← Read item
│     Description text here...            │
│     2 days ago                          │
└─────────────────────────────────────────┘
```

### Anatomy

| # | Element        | Description                                                                            |
|---|----------------|----------------------------------------------------------------------------------------|
| 1 | **Frame**      | Outer boundary housing the notification — provides structure without internal scrolling |
| 2 | **Icon**       | Communicates notification context — can be a user avatar or a module/app icon          |
| 3 | **Title**      | Short description indicating the trigger event                                         |
| 4 | **Description**| Brief sentence describing the context or detail of the notification                    |
| 5 | **Metadata**   | Additional contextual info — timestamp (`1 day ago`), count, grouped items             |
| 6 | **Unread dot** | Blue dot indicator on the right edge of unread items                                   |
| 7 | **View More**  | Link that expands grouped notifications within the same category                       |

### Specs

| Attribute          | Value                                               |
|--------------------|-----------------------------------------------------|
| Height             | Dynamic (`size-fit`)                                |
| Width              | Dynamic — fills notification panel width            |
| Icon size          | `w-8 h-8` (32px) avatar or module icon, `rounded-full` |
| Unread dot         | `w-2 h-2 rounded-full bg-[#0183FF]` right-aligned  |
| Timestamp          | `text-body-s font-book text-[#aaaaaa]`              |
| Title typography   | `text-body-m font-medium text-[#131313]`            |
| Description typo   | `text-body-m font-book text-[#4d4d4d]`              |
| "View More" link   | `text-body-s font-medium text-[#0183FF] hover:underline` |

### Sizes

| Size | Height        | Typography                              | Use                                     |
|------|---------------|-----------------------------------------|-----------------------------------------|
| **M** (default) | `min-h-[72px]` | `text-body-m` title + description | Standard notification list              |
| **S** (compact) | `min-h-[52px]` | `text-body-s` title + description | Dense/compact notification panels       |

### States

| State       | Style                                                             |
|-------------|-------------------------------------------------------------------|
| **Unread**  | `bg-white` + blue dot `w-2 h-2 bg-[#0183FF]` on right           |
| **Read**    | `bg-white` — no dot indicator                                     |
| **Hover**   | `bg-[#F5FAFF]` — subtle blue tint on hover                       |

### Specs (TSX)

```tsx
// ─── Notification Panel ─────────────────────────────────────────
// Fixed dropdown, top-right, z-50
// w-[380px] max-h-[560px] bg-white rounded-sds-8 shadow-sds-2
// flex flex-col border border-[#e0e0e0]

// ─── Panel Header ───────────────────────────────────────────────
// flex items-center justify-between px-4 py-3 border-b border-[#e0e0e0]
// Title: text-title-xs font-medium text-[#131313]
// "Mark all as read": text-body-s font-medium text-[#0183FF] hover:underline
// ⋮ menu icon: w-4 h-4 text-[#4d4d4d]

// ─── Filter Tabs ────────────────────────────────────────────────
// flex items-center gap-2 px-4 py-2 border-b border-[#e0e0e0]
// Tab: text-body-s font-medium
//   active: text-[#0183FF] border-b-2 border-[#0183FF]
//   inactive: text-[#4d4d4d]
// Filters button: text-body-s text-[#4d4d4d] flex items-center gap-1 ml-auto

// ─── Notification List ──────────────────────────────────────────
// flex-1 overflow-y-auto divide-y divide-[#e0e0e0]

// ─── Notification Item ──────────────────────────────────────────
// flex items-start gap-3 px-4 py-3 hover:bg-[#F5FAFF] cursor-pointer
// Icon: w-8 h-8 rounded-full flex-shrink-0
// Content: flex flex-col gap-0.5 flex-1
//   Title:       text-body-m font-medium text-[#131313]
//   Description: text-body-m font-book text-[#4d4d4d] line-clamp-2
//   Timestamp:   text-body-s font-book text-[#aaaaaa]
//   View More:   text-body-s font-medium text-[#0183FF] hover:underline mt-0.5
// Unread dot:  w-2 h-2 rounded-full bg-[#0183FF] flex-shrink-0 mt-2

// ─── Empty State ────────────────────────────────────────────────
// flex flex-col items-center justify-center flex-1 gap-2 py-12
// Illustration + "No more notifications." text-body-m text-[#4d4d4d]
```

### Grouping

Notifications of the same type/source can be grouped under a single item:
- The title reflects the group (e.g. "Vibe — Jogarth Singh and 4 others liked your comment")
- "View More" link expands to show individual items within the group
- Count badge shown in metadata when grouped
- Collapsed by default; max 3 items visible before "View More"

### Variants / Styles

| Style    | Description                                                                 |
|----------|-----------------------------------------------------------------------------|
| **Full** | Icon + title + description + timestamp + optional View More                 |
| **Label**| Icon + title only (compact, used in dense views)                            |
| **None** | Title + description only, no icon                                           |

### Bell Icon (Trigger)

```tsx
// Bell icon in top nav:
// relative w-8 h-8 flex items-center justify-center
// Unread count badge (when > 0):
//   absolute -top-1 -right-1
//   min-w-[16px] h-4 rounded-full bg-red-500 text-white
//   text-[10px] font-bold px-1 flex items-center justify-center
```

### Mobile Behaviour

- Full-page notification screen (not a dropdown panel)
- Header: `← Notifications` + `Mark as Read (N)` count + filter icon
- Tabs: `All` | `Unread` | `⊿ Filters`
- Same item structure as desktop
- Swipe-to-dismiss (optional)

### Content Guidelines

```
Title (trigger event):
✅ Keep titles functional and concise for regular notifications
✅ Use engaging, conversational tone for interactive events and social updates
✅ Use active voice ("Sachin Kumar has approved your attendance request")
✅ Personalise with names and @mentions where possible
✅ Keep to one concise sentence

Description (detail):
✅ Brief follow-up sentence adding context
✅ Include key details: names, dates, reference numbers (e.g. PRN-448732)
✅ Keep the body short and to the point

❌ Don't combine title and description into a single run-on sentence
❌ Don't send more than 2 notifications with the same title consecutively
❌ Notification copy that is 2+ sentences long will not display well to users
```

### Do's and Don'ts

| ✅ Do                                                                         | ❌ Don't                                                                 |
|-------------------------------------------------------------------------------|--------------------------------------------------------------------------|
| Include a clear title and a brief follow-up description                       | Combine title and follow-up into a single sentence                       |
| Show unread dot clearly; provide "Mark all as read"                           | Send multiple identical titles back-to-back                              |
| Group related notifications under a single item with "View More"              | Show all individual items ungrouped — list becomes unmanageable          |
| Use module/app icon or user avatar to give context at a glance                | Use generic icons that don't reflect notification source                 |
| Keep timestamps relative (e.g. "1 day ago", "Just now")                      | Use absolute timestamps in notification list (save for expanded view)    |
| Provide filter tabs (All / Unread) for easy scanning                          | Show only a flat undifferentiated list with no filtering                 |

---

## Components Pending Figma Specs

All components have now been fully documented. 🎉
