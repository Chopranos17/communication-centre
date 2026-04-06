import { Resend } from "resend";
import twilio from "twilio";
import { prisma } from "../db";

export type MessageChannel = "email" | "sms" | "whatsapp";

export interface VendorSendResult {
  success: boolean;
  messageId?: string;
  error?: string;
}

export interface SendEmailParams {
  from?: string;
  to: string;
  cc?: string[];
  subject: string;
  htmlBody: string;
}

export interface SendSMSParams {
  to: string;
  body: string;
}

export interface SendWhatsAppParams {
  to: string;
  body: string;
}

export interface SendMessageParams {
  channel: MessageChannel;
  to: string;
  /** Resend/Twilio “from” (verified sender for API). */
  from?: string;
  /** For email: stored as `from_address` when set (e.g. branded no-reply@…) while `from` is the verified Resend address. */
  fromDisplay?: string;
  subject?: string;
  body: string;
  cc?: string[];
  candidateId: string;
  jobId: string;
  senderType?: string;
  senderName?: string;
  templateId?: string | null;
}

export interface SendMessageResult extends VendorSendResult {
  communicationId: string;
}

const DEFAULT_EMAIL_FROM = "onboarding@resend.dev";

function getResend(): Resend | null {
  const key = process.env.RESEND_API_KEY?.trim();
  if (!key) return null;
  return new Resend(key);
}

function getTwilioClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return null;
  return twilio(sid, token);
}

/** Ensures WhatsApp `to` uses Twilio's whatsapp:+E.164 form. */
export function normalizeWhatsAppTo(to: string): string {
  const t = to.trim();
  if (/^whatsapp:/i.test(t)) return t;
  const cleaned = t.replace(/\s/g, "");
  if (cleaned.startsWith("+")) return `whatsapp:${cleaned}`;
  const digits = cleaned.replace(/\D/g, "");
  if (!digits) return "whatsapp:";
  return `whatsapp:+${digits}`;
}

export async function sendEmail(
  params: SendEmailParams,
): Promise<VendorSendResult> {
  const resend = getResend();
  if (!resend) {
    console.warn(
      "[message-sender] RESEND_API_KEY missing or empty — mock email (DB only)",
    );
    return { success: true };
  }

  const from = params.from?.trim() || DEFAULT_EMAIL_FROM;

  try {
    const { data, error } = await resend.emails.send({
      from,
      to: params.to,
      ...(params.cc?.length ? { cc: params.cc } : {}),
      subject: params.subject,
      html: params.htmlBody,
    });

    if (error) {
      return {
        success: false,
        error:
          typeof error === "object" && error && "message" in error
            ? String((error as { message: unknown }).message)
            : String(error),
      };
    }

    return { success: true, messageId: data?.id };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function sendSMS(params: SendSMSParams): Promise<VendorSendResult> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_PHONE_NUMBER?.trim();

  if (!client || !from) {
    console.warn(
      "[message-sender] Twilio SMS not fully configured — mock SMS (DB only)",
    );
    return { success: true };
  }

  try {
    const msg = await client.messages.create({
      body: params.body,
      from,
      to: params.to,
    });
    return { success: true, messageId: msg.sid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function sendWhatsApp(
  params: SendWhatsAppParams,
): Promise<VendorSendResult> {
  const client = getTwilioClient();
  const from = process.env.TWILIO_WHATSAPP_NUMBER?.trim();

  if (!client || !from) {
    console.warn(
      "[message-sender] Twilio WhatsApp not fully configured — mock WhatsApp (DB only)",
    );
    return { success: true };
  }

  const to = normalizeWhatsAppTo(params.to);

  try {
    const msg = await client.messages.create({
      body: params.body,
      from,
      to,
    });
    return { success: true, messageId: msg.sid };
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return { success: false, error: msg };
  }
}

export async function sendMessage(
  params: SendMessageParams,
): Promise<SendMessageResult> {
  const {
    channel,
    to,
    from,
    subject,
    body,
    cc,
    candidateId,
    jobId,
  } = params;

  let vendor: VendorSendResult;

  if (channel === "email") {
    vendor = await sendEmail({
      from,
      to,
      cc,
      subject: subject ?? "(no subject)",
      htmlBody: body,
    });
  } else if (channel === "sms") {
    vendor = await sendSMS({ to, body });
  } else {
    vendor = await sendWhatsApp({ to, body });
  }

  const deliveryStatus = vendor.success ? "sent" : "failed";

  const fromStored =
    channel === "email"
      ? (params.fromDisplay?.trim() ||
          from?.trim() ||
          DEFAULT_EMAIL_FROM)
      : channel === "sms"
        ? process.env.TWILIO_PHONE_NUMBER?.trim() ?? from?.trim() ?? null
        : process.env.TWILIO_WHATSAPP_NUMBER?.trim() ?? from?.trim() ?? null;

  const toStored = channel === "whatsapp" ? normalizeWhatsAppTo(to) : to;

  const row = await prisma.communication.create({
    data: {
      candidate_id: candidateId,
      job_id: jobId,
      channel,
      direction: "outbound",
      sender_type: params.senderType ?? "recruiter",
      sender_name: params.senderName ?? null,
      from_address: fromStored,
      to_address: toStored,
      cc_addresses:
        channel === "email" && cc?.length ? JSON.stringify(cc) : null,
      subject: channel === "email" ? (subject ?? null) : null,
      body,
      template_id: params.templateId?.trim() || null,
      delivery_status: deliveryStatus,
      vendor_message_id:
        vendor.success && vendor.messageId ? vendor.messageId : null,
    },
  });

  return {
    success: vendor.success,
    messageId: vendor.messageId,
    error: vendor.error,
    communicationId: row.id,
  };
}
