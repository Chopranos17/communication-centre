import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  scheduleMeeting,
  type ScheduleMeetingPayload,
} from "../../api/candidatesClient";
import { meetingInviteVendorError } from "../../utils/sendFeedbackMessages";
import { useToast } from "../../contexts/ToastContext";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import {
  sdsButtonIconTertiary,
  sdsButtonLink,
  sdsButtonPrimary,
  sdsButtonSecondary,
} from "../../lib/sdsButtonClasses";
import {
  sdsInput,
  sdsLabel,
  sdsSelectWFull,
  sdsTextarea,
} from "../../lib/sdsFormClasses";
import {
  sdsSidePanelBackdropButton,
  sdsSidePanelContainerMedium,
  sdsSidePanelRoot,
} from "../../lib/sdsModalClasses";

const DURATIONS: (15 | 30 | 45 | 60)[] = [15, 30, 45, 60];

const CHANNEL_OPTIONS: {
  value: ScheduleMeetingPayload["channel"];
  label: string;
}[] = [
  { value: "google_meet", label: "Google Meet" },
  { value: "ms_teams", label: "Microsoft Teams" },
  { value: "zoom", label: "Zoom" },
  { value: "darwinbox_meet", label: "Darwinbox Meet" },
  { value: "in_person", label: "In person" },
];

