/* Everything the engine tests cannot see, because they test the module and a
   browser loads the page.

   Each check here corresponds to a bug this script found during the port:
     - a namespace import that flattened to `defaults is not defined`
     - an aliased import that flattened to `DEFAULT_EPS_CM is not defined`
     - `const desc` declared by both the engine and the page adapter
     - superseded constants left above the markers, redeclaring EPS_CM
     - `const ENGINE` declared by both the generated block and the adapter
   All five are the same failure mode: the module was fine, the page was broken.
   None would have been caught by `npm test`. */
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const PAGES = [
  'mockup/index.html',
  'mockup/check.html',
  'mockup/bag.html',
  'mockup/bags.html',
  'mockup/guide.html',
];
const inlineScripts = (html) =>
  [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)].map((m) => m[1]).join('\n');

let failed = 0;
const fail = (page, msg) => {
  console.log(`  FAIL  ${page} — ${msg}`);
  failed++;
};

for (const page of PAGES) {
  const html = readFileSync(new URL(page, root), 'utf8');
  const src = inlineScripts(html);

  /* 1. Does it parse at all? A duplicate declaration throws before the page
        renders a single pixel, and a mockup opened from disk shows a blank
        screen with the reason only in the console. */
  try {
    new Function(src);
  } catch (e) {
    fail(page, e.message);
    continue;
  }

  /* 2. Exactly one engine. Two would mean the port left a copy behind. */
  const engines = (src.match(/^function gambleCeiling/gm) ?? []).length;
  if (engines > 1) {
    fail(page, `${engines} copies of gambleCeiling — a pasted engine survived`);
    continue;
  }

  /* 3. If the page decides fit, it must do so through the shared engine. */
  const decidesFit = /function fit\s*\(/.test(src);
  if (decidesFit && !src.includes('ENGINE:START')) {
    fail(page, 'has a fit() but no inlined engine — it is running its own ladder');
    continue;
  }
  if (
    decidesFit &&
    /band\s*=\s*["']wont["']/.test(src.replace(/\/\* ENGINE:START[\s\S]*?\/\* ENGINE:END \*\//, ''))
  ) {
    fail(page, 'assigns a band outside the engine block — the ladder has been reimplemented');
    continue;
  }

  console.log(`  ok    ${page}${decidesFit ? ' (engine inlined)' : ''}`);
}

console.log(failed ? `\n${failed} page(s) broken` : '\nall pages parse and run one shared engine');
process.exit(failed ? 1 : 0);
