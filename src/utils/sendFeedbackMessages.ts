/**
 * PRD / Task 19 copy for send feedback banners (success, partial, vendor errors).
 */

const WHATSAPP_SANDBOX_NUMBER = "+14155238886";

export function emailSuccessCandidateCount(n: number): string {
  if (n <= 0) {
    return "Email successfully sent to 0 candidates.";
  }
  if (n === 1) {
    return "Email successfully sent to 1 candidate.";
  }
  return `Email successfully sent to ${n} candidates.`;
}

export function emailPartialSuccess(
  x: number,
  y: number,
  z: number,
): string {
  return `Email sent to ${x} of ${y} candidates. ${z} addresses were invalid.`;
}

export function emailVendorError(vendorMessage: string): string {
  return `Failed to send email: ${vendorMessage}. Message saved as draft.`;
}

export function smsVendorError(vendorMessage: string): string {
  return `Failed to send SMS: ${vendorMessage}. Message saved as draft.`;
}

export function whatsappVendorError(vendorMessage: string): string {
  return `Failed to send WhatsApp message: ${vendorMessage}. Message saved as draft.`;
}

/** Task 19 — optional real code via VITE_TWILIO_SANDBOX_JOIN_CODE */
export function whatsappSandboxRecipientMessage(): string {
  const code =
    typeof import.meta.env.VITE_TWILIO_SANDBOX_JOIN_CODE === "string"
      ? import.meta.env.VITE_TWILIO_SANDBOX_JOIN_CODE.trim()
      : "";
  const joinPhrase = code.length > 0 ? `join ${code}` : "join {code}";
  return `Recipient has not joined the WhatsApp sandbox. Ask them to send '${joinPhrase}' to ${WHATSAPP_SANDBOX_NUMBER}.`;
}

/**
 * Twilio errors when the recipient is not opted into the sandbox or not a valid WA user.
 */
export function isLikelyWhatsAppSandboxOptInError(error: string): boolean {
  const e = error.toLowerCase();
  if (!e.trim()) return false;
  return (
    e.includes("not a valid whatsapp") ||
    e.includes("not opted in") ||
    e.includes("63007") ||
    e.includes("63016") ||
    e.includes("63015") ||
    e.includes("sandbox") ||
    (e.includes("join") && e.includes("sandbox"))
  );
}

export function resolveWhatsAppErrorBannerText(error: string): string {
  if (isLikelyWhatsAppSandboxOptInError(error)) {
    return whatsappSandboxRecipientMessage();
  }
  return whatsappVendorError(error);
}

export function meetingInviteSuccess(participantCount: number): string {
  if (participantCount <= 0) {
    return "Meeting scheduled.";
  }
  if (participantCount === 1) {
    return "Meeting scheduled. Invites sent to 1 participant.";
  }
  return `Meeting scheduled. Invites sent to ${participantCount} participants.`;
}

export function meetingInvitePartial(
  sent: number,
  total: number,
  failed: number,
): string {
  return `Invites sent to ${sent} of ${total} participants. ${failed} could not be delivered.`;
}

export function meetingInviteVendorError(vendorMessage: string): string {
  return `Failed to send meeting invites: ${vendorMessage}. Meeting saved; invites not delivered.`;
}
