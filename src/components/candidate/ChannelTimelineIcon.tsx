import type { CurrentJobEmailRow, TimelineChannel } from "../../api/candidatesClient";

type Props = {
  channel: TimelineChannel;
  /** When set, system-initiated email uses a gear icon instead of an envelope. */
  filterBucket?: CurrentJobEmailRow["filterBucket"];
  className?: string;
};

const vb = "0 0 12 12";
const sw = 1.25;

/** 12×12 viewBox — size via `className` (e.g. h-3 w-3). */
export function ChannelTimelineIcon({ channel, filterBucket, className }: Props) {
  const cn = className ?? "h-3 w-3";

  const gear = (
    <>
      <circle cx={6} cy={6} r={2} stroke="currentColor" strokeWidth={sw} />
      <path
        stroke="currentColor"
        strokeWidth={sw}
        strokeLinecap="round"
        d="M6 1.25v1.5M6 9.25v1.5M1.25 6h1.5M9.25 6h1.5M2.6 2.6l1.06 1.06M8.34 8.34l1.06 1.06M9.4 2.6l-1.06 1.06M3.66 8.34l-1.06 1.06"
      />
    </>
  );

  if (channel === "system") {
    return (
      <span className={`inline-flex shrink-0 ${cn}`} title="System" aria-hidden>
        <svg viewBox={vb} fill="none" className="h-full w-full" aria-hidden>
          {gear}
        </svg>
      </span>
    );
  }
  if (channel === "email" && filterBucket === "system") {
    return (
      <span className={`inline-flex shrink-0 ${cn}`} title="System" aria-hidden>
        <svg viewBox={vb} fill="none" className="h-full w-full" aria-hidden>
          {gear}
        </svg>
      </span>
    );
  }
  if (channel === "sms") {
    return (
      <span className={`inline-flex shrink-0 ${cn}`} title="SMS" aria-hidden>
        <svg viewBox={vb} fill="none" className="h-full w-full" aria-hidden>
          <path
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M10.25 5.75c0 2-2.25 3.75-5 3.75-.6 0-1.17-.08-1.7-.22L2.25 10l.85-1.65a4.1 4.1 0 01-.6-2.1c0-2 2.25-3.75 5-3.75s5 1.75 5 3.75z"
          />
        </svg>
      </span>
    );
  }
  if (channel === "meeting") {
    return (
      <span className={`inline-flex shrink-0 ${cn}`} title="Meeting" aria-hidden>
        <svg viewBox={vb} fill="none" className="h-full w-full" aria-hidden>
          <path
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M4 2.25V1M8 2.25V1M2.75 4.5h6.5M2.5 10.75h7a1 1 0 001-1v-5a1 1 0 00-1-1h-7a1 1 0 00-1 1v5a1 1 0 001 1z"
          />
        </svg>
      </span>
    );
  }
  if (channel === "whatsapp") {
    return (
      <span className={`inline-flex shrink-0 ${cn}`} title="WhatsApp" aria-hidden>
        <svg viewBox={vb} fill="none" className="h-full w-full" aria-hidden>
          <path
            stroke="currentColor"
            strokeWidth={sw}
            strokeLinecap="round"
            strokeLinejoin="round"
            d="M3 2.25h5.25a1 1 0 011 1v4.25a1 1 0 01-1 1H5.5L3.6 10.6V8.5H3a1 1 0 01-1-1v-4a1 1 0 011-1z"
          />
          <circle cx="4.65" cy="5.75" r="0.55" fill="currentColor" />
        </svg>
      </span>
    );
  }
  return (
    <span className={`inline-flex shrink-0 ${cn}`} title="Email" aria-hidden>
      <svg viewBox={vb} fill="none" className="h-full w-full" aria-hidden>
        <path
          stroke="currentColor"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M2.25 3.25h7.5c.55 0 1 .45 1 1v4.5c0 .55-.45 1-1 1h-7.5c-.55 0-1-.45-1-1v-4.5c0-.55.45-1 1-1z"
        />
        <path
          stroke="currentColor"
          strokeWidth={sw}
          strokeLinecap="round"
          strokeLinejoin="round"
          d="M10.75 4.25l-3.5 2.5-3.5-2.5"
        />
      </svg>
    </span>
  );
}
