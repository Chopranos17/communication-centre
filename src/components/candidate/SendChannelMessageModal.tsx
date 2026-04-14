import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import {
  composeSendSms,
  composeSendWhatsApp,
  fetchSmsNumberForUser,
} from "../../api/candidatesClient";
import { PERSONA_TO_USER_ID } from "../../constants/personaUserIds";
import { usePersona } from "../../context/PersonaContext";
import {
  resolveWhatsAppErrorBannerText,
  smsVendorError,
} from "../../utils/sendFeedbackMessages";
import { useToast } from "../../contexts/ToastContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import {
  sdsButtonPrimary,
  sdsButtonSecondary,
} from "../../lib/sdsButtonClasses";
import {
  sdsModalBody,
  sdsModalCloseButton,
  sdsModalFooter,
  sdsModalHeader,
  sdsModalTitle,
  sdsSidePanelBackdropButton,
  sdsSidePanelContainerNarrow,
  sdsSidePanelRoot,
} from "../../lib/sdsModalClasses";
import { sdsLabel, sdsTextarea } from "../../lib/sdsFormClasses";

const WHATSAPP_FROM =
  import.meta.env.VITE_WHATSAPP_BUSINESS_NAME ?? "Darwinbox WhatsApp Business";

export type SendChannelMessageModalProps = {
  open: boolean;
  onClose: () => void;
  variant: "sms" | "whatsapp";
  candidateId: string;
  candidateName: string;
  jobId: string;
  /** Display string for To field (name + number) */
  toDisplay: string;
  onSent: () => void;
};

