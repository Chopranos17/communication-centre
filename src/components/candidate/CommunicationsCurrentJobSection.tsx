import {
  useCallback,
  useEffect,
  useMemo,
  useRef,
  useState,
} from "react";
import { io } from "socket.io-client";
import { fetchCandidateCurrentJobEmails } from "../../api/candidatesClient";
import { usePersona } from "../../context/PersonaContext";
import type {
  CandidateCurrentJobEmails,
  CurrentJobEmailRow,
  MessageUpdatedSocketPayload,
  NewMessageSocketPayload,
} from "../../api/candidatesClient";
import { FilterTabs } from "../layout/FilterTabs";
import {
  applyFullGlobalFilter,
  applySearchAndPanelRowFilters,
  countMessagesByChannel,
  countNonDefaultPanelFilters,
  DEFAULT_COMMUNICATION_FILTERS,
  type ChannelFilterId,
  type CommunicationFilters,
} from "../../utils/communicationsTimelineFilter";
import { communicationToTimelineRow } from "../../utils/communicationTimelineRow";
import { CommunicationFilterPanel } from "./CommunicationFilterPanel";
import { CommunicationsJobEmailSection } from "./CommunicationsJobEmailSection";
import { ComposeEmailModal } from "./ComposeEmailModal";
import { EditScheduledEmailModal } from "./EditScheduledEmailModal";
import type { ComposeEmailRecipient } from "./ComposeEmailModal";
import { EmailDetailModal } from "./EmailDetailModal";
import { FollowUpEmailModal } from "./FollowUpEmailModal";
import { ReplyThreadModal } from "./ReplyThreadModal";
import { ScheduleMeetingModal } from "./ScheduleMeetingModal";
import { sdsButtonSecondaryIcon } from "../../lib/sdsButtonClasses";
import { sdsInput } from "../../lib/sdsFormClasses";
const EMPTY_EMAILS: CurrentJobEmailRow[] = [];

export type CommunicationsFilterSummary = {
  filtersActive: boolean;
  filteredCount: number;
  personaTotal: number;
};

/** Default recruiter row for 1:1 participants (aligned with `/api/employees` seed). */
const DEFAULT_RECRUITER_PARTICIPANT = {
  name: "Atharva M",
  email: "atharva.m@darwinbox.in",
};

function IconSearchOutline({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <circle
        cx="11"
        cy="11"
        r="6.25"
        stroke="currentColor"
        strokeWidth="1.75"
      />
      <path
        d="M16.5 16.5L20 20"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinecap="round"
      />
    </svg>
  );
}

/** Outline funnel (matches Darwinbox-style filter control). */
function IconFilterFunnelOutline({ className }: { className?: string }) {
  return (
    <svg
      className={className}
      width="18"
      height="18"
      viewBox="0 0 24 24"
      fill="none"
      aria-hidden
    >
      <path
        d="M3 5.25h18l-6.75 8.46V18.5l-2.25 1.25v-6.29L3 5.25z"
        stroke="currentColor"
        strokeWidth="1.75"
        strokeLinejoin="round"
        strokeLinecap="round"
      />
    </svg>
  );
}

const ICON_BUTTON_CLASS = `${sdsButtonSecondaryIcon} text-[var(--icon-default)] hover:text-[var(--icon-hover)]`;

