# SDS Layout

Layout system for the Sapien Design System. Covers page background, grid specifications, and layout patterns for desktop and mobile.

---

## Page Background

Default page background is `bg-[#F5FAFF]` (brand-10) — **not white**.
Card and surface backgrounds are `bg-white`.

---

## Desktop Layout Specifications

**Applies when:** Width > 1366px

| Property  | Value        |
|-----------|--------------|
| Columns   | 12           |
| Gutter    | 16px         |
| Margin    | 24px (left & right) |

### Grid Variants

Three grid display modes (for documentation/design reference):

| Variant     | Description                                        |
|-------------|----------------------------------------------------|
| Filled cols | Full column blocks visible — used to show column spans |
| Gutters     | Gutter gaps highlighted in blue — shows spacing between columns |
| Margins     | Outer margins highlighted in green — shows page edge offsets |

### Column Span Layouts

| Layout              | Columns used | Typical use                            |
|---------------------|--------------|----------------------------------------|
| Full width (1-col)  | 12 / 12      | Full-bleed tables, single-focus pages  |
| Half + half (2-col) | 6 / 6        | Side-by-side panels, split views       |
| Quarter grid (4-col)| 3 / 3 / 3 / 3| Stat cards, KPI rows                   |
| Sidebar + content   | 2 / 10 or 3 / 9 | Left nav + main content area        |

### Page Structure Pattern (Desktop)

```
┌────────────────────────────────────────┐
│  Top Nav / Header bar  (full width)    │
├──────────┬─────────────────────────────┤
│  Left    │                             │
│  Side    │   Main Content Area         │
│  Nav     │   (scrollable)              │
│  (fixed) │                             │
└──────────┴─────────────────────────────┘
```

- **Left sidebar nav:** fixed, does not scroll with content
- **Main content area:** scrollable, uses the 12-col grid within its width
- **Content max-width:** constrained by grid — content does not stretch infinitely on ultra-wide screens; use `max-w-screen-xl` or equivalent with `mx-auto`
- **Page padding:** 24px left and right margins (from grid spec)

---

## Mobile Layout Specifications

**Applies when:** Width > 414px (phones/small tablets)

| Property  | Value             |
|-----------|-------------------|
| Columns   | 12                |
| Gutter    | 16px              |
| Margin    | 24px (left & right) |

> Both Android and iOS share the same column/gutter/margin values.

### Mobile Grid Variants

Same three display modes as desktop (filled cols, gutters, margins) — applied at mobile viewport width.

### Mobile Column Span Layouts

| Layout              | Columns used | Typical use                    |
|---------------------|--------------|--------------------------------|
| Full width (1-col)  | 12 / 12      | Full-bleed lists, forms        |
| Half + half (2-col) | 6 / 6        | Two-up cards, metric pairs     |
| Three-col grid      | 4 / 4 / 4    | Icon grids, compact filters    |

### Mobile Page Structure Pattern

```
┌──────────────────────────┐
│  Top App Bar (full width)│
├──────────────────────────┤
│                          │
│   Main Content Area      │
│   (scrollable)           │
│                          │
├──────────────────────────┤
│  Bottom Nav (fixed)      │
└──────────────────────────┘
```

- **Top app bar:** fixed, full width
- **Bottom nav:** fixed, replaces left sidebar nav on mobile
- **Content:** single-column dominant; 2-col only for compact elements
- **Page padding:** 24px left and right margins
- On mobile (`sm` breakpoint): horizontal tabs switch to vertical layout; data tables become Card-based rows

### Responsive Behaviour Summary

| Breakpoint | Grid cols | Nav pattern          | Table behaviour          |
|------------|-----------|----------------------|--------------------------|
| sm (320px) | 12 (narrow spans) | Bottom nav  | Cards per row            |
| md (721px) | 12        | Bottom or side nav   | Compact table            |
| lg (1025px)| 12        | Left sidebar nav     | Full table               |
| xl (1441px)| 12        | Left sidebar nav     | Full table, wider cols   |

---

## Layout Do's and Don'ts

| ✅ Do                                               | ❌ Don't                                          |
|----------------------------------------------------|--------------------------------------------------|
| Use 12-col grid with 16px gutters and 24px margins | Free-position elements outside the grid          |
| Default page bg to `bg-[#F5FAFF]`                  | Use `bg-white` for the page background           |
| Fix sidebar nav; scroll only the main content      | Scroll the entire page including the sidebar     |
| Constrain content width at xl breakpoint           | Allow content to stretch to full ultra-wide width|
| Switch to bottom nav + card rows on mobile         | Use desktop table layout on small screens        |
