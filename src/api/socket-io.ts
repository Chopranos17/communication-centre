import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function setSocketIo(server: SocketIOServer): void {
  io = server;
}

export function emitNewMessage(payload: unknown): void {
  io?.emit("new-message", payload);
}

export function emitMessageUpdated(payload: unknown): void {
  io?.emit("message-updated", payload);
}

/** Candidate SMS consent changed (manual PATCH or inbound STOP). */
export function emitSmsConsentUpdated(payload: unknown): void {
  io?.emit("sms-consent-updated", payload);
}
