import process from "node:process";
import { config as loadEnv } from "dotenv";
import { getDefaultIndexNowUrls, submitIndexNowUrls } from "../../src/lib/seo/indexnow";

loadEnv({ path: ".env.local" });

async function main() {
  const rawArgs = process.argv.slice(2);
  const urls = rawArgs.length > 0 ? rawArgs : getDefaultIndexNowUrls();

  const result = await submitIndexNowUrls(urls);
  console.log(`[indexnow] Submitted ${result.submitted} URL(s).`);
}

main().catch((error) => {
  console.error("[indexnow] Submission failed.");
  console.error(error instanceof Error ? error.message : error);
  process.exit(1);
});
