// FaithfulD Book Notes — frontend build.
//
// The app is a zero-framework vanilla HTML/JS/CSS frontend. "Building" it means
// emitting the source in web/src/ into the directory FastAPI serves as static
// assets (backend/static). Uses only Node built-ins so `npm ci && npm run build`
// works fully offline with no third-party dependencies.
import { cp, mkdir, rm, readdir } from "node:fs/promises";
import { fileURLToPath } from "node:url";
import { dirname, join } from "node:path";

const here = dirname(fileURLToPath(import.meta.url));
const srcDir = join(here, "src");
const outDir = join(here, "..", "backend", "static");

async function main() {
  await mkdir(outDir, { recursive: true });

  // Clean previously built assets so removed files don't linger.
  for (const entry of await readdir(outDir)) {
    await rm(join(outDir, entry), { recursive: true, force: true });
  }

  await cp(srcDir, outDir, { recursive: true });

  const emitted = await readdir(outDir);
  console.log(`[build] emitted ${emitted.length} file(s) to backend/static:`);
  for (const f of emitted) console.log(`  - ${f}`);
}

main().catch((err) => {
  console.error("[build] failed:", err);
  process.exit(1);
});
