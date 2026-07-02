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
// Entry chunk was ~284 kB at the time this guard was added; 300 kB leaves
// headroom for organic growth while catching a data-bank import (~+400 kB).
const BUDGET_BYTES = 300 * 1024;

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
