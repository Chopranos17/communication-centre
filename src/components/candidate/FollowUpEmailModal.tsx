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
import { emailVendorError } from "../../utils/sendFeedbackMessages";
import { useToast } from "../../contexts/ToastContext";
import { DeliveryStatusGlyph } from "./DeliveryStatusGlyph";
import { LoadingSpinner } from "../ui/LoadingSpinner";
import {
  sdsBtnBase,
  sdsBtnTertiary,
  sdsButtonLink,
  sdsButtonPrimary,
  sdsButtonSecondary,
  sdsMenuItemBtn,
} from "../../lib/sdsButtonClasses";
import {
  sdsModalBody,
  sdsModalCloseButton,
  sdsModalFooterToolbar,
  sdsModalHeader,
  sdsModalTitle,
  sdsSidePanelBackdropButton,
  sdsSidePanelContainerMedium,
  sdsSidePanelContainerWide,
  sdsSidePanelNestedRoot,
  sdsSidePanelRoot,
} from "../../lib/sdsModalClasses";
import {
  sdsInput,
  sdsLabel,
  sdsSelectWFull,
} from "../../lib/sdsFormClasses";

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

type FollowUpEmailModalProps = {
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

export function FollowUpEmailModal({
  open,
  onClose,
  candidateId,
  candidateName,
  candidateEmail,
  jobId,
  jobTitle,
  threadRows,
  onSent,
}: FollowUpEmailModalProps) {
  const { showToast } = useToast();
  const [subject, setSubject] = useState("");
  const [bodyHtml, setBodyHtml] = useState("<p><br /></p>");
  const [templateId, setTemplateId] = useState<string>("");
  const [templates, setTemplates] = useState<EmailTemplateListItem[]>([]);
  const [templatesError, setTemplatesError] = useState<string | null>(null);
  const [prevOpen, setPrevOpen] = useState(true);
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
    setPrevOpen(true);
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

    let result: Awaited<ReturnType<typeof composeSendEmail>>;
    try {
      result = await composeSendEmail(candidateId, {
        jobId,
        fromAddress: CONTACT_FROM,
        subject: resolvedSubject,
        htmlBody: resolvedBody,
        cc: cc.length ? cc : undefined,
        templateId: tpl,
        senderName: "Recruiter",
        threadId: threadKey,
      });
    } catch {
      setSending(false);
      showToast("error", "Follow-up could not be sent");
      return;
    }

    setSending(false);
    if (result.success) {
      onSent();
      setTimeout(() => {
        onClose();
        showToast("success", "Follow-up sent successfully");
      }, 1200);
    } else {
      showToast("error", "Follow-up could not be sent");
      setBanner({
        type: "error",
        text: result.error
          ? emailVendorError(result.error)
          : emailVendorError("Unknown error"),
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
    showToast,
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
      className={sdsSidePanelRoot}
      role="dialog"
      aria-modal="true"
      aria-labelledby="follow-up-email-title"
    >
      <button
        type="button"
        className={sdsSidePanelBackdropButton}
        aria-label="Close follow-up"
        onClick={onClose}
      />
      <div className={sdsSidePanelContainerWide}>
        <div className={sdsModalHeader}>
          <h2 id="follow-up-email-title" className={sdsModalTitle}>
            Follow Up — {candidateName}
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
              <span className="mb-1 block text-[length:var(--body-s)] font-medium text-[var(--text-label)]">
                Send From
              </span>
              <p className="rounded-[4px] border border-[var(--border-subtle)] bg-[var(--charcoal-10)] px-3 py-2 text-[var(--text-body)]">
                {CONTACT_FROM}
              </p>
              <p className="mt-1 text-[length:var(--body-s)] text-[var(--text-label)]">
                From is fixed to contact@ for follow-up on this thread.
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

            <div className="rounded-sds-8 border border-[var(--border-card)] bg-[var(--charcoal-10)]/50">
              <button
                type="button"
                onClick={() => setPrevOpen((o) => !o)}
                className={`${sdsBtnBase} ${sdsBtnTertiary} flex w-full items-center justify-between gap-2 px-3 py-2 text-left font-medium text-[#131313]`}
                aria-expanded={prevOpen}
              >
                <span>Previous messages</span>
                <span className="text-[var(--text-label)]" aria-hidden>
                  {prevOpen ? "▾" : "▸"}
                </span>
              </button>
              {prevOpen ? (
                <div className="space-y-3 border-t border-[var(--border-subtle)] px-3 py-3">
                  {sortedThread.map((row) => (
                    <div
                      key={row.id}
                      className="border-l-2 border-[var(--charcoal-100)] pl-3"
                    >
                      <div className="flex flex-wrap items-baseline gap-2 text-[length:var(--body-s)]">
                        <span className="font-medium">{row.senderLabel}</span>
                        <span className="text-[var(--text-label)]">
                          {formatEmailDetailDateTime(row.sentAt)}
                        </span>
                        <DeliveryStatusGlyph
                        status={row.deliveryStatus}
                        scheduledForIso={row.scheduledFor}
                      />
                      </div>
                      <p className="mt-0.5 text-[length:var(--body-s)] font-medium text-[var(--text-body)]">
                        {row.subject?.trim() || "(No subject)"}
                      </p>
                      <div
                        className="mt-1 max-h-40 overflow-y-auto text-[length:var(--body-s)] font-light leading-relaxed text-[var(--text-body)] [&_a]:text-[var(--blue-500)]"
                        dangerouslySetInnerHTML={{ __html: row.body }}
                      />
                    </div>
                  ))}
                </div>
              ) : null}
            </div>

            <div>
              <span className={`mb-1 block ${sdsLabel}`}>
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
                        className={`${sdsButtonLink} min-h-[1.25rem] p-0.5 text-[var(--charcoal-400)] hover:text-[var(--text-error)]`}
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
                  className={`${sdsInput} w-full`}
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
                          className={sdsMenuItemBtn}
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
                className={`mb-1 block ${sdsLabel}`}
                htmlFor="followup-template"
              >
                Template
              </label>
              <select
                id="followup-template"
                value={templateId}
                onChange={(e) => handleTemplateChange(e.target.value)}
                className={sdsSelectWFull}
              >
                <option value="">None</option>
                {templates.map((t) => (
                  <option key={t.id} value={t.id}>
                    {t.name}
                  </option>
                ))}
              </select>
              {templatesError ? (
                <p className="mt-0.5 text-body-s text-red-500">{templatesError}</p>
              ) : null}
            </div>

            <div>
              <label
                className={`mb-1 block ${sdsLabel}`}
                htmlFor="followup-subject"
              >
                Subject
              </label>
              <input
                id="followup-subject"
                type="text"
                value={subject}
                onChange={(e) => setSubject(e.target.value)}
                className={`${sdsInput} w-full`}
                placeholder="Subject"
              />
            </div>

            <div>
              <span className={`mb-1 block ${sdsLabel}`}>
                Body
              </span>
              <div className="compose-quill rounded-sds-4 border border-[#e0e0e0] bg-white focus-within:border-[#0183FF] focus-within:outline-none">
                <ReactQuill
                  theme="snow"
                  value={bodyHtml}
                  onChange={setBodyHtml}
                  modules={quillModules}
                  placeholder="Compose your follow-up…"
                  className="min-h-[220px]"
                />
              </div>
            </div>
          </div>
        </div>

        <div className={sdsModalFooterToolbar}>
          <button
            type="button"
            onClick={() => setPreviewOpen(true)}
            className={`${sdsButtonSecondary} px-4`}
          >
            Preview
          </button>
          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onClose}
              className={`${sdsButtonSecondary} px-4`}
            >
              Cancel
            </button>
            <button
              type="button"
              disabled={sending || !candidateEmail.trim()}
              aria-busy={sending}
              onClick={() => void handleSend()}
              className={`${sdsButtonPrimary} inline-flex min-w-[7rem] justify-center px-5 disabled:opacity-50`}
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
          className={sdsSidePanelNestedRoot}
          role="dialog"
          aria-modal="true"
          aria-label="Email preview"
        >
          <button
            type="button"
            className={sdsSidePanelBackdropButton}
            aria-label="Close preview"
            onClick={() => setPreviewOpen(false)}
          />
          <div className={sdsSidePanelContainerMedium}>
            <div className={sdsModalHeader}>
              <h3 className={sdsModalTitle}>Preview</h3>
              <button
                type="button"
                onClick={() => setPreviewOpen(false)}
                className={sdsModalCloseButton}
                aria-label="Close preview"
              >
                <span className="text-xl leading-none" aria-hidden>
                  ×
                </span>
              </button>
            </div>
            <div className={sdsModalBody}>
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
        </div>
      ) : null}
    </div>
  );

  return createPortal(modal, document.body);
}
