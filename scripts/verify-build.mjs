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

/* 3. Colours come from tokens.

      The first version of this matched hex literals, and a tamper test proved
      it useless: the minifier rewrites `#ff0000` to `red`, so a hand-written
      colour sails straight past. The rule is not "no hex", it is "every colour
      resolves through a token" — so anything that is not a var() fails, whatever
      notation it arrived in. Only the :root block may define raw values.

      This matters because the design system has exactly one hard rule — blue is
      the only interactive colour, everything else is status — and it cannot be
      enforced if colours are scattered through components. */
const KEYWORDS = /^(inherit|initial|unset|currentcolor|transparent|none|revert)$/i;
const css = [...html.matchAll(/<style[^>]*>([\s\S]*?)<\/style>/gi)].map((m) => m[1]).join('\n');
/* Strip the token definitions themselves — that is where raw values belong. */
const authored = css.replace(/:root\s*\{[^}]*\}/g, '');
const loose = [...authored.matchAll(/(?:^|[;{\s])(color|background(?:-color)?|border-color|fill|stroke)\s*:\s*([^;}]+)/gi)]
  .map((m) => [m[1], m[2].trim()])
  .filter(([, v]) => !/var\(/.test(v) && !KEYWORDS.test(v) && !/^(0|1px|[\d.]+(px|rem|em|%))/.test(v));
if (loose.length) {
  bad(`colours not resolved through a token: ${[...new Set(loose.map(([p, v]) => `${p}: ${v}`))].join(' · ')}`);
}

/* 4. A page with no title is a page nobody finds. */
if (!/<title>[^<]+<\/title>/.test(html)) bad('no <title>');

console.log(fail ? `\n${fail} problem(s) in the built output` : 'built output: metric default, disclosure present, tokens intact');
process.exit(fail ? 1 : 0);
