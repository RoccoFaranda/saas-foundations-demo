import "dotenv/config";
import { PrismaPg } from "@prisma/adapter-pg";
import { Pool } from "pg";
import { PrismaClient } from "../src/generated/prisma/client";

const connectionString = process.env.DATABASE_URL;
if (!connectionString) {
  throw new Error("DATABASE_URL environment variable is not set");
}

// Create Prisma client for seeding
const pool = new Pool({ connectionString });
const adapter = new PrismaPg(pool);
const prisma = new PrismaClient({ adapter });

// Deterministic IDs for idempotent seeding
const DEMO_USER_ID = "user_demo_001";
const DEMO_USER_EMAIL = "demo@example.com";
const FIXED_TIMESTAMP = "2026-01-15T12:00:00Z";

async function main() {
  console.log("Starting seed...");

  // Seed demo user
  const demoUser = await prisma.user.upsert({
    where: { id: DEMO_USER_ID },
    update: {
      email: DEMO_USER_EMAIL,
      passwordHash: "$2a$10$placeholder.hash.for.demo.user.only",
      emailVerifiedAt: null,
      name: "Demo User",
      themePreference: null,
    },
    create: {
      id: DEMO_USER_ID,
      email: DEMO_USER_EMAIL,
      passwordHash: "$2a$10$placeholder.hash.for.demo.user.only",
      emailVerifiedAt: null,
      name: "Demo User",
      themePreference: null,
    },
  });

  console.log(`Seeded demo user id: ${demoUser.id}`);

  // Seed items with varied status/tag/summary/metricValue
  const items = [
    {
      id: "item_demo_001",
      name: "Implement user authentication",
      status: "completed" as const,
      tag: "feature" as const,
      summary: "Added email/password auth with verification flow",
      metricValue: 95,
    },
    {
      id: "item_demo_002",
      name: "Fix login redirect bug",
      status: "completed" as const,
      tag: "bugfix" as const,
      summary: "Resolved issue with redirect after login",
      metricValue: 100,
    },
    {
      id: "item_demo_003",
      name: "Update API documentation",
      status: "active" as const,
      tag: "docs" as const,
      summary: "Documenting new endpoints for v2 API",
      metricValue: 60,
    },
    {
      id: "item_demo_004",
      name: "Design new dashboard layout",
      status: "pending" as const,
      tag: "design" as const,
      summary: "Creating mockups for improved UX",
      metricValue: 30,
    },
    {
      id: "item_demo_005",
      name: "Set up CI/CD pipeline",
      status: "active" as const,
      tag: "infra" as const,
      summary: "Configuring GitHub Actions for automated deployments",
      metricValue: 75,
    },
    {
      id: "item_demo_006",
      name: "Add dark mode support",
      status: "completed" as const,
      tag: "feature" as const,
      summary: "Implemented theme switching with system preference detection",
      metricValue: 90,
    },
    {
      id: "item_demo_007",
      name: "Performance optimization",
      status: "active" as const,
      tag: "feature" as const,
      summary: "Reducing bundle size and improving load times",
      metricValue: 50,
    },
    {
      id: "item_demo_008",
      name: "Fix memory leak in activity feed",
      status: "completed" as const,
      tag: "bugfix" as const,
      summary: "Resolved memory issue causing performance degradation",
      metricValue: 100,
    },
    {
      id: "item_demo_009",
      name: "Write migration guide",
      status: "pending" as const,
      tag: "docs" as const,
      summary: "Documenting upgrade path from v1 to v2",
      metricValue: 0,
    },
    {
      id: "item_demo_010",
      name: "Refactor database queries",
      status: "archived" as const,
      tag: "infra" as const,
      summary: "Optimized queries for better performance (completed in previous sprint)",
      metricValue: 100,
    },
  ];

  for (const item of items) {
    await prisma.item.upsert({
      where: { id: item.id },
      update: {
        userId: DEMO_USER_ID,
        name: item.name,
        status: item.status,
        tag: item.tag,
        summary: item.summary,
        metricValue: item.metricValue,
      },
      create: {
        id: item.id,
        userId: DEMO_USER_ID,
        name: item.name,
        status: item.status,
        tag: item.tag,
        summary: item.summary,
        metricValue: item.metricValue,
      },
    });
  }

  console.log(`Seeded ${items.length} items`);

  // Seed activity logs
  const activityLogs = [
    {
      id: "log_demo_001",
      action: "item.created",
      entityType: "Item",
      entityId: "item_demo_001",
      metadata: { name: "Implement user authentication" },
    },
    {
      id: "log_demo_002",
      action: "item.updated",
      entityType: "Item",
      entityId: "item_demo_002",
      metadata: { status: "completed" },
    },
    {
      id: "log_demo_003",
      action: "item.created",
      entityType: "Item",
      entityId: "item_demo_003",
      metadata: { name: "Update API documentation" },
    },
    {
      id: "log_demo_004",
      action: "user.login",
      entityType: "User",
      entityId: DEMO_USER_ID,
      metadata: { timestamp: FIXED_TIMESTAMP },
    },
    {
      id: "log_demo_005",
      action: "item.status_changed",
      entityType: "Item",
      entityId: "item_demo_005",
      metadata: { from: "pending", to: "active" },
    },
  ];

  for (const log of activityLogs) {
    await prisma.activityLog.upsert({
      where: { id: log.id },
      update: {
        userId: DEMO_USER_ID,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
      },
      create: {
        id: log.id,
        userId: DEMO_USER_ID,
        action: log.action,
        entityType: log.entityType,
        entityId: log.entityId,
        metadata: log.metadata,
      },
    });
  }

  console.log(`Seeded ${activityLogs.length} activity logs`);
  console.log("Seed completed successfully.");
}

main()
  .then(async () => {
    await prisma.$disconnect();
    await pool.end();
  })
  .catch(async (e) => {
    console.error("Seed failed:", e);
    await prisma.$disconnect();
    await pool.end();
    process.exit(1);
  });
