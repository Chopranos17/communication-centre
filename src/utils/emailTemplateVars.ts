/** Variable keys used in seed `EmailTemplate` rows (`{{snake_case}}`). */
export type EmailTemplateVarContext = {
  candidate_name: string;
  job_title: string;
  recruiter_name: string;
  company_name: string;
  interview_date: string;
  subject_line: string;
  body: string;
};

export function resolveEmailTemplateString(
  template: string,
  ctx: Partial<EmailTemplateVarContext>,
): string {
  return template.replace(
    /\{\{\s*([a-zA-Z0-9_]+)\s*\}\}/g,
    (_m, key: string) => {
      const v = ctx[key as keyof EmailTemplateVarContext];
      if (v !== undefined && v !== null && String(v).length > 0) {
        return String(v);
      }
      return `{{${key}}}`;
    },
  );
}

/** Convert plain text (with newlines) to simple HTML for the rich-text editor. */
export function plainTextEmailToHtml(text: string): string {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const paragraphs = escaped.split(/\n\n+/).filter(Boolean);
  if (paragraphs.length === 0) return "<p><br /></p>";
  return paragraphs
    .map((p) => `<p>${p.replace(/\n/g, "<br />")}</p>`)
    .join("");
}
