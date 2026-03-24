import { existsSync } from "node:fs";
import path from "node:path";
import { config as dotenvConfig } from "dotenv";
import {
  assertValidDeployEnvironment,
  formatDeployEnvironmentValidation,
} from "../src/lib/config/deploy-env";
import type { DeploymentTarget } from "../src/lib/config/deployment";

function parseTargetArgument(): DeploymentTarget | undefined {
  const combinedTargetArgument = process.argv.find((argument) => argument.startsWith("--target="));
  if (combinedTargetArgument) {
    const [, value] = combinedTargetArgument.split("=", 2);
    if (
      value === "development" ||
      value === "test" ||
      value === "preview" ||
      value === "production"
    ) {
      return value;
    }

    throw new Error("Expected --target to be one of: development, test, preview, production.");
  }

  const targetIndex = process.argv.findIndex((argument) => argument === "--target");
  if (targetIndex === -1) {
    return undefined;
  }

  const nextArgument = process.argv[targetIndex + 1];
  if (
    nextArgument === "development" ||
    nextArgument === "test" ||
    nextArgument === "preview" ||
    nextArgument === "production"
  ) {
    return nextArgument;
  }

  throw new Error("Expected --target to be one of: development, test, preview, production.");
}

function loadEnvFiles(target: DeploymentTarget | undefined): void {
  const nodeEnv = target === "development" || target === "test" ? target : "production";
  const candidates = [
    `.env.${nodeEnv}.local`,
    ...(nodeEnv === "test" ? [] : [".env.local"]),
    `.env.${nodeEnv}`,
    ".env",
  ];

  for (const relativePath of candidates) {
    const fullPath = path.join(process.cwd(), relativePath);
    if (existsSync(fullPath)) {
      dotenvConfig({ path: fullPath, override: false, quiet: true });
    }
  }
}

const target = parseTargetArgument();
loadEnvFiles(target);

const result = assertValidDeployEnvironment({
  target,
  logWarnings: true,
});

console.log(formatDeployEnvironmentValidation(result));
