import type { CurrentJobEmailRow, TimelineChannel } from "../../api/candidatesClient";

type Props = {
  channel: TimelineChannel;
  filterBucket: CurrentJobEmailRow["filterBucket"];
  senderType?: string;
  className?: string;
};

/**
 * Compact channel label for the communications timeline (Task 17).
 */
export function ChannelTypeBadge({
  channel,
  filterBucket,
  senderType,
  className,
}: Props) {
  const base =
    "inline-flex max-w-full shrink-0 items-center rounded px-1.5 py-0.5 text-[10px] font-bold uppercase tracking-wide " +
    (className ?? "");

  if (channel === "system") {
    return (
      <span
        className={`${base} border border-slate-200 bg-slate-100 text-slate-700`}
        title="System notification"
      >
        System
      </span>
    );
  }
  if (channel === "sms") {
    return (
      <span
        className={`${base} border border-emerald-200 bg-emerald-50 text-emerald-900`}
        title="SMS"
      >
        SMS
      </span>
    );
  }
  if (channel === "whatsapp") {
    return (
      <span
        className={`${base} border border-[#25D366]/40 bg-[#25D366]/15 text-[#075E54]`}
        title="WhatsApp"
      >
        WhatsApp
      </span>
    );
  }
  if (channel === "meeting") {
    return (
      <span
        className={`${base} border border-indigo-200 bg-indigo-50 text-indigo-900`}
        title="Meeting"
      >
        Meeting
      </span>
    );
  }
  // email
  if (filterBucket === "system") {
    if (senderType === "CRM") {
      return (
        <span
          className={`${base} border border-violet-200 bg-violet-50 text-violet-900`}
          title="CRM"
        >
          CRM
        </span>
      );
    }
    return (
      <span
        className={`${base} border border-slate-200 bg-slate-100 text-slate-700`}
        title="System email"
      >
        System
      </span>
    );
  }
  return (
    <span
      className={`${base} border border-[var(--blue-200)] bg-[var(--blue-50)] text-[var(--blue-800)]`}
      title="Email"
    >
      Email
    </span>
  );
}
