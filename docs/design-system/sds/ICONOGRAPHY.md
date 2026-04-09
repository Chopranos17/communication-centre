# SDS Iconography

Icons are visual elements that help communicate information quickly and enhance the overall user experience. They simplify complex actions, support recognition over recall, and contribute to a cohesive visual language.

---

## Anatomy

### Canvas, Padding & Live Area

Each icon is designed on a canvas matching its pixel size. Padding sits between the icon edges and the canvas to avoid visual crowding. The live area is the space where the core visual elements reside.

Example at 24px:
- Canvas: 24 × 24px
- Padding: 4px on all sides
- Live area: 18 × 18px

### Keyline Shapes
Icons follow standardised keyline shapes for consistent proportions:
- **Horizontal rectangle** — icon is wider than tall
- **Vertical rectangle** — icon is taller than wide
- **Square** — equal width and height
- **Circle** — circular icons fitted within the live area

---

## Icon Sizes & Stroke

| Icon Size | Stroke | Padding | Tailwind class |
|-----------|--------|---------|----------------|
| 12px      | 1px    | 1px     | `w-3 h-3`      |
| 16px      | 1px    | 2px     | `w-4 h-4`      |
| 24px      | 1px    | 2px     | `w-6 h-6`      |
| 28px      | 1.5px  | 2px     | `w-7 h-7`      |
| 32px      | 1.5px  | 2px     | `w-8 h-8`      |

**16px is the default.** Use 24px for nav items and standalone icons. Use 32px for empty states and hero moments.

---

## Icon Style Rules

- **Style:** Stroke-based — no fill on default/outline variant
- **strokeLinecap:** round
- **strokeLinejoin:** round
- **Color:** `currentColor` — always inherits from parent text color
- ❌ Never hardcode icon colors — use a text color class on the container
- ❌ Never mix SDS icons with other icon libraries in the same UI
- ❌ Never resize to non-standard sizes — use only the 5 defined sizes

---

## Color Usage

| Context               | Value / class       |
|-----------------------|---------------------|
| Primary actions       | `text-[#131313]`    |
| Secondary / muted     | `text-[#4d4d4d]`    |
| Interactive / brand   | `text-[#0183FF]`    |
| Disabled              | `text-[#aaaaaa]`    |
| Destructive           | `text-red-500`      |
| On dark backgrounds   | `text-white`        |

---

## Icon Variants

Each icon ships in multiple variants (rows within each tile in the Figma library):

| Variant        | When to use                                          |
|----------------|------------------------------------------------------|
| **Outline**    | Default resting state                                |
| **Outline dark** | Stroke icon on dark/coloured backgrounds           |
| **Filled**     | Active / selected / toggled-on state                 |
| **Filled dark**| Filled icon on dark backgrounds                      |

Use **outline** by default. Switch to **filled** only for active/selected states (e.g. bookmarked, starred, hearted).

---

## Pairing with Labels

- `gap-1` (4px) between icon and label
- Pair with labels wherever space allows
- `aria-hidden="true"` on purely decorative icons
- `aria-label` on standalone interactive icons with no visible label text

---

## Icon Catalogue

### Arrows & Chevrons
`chevron-right` · `chevron-up` · `chevron-left` · `chevron-down`
`arrow-right` · `arrow-left` · `arrow-up` · `arrow-down`
`arrows-horizontal` · `arrows-vertical`
`arrow-down-to-line` · `arrow-up-to-line`
`expand` · `collapse` · `maximize` · `minimize`
`arrow-up-right` · `arrow-forward`
`sort-ascending` · `sort-descending` · `chevron-up-down`

### Alerts & Notifications
`info-circle` · `info-circle-filled`
`help-circle` · `help-circle-filled`
`warning-triangle` · `warning-triangle-filled`
`alert-circle` · `alert-circle-filled`
`notification` · `notification-dot`

### Settings & Tools
`settings` · `settings-filled`
`layout` · `layout-filled`
`wrench`
`link` · `link-broken` · `unlink`

### Navigation & Layout
`home` · `home-filled`
`grid-2x2` · `grid-3x3` · `grid-4x4`
`rows` · `columns`
`menu` · `menu-alt`
`dots-vertical` · `dots-horizontal`
`list` · `list-alt`
`sidebar` · `panel`

### Typography & Text Editing
`text` · `font-size` · `bold` · `italic` · `underline` · `strikethrough`
`text-color` · `highlight` · `font` · `font-alt`
`align-left` · `align-center` · `align-right` · `align-justify`
`indent-left` · `indent-right` · `outdent`
`list-bullet` · `list-ordered`
`line-height` · `letter-spacing`
`text-wrap` · `text-overflow`
`eraser` · `subscript` · `superscript`
`undo` · `redo`
`filter-text` · `filter-text-filled`
`link-text` · `unlink-text`

