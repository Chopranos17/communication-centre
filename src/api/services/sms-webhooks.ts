import type { Request, Response } from "express";
import { prisma } from "../db";
import { emitMessageUpdated } from "../socket-io";
import { ingestInboundSmsFromTwilio } from "./inbound-poller";

function twilioDeliveryToDbStatus(raw: string): string {
  const s = raw.trim().toLowerCase();
  if (s === "delivered") return "delivered";
  if (s === "sent" || s === "sending") return "sent";
  if (s === "failed" || s === "undelivered") return "failed";
  if (s === "read") return "delivered";
  return "pending";
}

function buildMessageUpdatedPayload(
  row: {
    id: string;
    candidate_id: string | null;
    job_id: string | null;
    channel: string;
    direction: string;
    sender_type: string;
    sender_id: string | null;
    sender_name: string | null;
    thread_id: string | null;
    from_address: string | null;
    to_address: string | null;
    cc_addresses: string | null;
    subject: string | null;
    body: string;
    template_id: string | null;
    delivery_status: string;
    vendor_message_id: string | null;
    sent_at: Date;
    read_at: Date | null;
    scheduled_for: Date | null;
    sms_number_id?: string | null;
    connected_email_id?: string | null;
    connected_email?: { email_address: string } | null;
  },
  candidate: { id: string; name: string; email: string },
  job: { id: string; title: string; job_code: string },
) {
  const ce = row.connected_email;
  const ceAddr = ce?.email_address?.trim();
  return {
    communication: {
      id: row.id,
      candidate_id: row.candidate_id,
      job_id: row.job_id,
      channel: row.channel,
      direction: row.direction,
      sender_type: row.sender_type,
      sender_id: row.sender_id,
      sender_name: row.sender_name,
      thread_id: row.thread_id,
      from_address: row.from_address,
      to_address: row.to_address,
      cc_addresses: row.cc_addresses,
      subject: row.subject,
      body: row.body,
      template_id: row.template_id,
      delivery_status: row.delivery_status,
      vendor_message_id: row.vendor_message_id,
      sent_at: row.sent_at.toISOString(),
      read_at: row.read_at ? row.read_at.toISOString() : null,
      scheduled_for: row.scheduled_for?.toISOString() ?? null,
      ...(row.sms_number_id != null
        ? { sms_number_id: row.sms_number_id }
        : {}),
      ...(row.connected_email_id != null
        ? { connected_email_id: row.connected_email_id }
        : {}),
      ...(ceAddr
        ? { connected_email: { email_address: ceAddr } }
        : {}),
    },
    candidate,
    job: {
      id: job.id,
      title: job.title,
      job_code: job.job_code,
    },
  };
}

/**
 * Twilio inbound SMS webhook (form-urlencoded POST).
 * Twilio expects TwiML response; empty `<Response/>` acknowledges without replying.
 */
export async function handleInboundSmsWebhook(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const MessageSid = String(req.body?.MessageSid ?? "").trim();
    const From = String(req.body?.From ?? "").trim();
    const To = req.body?.To != null ? String(req.body.To).trim() : "";
    const Body = typeof req.body?.Body === "string" ? req.body.Body : "";
    let sentAt = new Date();
    const dateSent = req.body?.DateSent;
    if (typeof dateSent === "string" && dateSent.trim()) {
      const d = new Date(dateSent);
      if (!Number.isNaN(d.getTime())) sentAt = d;
    }

    if (!MessageSid) {
      res
        .status(400)
        .type("text/xml")
        .send(
          '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
        );
      return;
    }

    await ingestInboundSmsFromTwilio({
      vendorMessageId: MessageSid,
      fromRaw: From,
      toRaw: To || null,
      body: Body,
      sentAt,
    });

    res
      .status(200)
      .type("text/xml")
      .send('<?xml version="1.0" encoding="UTF-8"?><Response></Response>');
  } catch (e) {
    console.error("[sms-webhook] inbound error:", e);
    res.status(500).type("text/xml").send(
      '<?xml version="1.0" encoding="UTF-8"?><Response></Response>',
    );
  }
}

/**
 * Twilio status callback for outbound (and optionally inbound) message lifecycle.
 */
export async function handleStatusCallback(
  req: Request,
  res: Response,
): Promise<void> {
  try {
    const MessageSid = String(req.body?.MessageSid ?? "").trim();
    const rawStatus = String(req.body?.MessageStatus ?? "").trim();

    if (!MessageSid) {
      res.status(400).send("Missing MessageSid");
      return;
    }

    const deliveryStatus = twilioDeliveryToDbStatus(rawStatus || "sent");

    const row = await prisma.communication.findFirst({
      where: { vendor_message_id: MessageSid },
      include: {
        job: true,
        connected_email: { select: { email_address: true } },
      },
    });

    if (!row) {
      res.status(200).json({ ok: true, updated: false });
      return;
    }

    if (row.delivery_status === deliveryStatus) {
      res.status(200).json({ ok: true, updated: false });
      return;
    }

    const updated = await prisma.communication.update({
      where: { id: row.id },
      data: { delivery_status: deliveryStatus },
      include: {
        job: true,
        connected_email: { select: { email_address: true } },
      },
    });

    if (updated.candidate_id && updated.job_id && updated.job) {
      const candidate = await prisma.candidate.findUnique({
        where: { id: updated.candidate_id },
        select: { id: true, name: true, email: true },
      });
      if (candidate) {
        emitMessageUpdated(
          buildMessageUpdatedPayload(updated, candidate, {
            id: updated.job.id,
            title: updated.job.title,
            job_code: updated.job.job_code,
          }),
        );
      }
    }

    res.status(200).json({ ok: true, updated: true });
  } catch (e) {
    console.error("[sms-webhook] status callback error:", e);
    res.status(500).json({ error: "status callback failed" });
  }
}
