import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { createPortal } from "react-dom";
import ReactQuill from "react-quill";
import "react-quill/dist/quill.snow.css";

import type {
  CurrentJobEmailRow,
  EmailTemplateListItem,
  EmployeeRow,
} from "../../api/candidatesClient";
import {
  composeSendEmail,
  fetchEmailTemplates,
  fetchEmployees,
} from "../../api/candidatesClient";
import {
  formatEmailDetailDateTime,
  getThreadComposeKey,
  replySubjectFromThread,
  sortEmailRowsChronological,
} from "../../utils/communicationTimeline";
import {
  plainTextEmailToHtml,
  resolveEmailTemplateString,
  type EmailTemplateVarContext,
} from "../../utils/emailTemplateVars";
import { DeliveryStatusGlyph } from "./DeliveryStatusGlyph";
import { LoadingSpinner } from "../ui/LoadingSpinner";

const CONTACT_FROM = "contact@darwinbox.in";
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

function SenderRoleIcon({ senderType }: { senderType: string }) {
  if (senderType === "candidate") {
    return (
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--green-50)] text-[length:var(--body-s)] font-bold text-[var(--green-700)]"
        title="Candidate"
      >
        C
      </span>
    );
  }
  if (senderType === "system" || senderType === "CRM") {
    return (
      <span
        className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--charcoal-100)] text-[length:var(--body-s)] font-bold text-[var(--charcoal-600)]"
        title={senderType === "CRM" ? "CRM" : "System"}
      >
        S
      </span>
    );
  }
  return (
    <span
      className="inline-flex h-7 w-7 shrink-0 items-center justify-center rounded-full bg-[var(--blue-50)] text-[length:var(--body-s)] font-bold text-[var(--blue-700)]"
      title="Recruiter"
    >
      R
    </span>
  );
}

type ReplyThreadModalProps = {
  open: boolean;
  onClose: () => void;
  candidateId: string;
  candidateName: string;
  candidateEmail: string;
  jobId: string;
  jobTitle: string;
  threadRows: CurrentJobEmailRow[];
  onSent: () => void;
};

