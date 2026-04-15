import twilio from "twilio";
import { prisma } from "../db";

function getTwilioClient(): ReturnType<typeof twilio> | null {
  const sid = process.env.TWILIO_ACCOUNT_SID?.trim();
  const token = process.env.TWILIO_AUTH_TOKEN?.trim();
  if (!sid || !token) return null;
  return twilio(sid, token);
}

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function toE164(raw: string): string {
  const t = raw.trim().replace(/\s/g, "");
  if (!t) return "";
  if (t.startsWith("+")) return `+${digitsOnly(t.slice(1))}`;
  const d = digitsOnly(t);
  return d ? `+${d}` : "";
}

export type AssignableSmsUser = {
  id: string;
  name: string;
  role: "recruiter" | "hiring_lead";
};

/**
 * Recruiter / hiring lead ids used in `prisma/seed.ts` and MOCK_EMPLOYEES in server.ts.
 * `emp-hl-003` appears in seed comms as "Hiring Lead"; we use a distinct display name for admin UI.
 */
export function getAssignableUsers(): AssignableSmsUser[] {
  return [
    { id: "emp-rec-001", name: "Atharva M", role: "recruiter" },
    { id: "emp-rec-002", name: "Priya Sharma", role: "recruiter" },
    { id: "emp-rec-003", name: "Rahul Verma", role: "recruiter" },
    { id: "emp-hl-001", name: "Neha Kapoor", role: "hiring_lead" },
    { id: "emp-hl-002", name: "Vikram Singh", role: "hiring_lead" },
    { id: "emp-hl-003", name: "Hiring Lead (HRBP)", role: "hiring_lead" },
  ];
}

export type SearchAvailableNumbersParams = {
  country: string;
  areaCode?: string;
  contains?: string;
  limit?: number;
};

export type AvailableNumberResult = {
  phoneNumber: string;
  friendlyName: string | null;
  locality: string | null;
  region: string | null;
};

export async function searchAvailableNumbers(
  params: SearchAvailableNumbersParams,
): Promise<AvailableNumberResult[]> {
  const client = getTwilioClient();
  if (!client) {
    throw new Error("Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).");
  }

  const country = (params.country || "US").trim().toUpperCase();
  if (!country) {
    throw new Error("country is required");
  }

  const limit = Math.min(Math.max(params.limit ?? 20, 1), 50);
  const listParams: Record<string, string | number> = { limit };

  const ac = params.areaCode?.trim();
  if (ac) {
    const n = parseInt(ac, 10);
    if (!Number.isNaN(n)) listParams.areaCode = n;
  }
  const contains = params.contains?.trim();
  if (contains) listParams.contains = contains;

  const resource = client.availablePhoneNumbers(country).local;
  const page = await resource.list(listParams);

  return page.map((n) => ({
    phoneNumber: n.phoneNumber,
    friendlyName: n.friendlyName ?? null,
    locality: n.locality ?? null,
    region: n.region ?? null,
  }));
}

function webhookUrls():
  | { smsUrl: string; statusCallback: string }
  | Record<string, never> {
  const base = process.env.WEBHOOK_BASE_URL?.trim();
  if (!base) return {};
  const b = base.replace(/\/$/, "");
  return {
    smsUrl: `${b}/api/webhooks/twilio/sms/inbound`,
    statusCallback: `${b}/api/webhooks/twilio/sms/status`,
  };
}

export type ProvisionNumberParams = {
  phoneNumber: string;
  displayLabel: string;
  numberType: "dedicated" | "shared";
  assignedToId: string | null;
  assignedToName: string | null;
};

export async function provisionNumber(params: ProvisionNumberParams) {
  const client = getTwilioClient();
  if (!client) {
    throw new Error("Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).");
  }

  const phone = toE164(params.phoneNumber);
  if (!phone) {
    throw new Error("phoneNumber is required");
  }

  const displayLabel = params.displayLabel?.trim() || phone;
  const numberType =
    params.numberType === "shared" ? "shared" : "dedicated";

  let assignedToId = params.assignedToId?.trim() || null;
  let assignedToName = params.assignedToName?.trim() || null;
  if (numberType === "shared") {
    assignedToId = null;
    assignedToName = null;
  }

  const hooks = webhookUrls();
  const created = await client.incomingPhoneNumbers.create({
    phoneNumber: phone,
    friendlyName: displayLabel,
    smsMethod: "POST",
    statusCallbackMethod: "POST",
    ...hooks,
  });

  const row = await prisma.smsNumber.create({
    data: {
      phone_number: created.phoneNumber ?? phone,
      twilio_phone_sid: created.sid ?? null,
      display_label: displayLabel,
      number_type: numberType,
      assigned_to_id: assignedToId,
      assigned_to_name: assignedToName,
      is_active: true,
    },
  });

  return row;
}

