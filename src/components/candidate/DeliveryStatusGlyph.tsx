import type { EmailDeliveryStatus } from "../../api/candidatesClient";

type Props = {
  status: EmailDeliveryStatus;
  className?: string;
};

/**
 * Delivery indicators next to timestamps: sent (gray ✓), delivered (blue ✓✓), failed (red ✕). Task 17.
 */
export function DeliveryStatusGlyph({ status, className }: Props) {
  const wrap = `inline-flex shrink-0 items-center justify-center ${className ?? ""}`;

  if (status === "delivered") {
    return (
      <span className={wrap} title="Delivered" aria-label="Delivered">
        <svg
          width="18"
          height="14"
          viewBox="0 0 18 14"
          className="text-[var(--blue-500)]"
          aria-hidden
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M1 7l4 4 8-9"
          />
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M5 7l4 4 8-9"
          />
        </svg>
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span className={wrap} title="Sent" aria-label="Sent">
        <svg
          width="14"
          height="14"
          viewBox="0 0 14 14"
          className="text-[var(--charcoal-400)]"
          aria-hidden
        >
          <path
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M1 7l4 4 8-9"
          />
        </svg>
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span className={wrap} title="Failed" aria-label="Failed">
        <svg
          width="14"
          height="14"
          viewBox="0 0 24 24"
          className="text-[var(--red-500)]"
          aria-hidden
        >
          <path
            fill="currentColor"
            d="M12 2C6.47 2 2 6.47 2 12s4.47 10 10 10 10-4.47 10-10S17.53 2 12 2zm5 13.59L15.59 17 12 13.41 8.41 17 7 15.59 10.59 12 7 8.41 8.41 7 12 10.59 15.59 7 17 8.41 13.41 12 17 15.59z"
          />
        </svg>
      </span>
    );
  }
  return (
    <span
      className={`inline-flex shrink-0 items-center gap-0.5 text-[length:10px] font-semibold uppercase tracking-wide text-[var(--charcoal-400)] ${className ?? ""}`}
      title="Pending"
      aria-label="Pending delivery"
    >
      <svg width="12" height="12" viewBox="0 0 24 24" fill="currentColor" aria-hidden>
        <path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10 10-4.5 10-10S17.5 2 12 2zm0 18c-4.41 0-8-3.59-8-8s3.59-8 8-8 8 3.59 8 8-3.59 8-8 8zm.5-13H11v6l5.25 3.15.75-1.23-4.5-2.67z" />
      </svg>
      <span className="hidden sm:inline">Pending</span>
    </span>
  );
}