### People & Users
`user` · `user-filled`
`user-add` · `user-remove`
`user-check` · `user-x`
`user-group` · `user-group-add`
`user-search` · `user-badge` · `user-location`
`user-settings` · `user-clock` · `user-star`
`org-chart` · `contacts`
`people` · `people-filled`

### Time & Calendar
`clock` · `clock-filled`
`hourglass` · `hourglass-filled`
`calendar` · `calendar-filled`
`calendar-add` · `calendar-remove` · `calendar-check`
`calendar-range` · `calendar-clock`
`calendar-week` · `calendar-month`
`calendar-event` · `calendar-today` · `calendar-recurring`
`history` · `time-back`
`moon` · `moon-filled`
`sun` · `sun-filled`
`date-picker`

### Security & Privacy
`key`
`lock` · `lock-open`
`shield` · `shield-check`
`cloud-upload` · `cloud-download`

### Files & Documents
`file` · `file-filled`
`file-add` · `file-remove` · `file-search` · `file-check` · `file-lock`
`file-text` · `file-code` · `file-image`
`folder` · `folder-open` · `folder-add`
`attachment` · `paperclip`
`trash` · `trash-filled`
`document-duplicate`
`document-download` · `document-upload`
`send` · `paper-plane`
`inbox` · `share` · `share-filled`
`export` · `import` · `copy`
`clipboard` · `clipboard-check`
`archive` · `save`
`pdf` · `spreadsheet` · `presentation`
`external-link`

### Tables & Data Views
`table` · `table-rows` · `table-columns`
`table-add` · `table-merge` · `table-split`

### Search & Zoom
`search`
`search-plus` · `search-minus`
`search-loading`

### Charts & Analytics
`chart-line` · `chart-bar` · `chart-pie`
`trending-up`

### Communication & Messaging
`message` · `message-filled`
`message-add` · `message-remove` · `message-dots`
`chat-bubble`
`mail` · `mail-filled` · `mail-open`
`inbox-message` · `send-message`
`video-call` · `video-call-filled` · `video-call-off`
`phone` · `phone-filled` · `phone-off`
`broadcast`
`notification-bell` · `notification-bell-off`
`whatsapp`

### Drag, Move & Position
`drag` · `drag-handle` · `drag-indicator`
`move` · `move-arrows`
`crosshair`

### Visibility
`eye` · `eye-off` · `eye-filled`
`wave` / `preview`

### Media & Image
`image` · `image-filled`
`image-add` · `image-remove`
`camera` · `video`
`play` · `pause` · `stop`

### HR & Workplace
`briefcase` · `briefcase-filled`
`clipboard-list`
`award` · `award-filled`
`certificate` · `badge`
`building` · `building-filled` · `building-office`
`org` · `hierarchy`
`shield-person`
`target`
`graduation` / `mortarboard`
`id-card`
`coffee`

### Social & Reactions
`thumbs-up` · `thumbs-up-filled`
`thumbs-down` · `thumbs-down-filled`
`trophy` · `trophy-filled`
`person-add` · `person-add-filled`
`heart` · `heart-filled`
`bookmark` · `bookmark-filled`
`flag` · `flag-filled`
`star` · `star-filled`
`share-social` · `network`
`emoji` · `emoji-happy` · `emoji-sad`
`reaction-heart` · `reaction-laugh` · `reaction-wow` · `reaction-sad` · `reaction-angry`

### Finance & Payroll
`currency-rupee` · `currency-dollar`
`wallet` · `credit-card` · `card-payment`
`bank-transfer`
`coin` · `coins`
`receipt` · `receipt-tax`
`payslip` · `salary` · `expense`
`reimbursement` · `loan` · `tax`
`phone-pay` · `database-pay`

### Actions & Controls
`plus` · `plus-circle` · `plus-circle-filled`
`minus` · `minus-circle` · `minus-circle-filled`
`close` · `close-circle` · `close-circle-filled`
`close-square` · `close-square-filled`
`check` · `check-circle` · `check-circle-filled`
`check-square` · `check-square-filled`
`delete` · `delete-filled`
`edit` · `edit-filled`
`pencil` · `pencil-filled`
`refresh` · `refresh-circle` · `sync`
`headphones` · `headphones-alt`
`lightbulb` · `lightbulb-sparkle`
`ai-sparkle`
`wand` · `wand-sparkle`
`cursor` · `cursor-click`
`pin` · `pin-filled` · `unpin`
`globe` · `language` / `translate`
`verified` · `verified-filled`
`prohibited` / `ban`
`microphone` · `microphone-off`
`screen-share`
`code` · `</>`
`truck` / `delivery`
`network-nodes`
`monitor`
`wifi` · `wifi-off`
`deactivate`
`external`
`branch`
