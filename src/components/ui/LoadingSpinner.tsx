/**
 * Inline loading indicator for data fetches and primary actions (e.g. Send).
 * Override border colors via className for buttons (white ring on blue).
 */
export function LoadingSpinner({
  size = "md",
  className = "",
  "aria-hidden": ariaHidden,
  "aria-label": ariaLabel = "Loading",
}: {
  size?: "sm" | "md" | "lg";
  className?: string;
  "aria-hidden"?: boolean;
  "aria-label"?: string;
}) {
  const dim =
    size === "sm"
      ? "h-4 w-4 border-2"
      : size === "lg"
        ? "h-8 w-8 border-[3px]"
        : "h-5 w-5 border-2";
  return (
    <span
      className={`inline-block ${dim} animate-spin rounded-full border-[var(--blue-500)] border-t-transparent ${className}`}
      role={ariaHidden ? undefined : "status"}
      aria-hidden={ariaHidden}
      aria-label={ariaHidden ? undefined : ariaLabel}
    />
  );
}
