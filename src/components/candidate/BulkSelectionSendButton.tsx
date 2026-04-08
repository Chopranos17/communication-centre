import { useCallback, useEffect, useMemo, useRef, useState } from "react";

const STORAGE_KEY = "bulk-candidate-last-send-channel";

export type BulkSendChannel = "email" | "sms" | "whatsapp" | "meeting";

function readStoredChannel(): BulkSendChannel {
  try {
    const v = localStorage.getItem(STORAGE_KEY);
    if (
      v === "email" ||
      v === "sms" ||
      v === "whatsapp" ||
      v === "meeting"
    ) {
      return v;
    }
  } catch {
    /* ignore */
  }
  return "email";
}

function writeStoredChannel(c: BulkSendChannel) {
  try {
    localStorage.setItem(STORAGE_KEY, c);
  } catch {
    /* ignore */
  }
}

const CHANNEL_META: Record<BulkSendChannel, { primaryLabel: string }> = {
  email: { primaryLabel: "Send Email" },
  sms: { primaryLabel: "Send SMS" },
  whatsapp: { primaryLabel: "Send WhatsApp" },
  meeting: { primaryLabel: "Schedule 1:1 Meeting" },
};

export type BulkSelectionSendButtonProps = {
  emailDisabled: boolean;
  emailTooltip?: string;
  smsDisabled: boolean;
  smsTooltip?: string;
  whatsappDisabled: boolean;
  whatsappTooltip?: string;
  meetingDisabled: boolean;
  meetingTooltip?: string;
  onActivate: (channel: BulkSendChannel) => void;
};

export function BulkSelectionSendButton({
  emailDisabled,
  emailTooltip,
  smsDisabled,
  smsTooltip,
  whatsappDisabled,
  whatsappTooltip,
  meetingDisabled,
  meetingTooltip,
  onActivate,
}: BulkSelectionSendButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
  const [lastUsed, setLastUsed] = useState<BulkSendChannel>(() =>
    readStoredChannel(),
  );
  const wrapRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    if (!menuOpen) return;
    const onDoc = (e: MouseEvent) => {
      if (!wrapRef.current?.contains(e.target as Node)) setMenuOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") setMenuOpen(false);
    };
    document.addEventListener("mousedown", onDoc);
    window.addEventListener("keydown", onKey);
    return () => {
      document.removeEventListener("mousedown", onDoc);
      window.removeEventListener("keydown", onKey);
    };
  }, [menuOpen]);

  const channelEnabled = useCallback(
    (c: BulkSendChannel) => {
      if (c === "email") return !emailDisabled;
      if (c === "sms") return !smsDisabled;
      if (c === "whatsapp") return !whatsappDisabled;
      return !meetingDisabled;
    },
    [emailDisabled, smsDisabled, whatsappDisabled, meetingDisabled],
  );

  const effectivePrimary = useMemo((): BulkSendChannel | null => {
    const order: BulkSendChannel[] = [
      "email",
      "sms",
      "whatsapp",
      "meeting",
    ];
    if (channelEnabled(lastUsed)) return lastUsed;
    for (const c of order) {
      if (channelEnabled(c)) return c;
    }
    return null;
  }, [lastUsed, channelEnabled]);

  const pickChannel = useCallback(
    (c: BulkSendChannel) => {
      if (!channelEnabled(c)) return;
      writeStoredChannel(c);
      setLastUsed(c);
      setMenuOpen(false);
      onActivate(c);
    },
    [channelEnabled, onActivate],
  );

  const primaryClick = useCallback(() => {
    if (effectivePrimary) pickChannel(effectivePrimary);
  }, [effectivePrimary, pickChannel]);

  const primaryDisabled = effectivePrimary === null;

  const options: {
    id: BulkSendChannel;
    icon: string;
    label: string;
    disabled: boolean;
    title?: string;
  }[] = [
    {
      id: "email",
      icon: "📧",
      label: "Email",
      disabled: emailDisabled,
      title: emailTooltip,
    },
    {
      id: "sms",
      icon: "💬",
      label: "SMS",
      disabled: smsDisabled,
      title: smsTooltip,
    },
    {
      id: "whatsapp",
      icon: "📱",
      label: "WhatsApp",
      disabled: whatsappDisabled,
      title: whatsappTooltip,
    },
    {
      id: "meeting",
      icon: "📅",
      label: "Schedule 1:1 Meeting",
      disabled: meetingDisabled,
      title: meetingTooltip,
    },
  ];

  return (
    <div className="relative inline-flex" ref={wrapRef}>
      {menuOpen ? (
        <div
          className="absolute bottom-full right-0 z-[120] mb-1 min-w-[14rem] overflow-hidden rounded-lg border border-[var(--border-default)] bg-[var(--bg-surface)] py-1 shadow-lg"
          role="menu"
          aria-label="Send message options"
        >
          {options.map((o) => (
            <button
              key={o.id}
              type="button"
              role="menuitem"
              disabled={o.disabled}
              title={o.title}
              onClick={() => pickChannel(o.id)}
              className="flex w-full items-center gap-2 px-4 py-2.5 text-left text-[length:var(--body-m)] text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)] disabled:cursor-not-allowed disabled:opacity-50"
            >
              <span aria-hidden>{o.icon}</span>
              <span className="flex-1">{o.label}</span>
              {lastUsed === o.id ? (
                <span
                  className="shrink-0 text-[var(--blue-600)]"
                  aria-label="Last used"
                >
                  ✓
                </span>
              ) : null}
            </button>
          ))}
        </div>
      ) : null}

      <div className="inline-flex overflow-hidden rounded border border-[var(--blue-400)]">
        <button
          type="button"
          disabled={primaryDisabled}
          onClick={primaryClick}
          className="bg-[var(--blue-500)] px-3 py-1.5 text-[length:var(--body-m)] font-medium text-[var(--white)] hover:bg-[var(--blue-600)] disabled:cursor-not-allowed disabled:opacity-50 sm:px-4"
        >
          {effectivePrimary
            ? CHANNEL_META[effectivePrimary].primaryLabel
            : "Send Message"}
        </button>
        <div
          className="w-px shrink-0 bg-[var(--blue-400)]"
          aria-hidden
        />
        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="More send options"
          onClick={() => setMenuOpen((v) => !v)}
          className="flex min-w-8 items-center justify-center bg-[var(--blue-500)] px-2 py-1.5 text-[var(--white)] hover:bg-[var(--blue-600)]"
        >
          <span aria-hidden>▾</span>
        </button>
      </div>
    </div>
  );
}
