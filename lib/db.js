// Unused as of the Catalyst Data Store migration — every lib/*.js consumer
// now goes through lib/zcql.js instead. Kept (not deleted) only so the old
// Postgres/Prisma path stays available to fall back to until a live Catalyst
// project has verified the ZCQL rewrite end-to-end. Safe to delete, along
// with prisma/, @prisma/client, and the prisma dep in package.json, once
// that verification is done.
import { PrismaClient } from "@prisma/client";

const globalForPrisma = globalThis;

export const prisma =
  globalForPrisma.prisma ??
  new PrismaClient({
    log: process.env.NODE_ENV === "development" ? ["warn", "error"] : ["error"],
  });

if (process.env.NODE_ENV !== "production") {
  globalForPrisma.prisma = prisma;
}
