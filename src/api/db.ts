import { PrismaClient } from "@prisma/client";

/** Used when `DATABASE_URL` is unset (e.g. UTF-8 BOM breaks the first line of `.env`). SQLite dev only. */
const DEFAULT_SQLITE_URL = "file:./dev.db";

function normalizeDatabaseUrl(): void {
  if (typeof process.env.DATABASE_URL === "string") {
    process.env.DATABASE_URL = process.env.DATABASE_URL.replace(/^\uFEFF/, "").trim();
  }
  const v = process.env.DATABASE_URL ?? "";
  if (!v) {
    process.env.DATABASE_URL = DEFAULT_SQLITE_URL;
    return;
  }
  const isPostgres =
    v.startsWith("postgres://") || v.startsWith("postgresql://");
  const isSqlite = v.startsWith("file:");
  if (isPostgres || isSqlite) {
    return;
  }
  console.warn(
    "[db] DATABASE_URL should start with `postgresql://`, `postgres://`, or `file:`. " +
      "Check .env and system environment.",
  );
}

normalizeDatabaseUrl();

const globalForPrisma = globalThis as unknown as { prisma?: PrismaClient };

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log:
      process.env.NODE_ENV === "development"
        ? ["error", "warn"]
        : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
