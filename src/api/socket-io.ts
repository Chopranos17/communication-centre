import type { Server as SocketIOServer } from "socket.io";

let io: SocketIOServer | null = null;

export function setSocketIo(server: SocketIOServer): void {
  io = server;
}

export function emitNewMessage(payload: unknown): void {
  io?.emit("new-message", payload);
}
