import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import type {
  EmailTemplateListItem,
  EmployeeRow,
} from "../../api/candidatesClient";
import {
  composeSendEmail,
  fetchEmailTemplates,
  fetchEmployees,
} from "../../api/candidatesClient";
import {
  plainTextEmailToHtml,
  resolveEmailTemplateString,
  type EmailTemplateVarContext,
} from "../../utils/emailTemplateVars";
import {
  emailPartialSuccess,
  emailSuccessCandidateCount,
  emailVendorError,
} from "../../utils/sendFeedbackMessages";
import { LoadingSpinner } from "../ui/LoadingSpinner";

const FROM_OPTIONS = [
  {
    value: "no-reply@darwinbox.in",
    label: "no-reply@darwinbox.in",
    hint: "warning" as const,
    hintText: "Candidate cannot reply to this address.",
  },
  {
    value: "contact@darwinbox.in",
    label: "contact@darwinbox.in",
    hint: "info" as const,
    hintText: "Candidate can reply to this address.",
  },
];

const CC_QUICK_RECRUITER = "recruiter.cc@darwinbox.in";
const CC_QUICK_HL = "hiring.lead@darwinbox.in";

function uniqEmails(emails: string[]): string[] {
  const seen = new Set<string>();
  const out: string[] = [];
  for (const e of emails) {
    const t = e.trim();
    if (!t) continue;
    const k = t.toLowerCase();
    if (seen.has(k)) continue;
    seen.add(k);
    out.push(t);
  }
  return out;
}

function isBodyEmpty(html: string): boolean {
  const text = html
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/\s+/g, " ")
    .trim();
  return text.length === 0;
}

export type ComposeEmailRecipient = {
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  /** Total job applications; used for "multiple jobs" bulk filter */
  jobCount?: number;
  /** When set (e.g. All Candidates list), used instead of the modal-level job for this recipient */
  jobId?: string;
  jobTitle?: string;
};

type ComposeEmailModalProps = {
  open: boolean;
  onClose: () => void;
  jobId: string;
  jobTitle: string;
  recipients: ComposeEmailRecipient[];
  onSent: () => void;
  /** After bulk send completes, for parent toast / banner. */
  onBulkComplete?: (summary: string) => void;
};

function buildEffectiveRecipients(
  recipients: ComposeEmailRecipient[],
  isBulk: boolean,
  dedupeUnique: boolean,
  skipMultiJob: boolean,
): ComposeEmailRecipient[] {
  const base = recipients.filter((r) => r.candidateEmail.trim());
  if (!isBulk) return base;
  let rows = base;
  if (skipMultiJob) rows = rows.filter((r) => (r.jobCount ?? 1) <= 1);
  if (dedupeUnique) {
    const seen = new Set<string>();
    const out: ComposeEmailRecipient[] = [];
    for (const r of rows) {
      const k = r.candidateEmail.trim().toLowerCase();
      if (seen.has(k)) continue;
      seen.add(k);
      out.push(r);
    }
    rows = out;
  }
  return rows;
}

