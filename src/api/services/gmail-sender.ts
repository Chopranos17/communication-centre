import { google } from "googleapis";

export type SendViaGmailOptions = {
  cc?: string[];
  replyToMessageId?: string;
  /** Shown in the From header with the mailbox address */
  fromDisplayName?: string;
};

function escapeDisplayName(name: string): string {
  return name.replace(/[\r\n]/g, " ").replace(/"/g, '\\"').trim();
}

function formatFromHeader(displayName: string | undefined, email: string): string {
  const addr = email.trim();
  const raw = displayName?.trim();
  if (!raw) return addr;
  return `"${escapeDisplayName(raw)}" <${addr}>`;
}

function foldSubject(subject: string): string {
  return subject.replace(/[\r\n]/g, " ").trim();
}

/**
 * Sends a message via Gmail API using a raw RFC 822 payload (base64url).
 */
export async function sendViaGmail(
  accessToken: string,
  from: string,
  to: string,
  subject: string,
  htmlBody: string,
  options?: SendViaGmailOptions,
): Promise<{ messageId: string; threadId: string }> {
  const auth = new google.auth.OAuth2();
  auth.setCredentials({ access_token: accessToken });
  const gmail = google.gmail({ version: "v1", auth });

  const lines: string[] = [];
  lines.push(`From: ${formatFromHeader(options?.fromDisplayName, from)}`);
  lines.push(`To: ${to.trim()}`);
  if (options?.cc?.length) {
    lines.push(`Cc: ${options.cc.map((c) => c.trim()).filter(Boolean).join(", ")}`);
  }
  lines.push(`Subject: ${foldSubject(subject)}`);
  const replyId = options?.replyToMessageId?.trim();
  if (replyId) {
    const ref = replyId.includes("<") ? replyId : `<${replyId}>`;
    lines.push(`In-Reply-To: ${ref}`);
    lines.push(`References: ${ref}`);
  }
  lines.push("MIME-Version: 1.0");
  lines.push("Content-Type: text/html; charset=utf-8");
  lines.push("");
  lines.push(htmlBody);

  const mimeMessage = lines.join("\r\n");
  const raw = Buffer.from(mimeMessage, "utf8").toString("base64url");

  const res = await gmail.users.messages.send({
    userId: "me",
    requestBody: { raw },
  });

  const messageId = res.data.id;
  if (!messageId) {
    throw new Error("Gmail API returned no message id");
  }
  return {
    messageId,
    threadId: res.data.threadId ?? "",
  };
}
