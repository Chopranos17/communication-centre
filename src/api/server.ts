import "dotenv/config";
import express from "express";
import { prisma } from "./db";
import { sendMessage } from "./services/message-sender";

const app = express();
const PORT = Number(process.env.PORT) || 3001;

app.use(express.json());

app.get("/api/health", (_req, res) => {
  res.json({ ok: true });
});

/**
 * Task 3 verification: send one test message per channel.
 * GET /api/test-send?channel=email|sms|whatsapp
 * Optional: &to=... (E.164 phone or email override)
 *
 * Note: use `&` between params. A second `?` is wrong — but we still parse
 * `?channel=email?to=user@x.com` when browsers glue that into one `channel` value.
 */
function parseTestSendQuery(req: express.Request): {
  channel: string;
  toOverride: string;
} {
  let channelRaw =
    typeof req.query.channel === "string" ? req.query.channel : "";
  let toOverride =
    typeof req.query.to === "string" ? req.query.to.trim() : "";

  // Mistake: ...?channel=email?to=me@x.com → channel becomes "email?to=me@x.com"
  const embedded = channelRaw.match(/^(\w+)\?to=(.+)$/i);
  if (embedded) {
    channelRaw = embedded[1];
    toOverride = decodeURIComponent(embedded[2].trim());
  }

  return { channel: channelRaw.trim(), toOverride };
}

app.get("/api/test-send", async (req, res) => {
  const { channel, toOverride } = parseTestSendQuery(req);
  if (!["email", "sms", "whatsapp"].includes(channel)) {
    return res.status(400).json({
      error:
        "Query param `channel` must be one of: email | sms | whatsapp. " +
        "Use `&` for more params, e.g. /api/test-send?channel=email&to=you@example.com",
    });
  }

  const link = await prisma.candidateJob.findFirst({
    include: { candidate: true, job: true },
  });
  if (!link) {
    return res.status(500).json({
      error: "No candidate/job in database. Run: npm run db:seed",
    });
  }

  try {
    if (channel === "email") {
      const to = toOverride || link.candidate.email;
      const result = await sendMessage({
        channel: "email",
        to,
        subject: "Communication Centre — test email",
        body: "<p>This is a test email from <code>/api/test-send</code>.</p>",
        candidateId: link.candidate_id,
        jobId: link.job_id,
        senderName: "Test route",
      });
      return res.json({ channel: "email", ...result });
    }

    if (channel === "sms") {
      const to = toOverride || link.candidate.phone;
      if (!to) {
        return res.status(400).json({
          error: "Candidate has no phone. Pass ?to=+E164 (e.g. +14155552671)",
        });
      }
      const result = await sendMessage({
        channel: "sms",
        to,
        body: "Communication Centre test SMS from /api/test-send",
        candidateId: link.candidate_id,
        jobId: link.job_id,
        senderName: "Test route",
      });
      return res.json({ channel: "sms", ...result });
    }

    const raw =
      toOverride ||
      link.candidate.whatsapp_number ||
      link.candidate.phone;
    if (!raw) {
      return res.status(400).json({
        error:
          "No WhatsApp or phone on candidate. Pass ?to=+E164 (sandbox recipient)",
      });
    }
    const result = await sendMessage({
      channel: "whatsapp",
      to: raw,
      body: "Communication Centre test WhatsApp from /api/test-send",
      candidateId: link.candidate_id,
      jobId: link.job_id,
      senderName: "Test route",
    });
    return res.json({ channel: "whatsapp", ...result });
  } catch (e) {
    const msg = e instanceof Error ? e.message : String(e);
    return res.status(500).json({ error: msg });
  }
});

app.listen(PORT, () => {
  console.log(`API listening on http://localhost:${PORT}`);
});
