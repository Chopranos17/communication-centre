import { google } from "googleapis";
import type { ConnectedEmail } from "@prisma/client";
import { prisma } from "../db";
import { PERSONA_TO_USER_ID } from "./sms-number-lookup";
import { isTokenExpired } from "./connected-email-lookup";

const GMAIL_SCOPES = [
  "https://www.googleapis.com/auth/gmail.send",
  "https://www.googleapis.com/auth/gmail.readonly",
  "https://www.googleapis.com/auth/gmail.modify",
  "https://www.googleapis.com/auth/userinfo.email",
] as const;

const PERSONA_DISPLAY: Record<string, string> = {
  recruiter: "Recruiter",
  hiring_lead: "Hiring Lead",
};

function createOAuth2Client() {
  const clientId = process.env.GOOGLE_CLIENT_ID?.trim();
  const clientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();
  const redirectUri = process.env.GOOGLE_REDIRECT_URI?.trim();
  if (!clientId || !clientSecret || !redirectUri) {
    throw new Error(
      "Missing GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, or GOOGLE_REDIRECT_URI",
    );
  }
  return new google.auth.OAuth2(clientId, clientSecret, redirectUri);
}

/** After OAuth on the API host, send users back to the SPA (Vite in dev). */
export function buildEmailOAuthSettingsRedirectUrl(
  query: Record<string, string>,
): string {
  const qs = new URLSearchParams(query).toString();
  const path = `/recruitment/settings/sms${qs ? `?${qs}` : ""}`;
  const fromEnv =
    process.env.EMAIL_OAUTH_FRONTEND_URL?.trim() ||
    process.env.APP_PUBLIC_URL?.trim() ||
    process.env.PUBLIC_URL?.trim();
  if (fromEnv) {
    return `${fromEnv.replace(/\/$/, "")}${path}`;
  }
  if (process.env.NODE_ENV === "production") {
    return path;
  }
  return `http://localhost:5173${path}`;
}

function displayNameFromPersonaUserIds(userId: string): string | undefined {
  for (const [persona, id] of Object.entries(PERSONA_TO_USER_ID) as [
    keyof typeof PERSONA_TO_USER_ID,
    string,
  ][]) {
    if (id === userId) {
      return PERSONA_DISPLAY[persona] ?? persona;
    }
  }
  return undefined;
}

async function resolveUserDisplayName(
  userId: string,
  googleEmail: string,
): Promise<string> {
  const sms = await prisma.smsNumber.findFirst({
    where: { assigned_to_id: userId, is_active: true },
    select: { assigned_to_name: true },
  });
  const fromSms = sms?.assigned_to_name?.trim();
  if (fromSms) return fromSms;

  const fromPersona = displayNameFromPersonaUserIds(userId);
  if (fromPersona) return fromPersona;

  const local = googleEmail.split("@")[0] ?? "";
  const titled = local
    .replace(/[._+-]+/g, " ")
    .trim()
    .split(/\s+/)
    .map((w) => w.charAt(0).toUpperCase() + w.slice(1).toLowerCase())
    .join(" ");
  return titled || "User";
}

function normalizeScopeString(scope: string | string[] | undefined): string | null {
  if (scope == null) return null;
  if (Array.isArray(scope)) return scope.join(" ");
  return scope;
}

export function getGoogleAuthUrl(userId: string): string {
  const oauth2Client = createOAuth2Client();
  return oauth2Client.generateAuthUrl({
    access_type: "offline",
    prompt: "consent",
    scope: [...GMAIL_SCOPES],
    state: JSON.stringify({ userId }),
  });
}

export async function handleGoogleCallback(
  code: string,
  userId: string,
): Promise<ConnectedEmail> {
  const oauth2Client = createOAuth2Client();
  const { tokens } = await oauth2Client.getToken(code);
  if (!tokens.access_token) {
    throw new Error("Google token response missing access_token");
  }

  oauth2Client.setCredentials(tokens);

  const gmail = google.gmail({ version: "v1", auth: oauth2Client });
  const profile = await gmail.users.getProfile({ userId: "me" });
  const emailAddress = profile.data.emailAddress?.trim() ?? "";

  let resolvedEmail = emailAddress;
  if (!resolvedEmail) {
    const oauth2 = google.oauth2({ version: "v2", auth: oauth2Client });
    const userinfo = await oauth2.userinfo.get();
    resolvedEmail = userinfo.data.email?.trim() ?? "";
  }
  if (!resolvedEmail) {
    throw new Error("Could not resolve Google account email address");
  }

  const user_name = await resolveUserDisplayName(userId, resolvedEmail);
  const existing = await prisma.connectedEmail.findUnique({
    where: { user_id: userId },
  });
  const refresh_token =
    tokens.refresh_token ?? existing?.refresh_token ?? null;
  const token_expires_at = tokens.expiry_date
    ? new Date(tokens.expiry_date)
    : null;
  const scopes = normalizeScopeString(tokens.scope);

  return prisma.connectedEmail.upsert({
    where: { user_id: userId },
    create: {
      user_id: userId,
      user_name,
      email_address: resolvedEmail,
      provider: "google",
      access_token: tokens.access_token,
      refresh_token,
      token_expires_at,
      scopes,
      is_active: true,
    },
    update: {
      user_name,
      email_address: resolvedEmail,
      access_token: tokens.access_token,
      ...(tokens.refresh_token
        ? { refresh_token: tokens.refresh_token }
        : {}),
      token_expires_at,
      scopes,
      is_active: true,
    },
  });
}

export async function refreshGoogleToken(
  connectedEmailId: string,
): Promise<{ access_token: string }> {
  const row = await prisma.connectedEmail.findUnique({
    where: { id: connectedEmailId },
  });
  if (!row) {
    throw new Error("Connected email not found");
  }
  if (!row.refresh_token) {
    throw new Error("No refresh token stored for this connection");
  }

  const oauth2Client = createOAuth2Client();
  oauth2Client.setCredentials({ refresh_token: row.refresh_token });
  const { credentials } = await oauth2Client.refreshAccessToken();
  const access_token = credentials.access_token;
  if (!access_token) {
    throw new Error("refreshAccessToken returned no access_token");
  }
  const token_expires_at = credentials.expiry_date
    ? new Date(credentials.expiry_date)
    : null;

  await prisma.connectedEmail.update({
    where: { id: connectedEmailId },
    data: { access_token, token_expires_at },
  });

  return { access_token };
}

export async function disconnectGoogleEmail(
  connectedEmailId: string,
): Promise<void> {
  const row = await prisma.connectedEmail.findUnique({
    where: { id: connectedEmailId },
  });
  if (!row) {
    throw new Error("Connected email not found");
  }

  const oauth2Client = createOAuth2Client();
  try {
    const token = row.refresh_token?.trim() || row.access_token?.trim();
    if (token) {
      await oauth2Client.revokeToken(token);
    }
  } catch (e) {
    console.error("[email-oauth] revoke failed (ignored):", e);
  }

  await prisma.connectedEmail.update({
    where: { id: connectedEmailId },
    data: { is_active: false },
  });
}

export async function getValidAccessToken(
  connectedEmail: ConnectedEmail,
): Promise<string> {
  if (!isTokenExpired(connectedEmail)) {
    return connectedEmail.access_token;
  }
  const { access_token } = await refreshGoogleToken(connectedEmail.id);
  return access_token;
}
