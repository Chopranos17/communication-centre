/**
 * SDS Modal shell — docs/design-system/sds/COMPONENTS.md (Modal)
 */

export const sdsModalBackdrop =
  "fixed inset-0 z-50 flex items-center justify-center bg-black/40 p-4";

/** Invisible full-screen control behind the panel; pairs with sdsModalContainer (z-10). */
export const sdsModalDismissLayer =
  "absolute inset-0 z-0 cursor-default border-0 bg-transparent p-0";

export const sdsModalContainer =
  "relative z-10 flex w-full max-w-[816px] max-h-[90vh] flex-col overflow-hidden rounded-sds-8 bg-white shadow-sds-2";

export const sdsModalHeader =
  "flex shrink-0 items-center justify-between border-b border-[#e0e0e0] px-6 py-3";

export const sdsModalTitle = "pr-2 text-title-xs font-medium text-[#131313]";

export const sdsModalCloseButton =
  "flex h-7 w-7 shrink-0 items-center justify-center rounded-sds-4 text-[#4d4d4d] transition-colors hover:bg-[#f5f5f5] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#0183FF] focus-visible:ring-offset-1";

export const sdsModalBody =
  "min-h-0 flex-1 overflow-y-auto px-6 py-4 text-body-m font-book text-[#4d4d4d]";

export const sdsModalFooter =
  "flex shrink-0 justify-end gap-2 border-t border-[#e0e0e0] px-6 py-3";

/** Footer with leading control (e.g. Preview) and trailing actions. */
export const sdsModalFooterToolbar =
  "flex shrink-0 flex-wrap items-center justify-between gap-2 border-t border-[#e0e0e0] px-6 py-3";

/** Nested dialog (e.g. email preview) above the main modal shell. */
export const sdsModalNestedBackdrop =
  "fixed inset-0 z-[60] flex items-center justify-center bg-black/40 p-4";

export const sdsModalNestedContainer =
  "relative z-10 flex max-h-[85vh] w-full max-w-lg flex-col overflow-hidden rounded-sds-8 bg-white shadow-sds-2 min-h-0";
