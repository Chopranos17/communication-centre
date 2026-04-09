/**
 * SDS Data Table — layout tokens for recruitment list tables.
 * Status pill colors — task spec (candidate pipeline).
 */

export const sdsDataTableShell =
  "w-full min-w-0 overflow-hidden rounded-sds-8 border border-[#e0e0e0] bg-white";

export const sdsDataTable = "w-full border-collapse text-left text-body-m";

export const sdsDataTableHeadRow =
  "border-b border-[#e0e0e0] bg-[#f5f5f5] text-body-s font-medium text-[#4d4d4d] uppercase tracking-wide";

export const sdsDataTableTh = "px-4 py-3";

export const sdsDataTableTd =
  "px-4 py-3 text-body-m text-[#131313] border-b border-[#e0e0e0]";

/** Row hover; bottom divider comes from `sdsDataTableTd`. */
export const sdsDataTableRow = "hover:bg-[#F5FAFF]";

export const sdsDataTableRowSelected = "bg-[#E6F3FF] hover:bg-[#E6F3FF]";

export const sdsDataTableCheckbox = "shrink-0 rounded-sds-2 border border-[#e0e0e0]";

/** SDS Pill base for inline status chips */
export const sdsStatusPillBase =
  "inline-flex max-w-full min-w-0 items-center rounded-sds-24 px-2 py-0.5 text-body-s font-medium";

/**
 * Maps candidate pipeline status labels to SDS semantic pill colors.
 */
export function candidateStatusPillClass(status: string): string {
  const base = sdsStatusPillBase;
  const s = status.trim().toLowerCase();
  if (s.includes("interview")) return `${base} bg-[#E6F3FF] text-[#0183FF]`;
  if (s.includes("assessment")) return `${base} bg-[#fef9e6] text-[#b45309]`;
  if (s.includes("shortlist")) return `${base} bg-[#fef9e6] text-[#b45309]`;
  if (s.includes("pre offer") || s.includes("pre-offer") || s.includes("preoffer"))
    return `${base} bg-[#f3e8ff] text-[#7c3aed]`;
  if (s.includes("reject")) return `${base} bg-[#fde8e8] text-[#d32f2f]`;
  if (s.includes("applied")) return `${base} bg-[#f5f5f5] text-[#4d4d4d]`;
  return `${base} bg-[#f5f5f5] text-[#4d4d4d]`;
}

export function jobOpeningStatusPillClass(
  variant: "open" | "draft" | "hold",
): string {
  const base = sdsStatusPillBase;
  if (variant === "open") return `${base} bg-[#E6F3FF] text-[#0183FF]`;
  if (variant === "hold") return `${base} bg-[#fef9e6] text-[#b45309]`;
  return `${base} bg-[#f5f5f5] text-[#4d4d4d]`;
}
