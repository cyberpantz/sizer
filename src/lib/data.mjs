/* Loading data/ at build time.

   Pages must not read the filesystem themselves. This is the one place that
   knows the layout, so when data/ moves — or moves into D1 — one file changes.

   Everything here runs at BUILD time. The engine is pure and runs in both
   places, but reading 58 JSON files is a build-time job. */
import { readFileSync, readdirSync } from 'node:fs';
import { isSized, toBag, toCarrier } from '../engine/normalize.mjs';

const root = new URL('../../data/', import.meta.url);

const readAll = (dir) =>
  readdirSync(new URL(dir, root))
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => JSON.parse(readFileSync(new URL(`${dir}${f}`, root))));

/** Every bag we can actually evaluate. Unsized records exist in the catalogue
 *  and cannot produce a verdict, so they never reach a page that shows one. */
export function loadBags({ role = 'overhead' } = {}) {
  return readAll('bags/')
    .filter((b) => isSized(b) && (!role || b.role === role))
    .map((b) => ({ ...toBag(b), record: b }))
    .sort((a, b) => a.slug.localeCompare(b.slug));
}

/** Carriers for a given booking. Defaults to the cheapest economy fare, which
 *  is what an unqualified "does my bag fit" question means. */
export function loadCarriers(booking = { class: 'economy' }) {
  return readAll('carriers/')
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
export function coverageStats() {
  const bags = readAll('bags/');
  const carriers = readAll('carriers/');
  return {
    bags_total: bags.length,
    bags_sized: bags.filter(isSized).length,
    bags_measured: bags.filter((b) => b.measured_cm).length,
    carriers_total: carriers.length,
    carriers_researched: carriers.filter((c) => !c.placeholder).length,
    carriers_publishable: carriers.filter((c) => c.publication_ready).length,
  };
}
