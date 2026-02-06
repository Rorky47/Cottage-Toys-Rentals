import { PrismaClient } from "@prisma/client";

declare global {
  var prismaGlobal: PrismaClient;
}

// SQLite does not support query timeout in Prisma. When migrating to PostgreSQL,
// set a reasonable timeout (e.g. 10s) via the connection URL or driver options.
// See: https://www.prisma.io/docs/orm/prisma-client/setup-and-configuration/databases-connections

if (process.env.NODE_ENV !== "production") {
  if (!global.prismaGlobal) {
    global.prismaGlobal = new PrismaClient();
  }
}

const prisma = global.prismaGlobal ?? new PrismaClient();

export default prisma;