export function ReplyThreadModal({
  open,
  onClose,
  candidateId,
  candidateName,
  candidateEmail,
  jobId,
  jobTitle,
  threadRows,
  onSent,
}: ReplyThreadModalProps) {
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p><br /></p>");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<EmailTemplateListItem[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [expandedMsg, setExpandedMsg] = useState<Record<string, boolean>>({});
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

  const threadKey = getThreadComposeKey(threadRows) ?? "";
  const sortedThread = useMemo(
    () => sortEmailRowsChronological(threadRows),
    [threadRows],
  );

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
      candidate_name: candidateName,
      job_title: jobTitle,
      recruiter_name: "Recruiter",
      company_name: "Darwinbox",
      interview_date: new Date().toLocaleDateString(undefined, {
        dateStyle: "medium",
      }),
      subject_line: subject.trim() || "[Subject]",
      body: "[Your message]",
    };
  }, [candidateName, jobTitle, subject]);

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
    setSubject(replySubjectFromThread(threadRows));
    setBodyHtml("<p><br /></p>");
    setTemplateId("");
    const init: Record<string, boolean> = {};
    for (const r of threadRows) init[r.id] = true;
    setExpandedMsg(init);
    setCcList([]);
    setCcRecruiter(false);
    setCcHl(false);
    setEmpQuery("");
    setEmpHits([]);
    setEmpOpen(false);
    setPreviewOpen(false);
    setBanner(null);
    setSending(false);
  }, [open, threadKey, threadRows]);

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

  const toggleMsg = (id: string) => {
    setExpandedMsg((prev) => ({ ...prev, [id]: !prev[id] }));
  };

  const previewSubject = useMemo(() => {
    return resolveEmailTemplateString(subject, templateVarCtx());
  }, [subject, templateVarCtx]);

  const previewBody = useMemo(() => {
    return resolveEmailTemplateString(bodyHtml, templateVarCtx());
  }, [bodyHtml, templateVarCtx]);

  const handleSend = useCallback(async () => {
    if (!threadKey) {
      setBanner({ type: "error", text: "Missing thread context." });
      return;
    }
    if (!subject.trim()) {
      setBanner({ type: "error", text: "Please enter a subject." });
      return;
    }
    if (isBodyEmpty(bodyHtml)) {
      setBanner({ type: "error", text: "Please enter a message body." });
      return;
    }
    if (!candidateEmail.trim()) {
      setBanner({ type: "error", text: "Candidate has no email address." });
      return;
    }
    setSending(true);
    setBanner(null);
    const cc = uniqEmails(ccList);
    const tpl =
      templateId && templates.some((t) => t.id === templateId)
        ? templateId
        : null;
    const ctx: Partial<EmailTemplateVarContext> = {
      candidate_name: candidateName,
      job_title: jobTitle,
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

    const result = await composeSendEmail(candidateId, {
      jobId,
      fromAddress: CONTACT_FROM,
      subject: resolvedSubject,
      htmlBody: resolvedBody,
      cc: cc.length ? cc : undefined,
      templateId: tpl,
      senderName: "Recruiter",
      threadId: threadKey,
    });

    setSending(false);
    if (result.success) {
      setBanner({
        type: "success",
        text: `Email successfully sent to ${candidateEmail}.`,
      });
      onSent();
      setTimeout(() => onClose(), 1200);
    } else {
      setBanner({
        type: "error",
        text: result.error
          ? `Failed to send email: ${result.error}. Message saved with failed status.`
          : "Failed to send email. Message saved with failed status.",
      });
      onSent();
    }
  }, [
    threadKey,
    subject,
    bodyHtml,
    candidateEmail,
    candidateId,
    jobId,
    candidateName,
    jobTitle,
    ccList,
    templateId,
    templates,
    onSent,
    onClose,
  ]);

  useEffect(() => {
    if (!open) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key !== "Escape") return;
      if (previewOpen) setPreviewOpen(false);
      else onClose();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [open, onClose, previewOpen]);

  useEffect(() => {
    if (!open) return;
    const prev = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => {
      document.body.style.overflow = prev;
    };
  }, [open]);

  if (!open) return null;

  const modal = (
    <div
      className="fixed inset-0 z-[115] flex justify-end"
      role="dialog"
      aria-modal="true"
      aria-labelledby="reply-thread-title"
    >
      <button
        type="button"
        className="absolute inset-0 z-0 bg-[var(--bg-overlay)]"
        aria-label="Close reply"
        onClick={onClose}
      />
      <div
        className="relative z-10 flex h-full w-full max-w-[640px] flex-col bg-[var(--bg-surface)] shadow-[var(--elevation-3)]"
        style={{ minWidth: "min(100%, 520px)" }}
      >
        <div className="flex shrink-0 items-center justify-between border-b border-[var(--border-subtle)] px-5 py-4">
          <h2
            id="reply-thread-title"
            className="pr-2 text-[length:var(--title-xxs)] font-bold text-[var(--text-title)]"
            style={{ fontWeight: "var(--font-weight-bold)" }}
          >
            Reply — {candidateName}
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

          <div className="mb-6 space-y-2">
            <p className="text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
              Thread
            </p>
            <div className="space-y-2">
              {sortedThread.map((row, idx) => {
                const exp = expandedMsg[row.id] ?? false;
                return (
                  <div
                    key={row.id}
                    className="rounded-[var(--radius-md)] border border-[var(--border-subtle)] bg-[var(--charcoal-10)]/60"
                    style={{ marginLeft: idx > 0 ? 12 : 0 }}
                  >
                    <button
                      type="button"
                      onClick={() => toggleMsg(row.id)}
                      className="flex w-full items-start gap-2 px-3 py-2 text-left hover:bg-[var(--charcoal-10)]"
                      aria-expanded={exp}
                    >
                      <span
                        className="mt-1 font-mono text-[var(--text-label)]"
                        aria-hidden
                      >
                        ^
                      </span>
                      <SenderRoleIcon senderType={row.senderType} />
                      <div className="min-w-0 flex-1">
                        <div className="flex flex-wrap items-baseline gap-2">
                          <span className="font-medium text-[var(--text-body)]">
                            {row.senderLabel}
                          </span>
                          <span className="text-[length:var(--body-s)] text-[var(--text-label)]">
                            {formatEmailDetailDateTime(row.sentAt)}
                          </span>
                          <DeliveryStatusGlyph status={row.deliveryStatus} />
                        </div>
                        {!exp ? (
                          <p className="mt-0.5 line-clamp-2 text-[length:var(--body-s)] text-[var(--text-body)]">
                            <span className="font-medium">
                              {row.subject?.trim() || "(No subject)"}
                            </span>
                          </p>
                        ) : null}
                      </div>
                    </button>
                    {exp ? (
                      <div className="border-t border-[var(--border-subtle)] px-3 py-2 pl-[4.25rem]">
                        <p className="mb-2 text-[length:var(--body-s)] font-medium text-[var(--text-body)]">
                          {row.subject?.trim() || "(No subject)"}
                        </p>
                        <div
                          className="max-h-64 overflow-y-auto text-[length:var(--body-m)] leading-relaxed text-[var(--text-body)] [&_a]:text-[var(--blue-500)]"
                          dangerouslySetInnerHTML={{ __html: row.body }}
                        />
                      </div>
                    ) : null}
                  </div>
                );
              })}
            </div>
          </div>

          <div className="space-y-4 border-t border-[var(--border-subtle)] pt-4 text-[length:var(--body-m)]">
            <p className="text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
              Your reply
            </p>
            <div>
              <span className="mb-1 block text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
                Send From
              </span>
              <p className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2 text-[var(--text-body)]">
                {CONTACT_FROM}
              </p>
            </div>

            <div>
              <span className="mb-1 block text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
                To
              </span>
              <p className="break-all rounded-[4px] border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2 text-[var(--text-body)]">
                {candidateEmail}
              </p>
            </div>

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
                htmlFor="reply-template"
              >
                Template
              </label>
              <select
                id="reply-template"
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
                htmlFor="reply-subject"
              >
                Subject
              </label>
              <input
                id="reply-subject"
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
                  placeholder="Write your reply…"
                  className="min-h-[200px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className="flex shrink-0 flex-wrap items-center justify-between gap-3 border-t border-[var(--border-subtle)] px-5 py-4">
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
              disabled={sending || !candidateEmail.trim()}
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
                  Sending…
                </span>
              ) : (
                "Send"
              )}
            </button>
          </div>
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
          <div className="relative z-10 max-h-[85vh] w-full max-w-lg overflow-y-auto rounded-[var(--radius-md)] border border-[var(--border-default)] bg-[var(--bg-surface)] p-5 shadow-[var(--elevation-3)]">
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