function defaultDatetimeLocal(): string {
  const d = new Date();
  d.setMinutes(0, 0, 0);
  d.setHours(d.getHours() + 1);
  const pad = (n: number) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}T${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export type BulkMeetingRecipient = {
  candidateId: string;
  name: string;
  email: string;
  jobId: string;
};

const DEFAULT_RECRUITER = {
  name: "Atharva M",
  email: "atharva.m@darwinbox.in",
};

export type BulkScheduleMeetingModalProps = {
  open: boolean;
  onClose: () => void;
  jobTitle: string;
  initialRecipients: BulkMeetingRecipient[];
  onComplete: (summary: string) => void;
  onSent: () => void;
};

type Phase = "compose" | "sending" | "summary";

export function BulkScheduleMeetingModal({
  open,
  onClose,
  jobTitle,
  initialRecipients,
  onComplete,
  onSent,
}: BulkScheduleMeetingModalProps) {
  const { showToast } = useToast();
  const [recipients, setRecipients] = useState<BulkMeetingRecipient[]>([]);
  const [title, setTitle] = useState("Candidate experience chat");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<15 | 30 | 45 | 60>(30);
  const [channel, setChannel] =
    useState<ScheduleMeetingPayload["channel"]>("google_meet");
  const [scheduledLocal, setScheduledLocal] = useState(defaultDatetimeLocal);
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
    setTitle("Candidate experience chat");
    setDescription("");
    setDuration(30);
    setChannel("google_meet");
    setScheduledLocal(defaultDatetimeLocal());
    setPhase("compose");
    setSendIndex(0);
    setSendTotal(0);
    setSentOk(0);
    setSentFail(0);
    setLastError(null);
  }, [open, recipientKey]);

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

  const canSend = useMemo(() => {
    return (
      title.trim().length > 0 &&
      recipients.length > 0 &&
      recipients.every((r) => r.jobId.trim() && r.email.trim())
    );
  }, [title, recipients]);

  const handleSend = useCallback(async () => {
    if (!canSend || phase !== "compose") return;
    const scheduledAt = new Date(scheduledLocal);
    if (Number.isNaN(scheduledAt.getTime())) return;

    setPhase("sending");
    setSendTotal(recipients.length);
    let ok = 0;
    let fail = 0;
    let err: string | null = null;

    try {
      for (let i = 0; i < recipients.length; i++) {
        const r = recipients[i];
        setSendIndex(i + 1);
        const payload: ScheduleMeetingPayload = {
          jobId: r.jobId.trim(),
          title: title.trim(),
          description: description.trim(),
          durationMinutes: duration,
          scheduledAt: scheduledAt.toISOString(),
          channel,
          participants: [
            { name: DEFAULT_RECRUITER.name, email: DEFAULT_RECRUITER.email },
            {
              name: r.name.trim(),
              email: r.email.trim(),
            },
          ],
          senderName: DEFAULT_RECRUITER.name,
        };
        const result = await scheduleMeeting(r.candidateId, payload);
        if (result.success) {
          ok++;
        } else {
          const sent = result.inviteSent ?? 0;
          if (sent > 0) ok++;
          else {
            fail++;
            if (result.error) err = result.error;
          }
        }
      }
    } catch {
      setPhase("compose");
      setSendIndex(0);
      setSendTotal(0);
      showToast("error", "Meeting could not be scheduled");
      return;
    }

    setSentOk(ok);
    setSentFail(fail);
    setLastError(err);
    setPhase("summary");
    onSent();

    const userRemoved = initialRecipients.length - recipients.length;
    let cleanSummary = `Scheduled ${ok} meeting${ok === 1 ? "" : "s"}`;
    if (fail > 0) cleanSummary += `. ${fail} failed`;
    if (userRemoved > 0) {
      cleanSummary += `. ${userRemoved} not scheduled (removed from list)`;
    }
    onComplete(cleanSummary);
    if (ok > 0) {
      showToast("success", `Meeting scheduled for ${ok} candidates`);
    } else {
      showToast("error", "Meeting could not be scheduled");
    }
  }, [
    canSend,
    phase,
    scheduledLocal,
    recipients,
    title,
    description,
    duration,
    channel,
    initialRecipients.length,
    onSent,
    onComplete,
    showToast,
  ]);

  if (!open) return null;

  const n = recipients.length;
  const visibleRecipients = recipients.slice(0, 5);
  const moreCount = recipients.length - visibleRecipients.length;

  const modal = (
    <div
      className={sdsSidePanelRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="bulk-meeting-title"
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
            id="bulk-meeting-title"
            className="text-[length:var(--title-xxs)] font-bold text-[var(--text-title)]"
            style={{ fontWeight: "var(--font-weight-bold)" }}
          >
            Schedule 1:1 Meetings ({n} candidate{n === 1 ? "" : "s"})
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
                <li>✓ Scheduled: {sentOk} meeting{sentOk === 1 ? "" : "s"}</li>
                <li>✗ Failed: {sentFail}</li>
                {lastError && sentFail > 0 ? (
                  <li className="text-[length:var(--body-s)] text-[var(--text-error)]">
                    {meetingInviteVendorError(lastError)}
                  </li>
                ) : null}
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
              <p className="mb-2 text-[length:var(--body-s)] text-[var(--text-label)]">
                Job: <span className="text-[var(--text-body)]">{jobTitle}</span>
              </p>
              <p className="mb-3 rounded-[var(--radius-md)] border border-[var(--blue-200)] bg-[var(--blue-50)] px-3 py-2 text-[length:var(--body-s)] text-[var(--charcoal-700)]">
                Individual meetings will be created for each candidate (not a
                group meeting). This will create {n} separate meeting
                invitations. The organizer ({DEFAULT_RECRUITER.name}) is included
                on every invite.
              </p>

              <div className="mb-4">
                <span className="mb-2 block text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
                  Candidates
                </span>
                <div className="scrollbar-sleek max-h-[11.5rem] space-y-2 overflow-y-auto rounded border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2">
                  {visibleRecipients.map((r) => (
                    <div
                      key={r.candidateId}
                      className="flex items-start justify-between gap-2 border-b border-[var(--border-subtle)] py-2 last:border-0 last:pb-0"
                    >
                      <div className="min-w-0">
                        <p className="font-medium text-[var(--text-body)]">
                          {r.name}
                        </p>
                        <p className="break-all text-[length:var(--body-s)] text-[var(--text-label)]">
                          {r.email}
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
                  ))}
                </div>
                {moreCount > 0 ? (
                  <p className="mt-1 text-[length:var(--body-s)] text-[var(--text-label)]">
                    and {moreCount} more
                  </p>
                ) : null}
              </div>

              <label className="mb-3 block">
                <span className={`mb-1 block ${sdsLabel}`}>
                  Title / purpose
                </span>
                <input
                  type="text"
                  value={title}
                  onChange={(e) => setTitle(e.target.value)}
                  className={`${sdsInput} w-full`}
                />
              </label>

              <div className="mb-3 grid gap-3 sm:grid-cols-2">
                <label className="block">
                  <span className={`mb-1 block ${sdsLabel}`}>
                    Duration
                  </span>
                  <select
                    value={duration}
                    onChange={(e) =>
                      setDuration(Number(e.target.value) as 15 | 30 | 45 | 60)
                    }
                    className={sdsSelectWFull}
                  >
                    {DURATIONS.map((m) => (
                      <option key={m} value={m}>
                        {m} minutes
                      </option>
                    ))}
                  </select>
                </label>
                <label className="block sm:col-span-2">
                  <span className={`mb-1 block ${sdsLabel}`}>
                    Date & time
                  </span>
                  <input
                    type="datetime-local"
                    value={scheduledLocal}
                    onChange={(e) => setScheduledLocal(e.target.value)}
                    className={`${sdsInput} w-full`}
                  />
                </label>
              </div>

              <label className="mb-3 block">
                <span className={`mb-1 block ${sdsLabel}`}>
                  Channel
                </span>
                <select
                  value={channel}
                  onChange={(e) =>
                    setChannel(e.target.value as ScheduleMeetingPayload["channel"])
                  }
                  className={sdsSelectWFull}
                >
                  {CHANNEL_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
              </label>

              <label className="mb-4 block">
                <span className={`mb-1 block ${sdsLabel}`}>
                  Description
                </span>
                <textarea
                  value={description}
                  onChange={(e) => setDescription(e.target.value)}
                  rows={4}
                  placeholder="Optional agenda or notes for the invite…"
                  className={`${sdsTextarea} w-full`}
                />
              </label>
            </>
          )}
        </div>

        <div className="flex shrink-0 justify-end gap-2 border-t border-[var(--border-subtle)] px-5 py-4">
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
                disabled={!canSend}
                onClick={() => void handleSend()}
                className={`${sdsButtonPrimary} inline-flex min-w-[7rem] justify-center px-4 disabled:opacity-50`}
              >
                Send Invites
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
