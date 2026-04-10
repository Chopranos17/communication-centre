import { useEffect, useRef, useState } from "react";
import { Clock, MoreHorizontal } from "lucide-react";

import type { CurrentJobEmailRow } from "../../api/candidatesClient";
import {
  cancelScheduledCommunication,
  sendScheduledEmailNow,
} from "../../api/candidatesClient";
import { useToast } from "../../contexts/ToastContext";
import { formatTimelineTime } from "../../utils/communicationTimeline";
import { sdsButtonIconTertiaryMini } from "../../lib/sdsButtonClasses";

type ScheduledEmailTimelineMenuProps = {
  row: CurrentJobEmailRow;
  onEdit: () => void;
  onMutated: () => void | Promise<void>;
};

export function ScheduledEmailTimelineMenu({
  row,
  onEdit,
  onMutated,
}: ScheduledEmailTimelineMenuProps) {
  const { showToast } = useToast();
  const [open, setOpen] = useState(false);
  const [busy, setBusy] = useState(false);
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!open) return;
    const onDocMouseDown = (e: MouseEvent) => {
      const el = wrapRef.current;
      if (el && !el.contains(e.target as Node)) {
        setOpen(false);
      }
    };
    document.addEventListener("mousedown", onDocMouseDown);
    return () => document.removeEventListener("mousedown", onDocMouseDown);
  }, [open]);

  const run = async (fn: () => Promise<void>) => {
    setBusy(true);
    try {
      await fn();
      setOpen(false);
      await onMutated();
    } finally {
      setBusy(false);
    }
  };

  return (
    <div ref={wrapRef} className="relative">
      <button
        type="button"
        disabled={busy}
        className={`${sdsButtonIconTertiaryMini} mr-1 shrink-0 transition-opacity ${
          open
            ? "pointer-events-auto opacity-100"
            : "pointer-events-none opacity-0 group-hover:pointer-events-auto group-hover:opacity-100"
        }`}
        aria-expanded={open}
        aria-haspopup="menu"
        aria-label="Scheduled email actions"
        onClick={(e) => {
          e.stopPropagation();
          setOpen((o) => !o);
        }}
      >
        <MoreHorizontal className="h-3.5 w-3.5 text-[#aaaaaa]" aria-hidden />
      </button>
      {open ? (
        <div
          role="menu"
          className="absolute right-0 top-full z-[50] mt-0.5 min-w-[11rem] rounded-sds-8 border-[0.5px] border-[#e0e0e0] bg-white py-1 shadow-sds-1"
          onClick={(e) => e.stopPropagation()}
          onKeyDown={(e) => e.stopPropagation()}
        >
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            className="flex w-full items-center px-3 py-2 text-left font-darwin text-[13px] text-[#131313] hover:bg-[#f5f5f5]"
            onClick={(e) => {
              e.stopPropagation();
              setOpen(false);
              onEdit();
            }}
          >
            Edit & reschedule
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            className="flex w-full items-center px-3 py-2 text-left font-darwin text-[13px] text-[#131313] hover:bg-[#f5f5f5]"
            onClick={(e) => {
              e.stopPropagation();
              void run(async () => {
                const r = await sendScheduledEmailNow(row.id);
                if (!r.ok) {
                  showToast("error", r.error ?? "Could not send");
                  return;
                }
                if (r.deliveryStatus === "failed") {
                  showToast("error", "Email failed to send");
                  return;
                }
                showToast("success", "Email sent");
              });
            }}
          >
            Send now
          </button>
          <button
            type="button"
            role="menuitem"
            disabled={busy}
            className="flex w-full items-center px-3 py-2 text-left font-darwin text-[13px] text-[#131313] hover:bg-[#f5f5f5]"
            onClick={(e) => {
              e.stopPropagation();
              void run(async () => {
                const r = await cancelScheduledCommunication(row.id);
                if (!r.ok) {
                  showToast("error", r.error ?? "Could not cancel");
                  return;
                }
                showToast("success", "Scheduled send cancelled");
              });
            }}
          >
            Cancel scheduled
          </button>
        </div>
      ) : null}
    </div>
  );
}

/** Timeline “Sends …” line for scheduled / cancelled-with-slot cards. */
export function ScheduledSendTimestamp({
  scheduledForIso,
  variant,
}: {
  scheduledForIso: string;
  variant: "scheduled" | "cancelled";
}) {
  const label = formatTimelineTime(scheduledForIso);
  if (variant === "cancelled") {
    return (
      <span className="inline-flex items-center gap-1 text-xs text-[#aaaaaa] line-through opacity-80">
        <Clock size={12} className="shrink-0" aria-hidden />
        Sends {label}
      </span>
    );
  }
  return (
    <span className="inline-flex items-center gap-1 text-xs text-[#6366f1]">
      <Clock size={12} className="shrink-0" aria-hidden />
      Sends {label}
    </span>
  );
}
