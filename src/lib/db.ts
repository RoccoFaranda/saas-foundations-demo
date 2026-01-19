import "server-only";
import { PrismaClient } from "../generated/prisma/client";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

declare global {
  var __prisma: PrismaClient | undefined;
  var __prismaPool: Pool | undefined;
}

// Create a pg Pool for the adapter
const pool =
  globalThis.__prismaPool ??
  new Pool({
    connectionString,
    allowExitOnIdle: process.env.NODE_ENV !== "production",
  });
const adapter = new PrismaPg(pool);

// PrismaClient instance with adapter
const prismaClient = new PrismaClient({ adapter });

const prisma = globalThis.__prisma ?? prismaClient;

if (process.env.NODE_ENV !== "production") {
  globalThis.__prisma = prisma;
  globalThis.__prismaPool = pool;
}

export default prisma;
