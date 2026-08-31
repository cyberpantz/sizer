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
import { readFileSync, readdirSync } from 'node:fs';
import { isPromotable, isSized, toBag, toCarrier } from '../engine/normalize.mjs';

const root = new URL('../../data/', import.meta.url);

/** Swap this one function for `fetch` when the endpoints land. Its contract:
 *  return every record, or throw. Never return a partial set — a short read
 *  looks identical to a small catalogue, and every coverage figure on the site
 *  is a fraction of this number. */
async function readAll(dir) {
  let files;
  try {
    files = readdirSync(new URL(dir, root)).filter((f) => f.endsWith('.json') && !f.startsWith('_'));
  } catch (cause) {
    throw new Error(`data source unreachable: ${dir}`, { cause });
  }
  if (!files.length) throw new Error(`data source returned nothing for ${dir} — refusing to continue`);
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
