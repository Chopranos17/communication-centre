import { useCallback, useEffect, useState } from "react";
import { fetchCandidateCurrentJobEmails } from "../../api/candidatesClient";
import type {
  CandidateCurrentJobEmails,
  CurrentJobEmailRow,
} from "../../api/candidatesClient";
import { CommunicationsJobEmailSection } from "./CommunicationsJobEmailSection";
import { EmailDetailModal } from "./EmailDetailModal";

const EMPTY_EMAILS: CurrentJobEmailRow[] = [];

export function CommunicationsCurrentJobSection({ candidateId }: { candidateId: string }) {
  const [data, setData] = useState<CandidateCurrentJobEmails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [detailEmail, setDetailEmail] = useState<CurrentJobEmailRow | null>(null);

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
  }, [load]);

  useEffect(() => {
    setDetailEmail(null);
  }, [candidateId]);

  const clearDetailEmail = useCallback(() => {
    setDetailEmail(null);
  }, []);

  const jobTitle = data?.currentJob?.title ?? "Current role";
  const jobCode = data?.currentJob?.jobCode;
  const otherSections = data?.otherJobEmailSections ?? [];

  return (
    <div className="space-y-4">
      <EmailDetailModal email={detailEmail} onClose={() => setDetailEmail(null)} />
      <CommunicationsJobEmailSection
        defaultSectionOpen
        jobTitle={jobTitle}
        jobCode={jobCode}
        titleSuffix=" (Current Job)"
        showNewEmailButton
        emails={data?.emails ?? EMPTY_EMAILS}
        loading={loading}
        loadError={loadError}
        onRetry={() => void load()}
        emptyFilterMessage="No emails match this filter for the current job."
        missingJobMessage={
          !loading && !loadError && !data?.currentJob
            ? "No current job is linked to this candidate."
            : null
        }
        onSelectEmail={setDetailEmail}
        onInvalidateDetail={clearDetailEmail}
      />

      {otherSections.map((section) => (
        <CommunicationsJobEmailSection
          key={section.job.id}
          defaultSectionOpen={false}
          jobTitle={section.job.title}
          jobCode={section.job.jobCode}
          showNewEmailButton={false}
          emails={section.emails}
          loading={false}
          onSelectEmail={setDetailEmail}
          onInvalidateDetail={clearDetailEmail}
        />
      ))}
    </div>
  );
}
