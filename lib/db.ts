import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForDb = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

function createPrismaClient() {
  const connectionString = process.env.DATABASE_URL;
  if (!connectionString) {
    throw new Error("DATABASE_URL is not set");
  }

  const pool =
    globalForDb.pool ??
    new Pool({
      connectionString,
    });

  if (process.env.NODE_ENV !== "production") {
    globalForDb.pool = pool;
  }

  return new PrismaClient({ adapter: new PrismaPg(pool) });
}

export const prisma = globalForDb.prisma ?? createPrismaClient();

if (process.env.NODE_ENV !== "production") {
  globalForDb.prisma = prisma;
}
