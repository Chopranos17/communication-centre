import type { ReactNode } from "react";

type BulkSelectionBarProps = {
  children: ReactNode;
  "aria-label": string;
};

/**
 * Bulk multi-select strip: spans only the main content column (not the sidebar)
 * and matches {@link AppLayout} content width (`max-w-screen-xl` + horizontal padding).
 */
export function BulkSelectionBar({
  children,
  "aria-label": ariaLabel,
}: BulkSelectionBarProps) {
  return (
    <div
      className="fixed bottom-0 right-0 z-[100] flex justify-center px-6"
      style={{ left: "var(--app-sidebar-width)" }}
      role="region"
      aria-label={ariaLabel}
    >
      <div className="flex w-full max-w-screen-xl flex-wrap items-center justify-between gap-3 border-t border-white/10 bg-[#1e2132] px-4 pb-[max(0.75rem,env(safe-area-inset-bottom))] pt-3 shadow-[var(--elevation-3)] sm:px-6">
        {children}
      </div>
    </div>
  );
}
