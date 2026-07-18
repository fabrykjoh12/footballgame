/**
 * Bundle-size budget check (plain Node — never imports app modules).
 *
 * The home experience depends on the main chunk staying lean: every mode and
 * data bank is code-split and lazy-loaded, so one careless static import of
 * `data/questions.ts` or `data/players.ts` into a home-path file would silently
 * balloon the entry chunk. This guard turns that mistake into a CI failure.
 *
 * Run after `vite build`: `node scripts/check-bundle.mjs`
 */

import { readdirSync, statSync } from 'node:fs';
import { join } from 'node:path';

const ASSETS_DIR = 'dist/assets';
// The guard exists to catch a mode/data bank (~80–480 kB each, all normally
// code-split) being statically pulled into the home path — NOT to police a few
// kB of organic growth. The entry sat ~284 kB when added, then grew to ~300 kB
// as the home + connection UX got richer, and ~312 kB once the home dashboard
// gained the unified "Your modes" stats card; 320 kB restores real headroom
// while a stray data/SDK import (which lands hundreds of kB) still trips it
// decisively.
const BUDGET_BYTES = 320 * 1024;

let files;
try {
  files = readdirSync(ASSETS_DIR);
} catch {
  console.error(`check-bundle: ${ASSETS_DIR} not found — run the build first.`);
  process.exit(1);
}

const entries = files.filter((f) => /^index-.*\.js$/.test(f));
if (entries.length === 0) {
  console.error('check-bundle: no index-*.js entry chunk found in dist/assets.');
  process.exit(1);
}

let failed = false;
for (const f of entries) {
  const size = statSync(join(ASSETS_DIR, f)).size;
  const kb = (size / 1024).toFixed(1);
  if (size > BUDGET_BYTES) {
    console.error(
      `check-bundle: FAIL — ${f} is ${kb} kB (budget ${BUDGET_BYTES / 1024} kB). ` +
        'Did a mode/data bank get statically imported into the home path?',
    );
    failed = true;
  } else {
    console.log(`check-bundle: OK — ${f} is ${kb} kB (budget ${BUDGET_BYTES / 1024} kB).`);
  }
}

process.exit(failed ? 1 : 0);