export type SyncTwilioNumbersResult = {
  imported: number;
  updatedSid: number;
};

export async function syncTwilioNumbers(): Promise<SyncTwilioNumbersResult> {
  const client = getTwilioClient();
  if (!client) {
    throw new Error("Twilio is not configured (TWILIO_ACCOUNT_SID / TWILIO_AUTH_TOKEN).");
  }

  const incoming = await client.incomingPhoneNumbers.list({ pageSize: 1000 });
  let imported = 0;
  let updatedSid = 0;

  const existing = await prisma.smsNumber.findMany();
  const bySid = new Map(
    existing.filter((r) => r.twilio_phone_sid).map((r) => [r.twilio_phone_sid!, r]),
  );

  for (const n of incoming) {
    const sid = n.sid;
    const phone = n.phoneNumber ?? "";
    if (!phone) continue;

    if (sid && bySid.has(sid)) continue;

    const wantDigits = digitsOnly(phone);
    const matchNoSid = existing.find(
      (r) =>
        !r.twilio_phone_sid &&
        wantDigits &&
        digitsOnly(r.phone_number) === wantDigits,
    );

    if (matchNoSid && sid) {
      await prisma.smsNumber.update({
        where: { id: matchNoSid.id },
        data: {
          twilio_phone_sid: sid,
          display_label:
            matchNoSid.display_label?.trim() ||
            n.friendlyName?.trim() ||
            phone,
        },
      });
      updatedSid++;
      bySid.set(sid, { ...matchNoSid, twilio_phone_sid: sid });
      continue;
    }

    const dupPhone = await prisma.smsNumber.findFirst({
      where: { phone_number: phone },
    });
    if (dupPhone) continue;

    await prisma.smsNumber.create({
      data: {
        phone_number: phone,
        twilio_phone_sid: sid ?? null,
        display_label: n.friendlyName?.trim() || phone,
        number_type: "dedicated",
        assigned_to_id: null,
        assigned_to_name: null,
        is_active: true,
      },
    });
    imported++;
  }

  return { imported, updatedSid };
}

export type AssignNumberParams = {
  assignedToId?: string | null;
  assignedToName?: string | null;
  numberType?: "dedicated" | "shared";
  displayLabel?: string | null;
};

export async function assignNumber(
  smsNumberId: string,
  params: AssignNumberParams,
) {
  const id = smsNumberId?.trim();
  if (!id) throw new Error("smsNumberId is required");

  await prisma.smsNumber.findUniqueOrThrow({ where: { id } });

  const numberType =
    params.numberType === "shared"
      ? "shared"
      : params.numberType === "dedicated"
        ? "dedicated"
        : undefined;

  const data: {
    assigned_to_id?: string | null;
    assigned_to_name?: string | null;
    number_type?: string;
    display_label?: string | null;
  } = {};

  if (numberType === "shared") {
    data.number_type = "shared";
    data.assigned_to_id = null;
    data.assigned_to_name = null;
  } else if (numberType === "dedicated") {
    data.number_type = "dedicated";
  }

  if (params.assignedToId !== undefined && numberType !== "shared") {
    data.assigned_to_id = params.assignedToId?.trim() || null;
  }
  if (params.assignedToName !== undefined && numberType !== "shared") {
    data.assigned_to_name = params.assignedToName?.trim() || null;
  }

  if (params.displayLabel !== undefined) {
    const dl = params.displayLabel?.trim();
    data.display_label = dl ? dl : null;
  }

  if (Object.keys(data).length === 0) {
    return prisma.smsNumber.findUniqueOrThrow({ where: { id } });
  }

  return prisma.smsNumber.update({
    where: { id },
    data,
  });
}

export async function deactivateNumber(smsNumberId: string) {
  const id = smsNumberId?.trim();
  if (!id) throw new Error("smsNumberId is required");
  return prisma.smsNumber.update({
    where: { id },
    data: { is_active: false },
  });
}
