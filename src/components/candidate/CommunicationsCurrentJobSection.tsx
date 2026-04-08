import { useCallback, useEffect, useMemo, useState } from "react";
import { io } from "socket.io-client";
import { fetchCandidateCurrentJobEmails } from "../../api/candidatesClient";
import { usePersona } from "../../context/PersonaContext";
import type {
  CandidateCurrentJobEmails,
  CurrentJobEmailRow,
  NewMessageSocketPayload,
} from "../../api/candidatesClient";
import { communicationToTimelineRow } from "../../utils/communicationTimelineRow";
import { CommunicationsJobEmailSection } from "./CommunicationsJobEmailSection";
import { ComposeEmailModal } from "./ComposeEmailModal";
import type { ComposeEmailRecipient } from "./ComposeEmailModal";
import { EmailDetailModal } from "./EmailDetailModal";
import { FollowUpEmailModal } from "./FollowUpEmailModal";
import { ReplyThreadModal } from "./ReplyThreadModal";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal";

const EMPTY_EMAILS: CurrentJobEmailRow[] = [];

/** Default recruiter row for 1:1 participants (aligned with `/api/employees` seed). */
const DEFAULT_RECRUITER_PARTICIPANT = {
  name: "Atharva M",
  email: "atharva.m@darwinbox.in",
};