export function SendChannelMessageModal({
  open,
  onClose,
  variant,
  candidateId,
  candidateName,
  jobId,
  toDisplay,
  onSent,
}: SendChannelMessageModalProps) {
  const { showToast } = useToast();
  const { canManageRecruitment, persona } = usePersona();
  const senderUserId =
    canManageRecruitment &&
    (persona === "recruiter" || persona === "hiring_lead")
      ? PERSONA_TO_USER_ID[persona]
      : undefined;

  const [text, setText] = useState("");
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [smsFromLoading, setSmsFromLoading] = useState(false);
  const [smsFromLine, setSmsFromLine] = useState<{
    label: string;
    phone: string;
  } | null>(null);
  const [smsFromWarning, setSmsFromWarning] = useState<string | null>(null);

  useEffect(() => {
    if (!open) return;
    setText("");
    setSending(false);
    setBanner(null);
  }, [open, candidateId, variant]);

  useEffect(() => {
    if (!open || variant !== "sms") {
      setSmsFromLoading(false);
      setSmsFromLine(null);
      setSmsFromWarning(null);
      return;
    }
    if (!senderUserId) {
      setSmsFromLoading(false);
      setSmsFromLine(null);
      setSmsFromWarning(
        "Switch to Recruiter or Hiring Lead to send with a dedicated number.",
      );
      return;
    }
    let cancelled = false;
    setSmsFromLoading(true);
    setSmsFromWarning(null);
    void (async () => {
      try {
        const data = await fetchSmsNumberForUser(senderUserId);
        if (cancelled) return;
        if (data.phoneNumber) {
          setSmsFromLine({
            label: data.displayLabel ?? data.phoneNumber,
            phone: data.phoneNumber,
          });
          setSmsFromWarning(data.warning ?? null);
        } else {
          setSmsFromLine(null);
          setSmsFromWarning(
            data.warning ?? "No SMS sending number is configured.",
          );
        }
      } catch {
        if (!cancelled) {
          setSmsFromLine(null);
          setSmsFromWarning("Could not load sending number.");
        }
      } finally {
        if (!cancelled) setSmsFromLoading(false);
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open, variant, senderUserId]);

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
      if (e.key === "Escape") onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose]);

  const send = useCallback(async () => {
    const body = text.trim();
    if (!body || sending) return;
    setSending(true);
    setBanner(null);
    const payload = {
      jobId,
      text: body,
      senderName: "Recruiter",
      ...(senderUserId ? { senderUserId } : {}),
    };
    let result: Awaited<ReturnType<typeof composeSendSms>>;
    try {
      result =
        variant === "sms"
          ? await composeSendSms(candidateId, payload)
          : await composeSendWhatsApp(candidateId, payload);
    } catch {
      setSending(false);
      showToast("error", "Message could not be sent");
      return;
    }
    setSending(false);
    if (result.success) {
      onSent();
      setTimeout(() => {
        onClose();
        showToast(
          "success",
          variant === "sms"
            ? "SMS sent successfully"
            : "WhatsApp message sent",
        );
      }, 1000);
    } else {
      showToast("error", "Message could not be sent");
      const errText = result.error ?? "Unknown error";
      setBanner({
        type: "error",
        text:
          variant === "sms"
            ? smsVendorError(errText)
            : resolveWhatsAppErrorBannerText(errText),
      });
      onSent();
    }
  }, [
    text,
    sending,
    jobId,
    candidateId,
    variant,
    onSent,
    onClose,
    showToast,
    senderUserId,
  ]);

  if (!open) return null;

  const title =
    variant === "sms"
      ? `Send SMS \u2013 ${candidateName}`
      : `Send WhatsApp Message \u2013 ${candidateName}`;

  const modal = (
    <div
      className={sdsSidePanelRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="channel-compose-title"
    >
      <button
        type="button"
        className={sdsSidePanelBackdropButton}
        aria-label="Close compose"
        onClick={onClose}
      />
      <div className={sdsSidePanelContainerNarrow}>
        <div className={sdsModalHeader}>
          <h2 id="channel-compose-title" className={sdsModalTitle}>
            {title}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className={sdsModalCloseButton}
            aria-label="Close"
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>

        <div className={sdsModalBody}>
          {variant === "whatsapp" ? (
            <div
              className="mb-4 rounded-[var(--radius-md)] border border-[var(--blue-200)] bg-[var(--blue-50)] px-3 py-2 text-[length:var(--body-s)] text-[var(--charcoal-700)]"
              role="status"
            >
              Recipients must have joined the WhatsApp sandbox to receive
              messages.
            </div>
          ) : null}

          {banner ? (
            <div
              className={
                banner.type === "success"
                  ? "mb-4 rounded-[var(--radius-md)] border border-green-200 bg-green-50 px-3 py-2 text-[length:var(--body-s)] text-green-900"
                  : "mb-4 rounded-[var(--radius-md)] border border-[var(--border-error)] bg-red-50 px-3 py-2 text-[length:var(--body-s)] text-[var(--text-error)]"
              }
              role="status"
            >
              {banner.text}
            </div>
          ) : null}

          <div className="space-y-4 text-[length:var(--body-m)]">
            {variant === "whatsapp" ? (
              <div>
                <span className={`mb-1 block ${sdsLabel}`}>From</span>
                <p className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2 text-[var(--text-body)]">
                  {WHATSAPP_FROM}
                </p>
              </div>
            ) : null}
            <div>
              <span className={`mb-1 block ${sdsLabel}`}>
                To
              </span>
              <p className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2 text-[var(--text-body)]">
                {toDisplay}
              </p>
            </div>
            {variant === "sms" ? (
              <>
                {smsFromWarning ? (
                  <div
                    className="rounded-[var(--radius-md)] border border-amber-200 bg-amber-50 px-3 py-2 text-[length:var(--body-s)] text-amber-950"
                    role="status"
                  >
                    {smsFromWarning}
                  </div>
                ) : null}
                <div>
                  <span className={`mb-1 block ${sdsLabel}`}>
                    Sending from
                  </span>
                  {smsFromLoading ? (
                    <p className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2 text-[var(--text-label)]">
                      Loading…
                    </p>
                  ) : smsFromLine ? (
                    <p className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2 text-[var(--text-body)]">
                      {smsFromLine.label} ({smsFromLine.phone})
                    </p>
                  ) : (
                    <p className="rounded-[4px] border border-amber-200 bg-amber-50 px-3 py-2 text-[length:var(--body-s)] text-amber-950">
                      No number assigned for sending.
                    </p>
                  )}
                </div>
              </>
            ) : null}
            <div>
              <label
                className={`mb-1 block ${sdsLabel}`}
                htmlFor="channel-msg-text"
              >
                Message
              </label>
              <textarea
                id="channel-msg-text"
                value={text}
                onChange={(e) => setText(e.target.value)}
                rows={8}
                className={`${sdsTextarea} w-full`}
                placeholder="Type your message…"
              />
            </div>
          </div>
        </div>

        <div className={sdsModalFooter}>
          <button
            type="button"
            onClick={onClose}
            className={`${sdsButtonSecondary} px-4`}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={sending || !text.trim()}
            aria-busy={sending}
            onClick={() => void send()}
            className={`${sdsButtonPrimary} inline-flex min-w-[7rem] justify-center px-4 disabled:opacity-50`}
          >
            {sending ? (
              <span className="inline-flex items-center gap-2">
                <LoadingSpinner
                  size="sm"
                  aria-hidden
                  className="border-white border-t-transparent"
                />
                Sending…
              </span>
            ) : (
              "Send"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
