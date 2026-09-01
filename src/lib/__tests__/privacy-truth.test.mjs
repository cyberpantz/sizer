/* THE POLICY MUST NOT OUTLIVE THE FACTS.
 *
 * A privacy policy fails in two directions, and only one of them is the one
 * people worry about. Claiming more than you do is embarrassing. Claiming LESS
 * than you do — leaving "we collect nothing" up on the day analytics ships —
 * is the one that misleads someone who read it and relied on it.
 *
 * That second failure is not hypothetical here. Frank has said both analytics
 * and a backend are coming, and neither arrives with a prompt to update this
 * page. The whole design — a declaration file the page renders from — exists
 * to make the update a consequence of the change rather than a chore attached
 * to it. These tests are the half that catches the case where someone adds the
 * capability and never touches the declaration at all.
 *
 * Same lesson as the footer's affiliate disclosure, which claimed an Amazon
 * relationship that did not exist on 63 pages. A claim about ourselves gets
 * the standard we apply to a claim about a bag.
 */
import assert from 'node:assert/strict';
import { existsSync, readdirSync, readFileSync, statSync } from 'node:fs';
import { join } from 'node:path';
import { describe, test } from 'node:test';
import {
  ANALYTICS_SIGNATURES,
  analyticsLive,
  backendLive,
  BROWSER_STORAGE,
  CONTACT,
  CONTROLLER,
  PROCESSORS,
  weCollect,
} from '../privacy.mjs';

const read = (p) => readFileSync(p, 'utf8');

const walk = (dir, out = []) => {
  for (const e of readdirSync(dir, { withFileTypes: true })) {
    const p = join(dir, e.name);
    if (e.isDirectory()) walk(p, out);
    else out.push(p);
  }
  return out;
};

describe('the declaration matches what the site actually does', () => {
  test('every browser key we set is declared', () => {
    /* The page says "one value, under the key `units`". If a second setItem
       appears anywhere, that sentence becomes false and nobody would notice —
       it is one line in a component, and the policy is a different file. */
    const declared = new Set(BROWSER_STORAGE.map((s) => s.key));
    const found = new Set();
    for (const file of walk('src')) {
      if (!/\.(mjs|jsx|astro|ts)$/.test(file) || file.includes('__tests__')) continue;
      for (const m of read(file).matchAll(/\.setItem\(\s*['"`]([^'"`]+)['"`]/g)) {
        found.add(m[1]);
      }
    }
    for (const key of found) {
      assert.ok(
        declared.has(key),
        `'${key}' is written to browser storage but is not declared in lib/privacy.mjs — the privacy page says we store only: ${[...declared].join(', ')}`
      );
    }
  });

  test('no cookies are set anywhere', () => {
    /* The page states this flatly, with no hedge, so it has to hold. */
    for (const file of walk('src')) {
      if (!/\.(mjs|jsx|astro|ts)$/.test(file) || file.includes('__tests__')) continue;
      assert.ok(
        !/document\.cookie\s*=/.test(read(file)),
        `${file} sets a cookie — the privacy page says we set none`
      );
    }
  });

  test('a live processor says what it receives and under what basis', () => {
    /* Guards the switch-on path: flipping `live: true` and leaving the fields
       null would produce a table with blank cells, which reads as though the
       question was never asked. */
    for (const p of PROCESSORS.filter((x) => x.live)) {
      for (const field of ['name', 'processes', 'basis']) {
        assert.ok(p[field], `processor '${p.id}' is live but has no ${field}`);
      }
    }
  });

  test('the page reads the declaration rather than restating it', () => {
    const page = read('src/pages/privacy.astro').replace(/\/\*[\s\S]*?\*\//g, '');
    assert.match(page, /from '\.\.\/lib\/privacy\.mjs'/);
    /* The specific false sentence Frank caught. Being static prevents nothing;
       client-side analytics needs no backend of ours. Pinned by its claim, not
       its wording, so a paraphrase is caught too. */
    assert.doesNotMatch(
      page,
      /no server to receive anything|cannot collect|technically impossible/i,
      'the page is again treating a choice not to collect as a technical guarantee'
    );
  });
});

/* dist/ is gitignored and goes stale; skip loudly rather than fail, so nobody
   learns to ignore this suite. */
const PAGE = 'src/pages/privacy.astro';
const why = !existsSync('dist')
  ? 'no dist/ — run `npm run build` to check the built site'
  : statSync('dist').mtimeMs < statSync(PAGE).mtimeMs
    ? 'dist/ is older than the privacy page — rebuild'
    : false;

describe('the built site contains nothing the policy denies', { skip: why }, () => {
  test('no analytics vendor is present while none is declared', () => {
    /* THE ONE THAT MATTERS. Adding a tracking snippet is a two-line change in
       a layout, and it will not occur to anyone that it makes a different page
       false. This turns that into a failed build. */
    if (analyticsLive()) return;
    const hits = [];
    for (const file of walk('dist')) {
      if (!file.endsWith('.html') && !file.endsWith('.js')) continue;
      const body = read(file);
      for (const sig of ANALYTICS_SIGNATURES) {
        if (body.includes(sig)) hits.push(`${file}: ${sig}`);
      }
    }
    assert.deepEqual(
      hits.slice(0, 10),
      [],
      'analytics found in the built site while lib/privacy.mjs declares none — declare it there and the privacy page will describe it'
    );
  });

  test('the page still tells the reader nothing is collected', () => {
    /* The inverse check: if the declaration is switched on, this sentence must
       be gone. Catches a declaration updated while the copy stays. */
    const html = read('dist/privacy/index.html');
    const claimsNothing = html.includes('There is no sign-up, no newsletter');
    assert.equal(
      claimsNothing,
      !weCollect(),
      weCollect()
        ? 'the page still claims we collect nothing, but a processor is live'
        : 'the page no longer states that we collect nothing, which is still true'
    );
  });

  test('the missing-contact notice is shown while contact details are missing', () => {
    const html = read('dist/privacy/index.html');
    if (CONTACT && CONTROLLER) return;
    assert.ok(
      html.includes('Incomplete:'),
      'contact details are missing but the page does not say so'
    );
  });

  test('a backend, once live, retires the "never reaches us" claim', () => {
    const html = read('dist/privacy/index.html');
    const claims = html.includes('there is no server of ours for it to reach');
    assert.equal(claims, !backendLive(), 'the trip-data claim disagrees with lib/privacy.mjs');
  });
});
