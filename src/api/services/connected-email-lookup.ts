import type { ConnectedEmail } from "@prisma/client";
import { prisma } from "../db";
import { PERSONA_TO_USER_ID } from "../../constants/personaUserIds";

export { PERSONA_TO_USER_ID };

/** Active personal inbox linked to a seed / app user id (e.g. `emp-rec-001`). */
export async function getConnectedEmailForUser(userId: string) {
  return prisma.connectedEmail.findFirst({
    where: { user_id: userId, is_active: true },
  });
}

/** All rows for admin settings (includes inactive). */
export async function getAllConnectedEmails() {
  return prisma.connectedEmail.findMany({
    orderBy: { created_at: "asc" },
  });
}

const REFRESH_BUFFER_MS = 5 * 60 * 1000;

/**
 * True when the access token is missing expiry or is at/within 5 minutes of expiry
 * (refresh before the hard cutoff).
 */
export function isTokenExpired(connectedEmail: Pick<ConnectedEmail, "token_expires_at">): boolean {
  const exp = connectedEmail.token_expires_at;
  if (!exp) return false;
  return Date.now() >= exp.getTime() - REFRESH_BUFFER_MS;
}
