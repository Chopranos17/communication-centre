/**
 * SDS Button & Pill — docs/design-system/sds/COMPONENTS.md (Button, Pill/Badge, Tabs)
 */

export const sdsBtnBase =
  "inline-flex items-center justify-center rounded-sds-4 font-darwin font-medium transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

export const sdsBtnMd = "h-9 px-3 text-body-m";

export const sdsBtnPrimary =
  "bg-[#131313] text-white hover:bg-[#292929] active:bg-black";

export const sdsBtnSecondary =
  "bg-white border border-[#e0e0e0] text-[#131313] hover:bg-[#f5f5f5]";

export const sdsBtnTheme =
  "bg-white border border-[#0183FF] text-[#0183FF] hover:bg-[#E6F3FF]";

export const sdsBtnTertiary =
  "bg-transparent text-[#4d4d4d] hover:bg-[#f5f5f5]";

/** Default md primary CTA */
export const sdsButtonPrimary = `${sdsBtnBase} ${sdsBtnMd} ${sdsBtnPrimary}`;

/** Primary icon-only (split button segment) */
export const sdsButtonPrimaryIconOnly = `${sdsBtnBase} ${sdsBtnPrimary} h-9 w-9 shrink-0 p-0`;

/**
 * Primary split button — use inside a single bordered wrapper (grid/flex).
 * Intentionally does NOT reuse {@link sdsBtnBase}: that includes `ring-offset-1`,
 * which cannot be reliably overridden and reads as a white “halo” on dark fills.
 */
export const sdsButtonPrimarySplitLeft =
  "inline-flex h-9 items-center justify-center gap-1 rounded-none border-0 bg-[#131313] px-4 font-darwin text-body-m font-medium text-white transition-colors duration-150 hover:bg-[#292929] active:bg-black focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0183FF] disabled:cursor-not-allowed disabled:opacity-50";

export const sdsButtonPrimarySplitRight =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-none border-0 border-l border-white/25 bg-[#131313] p-0 font-darwin font-medium text-white transition-colors duration-150 hover:bg-[#292929] active:bg-black focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0183FF] disabled:cursor-not-allowed disabled:opacity-50";

/** Default md secondary (outlined neutral) */
export const sdsButtonSecondary = `${sdsBtnBase} ${sdsBtnMd} ${sdsBtnSecondary}`;

/** Default md theme (blue outline) */
export const sdsButtonTheme = `${sdsBtnBase} ${sdsBtnMd} ${sdsBtnTheme}`;

/** Icon-only square (e.g. overflow ⋮, close × on chrome) */
export const sdsButtonIconTertiary = `${sdsBtnBase} ${sdsBtnTertiary} h-9 w-9 shrink-0 p-0`;

/** Table row overflow (32px) */
export const sdsButtonIconTertiarySm = `${sdsBtnBase} ${sdsBtnTertiary} h-8 w-8 shrink-0 p-0 rounded-sds-4`;

/** Inline toolbar icon (24px) */
export const sdsButtonIconTertiaryMini = `${sdsBtnBase} ${sdsBtnTertiary} h-6 w-6 shrink-0 p-0 rounded-sds-4`;

/** Extra-small icon (20px hit area) */
export const sdsButtonIconTertiaryXs = `${sdsBtnBase} ${sdsBtnTertiary} h-5 w-5 shrink-0 p-0 rounded-sds-4`;

/** Top bar: circular icon (40px) */
export const sdsTopBarIconButton = `${sdsBtnBase} ${sdsBtnTertiary} h-10 w-10 shrink-0 rounded-full p-0`;

/** Secondary compact (thread toolbars) */
export const sdsButtonSecondaryCompact = `${sdsBtnBase} ${sdsBtnSecondary} h-8 px-3 text-body-s`;

/** Selection pill (toggle) — size M — COMPONENTS Selection Pills */
export const sdsPillBase =
  "inline-flex items-center rounded-sds-24 border font-darwin font-book transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50";

export const sdsPillMd = "h-8 px-3 gap-1 text-body-m";

export const sdsPillSelected =
  "border-[#0183FF] bg-[#E6F3FF] text-[#0183FF] font-medium";

export const sdsPillUnselected =
  "border-[#e0e0e0] bg-white text-[#4d4d4d] hover:border-[#0183FF]";

export const sdsPillMdSelected = `${sdsPillBase} ${sdsPillMd} ${sdsPillSelected}`;

export const sdsPillMdUnselected = `${sdsPillBase} ${sdsPillMd} ${sdsPillUnselected}`;

/** Horizontal tab strip container — candidate detail tabs */
export const sdsTabStripContainer = "flex border-b border-[#e0e0e0]";

/** Horizontal tab strip (M, h-12) — COMPONENTS Tabs */
export const sdsTabBtnBase =
  "-mb-px flex h-12 items-center border-b-2 px-4 text-body-m font-darwin transition-colors duration-150 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1";

export const sdsTabBtnActive =
  "border-[#0183FF] text-[#0183FF] font-medium";

export const sdsTabBtnInactive =
  "border-transparent font-book text-[#4d4d4d] hover:bg-[#f5f5f5]";

/** Link variant (text CTA, not filled) */
export const sdsButtonLink =
  "inline-flex items-center gap-1 bg-transparent p-0 font-darwin font-medium text-[#0183FF] transition-colors duration-150 hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1 disabled:cursor-not-allowed disabled:opacity-50 text-body-m";

/** Compact secondary (Retry, pagination) */
export const sdsButtonSecondarySm = `${sdsBtnBase} ${sdsBtnSecondary} h-8 px-2 text-body-s`;

/** Square secondary (overflow on toolbars) */
export const sdsButtonSecondaryIcon = `${sdsBtnBase} ${sdsBtnSecondary} h-9 w-9 shrink-0 p-0`;

/**
 * Fixed bottom bulk-selection bar (dark chrome): primary CTA — white fill, dark text.
 */
export const sdsButtonBulkBarPrimary =
  "inline-flex h-9 items-center justify-center rounded-sds-4 border border-transparent bg-white px-4 font-darwin text-body-m font-medium text-[#292929] shadow-none transition-colors duration-150 hover:bg-[#f5f5f5] active:bg-[#e8e8e8] focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0183FF] disabled:cursor-not-allowed disabled:opacity-50";

/** Bulk bar: Cancel — white border and label, transparent on dark bar */
export const sdsButtonBulkBarGhost =
  "inline-flex h-9 items-center justify-center rounded-sds-4 border border-white bg-transparent px-4 font-darwin text-body-m font-medium text-white shadow-none transition-colors duration-150 hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50";

/** Bulk bar: overflow (⋮) on dark bar */
export const sdsButtonBulkBarIcon =
  "inline-flex h-9 w-9 shrink-0 items-center justify-center rounded-sds-4 border border-white bg-transparent p-0 font-darwin text-white shadow-none transition-colors duration-150 hover:bg-white/10 active:bg-white/20 focus:outline-none focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-white/50 disabled:cursor-not-allowed disabled:opacity-50";

/** Dropdown / menu row */
export const sdsMenuItemBtn =
  "flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-body-m font-book text-[#131313] transition-colors hover:bg-[#f5f5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-[#0183FF] disabled:cursor-not-allowed disabled:opacity-50";
