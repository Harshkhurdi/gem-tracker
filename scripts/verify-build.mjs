import assert from "node:assert/strict";
import { existsSync, readFileSync } from "node:fs";
import { dirname, resolve } from "node:path";

// Build-time guard only: deployment must contain dynamically loaded PDF assets.
for (const route of ["tenders", "diagnostics"]) {
  const trace = resolve(`.next/server/app/api/${route}/route.js.nft.json`);
  const { files } = JSON.parse(readFileSync(trace, "utf8"));
  const workers = files.filter((file) => file.endsWith("pdf.worker.mjs"));
  const native = files.filter(
    (file) => file.includes("@napi-rs/canvas-") && file.endsWith(".node"),
  );
  assert(workers.length > 0, `${route}: PDF worker missing from deployment trace`);
  assert(native.length > 0, `${route}: PDF native polyfill missing from deployment trace`);
  for (const file of [...workers, ...native])
    assert(existsSync(resolve(dirname(trace), file)), `${route}: traced asset missing`);
}
console.log("PASS: PDF worker and native assets included in Vercel API traces");
