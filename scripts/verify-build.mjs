/* Checks on the BUILT output — the thing a reader actually receives.

   The engine tests cover logic; verify-pages covers the mockups. This covers
   the shipped HTML, where a different class of bug lives: a default that only
   holds in a browser, a colour that bypassed the tokens, a missing disclosure. */
import { readFileSync, existsSync } from 'node:fs';
import { globSync } from 'node:fs';

const root = new URL('../', import.meta.url);
const dir = new URL('dist/client/', root);
let fail = 0;
const bad = (m) => { console.log(`  FAIL  ${m}`); fail++; };

const index = new URL('index.html', dir);
if (!existsSync(index)) { console.log('  no build — run: npx astro build'); process.exit(1); }
const html = readFileSync(index, 'utf8');

/* Styles may be inlined OR emitted as a linked stylesheet — Astro inlines small
   scoped blocks, Tailwind ships a file. Reading only the HTML meant the theme
   check reported "missing" against a build that was perfectly fine. Load both. */
const linked = [...html.matchAll(/<link[^>]+rel="stylesheet"[^>]+href="([^"]+)"/g)]
  .map((m) => m[1])
  .filter((h) => h.startsWith('/'))
  .map((h) => new URL('.' + h, dir))
  .filter((u) => existsSync(u))
  .map((u) => readFileSync(u, 'utf8'));
const styles = [
  ...[...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]),
  ...linked,
].join('\n');

/* 1. SSR must ship metric. Node's navigator says en-US; asking the server would
      open every page in inches for every reader outside the US. */
if (!/data-unit="cm"[^>]*aria-pressed="true"/.test(html)) {
  bad('static HTML does not ship metric-first — the server inferred a locale');
}
if (!/data-resolved="false"/.test(html)) {
  bad('the toggle does not mark itself unresolved — it will imply a choice nobody made');
}

/* 2. The affiliate disclosure is required on every page carrying outbound
      links, and adding it per-page is how it goes missing. */
if (!/Amazon Associate/.test(html)) bad('no affiliate disclosure in the footer');

/* 3. Blue is the only interactive colour.

      The design system's one hard rule (docs/02-design-system.md). Green, amber,
      orange and red are ONLY ever status — a green button reads as a verdict,
      which is exactly the confusion this product exists to remove.

      Under plain CSS this was checked by requiring every colour to resolve
      through a var(). Under Tailwind the check gets more direct and more
      honest: look at what colour utilities land on interactive elements.

      A previous version of this guard matched hex literals and a tamper test
      showed it was useless — the minifier rewrites #ff0000 to `red`. Tamper-test
      anything that replaces it. */
const STATUS = ['green', 'amber', 'orange', 'red'];
const INTERACTIVE = /<(?:a|button|input|select|summary)\b[^>]*>/gi;

const offenders = [];
for (const tag of html.match(INTERACTIVE) ?? []) {
  const cls = /class="([^"]*)"/.exec(tag)?.[1] ?? '';
  for (const c of STATUS) {
    /* bg-red-… / text-amber / border-green are all disqualifying on a control.
       A *-wash used as a status panel background is fine, but not on a control. */
    /* Any variant prefix, not a hand-listed few. `aria-pressed:bg-green` slipped
       past a version that only allowed hover:/focus:/active: — Tailwind variants
       are open-ended and an allow-list of them will always be incomplete. */
    const hit = new RegExp(`(?:^|\\s)[^\\s]*?\\b(?:bg|text|border)-${c}\\b`).exec(cls);
    if (hit) offenders.push(`${tag.slice(0, 40)}… uses ${hit[0].trim()}`);
  }
}
if (offenders.length) {
  bad(`status colour on an interactive element — blue is the only interactive colour:\n         ${offenders.join('\n         ')}`);
}

/* Tailwind theme tokens must actually be in the output; if @theme silently
   failed we would ship a page with no palette at all. */
if (!/--color-blue:/.test(styles)) bad('theme tokens missing from the build — @theme did not compile');

/* 4. A page with no title is a page nobody finds. */
if (!/<title>[^<]+<\/title>/.test(html)) bad('no <title>');

console.log(fail ? `\n${fail} problem(s) in the built output` : 'built output: metric default, disclosure present, tokens intact');
process.exit(fail ? 1 : 0);
