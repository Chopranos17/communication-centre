import { prisma } from "../db";
import { PERSONA_TO_USER_ID } from "../../constants/personaUserIds";

export { PERSONA_TO_USER_ID };

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
      number_type: 'dedicated',
      is_active: true,
    },
  });

  if (dedicated) return dedicated;

  // Fallback: find the shared number
  const shared = await prisma.smsNumber.findFirst({
    where: {
      number_type: 'shared',
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

/**
 * For inbound routing: determine which SmsNumber a reply belongs to
 * by checking who last sent an outbound SMS to this candidate.
 * This is especially important in dev mode where all numbers are the same.
 */
export async function resolveInboundSmsOwner(
  candidatePhone: string,
  receivingTwilioNumber: string,
): Promise<{ smsNumberId: string | null; ownerId: string | null }> {
  // Step 1: Find all SmsNumber rows matching the Twilio number
  const smsNumbers = await prisma.smsNumber.findMany({
    where: { phone_number: receivingTwilioNumber, is_active: true },
  });

  if (smsNumbers.length === 0) {
    return { smsNumberId: null, ownerId: null };
  }

  // Step 2: If only one match, it's simple
  if (smsNumbers.length === 1) {
    return {
      smsNumberId: smsNumbers[0].id,
      ownerId: smsNumbers[0].assigned_to_id,
    };
  }

  // Step 3: Multiple matches (dev mode) — check who last messaged this candidate
  const candidate = await prisma.candidate.findFirst({
    where: {
      OR: [
        { phone: candidatePhone },
        { whatsapp_number: candidatePhone },
      ],
    },
  });

  if (candidate) {
    const lastOutbound = await prisma.communication.findFirst({
      where: {
        candidate_id: candidate.id,
        channel: 'sms',
        direction: 'outbound',
        sms_number_id: { not: null },
      },
      orderBy: { sent_at: 'desc' },
    });

    if (lastOutbound?.sms_number_id) {
      const matched = smsNumbers.find((n) => n.id === lastOutbound.sms_number_id);
      if (matched) {
        return {
          smsNumberId: matched.id,
          ownerId: matched.assigned_to_id,
        };
      }
    }
  }

  // Step 4: Fallback — pick shared if available, else first
  const shared = smsNumbers.find((n) => n.number_type === 'shared');
  const fallback = shared || smsNumbers[0];
  return {
    smsNumberId: fallback.id,
    ownerId: fallback.assigned_to_id,
  };
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