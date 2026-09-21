import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "@/generated/prisma/client";

const globalForDb = globalThis as unknown as {
  prisma?: PrismaClient;
  pool?: Pool;
};

function createPrismaClient() {
  const connectionString =
    process.env.DATABASE_URL ||
    "postgresql://postgres:postgres@127.0.0.1:5433/grouptalk";

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