export function ComposeEmailModal({
  open,
  onClose,
  jobId,
  jobTitle,
  recipients,
  onSent,
  onBulkComplete,
}: ComposeEmailModalProps) {
  const isBulk = recipients.length > 1;
  const [dedupeUnique, setDedupeUnique] = useState(true);
  const [skipMultiJob, setSkipMultiJob] = useState(false);
  const [sendProgress, setSendProgress] = useState<{
    current: number;
    total: number;
  } | null>(null);

  const effectiveRecipients = useMemo(
    () =>
      buildEffectiveRecipients(
        recipients,
        isBulk,
        dedupeUnique,
        skipMultiJob,
      ),
    [recipients, isBulk, dedupeUnique, skipMultiJob],
  );

  const primaryRecipient = effectiveRecipients[0] ?? recipients[0];
  const recipientKey = recipients.map((r) => r.candidateId).join("|");
  const [sendFrom, setSendFrom] = useState(FROM_OPTIONS[0].value);
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p><br /></p>");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<EmailTemplateListItem[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);

  const [ccList, setCcList] = useState<string[]>([]);
  const [ccRecruiter, setCcRecruiter] = useState(false);
  const [ccHl, setCcHl] = useState(false);
  const [empQuery, setEmpQuery] = useState("");
  const [empHits, setEmpHits] = useState<EmployeeRow[]>([]);
  const [empOpen, setEmpOpen] = useState(false);
  const empTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [previewOpen, setPreviewOpen] = useState(false);
  const [sending, setSending] = useState(false);
  const [banner, setBanner] = useState<{
    type: "success" | "error";
    text: string;
  } | null>(null);
  const [bulkSendSummary, setBulkSendSummary] = useState<{
    sent: number;
    failed: number;
    lastError?: string;
  } | null>(null);

  const quillModules = useMemo(
    () => ({
      toolbar: [
        [{ header: [1, 2, false] }],
        ["bold", "italic", "underline", "strike"],
        [{ list: "ordered" }, { list: "bullet" }],
        ["link"],
        ["clean"],
      ],
    }),
    [],
  );

  const templateVarCtx = useCallback((): Partial<EmailTemplateVarContext> => {
    return {
      candidate_name: primaryRecipient?.candidateName ?? "",
      job_title: jobTitle,
      recruiter_name: "Recruiter",
      company_name: "Darwinbox",
      interview_date: new Date().toLocaleDateString(undefined, {
        dateStyle: "medium",
      }),
      subject_line: subject.trim() || "[Subject]",
      body: "[Your message]",
    };
  }, [primaryRecipient?.candidateName, jobTitle, subject]);

  const applyTemplate = useCallback(
    (tpl: EmailTemplateListItem) => {
      const ctx = templateVarCtx();
      const sub = resolveEmailTemplateString(tpl.subject_template, ctx);
      const rawBody = resolveEmailTemplateString(tpl.body_template, ctx);
      const html =
        rawBody.includes("<") && rawBody.includes(">")
          ? rawBody
          : plainTextEmailToHtml(rawBody);
      setSubject(sub);
      setBodyHtml(html);
    },
    [templateVarCtx],
  );

  useEffect(() => {
    if (!open) return;
    setSendFrom(FROM_OPTIONS[0].value);
    setSubject("");
    setBodyHtml("<p><br /></p>");
    setTemplateId("");
    setCcList([]);
    setCcRecruiter(false);
    setCcHl(false);
    setEmpQuery("");
    setEmpHits([]);
    setEmpOpen(false);
    setPreviewOpen(false);
    setBanner(null);
    setSending(false);
    setDedupeUnique(true);
    setSkipMultiJob(false);
    setSendProgress(null);
    setBulkSendSummary(null);
  }, [open, recipientKey]);

  useEffect(() => {
    if (!open) return;
    let cancelled = false;
    void (async () => {
      try {
        const list = await fetchEmailTemplates();
        if (!cancelled) {
          setTemplates(list);
          setTemplatesError(null);
        }
      } catch {
        if (!cancelled) {
          setTemplates([]);
          setTemplatesError("Could not load templates.");
        }
      }
    })();
    return () => {
      cancelled = true;
    };
  }, [open]);

  useEffect(() => {
    if (!open) return;
    if (empTimer.current) clearTimeout(empTimer.current);
    empTimer.current = setTimeout(() => {
      void (async () => {
        try {
          const list = await fetchEmployees(empQuery.trim() || undefined);
          setEmpHits(list);
        } catch {
          setEmpHits([]);
        }
      })();
    }, 200);
    return () => {
      if (empTimer.current) clearTimeout(empTimer.current);
    };
  }, [empQuery, open]);

  useEffect(() => {
    if (!open) return;
    setCcList((prev) => {
      const base = prev.filter(
        (e) => e !== CC_QUICK_RECRUITER && e !== CC_QUICK_HL,
      );
      const extra: string[] = [];
      if (ccRecruiter) extra.push(CC_QUICK_RECRUITER);
      if (ccHl) extra.push(CC_QUICK_HL);
      return uniqEmails([...base, ...extra]);
    });
  }, [ccRecruiter, ccHl, open]);

  const addCc = useCallback((email: string) => {
    setCcList((prev) => uniqEmails([...prev, email]));
    setEmpQuery("");
    setEmpOpen(false);
  }, []);

  const removeCc = useCallback((email: string) => {
    setCcList((prev) => prev.filter((e) => e !== email));
    if (email === CC_QUICK_RECRUITER) setCcRecruiter(false);
    if (email === CC_QUICK_HL) setCcHl(false);
  }, []);

  const handleTemplateChange = useCallback(
    (id: string) => {
      setTemplateId(id);
      if (!id) return;
      const tpl = templates.find((t) => t.id === id);
      if (tpl) applyTemplate(tpl);
    },
    [templates, applyTemplate],
  );

  const previewSubject = useMemo(() => {
    return resolveEmailTemplateString(subject, templateVarCtx());
  }, [subject, templateVarCtx]);

  const previewBody = useMemo(() => {
    return resolveEmailTemplateString(bodyHtml, templateVarCtx());
  }, [bodyHtml, templateVarCtx]);

  const handleSend = useCallback(async () => {
    if (!subject.trim()) {
      setBanner({ type: "error", text: "Please enter a subject." });
      return;
    }
    if (isBodyEmpty(bodyHtml)) {
      setBanner({ type: "error", text: "Please enter a message body." });
      return;
    }
    const list = effectiveRecipients;
    if (list.length === 0) {
      setBanner({
        type: "error",
        text: "No recipients match the selected filters.",
      });
      return;
    }
    setSending(true);
    setBanner(null);
    setSendProgress(null);
    const cc = uniqEmails(ccList);
    const tpl =
      templateId && templates.some((t) => t.id === templateId)
        ? templateId
        : null;

    let successCount = 0;
    let failCount = 0;
    let lastError = "";

    for (let i = 0; i < list.length; i++) {
      const r = list[i];
      setSendProgress({ current: i + 1, total: list.length });
      const recipientJobId = r.jobId?.trim() || jobId;
      const recipientJobTitle = r.jobTitle?.trim() || jobTitle;
      const ctx: Partial<EmailTemplateVarContext> = {
        candidate_name: r.candidateName,
        job_title: recipientJobTitle,
        recruiter_name: "Recruiter",
        company_name: "Darwinbox",
        interview_date: new Date().toLocaleDateString(undefined, {
          dateStyle: "medium",
        }),
        subject_line: subject.trim() || "[Subject]",
        body: "[Your message]",
      };
      const resolvedSubject = resolveEmailTemplateString(subject.trim(), ctx);
      const resolvedBody = resolveEmailTemplateString(bodyHtml, ctx);

      const result = await composeSendEmail(r.candidateId, {
        jobId: recipientJobId,
        fromAddress: sendFrom,
        subject: resolvedSubject,
        htmlBody: resolvedBody,
        cc: cc.length ? cc : undefined,
        templateId: tpl,
        senderName: "Recruiter",
      });
      if (result.success) successCount++;
      else {
        failCount++;
        if (result.error) lastError = result.error;
      }
    }

    setSending(false);
    setSendProgress(null);
    onSent();

    if (recipients.length > 1) {
      setBulkSendSummary({
        sent: successCount,
        failed: failCount,
        lastError: lastError || undefined,
      });
      let s = `Sent to ${successCount} candidate${successCount === 1 ? "" : "s"}`;
      if (failCount > 0) s += `. ${failCount} failed`;
      onBulkComplete?.(s);
      return;
    }

    if (failCount === 0) {
      setBanner({
        type: "success",
        text: emailSuccessCandidateCount(successCount),
      });
      setTimeout(() => {
        onClose();
      }, 1200);
    } else {
      const text =
        successCount > 0
          ? emailPartialSuccess(successCount, list.length, failCount)
          : lastError
            ? emailVendorError(lastError)
            : emailVendorError("Unknown error");
      setBanner({
        type: successCount > 0 ? "success" : "error",
        text,
      });
    }
  }, [
    subject,
    bodyHtml,
    ccList,
    templateId,
    templates,
    effectiveRecipients,
    jobId,
    jobTitle,
    sendFrom,
    onSent,
    onClose,
    recipients.length,
    onBulkComplete,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (sending) return;
      if (previewOpen) setPreviewOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, previewOpen, sending]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;
  if (recipients.length === 0) return null;

  const fromMeta = FROM_OPTIONS.find((o) => o.value === sendFrom);

  const modal = (
    <div
      className="fixed inset-0 z-[110] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="compose-email-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 bg-[var(--bg-overlay)]"
        aria-label="Close compose"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex h-full w-full max-w-[500px] flex-col bg-[var(--bg-surface)] shadow-[var(--elevation-3)]"
        style={{ minWidth: "min(100%, 450px)" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2
            id="compose-email-title"
            className="pr-2 text-[length:var(--title-xxs)] font-bold text-[var(--text-title)]"
            style={{ fontWeight: "var(--font-weight-bold)" }}
          >
            {isBulk
              ? `Compose ${effectiveRecipients.length} Email${
                  effectiveRecipients.length === 1 ? "" : "s"
                }`
              : `Compose New Email — ${primaryRecipient?.candidateName ?? ""}`}
          </h2>
          <button
            type="button"
            onClick={onClose}
            className="flex h-9 w-9 shrink-0 items-center justify-center rounded text-[var(--charcoal-400)] hover:bg-[var(--charcoal-10)] hover:text-[var(--text-body)]"
            aria-label="Close"
          >
            <span className="text-xl leading-none" aria-hidden>
              ×
            </span>
          </button>
        </div>

        <div className="min-h-0 flex-1 overflow-y-auto px-5 py-4">
          {bulkSendSummary ? (
            <div className="space-y-4 text-[length:var(--body-m)] text-[var(--text-body)]">
              <p className="font-medium text-[var(--text-title)]">Summary</p>
              <ul className="list-none space-y-2">
                <li>
                  ✓ Sent: {bulkSendSummary.sent} candidate
                  {bulkSendSummary.sent === 1 ? "" : "s"}
                </li>
                <li>
                  ✗ Failed: {bulkSendSummary.failed}
                  {bulkSendSummary.lastError &&
                  bulkSendSummary.failed > 0 ? (
                    <span className="mt-1 block text-[length:var(--body-s)] text-[var(--text-error)]">
                      {emailVendorError(bulkSendSummary.lastError)}
                    </span>
                  ) : null}
                </li>
              </ul>
            </div>
          ) : (
            <>
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
            <div>
              <label
                className="mb-1 block text-[length:var(--body-s)] font-medium text-[var(--text-label)]"
                htmlFor="compose-send-from"
              >
                Send From
              </label>
              <div className="relative">
                <select
                  id="compose-send-from"
                  value={sendFrom}
                  onChange={(e) => setSendFrom(e.target.value)}
                  className="w-full appearance-none rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 pr-9 text-[length:var(--body-m)] text-[var(--text-body)] outline-none focus:border-[var(--blue-500)] focus:ring-1 focus:ring-[var(--blue-500)]"
                >
                  {FROM_OPTIONS.map((o) => (
                    <option key={o.value} value={o.value}>
                      {o.label}
                    </option>
                  ))}
                </select>
                <span
                  className="pointer-events-none absolute right-3 top-1/2 -translate-y-1/2 text-[var(--text-label)]"
                  aria-hidden
                >
                  ▾
                </span>
              </div>
              {fromMeta ? (
                <p
                  className={
                    fromMeta.hint === "warning"
                      ? "mt-1 text-[length:var(--body-s)] text-amber-800"
                      : "mt-1 text-[length:var(--body-s)] text-[var(--text-label)]"
                  }
                  role="note"
                >
                  {fromMeta.hintText}
                </p>
              ) : null}
            </div>

            <div>
              <span className="mb-1 block text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
                To
              </span>
              {isBulk ? (
                <div className="space-y-2 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2 text-[var(--text-body)]">
                  {effectiveRecipients.length === 0 ? (
                    <p className="text-[var(--text-label)]">
                      No recipients after applying filters.
                    </p>
                  ) : (
                    <>
                      {effectiveRecipients.slice(0, 2).map((r) => (
                        <p key={r.candidateId} className="break-all">
                          {r.candidateEmail}
                        </p>
                      ))}
                      {effectiveRecipients.length > 2 ? (
                        <p className="text-[length:var(--body-s)] text-[var(--text-label)]">
                          +{effectiveRecipients.length - 2} Recipients
                        </p>
                      ) : null}
                    </>
                  )}
                </div>
              ) : (
                <p className="break-all rounded-[4px] border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2 text-[var(--text-body)]">
                  {primaryRecipient?.candidateEmail ?? ""}
                </p>
              )}
            </div>

            {isBulk ? (
              <div className="space-y-2 rounded-[4px] border border-[var(--border-subtle)] bg-[var(--bg-surface)] px-3 py-3">
                <label className="flex cursor-pointer items-start gap-2 text-[length:var(--body-s)] text-[var(--text-body)]">
                  <input
                    type="checkbox"
                    checked={dedupeUnique}
                    onChange={(e) => setDedupeUnique(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--border-default)]"
                  />
                  <span>
                    Send only one email for each unique candidate (deduplicate
                    by email address)
                  </span>
                </label>
                <label className="flex cursor-pointer items-start gap-2 text-[length:var(--body-s)] text-[var(--text-body)]">
                  <input
                    type="checkbox"
                    checked={skipMultiJob}
                    onChange={(e) => setSkipMultiJob(e.target.checked)}
                    className="mt-0.5 rounded border-[var(--border-default)]"
                  />
                  <span>
                    Don&apos;t email candidates with multiple jobs
                  </span>
                </label>
              </div>
            ) : null}

            <div>
              <span className="mb-1 block text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
                CC
              </span>
              <div className="mb-2 flex flex-wrap gap-3">
                <label className="flex cursor-pointer items-center gap-2 text-[length:var(--body-s)] text-[var(--text-body)]">
                  <input
                    type="checkbox"
                    checked={ccRecruiter}
                    onChange={(e) => setCcRecruiter(e.target.checked)}
                    className="rounded border-[var(--border-default)]"
                  />
                  Recruiter
                </label>
                <label className="flex cursor-pointer items-center gap-2 text-[length:var(--body-s)] text-[var(--text-body)]">
                  <input
                    type="checkbox"
                    checked={ccHl}
                    onChange={(e) => setCcHl(e.target.checked)}
                    className="rounded border-[var(--border-default)]"
                  />
                  Hiring Lead
                </label>
              </div>
              {ccList.length > 0 ? (
                <ul className="mb-2 flex flex-wrap gap-2">
                  {ccList.map((em) => (
                    <li
                      key={em}
                      className="inline-flex items-center gap-1 rounded-full border border-[var(--border-default)] bg-[var(--charcoal-10)] px-2 py-0.5 text-[length:var(--body-s)] text-[var(--text-body)]"
                    >
                      <span className="max-w-[200px] truncate">{em}</span>
                      <button
                        type="button"
                        className="text-[var(--charcoal-400)] hover:text-[var(--text-error)]"
                        aria-label={`Remove ${em}`}
                        onClick={() => removeCc(em)}
                      >
                        ×
                      </button>
                    </li>
                  ))}
                </ul>
              ) : null}
              <div className="relative">
                <input
                  type="search"
                  value={empQuery}
                  onChange={(e) => {
                    setEmpQuery(e.target.value);
                    setEmpOpen(true);
                  }}
                  onFocus={() => setEmpOpen(true)}
                  placeholder="Search employees by name or email"
                  className="w-full rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-[length:var(--body-m)] text-[var(--text-body)] outline-none focus:border-[var(--blue-500)] focus:ring-1 focus:ring-[var(--blue-500)]"
                  autoComplete="off"
                />
                {empOpen && empHits.length > 0 ? (
                  <ul
                    className="absolute left-0 right-0 z-20 mt-1 max-h-48 overflow-y-auto rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-surface)] py-1 shadow-[var(--elevation-2)]"
                    role="listbox"
                  >
                    {empHits.map((e) => (
                      <li key={e.id}>
                        <button
                          type="button"
                          className="w-full px-3 py-2 text-left text-[length:var(--body-m)] hover:bg-[var(--charcoal-10)]"
                          onClick={() => addCc(e.email)}
                        >
                          <span className="font-medium">{e.name}</span>
                          <span className="block text-[length:var(--body-s)] text-[var(--text-label)]">
                            {e.email}
                          </span>
                        </button>
                      </li>
                    ))}
                  </ul>
                ) : null}
              </div>
            </div>

            <div>
              <label
                className="mb-1 block text-[length:var(--body-s)] font-medium text-[var(--text-label)]"
                htmlFor="compose-template"
              >
                Template
              </label>
              <select
                id="compose-template"
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className="w-full rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-[length:var(--body-m)] text-[var(--text-body)] outline-none focus:border-[var(--blue-500)] focus:ring-1 focus:ring-[var(--blue-500)]"
              >
                <option value="">None</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {templatesError ? (
                <p className="mt-1 text-[length:var(--body-s)] text-[var(--text-error)]">
                  {templatesError}
                </p>
              ) : null}
            </div>

            <div>
              <label
                className="mb-1 block text-[length:var(--body-s)] font-medium text-[var(--text-label)]"
                htmlFor="compose-subject"
              >
                Subject
              </label>
              <input
                id="compose-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className="w-full rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-surface)] px-3 py-2 text-[length:var(--body-m)] text-[var(--text-body)] outline-none focus:border-[var(--blue-500)] focus:ring-1 focus:ring-[var(--blue-500)]"
                placeholder="Subject"
              />
            </div>

            <div>
              <span className="mb-1 block text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
                Body
              </span>
              <div className="compose-quill rounded-[4px] border border-[var(--border-default)] bg-[var(--bg-surface)] focus-within:border-[var(--blue-500)] focus-within:ring-1 focus-within:ring-[var(--blue-500)]">
                <ReactQuill
                  theme="snow"
                  value={bodyHtml}
                  onChange={setBodyHtml}
                  modules={quillModules}
                  placeholder="Compose your message…"
                  className="min-h-[220px]"
                />
              </div>
            </div>
          </div>
            </>
          )}
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-4">
          {bulkSendSummary ? (
            <div className="flex w-full justify-end">
              <button
                type="button"
                onClick={onClose}
                className="rounded border border-[var(--blue-500)] bg-[var(--blue-500)] px-5 py-2 text-[length:var(--body-m)] font-medium text-white hover:bg-[var(--blue-600)]"
              >
                Done
              </button>
            </div>
          ) : (
            <>
              <button
                type="button"
                onClick={() => setPreviewOpen(true)}
                className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-[length:var(--body-m)] font-medium text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
              >
                Preview
              </button>
              <div className="flex flex-wrap gap-2">
                <button
                  type="button"
                  onClick={onClose}
                  className="rounded border border-[var(--border-default)] bg-[var(--bg-surface)] px-4 py-2 text-[length:var(--body-m)] font-medium text-[var(--text-body)] hover:bg-[var(--bg-surface-hover)]"
                >
                  Cancel
                </button>
                <button
                  type="button"
                  disabled={
                    sending ||
                    (isBulk && effectiveRecipients.length === 0) ||
                    (!isBulk && !primaryRecipient?.candidateEmail?.trim())
                  }
                  aria-busy={sending}
                  onClick={() => void handleSend()}
                  className="inline-flex min-w-[7rem] items-center justify-center rounded border border-[var(--blue-500)] bg-[var(--blue-500)] px-5 py-2 text-[length:var(--body-m)] font-medium text-white hover:bg-[var(--blue-600)] disabled:cursor-not-allowed disabled:opacity-60"
                >
                  {sending ? (
                    <span className="inline-flex items-center gap-2">
                      <LoadingSpinner
                        size="sm"
                        aria-hidden
                        className="border-white border-t-transparent"
                      />
                      {sendProgress
                        ? `Sending to candidate ${sendProgress.current} of ${sendProgress.total}…`
                        : "Sending…"}
                    </span>
                  ) : (
                    "Send"
                  )}
                </button>
              </div>
            </>
          )}
        </div>
      </div>

      {previewOpen ? (
        <div
          className="absolute inset-0 z-[120] flex items-center justify-center p-4"
          role="dialog"
          aria-modal="true"
          aria-label="Email preview"
        >
          <button
            type="button"
            className="absolute inset-0 bg-black/40"
            aria-label="Close preview"
            onClick={() => setPreviewOpen(false)}
          />
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-lg border border-[var(--border-card)] bg-[var(--bg-surface)] p-5 shadow-[var(--elevation-3)]">
            <div className="mb-3 flex items-center justify-between gap-2">
              <h3 className="text-[length:var(--title-xxs)] font-bold text-[var(--text-title)]">
                Preview
              </h3>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className="text-[var(--charcoal-400)] hover:text-[var(--text-body)]"
                aria-label="Close preview"
              >
                ×
              </button>
            </div>
            <p className="mb-2 text-[length:var(--body-s)] text-[var(--text-label)]">
              {isBulk
                ? "Variables resolved for preview using the first recipient shown under To (after filters)."
                : "Variables resolved for preview."}
            </p>
            <p className="mb-1 text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
              Subject
            </p>
            <p className="mb-4 font-medium text-[var(--text-body)]">{previewSubject}</p>
            <p className="mb-1 text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
              Body
            </p>
            <div
              className="max-w-none text-[length:var(--body-m)] leading-relaxed text-[var(--text-body)] [&_a]:text-[var(--blue-500)] [&_li]:my-1 [&_p]:my-2 [&_ul]:my-2"
              dangerouslySetInnerHTML={{ __html: previewBody }}
            />
          </div>
        </div>
      ) : null}
    </div>
  );

  return createPortal(modal, document.body);
}
