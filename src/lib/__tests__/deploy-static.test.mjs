/* THIS SITE DEPLOYS AS AN UPLOAD, NOT AS A SERVER.
 *
 * Every page is prerendered. There is no request-time code, no database, no
 * session — 63 HTML files and a JSON blob. That is a deliberate property, and
 * it is what makes the site cheap, fast, and impossible to take down with a
 * bad deploy.
 *
 * IT WAS LOST ONCE, SILENTLY, AND COST A DAY. Cloudflare's `wrangler deploy`
 * runs AUTOCONFIG when a repository has no wrangler config: it detects Astro,
 * installs `@astrojs/cloudflare`, and rewrites the build to on-demand
 * rendering. Astro then boots a miniflare worker to run getStaticPaths for
 * /bags/[slug], that worker 500s, and the build dies with `Failed to get
 * static paths from the Cloudflare prerender server`. The build passed locally
 * and on a clean clone every time, because the rewrite only happens on the
 * host.
 *
 * WHAT MADE IT EXPENSIVE was diagnosing it twice. The adapter was also sitting
 * unused in package.json, so the first fix removed it — and the very next
 * build produced the identical error, because autoconfig had reinstalled it.
 * The dependency was a red herring; the trigger was the MISSING CONFIG FILE.
 *
 * So these tests pin the RULE — this project deploys static, with nothing to
 * execute — rather than any one symptom of it. Four separate things all have
 * to agree, and a regression in any of them puts the SSR build back:
 *
 *   astro.config.mjs   output: 'static', no adapter
 *   package.json       the adapter is not a dependency
 *   wrangler.jsonc     exists at all (this is the load-bearing one)
 *   wrangler.jsonc     assets-only, no `main`
 *
 * Written after four vacuous guards in one week, so each assertion below is
 * one I have checked FAILS when the thing it describes is undone.
 */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';

const astroConfig = readFileSync('astro.config.mjs', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));

/* JSONC: the file is heavily commented on purpose — it is the only record of
   why it exists — so strip comments the way wrangler does before parsing. */
const wrangler = JSON.parse(
  readFileSync('wrangler.jsonc', 'utf8')
    .replace(/\/\*[\s\S]*?\*\//g, '')
    .replace(/^\s*\/\/.*$/gm, '')
);

describe('the build produces files, not a server', () => {
  test("astro is set to 'static'", () => {
    /* Not a default worth trusting: Astro's default changed once already, and
       `output: 'server'` here would make every guard below meaningless. */
    assert.match(
      astroConfig.replace(/\/\*[\s\S]*?\*\//g, ''),
      /output:\s*'static'/,
      "astro.config.mjs no longer declares output: 'static'"
    );
  });

  test('no adapter is configured', () => {
    /* An adapter is the switch from "write files" to "run code". Checked
       against the config with COMMENTS STRIPPED, because the real config
       mentions the Cloudflare adapter at length in prose explaining why it is
       absent — and a guard that reads its own explanation as a violation is
       worse than no guard. */
    const code = astroConfig.replace(/\/\*[\s\S]*?\*\//g, '');
    assert.doesNotMatch(code, /adapter:/, 'an adapter has been added');
  });

  test('the Cloudflare adapter is not a dependency', () => {
    /* Belt to the config's braces. Autoconfig will reinstall it on the host
       regardless — that is what wrangler.jsonc below is for — but there is no
       reason for it to be declared here, and it was for weeks. */
    const deps = { ...pkg.dependencies, ...pkg.devDependencies };
    assert.ok(
      !('@astrojs/cloudflare' in deps),
      '@astrojs/cloudflare is back in package.json'
    );
  });
});

describe('the deploy is configured explicitly, so nothing infers it for us', () => {
  test('a wrangler config exists', () => {
    /* THE ONE THAT ACTUALLY FIXED IT. Autoconfig runs only when this file is
       absent, so its mere existence is the fix — which is exactly the kind of
       fact that gets deleted by someone tidying up a config that "does
       nothing". It does the most important thing in the repository. */
    assert.ok(wrangler, 'wrangler.jsonc is gone — autoconfig will take over again');
  });

  test('there is no entrypoint to run', () => {
    /* `main` is what makes a Worker executable. Its absence is the assertion:
       an assets-only Worker cannot render on demand even if something tried to
       make it. */
    assert.ok(!wrangler.main, `a server entrypoint appeared: ${wrangler.main}`);
  });

  test('it serves the directory astro actually builds into', () => {
    /* `dist` is Astro's default outDir and astro.config.mjs does not override
       it. If someone sets outDir, this has to move with it or the deploy
       uploads an empty folder and the site 404s wholesale — a failure that
       looks like a DNS problem and is not one. */
    assert.equal(wrangler.assets?.directory, './dist');
    assert.doesNotMatch(
      astroConfig.replace(/\/\*[\s\S]*?\*\//g, ''),
      /outDir:/,
      'outDir is now set in astro.config.mjs; wrangler.jsonc still points at ./dist'
    );
  });

  test('the runtime date is pinned', () => {
    /* An unpinned compatibility_date lets Cloudflare change the runtime under
       a site nobody is watching. Any valid date is fine; the point is that one
       was chosen. */
    assert.match(
      String(wrangler.compatibility_date ?? ''),
      /^\d{4}-\d{2}-\d{2}$/,
      'compatibility_date is missing or malformed'
    );
  });

  test('the worker name matches the deployed one', () => {
    /* A rename here does not fail the build — it silently creates a SECOND
       worker at a different subdomain and leaves the live site frozen on its
       last good deploy, which is the worst possible failure mode: green build,
       stale site. */
    assert.equal(wrangler.name, 'sizer');
  });
});
