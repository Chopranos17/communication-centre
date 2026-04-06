import { useCallback, useEffect, useState } from "react";
import { fetchCandidateCurrentJobEmails } from "../../api/candidatesClient";
import type { CandidateCurrentJobEmails } from "../../api/candidatesClient";
import { CommunicationsJobEmailSection } from "./CommunicationsJobEmailSection";

export function CommunicationsCurrentJobSection({ candidateId }: { candidateId: string }) {
  const [data, setData] = useState<CandidateCurrentJobEmails | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);

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

  const jobTitle = data?.currentJob?.title ?? "Current role";
  const jobCode = data?.currentJob?.jobCode;
  const otherSections = data?.otherJobEmailSections ?? [];

  return (
    <div className="space-y-4">
      <CommunicationsJobEmailSection
        defaultSectionOpen
        jobTitle={jobTitle}
        jobCode={jobCode}
        titleSuffix=" (Current Job)"
        showNewEmailButton
        emails={data?.emails ?? []}
        loading={loading}
        loadError={loadError}
        onRetry={() => void load()}
        emptyFilterMessage="No emails match this filter for the current job."
        missingJobMessage={
          !loading && !loadError && !data?.currentJob
            ? "No current job is linked to this candidate."
            : null
        }
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
        />
      ))}
    </div>
  );
}
