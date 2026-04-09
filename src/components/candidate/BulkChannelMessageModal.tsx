import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  composeSendSms,
  composeSendWhatsApp,
} from "../../api/candidatesClient";
import {
  resolveWhatsAppErrorBannerText,
  smsVendorError,
} from "../../utils/sendFeedbackMessages";
import { smsSegmentHint } from "../../utils/smsSegments";
import { useToast } from "../../contexts/ToastContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import {
  sdsButtonIconTertiary,
  sdsButtonLink,
  sdsButtonPrimary,
  sdsButtonSecondary,
} from "../../lib/sdsButtonClasses";
import { sdsHelpText, sdsLabel, sdsTextarea } from "../../lib/sdsFormClasses";
import {
  sdsSidePanelBackdropButton,
  sdsSidePanelContainerMedium,
  sdsSidePanelRoot,
} from "../../lib/sdsModalClasses";

const SMS_FROM =
  import.meta.env.VITE_SMS_SENDER_LABEL ?? "Twilio SMS (Sender ID)";
const WHATSAPP_FROM =
  import.meta.env.VITE_WHATSAPP_BUSINESS_NAME ?? "Darwinbox WhatsApp Business";

const WHATSAPP_MAX = 4096;

export type BulkChannelRecipient = {
  candidateId: string;
  name: string;
  jobId: string;
  /** Phone for SMS; WhatsApp number for WhatsApp (dedicated field). */
  address: string;
};

export type BulkChannelMessageModalProps = {
  open: boolean;
  onClose: () => void;
  variant: "sms" | "whatsapp";
  jobIdFallback: string;
  /** Initial rows that can receive (have phone / whatsapp_number). */
  initialRecipients: BulkChannelRecipient[];
  skippedNoContactCount: number;
  skippedReason: "phone" | "whatsapp";
  onComplete: (summary: string) => void;
  onSent: () => void;
};

type Phase = "compose" | "sending" | "summary";

