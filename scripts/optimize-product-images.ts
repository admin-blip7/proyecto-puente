import { config as dotenvConfig } from "dotenv";

dotenvConfig({ path: ".env.local" });
dotenvConfig();

const parseLimit = () => {
  const arg = process.argv.find((item) => item.startsWith("--limit="));
  if (!arg) return undefined;
  const parsed = Number(arg.split("=")[1]);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : undefined;
};

async function main() {
  const { backfillOptimizedProductImages } = await import("../src/lib/services/productService");
  const limit = parseLimit();
  console.log(`[image-backfill] Starting${limit ? ` with limit=${limit}` : ""}...`);
  const result = await backfillOptimizedProductImages(limit);
  console.log("[image-backfill] Done");
  console.log(
    JSON.stringify(
      {
        processed: result.processed,
        optimized: result.optimized,
        skipped: result.skipped,
        failed: result.failed,
      },
      null,
      2
    )
  );
}

main().catch((error) => {
  console.error("[image-backfill] Failed", error);
  process.exit(1);
});