export function CommunicationsCurrentJobSection({
  candidateId,
  candidateName,
  candidateEmail,
  currentJob,
  jobApplicationCount,
  refreshSignal = 0,
  onSendSms,
  onSendWhatsApp,
  smsDisabled = false,
  whatsappDisabled = false,
  smsDisabledTitle,
  whatsappDisabledTitle,
}: {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  currentJob: { id: string; title: string; jobCode: string } | null;
  /** Total CandidateJob rows for this candidate (for bulk multi-job semantics if reused) */
  jobApplicationCount: number;
  /** Increment from parent to refetch timeline (e.g. after SMS/WhatsApp send). */
  refreshSignal?: number;
  onSendSms?: () => void;
  onSendWhatsApp?: () => void;
  smsDisabled?: boolean;
  whatsappDisabled?: boolean;
  smsDisabledTitle?: string;
  whatsappDisabledTitle?: string;
}) {
  const [data, setData] = useState<CandidateCurrentJobEmails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailEmail, setDetailEmail] = useState<CurrentJobEmailRow | null>(null);
  const [composeOpen, setComposeOpen] = useState(false);
  const [meetingOpen, setMeetingOpen] = useState(false);
  const [followUpRows, setFollowUpRows] = useState<CurrentJobEmailRow[] | null>(
    null,
  );
  const [replyRows, setReplyRows] = useState<CurrentJobEmailRow[] | null>(null);
  const [actionJob, setActionJob] = useState<{
    id: string;
    title: string;
  } | null>(null);

  const { canManageRecruitment } = usePersona();

  const emailsForPersona = useMemo(() => {
    const list = data?.emails ?? EMPTY_EMAILS;
    if (canManageRecruitment) return list;
    return list.filter((e) => e.direction === "outbound");
  }, [data?.emails, canManageRecruitment]);

  const otherJobSectionsForPersona = useMemo(() => {
    const sections = data?.otherJobEmailSections ?? [];
    if (canManageRecruitment) return sections;
    return sections
      .map((section) => ({
        ...section,
        emails: section.emails.filter((e) => e.direction === "outbound"),
      }))
      .filter((section) => section.emails.length > 0);
  }, [data?.otherJobEmailSections, canManageRecruitment]);

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const d = await fetchCandidateCurrentJobEmails(candidateId);
      setData(d);
    } catch {
      setLoadError("Could not load communications.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId]);

  useEffect(() => {
    void load();
  }, [load, refreshSignal]);

  useEffect(() => {
    const socket = io({
      path: "/socket.io",
      transports: ["websocket", "polling"],
    });
    const onNew = (payload: NewMessageSocketPayload) => {
      if (payload.communication.candidate_id !== candidateId) return;
      const row = communicationToTimelineRow(payload.communication, null);
      setData((prev) => {
        if (!prev) return prev;
        if (payload.communication.job_id === prev.currentJob?.id) {
          if (prev.emails.some((e) => e.id === row.id)) return prev;
          return { ...prev, emails: [row, ...prev.emails] };
        }
        const jobId = payload.job.id;
        const idx = prev.otherJobEmailSections.findIndex(
          (s) => s.job.id === jobId,
        );
        if (idx === -1) {
          const section = {
            job: {
              id: payload.job.id,
              title: payload.job.title,
              jobCode: payload.job.job_code,
            },
            emails: [row],
          };
          const other = [...prev.otherJobEmailSections, section];
          other.sort((a, b) => {
            const ta = a.emails[0]?.sentAt;
            const tb = b.emails[0]?.sentAt;
            if (!ta || !tb) return 0;
            return new Date(tb).getTime() - new Date(ta).getTime();
          });
          return { ...prev, otherJobEmailSections: other };
        }
        const sections = [...prev.otherJobEmailSections];
        const sec = sections[idx];
        if (sec.emails.some((e) => e.id === row.id)) return prev;
        sections[idx] = { ...sec, emails: [row, ...sec.emails] };
        return { ...prev, otherJobEmailSections: sections };
      });
    };
    socket.on("new-message", onNew);
    return () => {
      socket.off("new-message", onNew);
      socket.close();
    };
  }, [candidateId]);

  useEffect(() => {
    setDetailEmail(null);
  }, [candidateId]);

  const clearDetailEmail = useCallback(() => {
    setDetailEmail(null);
  }, []);

  const jobTitle = data?.currentJob?.title ?? "Current role";
  const jobCode = data?.currentJob?.jobCode;

  const composeJob = currentJob ?? data?.currentJob ?? null;
  const canCompose = Boolean(
    composeJob && candidateEmail.trim().length > 0,
  );
  const canScheduleMeeting = canCompose;

  const openFollowUp = (rows: CurrentJobEmailRow[], job: { id: string; title: string }) => {
    setReplyRows(null);
    setActionJob(job);
    setFollowUpRows(rows);
  };

  const openReply = (rows: CurrentJobEmailRow[], job: { id: string; title: string }) => {
    setFollowUpRows(null);
    setActionJob(job);
    setReplyRows(rows);
  };

  const emptyTimelineCopy = canManageRecruitment
    ? "No communications yet. Send the first message."
    : "No messages received yet.";

  return (
    <div className="space-y-4">
      <EmailDetailModal email={detailEmail} onClose={() => setDetailEmail(null)} />
      {canManageRecruitment && actionJob && followUpRows ? (
        <FollowUpEmailModal
          open
          onClose={() => {
            setFollowUpRows(null);
            setActionJob(null);
          }}
          candidateId={candidateId}
          candidateName={candidateName}
          candidateEmail={candidateEmail}
          jobId={actionJob.id}
          jobTitle={actionJob.title}
          threadRows={followUpRows}
          onSent={() => void load()}
        />
      ) : null}
      {canManageRecruitment && actionJob && replyRows ? (
        <ReplyThreadModal
          open
          onClose={() => {
            setReplyRows(null);
            setActionJob(null);
          }}
          candidateId={candidateId}
          candidateName={candidateName}
          candidateEmail={candidateEmail}
          jobId={actionJob.id}
          jobTitle={actionJob.title}
          threadRows={replyRows}
          onSent={() => void load()}
        />
      ) : null}
      {canManageRecruitment && composeJob ? (
        <ComposeEmailModal
          open={composeOpen}
          onClose={() => setComposeOpen(false)}
          jobId={composeJob.id}
          jobTitle={composeJob.title}
          recipients={
            [
              {
                candidateId,
                candidateName,
                candidateEmail,
                jobCount: jobApplicationCount,
              },
            ] satisfies ComposeEmailRecipient[]
          }
          onSent={() => void load()}
        />
      ) : null}
      {canManageRecruitment && composeJob ? (
        <ScheduleMeetingModal
          open={meetingOpen}
          onClose={() => setMeetingOpen(false)}
          candidateId={candidateId}
          candidateName={candidateName}
          candidateEmail={candidateEmail}
          jobId={composeJob.id}
          jobTitle={composeJob.title}
          recruiterParticipant={DEFAULT_RECRUITER_PARTICIPANT}
          senderName={DEFAULT_RECRUITER_PARTICIPANT.name}
          onSent={() => void load()}
        />
      ) : null}
      <CommunicationsJobEmailSection
        defaultSectionOpen
        jobTitle={jobTitle}
        jobId={data?.currentJob?.id ?? currentJob?.id ?? ""}
        jobCode={jobCode}
        titleSuffix=" (Current Job)"
        showNewEmailButton={canManageRecruitment}
        emails={emailsForPersona}
        loading={loading}
        loadError={loadError}
        onRetry={() => void load()}
        emptyFilterMessage="No messages match this filter for the current job."
        emptyTimelineMessage={emptyTimelineCopy}
        missingJobMessage={
          !loading && !loadError && !data?.currentJob
            ? "No current job is linked to this candidate."
            : null
        }
        onSelectEmail={setDetailEmail}
        onInvalidateDetail={clearDetailEmail}
        onNewEmail={
          canManageRecruitment ? () => setComposeOpen(true) : undefined
        }
        newEmailDisabled={!canCompose}
        newEmailDisabledTitle={
          !candidateEmail.trim()
            ? "Candidate has no email address."
            : "No current job is linked to this candidate."
        }
        onSendSms={canManageRecruitment ? onSendSms : undefined}
        onSendWhatsApp={canManageRecruitment ? onSendWhatsApp : undefined}
        onScheduleMeeting={
          canManageRecruitment ? () => setMeetingOpen(true) : undefined
        }
        smsDisabled={smsDisabled}
        whatsappDisabled={whatsappDisabled}
        scheduleMeetingDisabled={!canScheduleMeeting}
        smsDisabledTitle={smsDisabledTitle}
        whatsappDisabledTitle={whatsappDisabledTitle}
        scheduleMeetingDisabledTitle={
          !candidateEmail.trim()
            ? "Candidate has no email address."
            : "No current job is linked to this candidate."
        }
        candidateName={candidateName}
        onFollowUp={
          canManageRecruitment
            ? (rows) => {
                const j = data?.currentJob ?? currentJob;
                if (!j) return;
                openFollowUp(rows, { id: j.id, title: j.title });
              }
            : undefined
        }
        onReply={
          canManageRecruitment
            ? (rows) => {
                const j = data?.currentJob ?? currentJob;
                if (!j) return;
                openReply(rows, { id: j.id, title: j.title });
              }
            : undefined
        }
      />

      {otherJobSectionsForPersona.map((section) => (
        <CommunicationsJobEmailSection
          key={section.job.id}
          defaultSectionOpen={false}
          jobTitle={section.job.title}
          jobId={section.job.id}
          jobCode={section.job.jobCode}
          showNewEmailButton={false}
          emails={section.emails}
          loading={false}
          onSelectEmail={setDetailEmail}
          onInvalidateDetail={clearDetailEmail}
          candidateName={candidateName}
          onFollowUp={
            canManageRecruitment
              ? (rows) =>
                  openFollowUp(rows, {
                    id: section.job.id,
                    title: section.job.title,
                  })
              : undefined
          }
          onReply={
            canManageRecruitment
              ? (rows) =>
                  openReply(rows, {
                    id: section.job.id,
                    title: section.job.title,
                  })
              : undefined
          }
          emptyTimelineMessage={emptyTimelineCopy}
        />
      ))}
    </div>
  );
}
