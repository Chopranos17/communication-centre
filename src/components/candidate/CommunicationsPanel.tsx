import { useEffect, useState } from "react";
import {
  CommunicationsCurrentJobSection,
  type CommunicationsFilterSummary,
} from "./CommunicationsCurrentJobSection";

function touchpointSubtitle(
  stats: CommunicationsFilterSummary | null,
  profileCommunicationCount: number | undefined,
): string {
  if (stats?.filtersActive) {
    return `${stats.filteredCount} of ${stats.personaTotal} touchpoints (all channels)`;
  }
  if (profileCommunicationCount != null) {
    return `${profileCommunicationCount} total touchpoints (all channels)`;
  }
  if (stats) {
    return `${stats.personaTotal} total touchpoints (all channels)`;
  }
  return "Loading touchpoints…";
}

export type CommunicationsPanelProps = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  currentJob: { id: string; title: string; jobCode: string } | null;
  jobApplicationCount: number;
  /** Scope timeline to this job (Activity Command Center). */
  timelineJobId?: string | null;
  refreshSignal?: number;
  onSendSms?: () => void;
  onSendWhatsApp?: () => void;
  smsDisabled?: boolean;
  smsOptedOut?: boolean;
  whatsappDisabled?: boolean;
  smsDisabledTitle?: string;
  whatsappDisabledTitle?: string;
  /** Candidate profile global count; omit when only timeline totals apply. */
  profileCommunicationCount?: number;
  /** `card` = bordered surface like candidate profile tab; `plain` = no outer chrome. */
  variant?: "card" | "plain";
  /** After load, open message detail for this communication id (e.g. “View this message”). */
  focusCommunicationId?: string | null;
  /** Called after focus is applied or skipped so parent can clear state / URL. */
  onFocusCommunicationConsumed?: () => void;
  /**
   * Hub / activity: when user dismisses message detail after opening via “View this message”,
   * parent can close the outer panel so the full timeline is not left visible underneath.
   */
  onMessageDetailClosed?: () => void;
  /** Hub / activity: timeline opened a message detail from {@link focusCommunicationId}. */
  onOpenedMessageDetailFromFocus?: () => void;
};

export function CommunicationsPanel({
  candidateId,
  candidateName,
  candidateEmail,
  currentJob,
  jobApplicationCount,
  timelineJobId,
  refreshSignal = 0,
  onSendSms,
  onSendWhatsApp,
  smsDisabled = false,
  smsOptedOut = false,
  whatsappDisabled = false,
  smsDisabledTitle,
  whatsappDisabledTitle,
  profileCommunicationCount,
  variant = "plain",
  focusCommunicationId = null,
  onFocusCommunicationConsumed,
  onMessageDetailClosed,
  onOpenedMessageDetailFromFocus,
}: CommunicationsPanelProps) {
  const [commFilterStats, setCommFilterStats] =
    useState<CommunicationsFilterSummary | null>(null);

  useEffect(() => {
    setCommFilterStats(null);
  }, [candidateId, timelineJobId]);

  const inner = (
    <>
      <div className="flex flex-wrap items-baseline justify-between gap-2">
        <h2
          className="text-[length:var(--title-xs)] font-bold text-[var(--text-title)]"
          style={{ fontWeight: "var(--font-weight-bold)" }}
        >
          Communications
        </h2>
        <span className="text-[length:var(--body-s)] text-[var(--text-label)]">
          {touchpointSubtitle(commFilterStats, profileCommunicationCount)}
        </span>
      </div>
      <CommunicationsCurrentJobSection
        candidateId={candidateId}
        candidateName={candidateName}
        candidateEmail={candidateEmail}
        currentJob={currentJob}
        jobApplicationCount={jobApplicationCount}
        timelineJobId={timelineJobId}
        refreshSignal={refreshSignal}
        onSendSms={onSendSms}
        onSendWhatsApp={onSendWhatsApp}
        smsDisabled={smsDisabled}
        smsOptedOut={smsOptedOut}
        whatsappDisabled={whatsappDisabled}
        smsDisabledTitle={smsDisabledTitle}
        whatsappDisabledTitle={whatsappDisabledTitle}
        onCommunicationsFilterSummary={setCommFilterStats}
        focusCommunicationId={focusCommunicationId}
        onFocusCommunicationConsumed={onFocusCommunicationConsumed}
        onMessageDetailClosed={onMessageDetailClosed}
        onOpenedMessageDetailFromFocus={onOpenedMessageDetailFromFocus}
      />
    </>
  );

  if (variant === "card") {
    return (
      <div className="space-y-4 rounded-sds-8 border border-[var(--border-card)] bg-[var(--bg-surface)] p-5 shadow-[var(--elevation-1)]">
        {inner}
      </div>
    );
  }

  return <div className="space-y-4">{inner}</div>;
}
