import type { CurrentJobEmailRow, TimelineChannel } from "../../api/candidatesClient";

type Props = {
  channel: TimelineChannel;
  /** When set, system-initiated email uses a gear icon instead of an envelope. */
  filterBucket?: CurrentJobEmailRow["filterBucket"];
  className?: string;
};

const vb = "0 0 24 24";

const strokeSvg = {
  fill: "none" as const,
  stroke: "currentColor",
  strokeWidth: 2,
  strokeLinecap: "round" as const,
  strokeLinejoin: "round" as const,
};

/** Timeline circle icons — 24×24 viewBox, rendered at `w-3 h-3` (12px). */
export function ChannelTimelineIcon({ channel, filterBucket, className }: Props) {
  const cn = className ?? "h-3 w-3";

  const gearIcon = (
    <svg
      viewBox={vb}
      className="h-full w-full"
      aria-hidden
      {...strokeSvg}
    >
      <circle cx="12" cy="12" r="3" />
      <path d="M12 1v4m0 14v4m-9-9h4m14 0h4m-3.3-7.8l-2.8 2.8m-9.8 0L2.3 4.2m0 15.6l2.8-2.8m9.8 0l2.8 2.8" />
    </svg>
  );

  if (channel === "system") {
    return (
      <span className={`inline-flex shrink-0 ${cn}`} title="System" aria-hidden>
        {gearIcon}
      </span>
    );
  }
  if (channel === "email" && filterBucket === "system") {
    return (
      <span className={`inline-flex shrink-0 ${cn}`} title="System" aria-hidden>
        {gearIcon}
      </span>
    );
  }
  if (channel === "sms") {
    return (
      <span className={`inline-flex shrink-0 ${cn}`} title="SMS" aria-hidden>
        <svg viewBox={vb} className="h-full w-full" aria-hidden {...strokeSvg}>
          <path d="M21 15a2 2 0 01-2 2H7l-4 4V5a2 2 0 012-2h14a2 2 0 012 2z" />
        </svg>
      </span>
    );
  }
  if (channel === "meeting") {
    return (
      <span className={`inline-flex shrink-0 ${cn}`} title="Meeting" aria-hidden>
        <svg viewBox={vb} className="h-full w-full" aria-hidden {...strokeSvg}>
          <rect x="3" y="4" width="18" height="18" rx="2" />
          <path d="M16 2v4M8 2v4M3 10h18" />
        </svg>
      </span>
    );
  }
  if (channel === "whatsapp") {
    return (
      <span className={`inline-flex shrink-0 ${cn}`} title="WhatsApp" aria-hidden>
        <svg viewBox={vb} className="h-full w-full" aria-hidden {...strokeSvg}>
          <path d="M21 11.5a8.38 8.38 0 01-.9 3.8 8.5 8.5 0 01-7.6 4.7 8.38 8.38 0 01-3.8-.9L3 21l1.9-5.7a8.38 8.38 0 01-.9-3.8 8.5 8.5 0 014.7-7.6 8.38 8.38 0 013.8-.9h.5a8.48 8.48 0 018 8v.5z" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`inline-flex shrink-0 ${cn}`} title="Email" aria-hidden>
      <svg viewBox={vb} className="h-full w-full" aria-hidden {...strokeSvg}>
        <rect x="2" y="4" width="20" height="16" rx="2" />
        <path d="M22 7l-10 7L2 7" />
      </svg>
    </span>
  );
}