export function CommunicationsCurrentJobSection({
  candidateId,
  candidateName,
  candidateEmail,
  currentJob,
  jobApplicationCount,
  /** When set, loads the communications timeline for this job (e.g. Activity Command Center). */
  timelineJobId,
  refreshSignal = 0,
  onSendSms,
  onSendWhatsApp,
  smsDisabled = false,
  whatsappDisabled = false,
  smsDisabledTitle,
  whatsappDisabledTitle,
  onCommunicationsFilterSummary,
}: {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  currentJob: { id: string; title: string; jobCode: string } | null;
  /** Total CandidateJob rows for this candidate (for bulk multi-job semantics if reused) */
  jobApplicationCount: number;
  timelineJobId?: string | null;
  /** Increment from parent to refetch timeline (e.g. after SMS/WhatsApp send). */
  refreshSignal?: number;
  onSendSms?: () => void;
  onSendWhatsApp?: () => void;
  smsDisabled?: boolean;
  whatsappDisabled?: boolean;
  smsDisabledTitle?: string;
  whatsappDisabledTitle?: string;
  onCommunicationsFilterSummary?: (summary: CommunicationsFilterSummary) => void;
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
  const [editScheduledRow, setEditScheduledRow] =
    useState<CurrentJobEmailRow | null>(null);
  const [actionJob, setActionJob] = useState<{
    id: string;
    title: string;
  } | null>(null);
  const [searchInput, setSearchInput] = useState("");
  const [debouncedSearch, setDebouncedSearch] = useState("");
  const [channelFilter, setChannelFilter] = useState<ChannelFilterId>("all");
  const [panelFilters, setPanelFilters] = useState<CommunicationFilters>(() => ({
    ...DEFAULT_COMMUNICATION_FILTERS,
  }));
  const [filterPanelOpen, setFilterPanelOpen] = useState(false);
  const [searchExpanded, setSearchExpanded] = useState(false);
  const searchInputRef = useRef<HTMLInputElement>(null);
  const commToolbarRef = useRef<HTMLDivElement>(null);

  const { canManageRecruitment } = usePersona();

  useEffect(() => {
    const t = window.setTimeout(() => {
      setDebouncedSearch(searchInput.trim());
    }, 300);
    return () => window.clearTimeout(t);
  }, [searchInput]);

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

  const allPersonaRowsFlat = useMemo(
    () => [
      ...emailsForPersona,
      ...otherJobSectionsForPersona.flatMap((s) => s.emails),
    ],
    [emailsForPersona, otherJobSectionsForPersona],
  );

  const personaGrandTotal = allPersonaRowsFlat.length;

  const composeRecipientJobCount = useMemo(() => {
    if (!data) return jobApplicationCount;
    return 1 + data.otherJobEmailSections.length;
  }, [data, jobApplicationCount]);

  const afterSearchAndPanelRowFilters = useMemo(
    () =>
      applySearchAndPanelRowFilters(
        allPersonaRowsFlat,
        debouncedSearch,
        panelFilters,
      ),
    [allPersonaRowsFlat, debouncedSearch, panelFilters],
  );

  const channelCounts = useMemo(
    () => countMessagesByChannel(afterSearchAndPanelRowFilters),
    [afterSearchAndPanelRowFilters],
  );

  const filteredCurrentJobEmails = useMemo(
    () =>
      applyFullGlobalFilter(
        emailsForPersona,
        debouncedSearch,
        panelFilters,
        channelFilter,
      ),
    [emailsForPersona, debouncedSearch, panelFilters, channelFilter],
  );

  const filteredOtherSections = useMemo(
    () =>
      otherJobSectionsForPersona.map((section) => ({
        ...section,
        emails: applyFullGlobalFilter(
          section.emails,
          debouncedSearch,
          panelFilters,
          channelFilter,
        ),
      })),
    [
      otherJobSectionsForPersona,
      debouncedSearch,
      panelFilters,
      channelFilter,
    ],
  );

  const filteredGrandTotal = useMemo(() => {
    let n = filteredCurrentJobEmails.length;
    for (const s of filteredOtherSections) n += s.emails.length;
    return n;
  }, [filteredCurrentJobEmails, filteredOtherSections]);

  const panelFilterBadgeCount = useMemo(
    () => countNonDefaultPanelFilters(panelFilters),
    [panelFilters],
  );

  const filtersActive = useMemo(
    () =>
      debouncedSearch !== "" ||
      channelFilter !== "all" ||
      countNonDefaultPanelFilters(panelFilters) > 0,
    [debouncedSearch, channelFilter, panelFilters],
  );

  const clearGlobalFilters = useCallback(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setChannelFilter("all");
    setPanelFilters({ ...DEFAULT_COMMUNICATION_FILTERS });
    setSearchExpanded(false);
  }, []);

  const handleSearchBlur = useCallback(() => {
    window.setTimeout(() => {
      if (commToolbarRef.current?.contains(document.activeElement)) return;
      if (!searchInputRef.current?.value.trim()) setSearchExpanded(false);
    }, 0);
  }, []);

  const openSearch = useCallback(() => {
    setSearchExpanded(true);
    queueMicrotask(() => searchInputRef.current?.focus());
  }, []);

  const channelTabs = useMemo(
    () => [
      { id: "all" as const, label: "All", count: channelCounts.all },
      { id: "email" as const, label: "Email", count: channelCounts.email },
      { id: "sms" as const, label: "SMS", count: channelCounts.sms },
      {
        id: "whatsapp" as const,
        label: "WhatsApp",
        count: channelCounts.whatsapp,
      },
      {
        id: "meeting" as const,
        label: "Meeting",
        count: channelCounts.meeting,
      },
    ],
    [channelCounts],
  );

  const load = useCallback(async () => {
    setLoading(true);
    setLoadError(null);
    try {
      const jobParam =
        typeof timelineJobId === "string" && timelineJobId.trim()
          ? timelineJobId.trim()
          : undefined;
      const d = await fetchCandidateCurrentJobEmails(candidateId, jobParam);
      setData(d);
    } catch {
      setLoadError("Could not load communications.");
      setData(null);
    } finally {
      setLoading(false);
    }
  }, [candidateId, timelineJobId]);

  const scheduledEmailActions = useMemo(
    () =>
      canManageRecruitment
        ? {
            onEdit: (row: CurrentJobEmailRow) => setEditScheduledRow(row),
            onMutated: () => void load(),
          }
        : undefined,
    [canManageRecruitment, load],
  );

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
    const onUpdated = (payload: MessageUpdatedSocketPayload) => {
      if (payload.communication.candidate_id !== candidateId) return;
      const row = communicationToTimelineRow(payload.communication, null);
      setData((prev) => {
        if (!prev) return prev;
        const merge = (emails: CurrentJobEmailRow[]) => {
          const i = emails.findIndex((e) => e.id === row.id);
          if (i === -1) return emails;
          const next = [...emails];
          next[i] = row;
          return next;
        };
        if (payload.communication.job_id === prev.currentJob?.id) {
          return { ...prev, emails: merge(prev.emails) };
        }
        const jobId = payload.job.id;
        const idx = prev.otherJobEmailSections.findIndex(
          (s) => s.job.id === jobId,
        );
        if (idx === -1) return prev;
        const sections = [...prev.otherJobEmailSections];
        const sec = sections[idx];
        sections[idx] = { ...sec, emails: merge(sec.emails) };
        return { ...prev, otherJobEmailSections: sections };
      });
    };
    socket.on("new-message", onNew);
    socket.on("message-updated", onUpdated);
    return () => {
      socket.off("new-message", onNew);
      socket.off("message-updated", onUpdated);
      socket.close();
    };
  }, [candidateId]);

  useEffect(() => {
    setDetailEmail(null);
  }, [candidateId, timelineJobId]);

  useEffect(() => {
    setSearchInput("");
    setDebouncedSearch("");
    setChannelFilter("all");
    setPanelFilters({ ...DEFAULT_COMMUNICATION_FILTERS });
    setFilterPanelOpen(false);
    setSearchExpanded(false);
  }, [candidateId, timelineJobId]);

  useEffect(() => {
    setDetailEmail(null);
  }, [
    debouncedSearch,
    channelFilter,
    panelFilters.sortBy,
    panelFilters.direction,
    panelFilters.deliveryStatus,
    panelFilters.dateRange,
    panelFilters.senderType,
  ]);

  useEffect(() => {
    if (!onCommunicationsFilterSummary || loading) return;
    onCommunicationsFilterSummary({
      filtersActive,
      filteredCount: filteredGrandTotal,
      personaTotal: personaGrandTotal,
    });
  }, [
    onCommunicationsFilterSummary,
    loading,
    filtersActive,
    filteredGrandTotal,
    personaGrandTotal,
  ]);

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
      {canManageRecruitment ? (
        <EditScheduledEmailModal
          open={editScheduledRow != null}
          onClose={() => setEditScheduledRow(null)}
          candidateName={candidateName}
          email={editScheduledRow}
          onUpdated={() => void load()}
        />
      ) : null}
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
                jobCount: composeRecipientJobCount,
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

      <div className="space-y-3">
        <div
          ref={commToolbarRef}
          className="flex min-w-0 flex-wrap items-center gap-x-2 gap-y-2"
        >
          <div className="min-w-0 flex-[1_1_0%]">
            <FilterTabs
              tabs={channelTabs}
              activeId={channelFilter}
              onChange={(id) => setChannelFilter(id as ChannelFilterId)}
            />
          </div>
          <div className="flex shrink-0 items-center gap-2">
            {searchExpanded ? (
              <div className="relative w-[min(100%,20rem)] min-w-[10.5rem] sm:min-w-[12rem]">
                <input
                  ref={searchInputRef}
                  type="search"
                  value={searchInput}
                  onChange={(e) => setSearchInput(e.target.value)}
                  onBlur={handleSearchBlur}
                  placeholder="Search messages..."
                  className={`${sdsInput} w-full pl-3 pr-10`}
                  aria-label="Search messages"
                />
                <span className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--icon-default)]">
                  <IconSearchOutline />
                </span>
              </div>
            ) : (
              <button
                type="button"
                onClick={openSearch}
                className={ICON_BUTTON_CLASS}
                aria-label="Open search"
              >
                <IconSearchOutline />
              </button>
            )}
            <button
              type="button"
              onClick={() => setFilterPanelOpen(true)}
              className={`relative ${ICON_BUTTON_CLASS}`}
              aria-label="Sort and filters"
            >
              <IconFilterFunnelOutline />
              {panelFilterBadgeCount > 0 ? (
                <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-[16px] items-center justify-center rounded-full bg-[var(--blue-500)] px-0.5 text-[10px] font-semibold leading-none text-white">
                  {panelFilterBadgeCount > 9 ? "9+" : panelFilterBadgeCount}
                </span>
              ) : null}
            </button>
          </div>
        </div>
        {!loading && !loadError && personaGrandTotal > 0 ? (
          <p className="text-[length:var(--body-s)] text-[var(--text-label)]">
            Showing {filteredGrandTotal} of {personaGrandTotal} messages
          </p>
        ) : null}
      </div>

      <CommunicationFilterPanel
        isOpen={filterPanelOpen}
        onClose={() => setFilterPanelOpen(false)}
        filters={panelFilters}
        onApply={(f) => setPanelFilters({ ...f })}
        onReset={() => setPanelFilters({ ...DEFAULT_COMMUNICATION_FILTERS })}
      />

      <CommunicationsJobEmailSection
        defaultSectionOpen
        jobTitle={jobTitle}
        jobId={data?.currentJob?.id ?? currentJob?.id ?? ""}
        jobCode={jobCode}
        titleSuffix=" (Current Job)"
        showNewEmailButton={canManageRecruitment}
        emails={filteredCurrentJobEmails}
        preGlobalEmailCount={emailsForPersona.length}
        onClearGlobalFilters={clearGlobalFilters}
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
        timelineGroupOrder={panelFilters.sortBy}
        scheduledEmailActions={scheduledEmailActions}
      />

      {otherJobSectionsForPersona.map((section, idx) => (
        <CommunicationsJobEmailSection
          key={section.job.id}
          defaultSectionOpen={false}
          jobTitle={section.job.title}
          jobId={section.job.id}
          jobCode={section.job.jobCode}
          showNewEmailButton={false}
          emails={filteredOtherSections[idx]?.emails ?? []}
          preGlobalEmailCount={section.emails.length}
          onClearGlobalFilters={clearGlobalFilters}
          loading={false}
          onSelectEmail={setDetailEmail}
          onInvalidateDetail={clearDetailEmail}
          candidateName={candidateName}
          onSendSms={canManageRecruitment ? onSendSms : undefined}
          onSendWhatsApp={canManageRecruitment ? onSendWhatsApp : undefined}
          smsDisabled={smsDisabled}
          whatsappDisabled={whatsappDisabled}
          smsDisabledTitle={smsDisabledTitle}
          whatsappDisabledTitle={whatsappDisabledTitle}
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
          timelineGroupOrder={panelFilters.sortBy}
          scheduledEmailActions={scheduledEmailActions}
        />
      ))}
    </div>
  );
}
