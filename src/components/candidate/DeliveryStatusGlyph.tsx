import type { EmailDeliveryStatus } from "../../api/candidatesClient";

type Props = {
  status: EmailDeliveryStatus;
  className?: string;
};

export function DeliveryStatusGlyph({ status, className }: Props) {
  if (status === "delivered") {
    return (
      <span
        className={`inline-flex items-center gap-0.5 text-[var(--blue-500)] ${className ?? ""}`}
        title="Delivered"
        aria-label="Delivered"
      >
        <span aria-hidden>✓</span>
        <span aria-hidden className="-ml-1.5">
          ✓
        </span>
      </span>
    );
  }
  if (status === "sent") {
    return (
      <span
        className={`text-[var(--charcoal-400)] ${className ?? ""}`}
        title="Sent"
        aria-label="Sent"
      >
        ✓
      </span>
    );
  }
  if (status === "failed") {
    return (
      <span
        className={`text-[var(--red-500)] ${className ?? ""}`}
        title="Failed"
        aria-label="Failed"
      >
        ✕
      </span>
    );
  }
  return (
    <span
      className={`text-[length:var(--body-s)] font-medium text-[var(--charcoal-300)] ${className ?? ""}`}
      title="Pending"
    >
      Pending
    </span>
  );
}
