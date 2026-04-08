import { useCallback, useEffect, useRef, useState } from "react";

export type BulkSendChannel = "email" | "sms" | "whatsapp" | "meeting";

/** Page-defined rows for the overflow menu below the separator (non-communication). */
export type BulkOverflowMenuItem = {
  label: string;
  onClick?: () => void;
  disabled?: boolean;
};

export type BulkSelectionSendButtonProps = {
  emailDisabled: boolean;
  emailTooltip?: string;
  onActivate: (channel: BulkSendChannel) => void;
  secondaryMenuItems: BulkOverflowMenuItem[];
};

const COMMUNICATION_ITEMS: {
  id: Exclude<BulkSendChannel, "email">;
  label: string;
}[] = [
  { id: "sms", label: "Send SMS" },
  { id: "whatsapp", label: "Send WhatsApp" },
  { id: "meeting", label: "Schedule 1:1 Meeting" },
];

function isSecondaryInteractive(item: BulkOverflowMenuItem): boolean {
  return Boolean(item.onClick) && item.disabled !== true;
}

export function BulkSelectionSendButton({
  emailDisabled,
  emailTooltip,
  onActivate,
  secondaryMenuItems,
}: BulkSelectionSendButtonProps) {
  const [menuOpen, setMenuOpen] = useState(false);
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

  const pickChannel = useCallback(
    (c: Exclude<BulkSendChannel, "email">) => {
      setMenuOpen(false);
      onActivate(c);
    },
    [onActivate],
  );

  const onSendEmail = useCallback(() => {
    if (emailDisabled) return;
    onActivate("email");
  }, [emailDisabled, onActivate]);

  return (
    <div className="flex items-center gap-2">
      <button
        type="button"
        disabled={emailDisabled}
        title={emailTooltip}
        onClick={onSendEmail}
        className="rounded-none bg-white px-4 py-2 text-sm font-semibold text-black hover:bg-gray-100 disabled:cursor-not-allowed disabled:opacity-50"
      >
        Send Email
      </button>

      <div className="relative inline-flex" ref={wrapRef}>
        {menuOpen ? (
          <div
            className="absolute bottom-full right-0 z-[120] mb-1 min-w-[14rem] overflow-hidden rounded-lg border border-gray-200 bg-white py-1 shadow-xl"
            role="menu"
            aria-label="More bulk actions"
          >
            {COMMUNICATION_ITEMS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="menuitem"
                onClick={() => pickChannel(o.id)}
                className="flex w-full cursor-pointer items-center gap-2 px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
              >
                {o.label}
              </button>
            ))}
            <div
              className="my-1 border-t border-gray-100"
              role="separator"
              aria-hidden
            />
            {secondaryMenuItems.map((item, idx) => {
              const key = `${item.label}-${idx}`;
              if (isSecondaryInteractive(item)) {
                return (
                  <button
                    key={key}
                    type="button"
                    role="menuitem"
                    onClick={() => {
                      item.onClick?.();
                      setMenuOpen(false);
                    }}
                    className="w-full cursor-pointer px-4 py-2.5 text-left text-sm text-gray-800 hover:bg-gray-50"
                  >
                    {item.label}
                  </button>
                );
              }
              return (
                <div
                  key={key}
                  role="menuitem"
                  aria-disabled="true"
                  title="Coming soon"
                  className="cursor-not-allowed px-4 py-2.5 text-sm text-gray-400"
                >
                  {item.label}
                </div>
              );
            })}
          </div>
        ) : null}

        <button
          type="button"
          aria-expanded={menuOpen}
          aria-haspopup="menu"
          aria-label="More bulk actions"
          onClick={() => setMenuOpen((v) => !v)}
          className="inline-flex min-w-[2rem] items-center justify-center rounded-none px-2 py-2 text-white hover:text-white"
        >
          <span className="text-xl leading-none" aria-hidden>
            ⋮
          </span>
        </button>
      </div>
    </div>
  );
}
