import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";

import type { CurrentJobEmailRow } from "../../api/candidatesClient";
import { patchScheduledCommunication } from "../../api/candidatesClient";
import { plainTextEmailToHtml } from "../../utils/emailTemplateVars";
import { useToast } from "../../contexts/ToastContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import { sdsButtonPrimary, sdsButtonSecondary } from "../../lib/sdsButtonClasses";
import {
  sdsModalCloseButton,
  sdsModalFooter,
  sdsModalHeader,
  sdsModalTitle,
  sdsSidePanelBackdropButton,
  sdsSidePanelContainerMedium,
  sdsSidePanelRoot,
} from "../../lib/sdsModalClasses";
import { sdsInput, sdsLabel } from "../../lib/sdsFormClasses";

function minDateTimeLocalValue(): string {
  const d = new Date(Date.now() + 5 * 60 * 1000);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function isoToDatetimeLocalValue(iso: string): string {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return "";
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

function htmlToPlainForEdit(html: string): string {
  return html
    .replace(/<br\s*\/?>/gi, "\n")
    .replace(/<\/p>/gi, "\n\n")
    .replace(/<[^>]*>/g, "")
    .replace(/\n{3,}/g, "\n\n")
    .trim();
}

export type EditScheduledEmailModalProps = {
  open: boolean;
  onClose: () => void;
  candidateName: string;
  email: CurrentJobEmailRow | null;
  onUpdated: () => void | Promise<void>;
};

export function EditScheduledEmailModal({
  open,
  onClose,
  candidateName,
  email,
  onUpdated,
}: EditScheduledEmailModalProps) {
  const { showToast } = useToast();
  const [subject, setSubject] = useState("");
  const [bodyText, setBodyText] = useState("");
  const [scheduleLocal, setScheduleLocal] = useState("");
  const [saving, setSaving] = useState(false);

  useEffect(() => {
    if (!open || !email) return;
    setSubject(email.subject?.trim() ?? "");
    setBodyText(htmlToPlainForEdit(email.body));
    setScheduleLocal(
      email.scheduledFor ? isoToDatetimeLocalValue(email.scheduledFor) : "",
    );
  }, [open, email]);

  const handleSubmit = useCallback(async () => {
    if (!email) return;
    const sub = subject.trim();
    if (!sub) {
      showToast("error", "Subject is required");
      return;
    }
    if (!bodyText.trim()) {
      showToast("error", "Body is required");
      return;
    }
    if (!scheduleLocal) {
      showToast("error", "Choose a send time");
      return;
    }
    const when = new Date(scheduleLocal);
    if (Number.isNaN(when.getTime())) {
      showToast("error", "Invalid date");
      return;
    }
    const minTime = Date.now() + 5 * 60 * 1000;
    if (when.getTime() < minTime) {
      showToast(
        "error",
        "Send time must be at least 5 minutes from now",
      );
      return;
    }

    setSaving(true);
    try {
      const htmlBody = plainTextEmailToHtml(bodyText.trim());
      const r = await patchScheduledCommunication(email.id, {
        subject: sub,
        htmlBody,
        scheduledFor: when.toISOString(),
      });
      if (!r.ok) {
        showToast("error", r.error ?? "Could not update");
        return;
      }
      showToast("success", "Scheduled email updated");
      onClose();
      await onUpdated();
    } finally {
      setSaving(false);
    }
  }, [
    bodyText,
    email,
    onClose,
    onUpdated,
    scheduleLocal,
    showToast,
    subject,
  ]);

  if (!open || !email) {
    return null;
  }

  const fromDisplay = email.fromAddress?.trim() || "—";

  const modal = (
    <div className={sdsSidePanelRoot} role="dialog" aria-modal="true">
      <button
        type="button"
        className={sdsSidePanelBackdropButton}
        aria-label="Close"
        onClick={onClose}
      />
      <div className={sdsSidePanelContainerMedium}>
        <div className={sdsModalHeader}>
          <div className="min-w-0 flex-1 pr-2">
            <h2 className={sdsModalTitle}>
              Edit scheduled email — {candidateName.trim() || "Candidate"}
            </h2>
            <p className="mt-1 text-[length:var(--body-s)] text-[#4d4d4d]">
              Changes overwrite the existing scheduled message.
            </p>
          </div>
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

        <div className="scrollbar-sleek flex min-h-0 flex-1 flex-col gap-4 overflow-y-auto px-6 py-4">
          <div>
            <label className={`${sdsLabel} mb-1 block`} htmlFor="edit-sched-from">
              Send from
            </label>
            <input
              id="edit-sched-from"
              type="text"
              readOnly
              disabled
              value={fromDisplay}
              className={`${sdsInput} w-full cursor-not-allowed bg-[#f5f5f5] text-[#4d4d4d]`}
            />
          </div>
          <div>
            <label className={`${sdsLabel} mb-1 block`} htmlFor="edit-sched-subject">
              Subject
            </label>
            <input
              id="edit-sched-subject"
              type="text"
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className={`${sdsInput} w-full`}
            />
          </div>
          <div>
            <label className={`${sdsLabel} mb-1 block`} htmlFor="edit-sched-body">
              Body
            </label>
            <textarea
              id="edit-sched-body"
              rows={8}
              value={bodyText}
              onChange={(e) => setBodyText(e.target.value)}
              className={`${sdsInput} min-h-[10rem] w-full resize-y font-darwin`}
            />
          </div>
          <div>
            <label
              className={`${sdsLabel} mb-1 block`}
              htmlFor="edit-sched-when"
            >
              Reschedule for
            </label>
            <input
              id="edit-sched-when"
              type="datetime-local"
              min={minDateTimeLocalValue()}
              value={scheduleLocal}
              onChange={(e) => setScheduleLocal(e.target.value)}
              className={`${sdsInput} w-full`}
            />
          </div>
        </div>

        <div
          className={`${sdsModalFooter} w-full shrink-0 justify-end`}
        >
          <button
            type="button"
            disabled={saving}
            onClick={onClose}
            className={sdsButtonSecondary}
          >
            Cancel
          </button>
          <button
            type="button"
            disabled={saving}
            onClick={() => void handleSubmit()}
            className={sdsButtonPrimary}
          >
            {saving ? (
              <span className="inline-flex items-center gap-2">
                <LoadingSpinner
                  size="sm"
                  aria-hidden
                  className="border-white border-t-transparent"
                />
                Updating…
              </span>
            ) : (
              "Update & reschedule"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