export function BulkChannelMessageModal({
  open,
  onClose,
  variant,
  jobIdFallback,
  initialRecipients,
  skippedNoContactCount,
  skippedReason,
  onComplete,
  onSent,
}: BulkChannelMessageModalProps) {
  const { showToast } = useToast();
  const [recipients, setRecipients] = useState<BulkChannelRecipient[]>([]);
  const [text, setText] = useState("");
  const [phase, setPhase] = useState<Phase>("compose");
  const [sendIndex, setSendIndex] = useState(0);
  const [sendTotal, setSendTotal] = useState(0);
  const [sentOk, setSentOk] = useState(0);
  const [sentFail, setSentFail] = useState(0);
  const [lastError, setLastError] = useState<string | null>(null);

  const recipientKey = useMemo(
    () => initialRecipients.map((r) => r.candidateId).join("|"),
    [initialRecipients],
  );

  useEffect(() => {
    if (!open) return;
    setRecipients([...initialRecipients]);
    setText("");
    setPhase("compose");
    setSendIndex(0);
    setSendTotal(0);
    setSentOk(0);
    setSentFail(0);
    setLastError(null);
  }, [open, recipientKey, variant]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (phase === "sending") return;
      onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, phase]);

  const removeRecipient = useCallback((candidateId: string) => {
    setRecipients((prev) => prev.filter((r) => r.candidateId !== candidateId));
  }, []);

  const smsHint = smsSegmentHint(text);
  const fromLabel = variant === "sms" ? SMS_FROM : WHATSAPP_FROM;
  const title =
    variant === "sms"
      ? `Send SMS (${recipients.length} candidate${recipients.length === 1 ? "" : "s"})`
      : `Send WhatsApp (${recipients.length} candidate${recipients.length === 1 ? "" : "s"})`;

  const skippedLabel =
    skippedReason === "phone"
      ? "phone number"
      : "WhatsApp number";

  const handleSend = useCallback(async () => {
    const body = text.trim();
    if (!body || recipients.length === 0) return;

    if (variant === "whatsapp" && body.length > WHATSAPP_MAX) return;

    setPhase("sending");
    setSendTotal(recipients.length);
    let ok = 0;
    let fail = 0;
    let err: string | null = null;

    try {
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        setSendIndex(i + 1);
        const payload = {
          jobId: r.jobId.trim() || jobIdFallback,
          text: body,
          senderName: "Recruiter" as const,
        };
        const result =
          variant === "sms"
            ? await composeSendSms(r.candidateId, payload)
            : await composeSendWhatsApp(r.candidateId, payload);
        if (result.success) ok++;
        else {
          fail++;
          if (result.error) err = result.error;
        }
      }
    } catch {
      setPhase("compose");
      setSendIndex(0);
      setSendTotal(0);
      showToast("error", "Message could not be sent");
      return;
    }

    setSentOk(ok);
    setSentFail(fail);
    setLastError(err);
    setPhase("summary");
    onSent();

    const userRemoved = initialRecipients.length - recipients.length;
    let cleanSummary = `Sent to ${ok} candidate${ok === 1 ? "" : "s"}`;
    if (fail > 0) cleanSummary += `. ${fail} failed`;
    if (skippedNoContactCount > 0) {
      cleanSummary += `. ${skippedNoContactCount} skipped (no ${skippedLabel})`;
    }
    if (userRemoved > 0) {
      cleanSummary += `. ${userRemoved} not sent (removed from list)`;
    }
    onComplete(cleanSummary);
    if (ok > 0) {
      showToast(
        "success",
        variant === "sms"
          ? `SMS sent to ${ok} candidates`
          : `WhatsApp sent to ${ok} candidates`,
      );
    } else {
      showToast("error", "Message could not be sent");
    }
  }, [
    text,
    recipients,
    variant,
    jobIdFallback,
    skippedNoContactCount,
    skippedLabel,
    initialRecipients.length,
    onSent,
    onComplete,
    showToast,
  ]);

  if (!open) return null;

  const visibleRecipients = recipients.slice(0, 5);
  const moreCount = recipients.length - visibleRecipients.length;

  const modal = (
    <div
      className={sdsSidePanelRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-channel-title"
    >
      <button
        type="button"
        className={sdsSidePanelBackdropButton}
        aria-label="Close"
        onClick={() => {
          if (phase === "compose") onClose();
        }}
      />
      <div className={sdsSidePanelContainerMedium}>
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2
            id="bulk-channel-title"
            className="pr-2 text-[length:var(--title-xxs)] font-bold text-[var(--text-title)]"
            style={{ fontWeight: "var(--font-weight-bold)" }}
          >
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            disabled={phase === "sending"}
            className={`${sdsButtonIconTertiary} disabled:opacity-40`}
            aria-label="Close"
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>

        <div className="scrollbar-sleek min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {phase === "summary" ? (
            <div className="space-y-4 text-[length:var(--body-m)] text-[var(--text-body)]">
              <p className="font-medium text-[var(--text-title)]">Summary</p>
              <ul className="list-none space-y-2">
                <li>✓ Sent: {sentOk} candidate{sentOk === 1 ? "" : "s"}</li>
                {skippedNoContactCount > 0 ? (
                  <li>
                    ⚠ Skipped: {skippedNoContactCount} candidate
                    {skippedNoContactCount === 1 ? "" : "s"} (no {skippedLabel})
                  </li>
                ) : null}
                <li>
                  ✗ Failed: {sentFail}
                  {lastError && sentFail > 0 ? (
                    <span className="mt-1 block text-[length:var(--body-s)] text-[var(--text-error)]">
                      {variant === "sms"
                        ? smsVendorError(lastError)
                        : resolveWhatsAppErrorBannerText(lastError)}
                    </span>
                  ) : null}
                </li>
              </ul>
            </div>
          ) : phase === "sending" ? (
            <div className="flex flex-col items-center justify-center gap-4 py-12 text-center">
              <LoadingSpinner size="md" aria-hidden />
              <p className="text-[length:var(--body-m)] text-[var(--text-body)]">
                Sending to candidate {sendIndex} of {sendTotal}…
              </p>
            </div>
          ) : (
            <>
              <p className="mb-3 text-[length:var(--body-m)] text-[var(--text-body)]">
                Sending to {recipients.length} candidate
                {recipients.length === 1 ? "" : "s"}
              </p>

              {skippedNoContactCount > 0 ? (
                <div
                  className="mb-4 rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-3 py-2 text-[length:var(--body-s)] text-amber-950"
                  role="status"
                >
                  {skippedNoContactCount} candidate
                  {skippedNoContactCount === 1 ? "" : "s"} have no{" "}
                  {skippedLabel} and will be skipped.
                </div>
              ) : null}

              {variant === "whatsapp" ? (
                <div
                  className="mb-4 rounded-[var(--radius-md)] border border-[var(--blue-200)] bg-[var(--blue-50)] px-3 py-2 text-[length:var(--body-s)] text-[var(--charcoal-700)]"
                  role="status"
                >
                  Recipients must have joined the WhatsApp sandbox to receive
                  messages.
                </div>
              ) : null}

              <div className="mb-4">
                <span className="mb-2 block text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
                  Recipients
                </span>
                <div
                  className="scrollbar-sleek max-h-[11.5rem] space-y-2 overflow-y-auto rounded-[4px] border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2"
                >
                  {recipients.length === 0 ? (
                    <p className="text-[length:var(--body-s)] text-[var(--text-label)]">
                      Add at least one recipient with a {skippedLabel}.
                    </p>
                  ) : (
                    visibleRecipients.map((r) => (
                      <div
                        key={r.candidateId}
                        className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] py-2 last:border-0 last:pb-0"
                      >
                        <div className="min-w-0">
                          <p className="font-medium text-[var(--text-body)]">
                            {r.name}
                          </p>
                          <p className="break-all text-[length:var(--body-s)] text-[var(--text-label)]">
                            {r.address}
                          </p>
                        </div>
                        <button
                          type="button"
                          className={`${sdsButtonLink} shrink-0 p-0.5 text-[var(--charcoal-400)] hover:text-[var(--text-error)]`}
                          aria-label={`Remove ${r.name}`}
                          onClick={() => removeRecipient(r.candidateId)}
                        >
                          ×
                        </button>
                      </div>
                    ))
                  )}
                </div>
                {moreCount > 0 ? (
                  <p className="mt-1 text-[length:var(--body-s)] text-[var(--text-label)]">
                    and {moreCount} more
                  </p>
                ) : null}
              </div>

              <div className="space-y-4 text-[length:var(--body-m)]">
                <div>
                  <span className={`mb-1 block ${sdsLabel}`}>
                    From
                  </span>
                  <p className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2 text-[var(--text-body)]">
                    {fromLabel}
                  </p>
                </div>
                <div>
                  <label
                    className={`mb-1 block ${sdsLabel}`}
                    htmlFor="bulk-channel-msg"
                  >
                    Message
                  </label>
                  <textarea
                    id="bulk-channel-msg"
                    value={text}
                    onChange={(e) => setText(e.target.value)}
                    rows={8}
                    maxLength={variant === "whatsapp" ? WHATSAPP_MAX : undefined}
                    className={`${sdsTextarea} w-full`}
                    placeholder="Type your message…"
                  />
                  {variant === "sms" ? (
                    <p className={sdsHelpText}>
                      {smsHint.charCount}/{smsHint.unitLimit} (
                      {smsHint.segments} segment
                      {smsHint.segments === 1 ? "" : "s"})
                    </p>
                  ) : (
                    <p className={sdsHelpText}>
                      {text.length}/{WHATSAPP_MAX}
                    </p>
                  )}
                </div>
              </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
          {phase === "summary" ? (
            <button
              type="button"
              onClick={onClose}
              className={`${sdsButtonPrimary} px-4`}
            >
              Done
            </button>
          ) : phase === "sending" ? null : (
            <>
              <button
                type="button"
                onClick={onClose}
                className={`${sdsButtonSecondary} px-4`}
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={
                  !text.trim() ||
                  recipients.length === 0 ||
                  (variant === "whatsapp" && text.length > WHATSAPP_MAX)
                }
                onClick={() => void handleSend()}
                className={`${sdsButtonPrimary} inline-flex min-w-[7rem] justify-center px-4 disabled:opacity-50`}
              >
                Send
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
