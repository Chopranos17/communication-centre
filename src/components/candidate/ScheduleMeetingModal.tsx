import { useCallback, useEffect, useMemo, useState } from "react";
import { createPortal } from "react-dom";

import {
  scheduleMeeting,
  type ScheduleMeetingPayload,
} from "../../api/candidatesClient";
import {
  meetingInvitePartial,
  meetingInviteSuccess,
  meetingInviteVendorError,
} from "../../utils/sendFeedbackMessages";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import {
  sdsButtonLink,
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
  sdsSidePanelContainerWide,
  sdsSidePanelRoot,
} from "../../lib/sdsModalClasses";
import {
  sdsInput,
  sdsLabel,
  sdsSelectWFull,
  sdsTextarea,
} from "../../lib/sdsFormClasses";

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

export type ScheduleMeetingModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  /** Default recruiter row (matches seed / CC employees). */
  recruiterParticipant: { name: string; email: string };
  senderName?: string;
  onSent: () => void;
};

type ParticipantRow = { name: string; email: string };

export function ScheduleMeetingModal({
  open,
  onClose,
  candidateId,
  candidateName,
  candidateEmail,
  jobId,
  jobTitle,
  recruiterParticipant,
  senderName = "Recruiter",
  onSent,
}: ScheduleMeetingModalProps) {
  const [title, setTitle] = useState("Candidate experience chat");
  const [description, setDescription] = useState("");
  const [duration, setDuration] = useState<15 | 30 | 45 | 60>(30);
  const [channel, setChannel] =
    useState<ScheduleMeetingPayload["channel"]>("google_meet");
  const [scheduledLocal, setScheduledLocal] = useState(defaultDatetimeLocal);
  const [participants, setParticipants] = useState<ParticipantRow[]>([]);
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{
    kind: "ok" | "err";
    text: string;
  } | null>(null);

  useEffect(() => {
    if (!open) return;
    setBanner(null);
    setTitle("Candidate experience chat");
    setDescription("");
    setDuration(30);
    setChannel("google_meet");
    setScheduledLocal(defaultDatetimeLocal());
    setParticipants([
      { name: recruiterParticipant.name, email: recruiterParticipant.email },
      { name: candidateName, email: candidateEmail.trim() },
    ]);
  }, [open, recruiterParticipant, candidateName, candidateEmail]);

  const canSend = useMemo(() => {
    const emails = participants.map((p) => p.email.trim()).filter(Boolean);
    return (
      title.trim().length > 0 &&
      emails.length > 0 &&
      jobId.trim().length > 0
    );
  }, [title, participants, jobId]);

  const updateParticipant = (index: number, patch: Partial<ParticipantRow>) => {
    setParticipants((prev) => {
      const next = [...prev];
      next[index] = { ...next[index], ...patch };
      return next;
    });
  };

  const addParticipant = () => {
    setParticipants((prev) => [...prev, { name: "", email: "" }]);
  };

  const removeParticipant = (index: number) => {
    if (participants.length <= 1) return;
    setParticipants((prev) => prev.filter((_, i) => i !== index));
  };

  const handleSend = useCallback(async () => {
    if (!canSend || sending) return;
    setSending(true);
    setBanner(null);
    const scheduledAt = new Date(scheduledLocal);
    if (Number.isNaN(scheduledAt.getTime())) {
      setBanner({ kind: "err", text: "Choose a valid date and time." });
      setSending(false);
      return;
    }
    const payload: ScheduleMeetingPayload = {
      jobId,
      title: title.trim(),
      description: description.trim(),
      durationMinutes: duration,
      scheduledAt: scheduledAt.toISOString(),
      channel,
      participants: participants
        .map((p) => ({
          name: p.name.trim() || p.email.trim(),
          email: p.email.trim(),
        }))
        .filter((p) => p.email.length > 0),
      senderName,
    };
    const result = await scheduleMeeting(candidateId, payload);
    setSending(false);
    const total = result.inviteTotal ?? payload.participants.length;
    const sent = result.inviteSent ?? 0;
    const failed = result.inviteFailed ?? (total > 0 ? total : 0);

    if (result.success) {
      setBanner({
        kind: "ok",
        text: meetingInviteSuccess(sent || total),
      });
      onSent();
      window.setTimeout(() => {
        onClose();
      }, 600);
    } else if (sent > 0 && failed > 0) {
      setBanner({
        kind: "ok",
        text: meetingInvitePartial(sent, total, failed),
      });
      onSent();
    } else {
      setBanner({
        kind: "err",
        text: result.error
          ? meetingInviteVendorError(result.error)
          : meetingInviteVendorError("Unknown error"),
      });
    }
  }, [
    canSend,
    sending,
    scheduledLocal,
    jobId,
    title,
    description,
    duration,
    channel,
    participants,
    candidateId,
    senderName,
    onSent,
    onClose,
  ]);

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

  if (!open) return null;

  const modal = (
    <div
      className={sdsSidePanelRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="schedule-meeting-title"
    >
      <button
        type="button"
        className={sdsSidePanelBackdropButton}
        aria-label="Close schedule meeting"
        onClick={onClose}
      />
      <div className={sdsSidePanelContainerWide}>
        <div className={sdsModalHeader}>
          <h2 id="schedule-meeting-title" className={sdsModalTitle}>
            Schedule 1:1 Meeting
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
          <p className="mb-4 text-[length:var(--body-s)] text-[var(--text-label)]">
            Job: <span className="text-[var(--text-body)]">{jobTitle}</span>
          </p>

          {banner ? (
            <div
              className={
                banner.kind === "ok"
                  ? "mb-4 rounded border border-green-200 bg-green-50 px-3 py-2 text-[length:var(--body-s)] text-green-900"
                  : "mb-4 rounded border border-red-200 bg-red-50 px-3 py-2 text-[length:var(--body-s)] text-red-900"
              }
              role="status"
            >
              {banner.text}
            </div>
          ) : null}

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

          <div className="mb-3">
            <span className={`mb-2 block ${sdsLabel}`}>
              Participants
            </span>
            <div className="space-y-2">
              {participants.map((p, i) => (
                <div
                  key={i}
                  className="flex flex-col gap-2 rounded border border-[var(--border-subtle)] bg-[var(--charcoal-10)] p-3 sm:flex-row sm:items-center"
                >
                  <input
                    type="text"
                    placeholder="Name"
                    value={p.name}
                    onChange={(e) => updateParticipant(i, { name: e.target.value })}
                    className={`${sdsInput} min-w-0 flex-1`}
                  />
                  <input
                    type="email"
                    placeholder="Email"
                    value={p.email}
                    onChange={(e) => updateParticipant(i, { email: e.target.value })}
                    className={`${sdsInput} min-w-0 flex-[1.2]`}
                  />
                  {participants.length > 1 ? (
                    <button
                      type="button"
                      onClick={() => removeParticipant(i)}
                      className={`${sdsButtonLink} shrink-0 text-[length:var(--body-s)] text-[var(--text-error)] hover:underline`}
                    >
                      Remove
                    </button>
                  ) : null}
                </div>
              ))}
            </div>
            <button
              type="button"
              onClick={addParticipant}
              className={`${sdsButtonLink} mt-2 text-[length:var(--body-s)] font-medium`}
            >
              + Add participant
            </button>
          </div>

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
            disabled={!canSend || sending}
            aria-busy={sending}
            onClick={() => void handleSend()}
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
              "Send Invite"
            )}
          </button>
        </div>
      </div>
    </div>
  );

  return createPortal(modal, document.body);
}
