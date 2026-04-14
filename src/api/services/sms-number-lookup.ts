import { prisma } from "../db";
import { PERSONA_TO_USER_ID } from "../../constants/personaUserIds";

export { PERSONA_TO_USER_ID };

/** Fields needed for inbound routing (matches {@link SmsNumber} scalars we read). */
type SmsNumberRow = {
  id: string;
  phone_number: string;
  number_type: string;
  assigned_to_id: string | null;
  assigned_to_name: string | null;
  display_label: string | null;
};

function digitsOnly(s: string): string {
  return s.replace(/\D/g, "");
}

function phoneDigitsMatch(
  incomingDigits: string,
  stored: string | null | undefined,
): boolean {
  if (!stored || !incomingDigits) return false;
  const b = digitsOnly(stored);
  if (!b) return false;
  return (
    incomingDigits === b ||
    incomingDigits.endsWith(b) ||
    b.endsWith(incomingDigits)
  );
}

async function findSmsNumbersMatchingReceivingNumber(
  receivingTwilioNumber: string,
): Promise<SmsNumberRow[]> {
  const want = digitsOnly(receivingTwilioNumber);
  if (!want) return [];
  const all = await prisma.smsNumber.findMany({
    where: { is_active: true },
  });
  return all.filter((n) => phoneDigitsMatch(want, n.phone_number));
}

async function findCandidateIdsByPhoneDigits(
  digits: string,
): Promise<string[]> {
  if (!digits) return [];
  const rows = await prisma.candidate.findMany();
  const ids: string[] = [];
  for (const c of rows) {
    if (
      phoneDigitsMatch(digits, c.phone) ||
      phoneDigitsMatch(digits, c.whatsapp_number)
    ) {
      ids.push(c.id);
    }
  }
  return ids;
}

export type SmsEligibilityReason =
  | "OK"
  | "SMS_OPTED_OUT"
  | "SMS_NO_CONSENT"
  | "SMS_NO_NUMBER";

export type SmsEligibilityResult = {
  eligible: boolean;
  reason: SmsEligibilityReason;
  message: string;
  senderNumber: string | null;
};

/**
 * Rules: consent must be granted; sender must resolve to an active {@link SmsNumber}
 * via {@link getSmsNumberForUser} (dedicated or shared).
 */
export async function evaluateSmsSendEligibility(
  smsConsentStatus: string,
  senderUserId: string | null | undefined,
): Promise<SmsEligibilityResult> {
  if (smsConsentStatus === "revoked") {
    return {
      eligible: false,
      reason: "SMS_OPTED_OUT",
      message: "Candidate has opted out of SMS.",
      senderNumber: null,
    };
  }
  if (smsConsentStatus === "pending" || smsConsentStatus !== "granted") {
    return {
      eligible: false,
      reason: "SMS_NO_CONSENT",
      message: "SMS consent has not been granted for this candidate.",
      senderNumber: null,
    };
  }

  const uid = senderUserId?.trim();
  if (!uid) {
    return {
      eligible: false,
      reason: "SMS_NO_NUMBER",
      message: "No sender user id — cannot resolve an SMS sending number.",
      senderNumber: null,
    };
  }

  const row = await getSmsNumberForUser(uid);
  if (!row) {
    return {
      eligible: false,
      reason: "SMS_NO_NUMBER",
      message: "No SMS sending number is assigned for this sender.",
      senderNumber: null,
    };
  }

  return {
    eligible: true,
    reason: "OK",
    message: "",
    senderNumber: row.phone_number,
  };
}

/**
 * Look up the SMS number assigned to a specific user (dedicated).
 * Falls back to the shared team number if no dedicated number exists.
 *
 * @param userId - e.g. 'emp-rec-001' or 'emp-hl-001'
 */
export async function getSmsNumberForUser(userId: string) {
  // First, try to find a dedicated number for this user
  const dedicated = await prisma.smsNumber.findFirst({
    where: {
      assigned_to_id: userId,
      number_type: "dedicated",
      is_active: true,
    },
  });

  if (dedicated) return dedicated;

  // Fallback: find the shared number
  const shared = await prisma.smsNumber.findFirst({
    where: {
      number_type: "shared",
      is_active: true,
    },
  });

  return shared;
}

/**
 * Look up an SMS number by the phone number itself (for inbound routing).
 * Used when Twilio tells us which number received an inbound message.
 * In dev mode, multiple rows may share the same phone number.
 */
export async function getSmsNumberByPhone(phoneNumber: string) {
  return prisma.smsNumber.findMany({
    where: {
      phone_number: phoneNumber,
      is_active: true,
    },
  });
}

export type InboundSmsOwnerResolution = {
  smsNumberId: string | null;
  ownerId: string | null;
  ownerName: string | null;
  lineLabel: string | null;
};

function pickResolution(row: SmsNumberRow): InboundSmsOwnerResolution {
  return {
    smsNumberId: row.id,
    ownerId: row.assigned_to_id,
    ownerName: row.assigned_to_name,
    lineLabel: row.display_label,
  };
}

/**
 * For inbound routing: determine which SmsNumber a reply belongs to
 * by matching the Twilio "To" number, then (when multiple DB rows share that
 * number — dev mode) using the last outbound SMS to this candidate.
 * Falls back to the shared number, then first matching row.
 *
 * @param candidatePhone - Normalized digit string from the inbound From (same as poller uses); may be empty when no candidate match.
 * @param receivingTwilioNumber - Twilio inbound `To` (our number).
 */
export async function resolveInboundSmsOwner(
  candidatePhone: string,
  receivingTwilioNumber: string,
): Promise<InboundSmsOwnerResolution> {
  const empty: InboundSmsOwnerResolution = {
    smsNumberId: null,
    ownerId: null,
    ownerName: null,
    lineLabel: null,
  };

  const smsNumbers =
    await findSmsNumbersMatchingReceivingNumber(receivingTwilioNumber);
  if (smsNumbers.length === 0) return empty;

  if (smsNumbers.length === 1) {
    return pickResolution(smsNumbers[0]);
  }

  const candDigits = digitsOnly(candidatePhone);
  const candidateIds = candDigits
    ? await findCandidateIdsByPhoneDigits(candDigits)
    : [];

  if (candidateIds.length > 0) {
    const lastOutbound = await prisma.communication.findFirst({
      where: {
        candidate_id:
          candidateIds.length === 1
            ? candidateIds[0]
            : { in: candidateIds },
        channel: "sms",
        direction: "outbound",
        sms_number_id: { not: null },
      },
      orderBy: { sent_at: "desc" },
    });

    if (lastOutbound?.sms_number_id) {
      const matched = smsNumbers.find(
        (n) => n.id === lastOutbound.sms_number_id,
      );
      if (matched) return pickResolution(matched);
    }
  }

  const shared = smsNumbers.find((n) => n.number_type === "shared");
  const fallback = shared ?? smsNumbers[0];
  return pickResolution(fallback);
}

/**
 * Get all active SMS numbers (for admin settings page).
 */
export async function getAllSmsNumbers() {
  return prisma.smsNumber.findMany({
    where: { is_active: true },
    orderBy: { created_at: "asc" },
  });
}
