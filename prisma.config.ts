import { config } from "dotenv";
import fs from "node:fs";
import path from "node:path";
import { defineConfig, env } from "prisma/config";

const envLocalPath = path.join(process.cwd(), ".env.local");
if (fs.existsSync(envLocalPath)) {
  config({ path: envLocalPath });
} else {
  config();
}

export default defineConfig({
  schema: path.join("prisma", "schema.prisma"),
  migrations: {
    path: path.join("prisma", "migrations"),
    seed: "tsx prisma/seed.ts",
  },
  datasource: {
    url: env("DATABASE_URL"),
  },
});
