import { useCallback, useEffect, useRef, useState } from "react";
import {
  sdsButtonBulkBarIcon,
  sdsButtonBulkBarPrimary,
  sdsMenuItemBtn,
} from "../../lib/sdsButtonClasses";

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
        className={sdsButtonBulkBarPrimary}
      >
        Send Email
      </button>

      <div className="relative inline-flex" ref={wrapRef}>
        {menuOpen ? (
          <div
            className="absolute bottom-full right-0 z-[120] mb-1 min-w-[14rem] overflow-hidden rounded-sds-8 border border-[#e0e0e0]/60 bg-white py-1 shadow-[var(--elevation-2)]"
            role="menu"
            aria-label="More bulk actions"
          >
            {COMMUNICATION_ITEMS.map((o) => (
              <button
                key={o.id}
                type="button"
                role="menuitem"
                onClick={() => pickChannel(o.id)}
                className={sdsMenuItemBtn}
              >
                {o.label}
              </button>
            ))}
            <div
              className="my-1 border-t border-[#f5f5f5]"
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
                    className={sdsMenuItemBtn}
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
                  className="cursor-not-allowed px-4 py-2.5 text-sm text-[#aaaaaa]"
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
          className={sdsButtonBulkBarIcon}
        >
          <span className="text-xl leading-none" aria-hidden>
            ⋮
          </span>
        </button>
      </div>
    </div>
  );
}
