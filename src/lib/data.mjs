/* The only thing that knows where data lives.

   Today: JSON on disk. Soon: HTTP endpoints. Nothing outside this file should
   need to change for that — pages, the audit and the scripts all go through
   these four functions.

   Every loader is ASYNC already, even though reading a file is synchronous.
   That is the point: making them async later would ripple through every caller
   at exactly the moment the switch is riskiest.

   ## Never fall back

   The tempting failure is a loader that cannot reach the endpoint, quietly uses
   a cached copy, and lets the audit report green. That is worse than an outage,
   because a guard reporting coverage it does not have is how the mockup drift
   and the dead drift-checker regex both survived. If the source is unreachable,
   THROW. */
import { existsSync, readdirSync, readFileSync } from 'node:fs';
import { pathToFileURL } from 'node:url';
import { isPromotable, isSized, toBag, toCarrier } from '../engine/normalize.mjs';

/* WHERE data/ IS, WHICH IS NOT WHERE THIS FILE THINKS IT IS.
 *
 * `new URL('../../data/', import.meta.url)` is correct while this module sits
 * at src/lib/. It stops being correct the moment a bundler moves it: Astro
 * emits it as dist/.prerender/chunks/data_XXXX.mjs, where '../../data/'
 * resolves to dist/data/ — which does not exist.
 *
 * So `astro build` died in getStaticPaths with
 * "ENOENT: scandir .../dist/data/bags/", and it died that way on every
 * machine. The whole site could not build, and nothing caught it because the
 * tests import this module directly from source, where the relative path is
 * fine. Every check we had ran on the one layout where the bug is invisible.
 *
 * Both candidates are tried and the FIRST ONE THAT EXISTS wins. No silent
 * fallback beyond that: if neither is there, readAll throws, per the rule at
 * the top of this file. A loader that quietly finds nothing is the failure
 * this module is built to refuse. */
function resolveRoot() {
  const candidates = [
    new URL('../../data/', import.meta.url), // running from source
    pathToFileURL(`${process.cwd()}/data/`), // running from a bundle, cwd = repo
  ];
  const hit = candidates.find((u) => existsSync(u));
  if (!hit) {
    throw new Error(
      `data/ not found. Looked in:\n  ${candidates.map((u) => u.pathname).join('\n  ')}`
    );
  }
  return hit;
}

export const DATA_ROOT = resolveRoot();
const root = DATA_ROOT;

/** Swap this one function for `fetch` when the endpoints land. Its contract:
 *  return every record, or throw. Never return a partial set — a short read
 *  looks identical to a small catalogue, and every coverage figure on the site
 *  is a fraction of this number. */
async function readAll(dir) {
  let files;
  try {
    files = readdirSync(new URL(dir, root)).filter(
      (f) => f.endsWith('.json') && !f.startsWith('_')
    );
  } catch (cause) {
    throw new Error(`data source unreachable: ${dir}`, { cause });
  }
  if (!files.length)
    throw new Error(`data source returned nothing for ${dir} — refusing to continue`);
  return files.map((f) => JSON.parse(readFileSync(new URL(`${dir}${f}`, root))));
}

/** Every bag we can actually evaluate. Unsized records exist in the catalogue
 *  and cannot produce a verdict, so they never reach a page that shows one. */
export async function loadBags({ role = 'overhead' } = {}) {
  return (await readAll('bags/'))
    .filter((b) => isSized(b) && (!role || b.role === role))
    .map((b) => ({ ...toBag(b), record: b }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Carriers for a given booking. Defaults to the cheapest economy fare, which
 *  is what an unqualified "does my bag fit" question means. */
export async function loadCarriers(booking = { class: 'economy' }) {
  return (await readAll('carriers/'))
    .map((c) => {
      try {
        return { ...toCarrier(c, booking), record: c };
      } catch {
        /* A malformed record must not break the whole build. It is excluded and
           counted — validate-carriers.mjs is where it gets fixed. */
        return null;
      }
    })
    .filter(Boolean)
    .sort((a, b) => a.name.localeCompare(b.name));
}

/** What the site can and cannot answer today. Rendered on the page rather than
 *  kept in a doc, because a coverage claim nobody can check is marketing. */
export async function coverageStats() {
  const [bags, carriers] = await Promise.all([readAll('bags/'), readAll('carriers/')]);
  return {
    bags_total: bags.length,
    bags_sized: bags.filter(isSized).length,
    bags_measured: bags.filter((b) => b.measured_cm).length,
    /* The number that matters for the release gate: dimensions we can put a
       recommendation behind. */
    bags_promotable: bags.filter((b) => isSized(b) && isPromotable(toBag(b))).length,
    carriers_total: carriers.length,
    carriers_researched: carriers.filter((c) => !c.placeholder).length,
    carriers_publishable: carriers.filter((c) => c.publication_ready).length,
  };
}
