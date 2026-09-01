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
import { readdirSync, readFileSync } from 'node:fs';
import { join } from 'node:path';

const root = new URL('../', import.meta.url);
const PAGES = [
  'mockup/index.html',
  'mockup/check.html',
  'mockup/bag.html',
  'mockup/bags.html',
  'mockup/guide.html',
];
const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : [join(d, e.name)]
  );

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

/* Dead internal links.

   A nav item pointing at a route that does not exist is a 404 the reader finds
   before we do. A first pass at this only matched href="..." attributes and
   missed /guide/, which lives in a nav ARRAY in Header.astro frontmatter —
   which is exactly where a site's most-clicked links live. */
const walkAll = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walkAll(join(d, e.name)) : [join(d, e.name)]
  );

const routes = new Set(
  walkAll('src/pages').map((f) =>
    `/${f
      .replace(/^src\/pages\/?/, '')
      .replace(/index\.astro$/, '')
      .replace(/\.astro$/, '/')}`.replace(/\/+/g, '/')
  )
);

/* A DYNAMIC LINK IS STILL A LINK WORTH CHECKING.

   `/bags/${slug}/` can never equal a literal route, and the first version of
   this check simply failed it — which would have pushed the next person to
   either delete the link or add an exception, when what they want is for the
   check to do its job on the interesting case.

   So a link is split into segments, an interpolated segment matches a `[param]`
   segment, and everything else must match literally. That still catches the
   real mistakes — a typo in the fixed part, a missing dynamic route, the wrong
   depth — while letting `/bags/${slug}/` resolve to `/bags/[slug]/`. */
const segments = (path) => path.replace(/^\/|\/$/g, '').split('/').filter(Boolean);
const WILDCARD = /^(\$\{.*\}|\[.*\])$/;

const resolves = (href) => {
  if (routes.has(href) || routes.has(`${href}/`)) return true;
  const want = segments(href);
  return [...routes].some((route) => {
    const have = segments(route);
    if (have.length !== want.length) return false;
    return have.every((seg, i) => seg === want[i] || (WILDCARD.test(seg) && WILDCARD.test(want[i])));
  });
};

for (const f of walkAll('src')) {
  if (!f.endsWith('.astro')) continue;
  const src = readFileSync(f, 'utf8');
  /* `[^'"#?]` used to exclude `$` implicitly by excluding nothing — an
     interpolated href matched fine and then failed the lookup. */
  for (const m of src.matchAll(/href[=:]\s*['"`](\/[^'"`#?]*)['"`]/g)) {
    const href = m[1];
    if (!resolves(href)) fail(f, `links to ${href}, which is not a route`);
  }
}

/* Does the page actually RENDER?

   Everything above this line parses the source. Parsing is not running, and the
   gap between them cost us three pages at once:

     - bags.html drew zero bags. The generated catalogue stopped carrying `cov`,
       every group filtered on `cov >= 0`, and `undefined >= 0` is false. No
       error, no warning, an empty page.
     - every card lost its luggage drawing, because `SIL[b.t]` with no `t` is
       `undefined` rather than a failure.
     - bag.html and bags.html both threw a TDZ ReferenceError at load: the first
       render ran above the `const U` that formats every dimension.

   This script said "all pages parse and run one shared engine" throughout. It
   was true and it was useless. A missing property is not a syntax error, so the
   only thing that finds this class of bug is executing the page and looking.

   jsdom is optional on purpose — the check degrades to a warning rather than
   blocking anyone who has not installed it. Install it to turn this on:
     pnpm add -D jsdom */
let JSDOM;
try {
  ({ JSDOM } = await import('jsdom'));
} catch {
  console.log('\n  skip  render check — jsdom not installed (pnpm add -D jsdom)');
}

if (JSDOM) {
  /* What each page must put on screen. A number, not a boolean: "renders
     something" was true of the empty page too. */
  const MUST_RENDER = {
    'mockup/bags.html': { sel: '.bag', min: 20, what: 'bag cards' },
    'mockup/bag.html': { sel: '.tr', min: 20, what: 'airline rows' },
    'mockup/check.html': { sel: '.item', min: 1, what: 'a chosen bag' },
    'mockup/index.html': { sel: '.item, .scen, .chip', min: 1, what: 'the scenario picker' },
  };

  console.log('');
  for (const [page, want] of Object.entries(MUST_RENDER)) {
    const errors = [];
    const dom = new JSDOM(readFileSync(new URL(page, root), 'utf8'), {
      runScripts: 'dangerously',
      pretendToBeVisual: true,
      url: 'https://sizer.test/',
      /* jsdom has no matchMedia. Without this the page dies on a gap in the
         test harness and we would "find" a bug that does not exist. */
      beforeParse(w) {
        w.matchMedia = () => ({
          matches: false,
          addEventListener() {},
          removeEventListener() {},
          addListener() {},
          removeListener() {},
        });
      },
    });
    dom.virtualConsole.on('jsdomError', (e) => errors.push(e.message));
    await new Promise((r) => setTimeout(r, 250));

    const n = dom.window.document.querySelectorAll(want.sel).length;
    if (errors.length) fail(page, `threw while loading — ${errors[0]}`);
    else if (n < want.min) fail(page, `rendered ${n} ${want.what}, expected at least ${want.min}`);
    else console.log(`  ok    ${page} — ${n} ${want.what}`);
    dom.window.close();
  }
}

console.log(
  failed
    ? `\n${failed} page(s) broken`
    : JSDOM
      ? '\nall pages parse, run one shared engine, and render'
      : '\nall pages parse and run one shared engine (not executed — no jsdom)'
);
process.exit(failed ? 1 : 0);
