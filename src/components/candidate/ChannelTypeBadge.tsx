import type { CurrentJobEmailRow, TimelineChannel } from "../../api/candidatesClient";

type Props = {
  channel: TimelineChannel;
  filterBucket: CurrentJobEmailRow["filterBucket"];
  senderType?: string;
  className?: string;
};

const pill =
  "inline-flex max-w-full shrink-0 items-center rounded-full px-2 py-0.5 text-[11px] font-medium ";

/**
 * Channel pill on the communications timeline.
 */
export function ChannelTypeBadge({
  channel,
  filterBucket,
  senderType,
  className,
}: Props) {
  const extra = className ?? "";

  if (channel === "system") {
    return null;
  }
  if (channel === "sms") {
    return (
      <span className={`${pill} bg-amber-100 text-amber-800 ${extra}`} title="SMS">
        SMS
      </span>
    );
  }
  if (channel === "whatsapp") {
    return (
      <span className={`${pill} bg-green-100 text-green-800 ${extra}`} title="WhatsApp">
        WhatsApp
      </span>
    );
  }
  if (channel === "meeting") {
    return (
      <span className={`${pill} bg-purple-100 text-purple-800 ${extra}`} title="Meeting">
        Meeting
      </span>
    );
  }
  // email
  if (filterBucket === "system") {
    if (senderType === "CRM") {
      return (
        <span className={`${pill} bg-violet-100 text-violet-800 ${extra}`} title="CRM">
          CRM
        </span>
      );
    }
    return (
      <span className={`${pill} bg-gray-100 text-gray-800 ${extra}`} title="System email">
        System
      </span>
    );
  }
  return (
    <span className={`${pill} bg-blue-100 text-blue-800 ${extra}`} title="Email">
      Email
    </span>
  );
}
