/* One payload for the interactive check.

   /check runs the engine in the browser — that is the whole reason the engine
   has no DOM, no I/O and no units in it. It needs the catalogue client-side,
   and 40 bags + 58 carriers is small enough to ship as a single file.

   Generated, never hand-edited. Rebuilt by `npm run build:client-data`, which
   runs before the Astro build. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadBags, loadCarriers } from '../src/lib/data.mjs';

/** Where a carrier's allowance was read from. Per-allowance first — a fare can
 *  be documented on a different page from the airline's index — then the
 *  record's own. Empty strings are NOT a source; several records carry one. */
function primarySource(record) {
  const rows = record.allowances ?? [];
  const row = rows.find((a) => a.source_url) ?? null;
  const url = row?.source_url || record.source_url || null;
  if (!url) return null;
  return { url, at: row?.verified_at ?? record.verified_at ?? null };
}

const bags = await loadBags();

/* Every fare of every carrier, because the fare is half the answer — Ryanair
   Basic and Ryanair Priority are different questions about the same flight. */
const carrierRecords = await loadCarriers();
const carriers = [];
for (const c of carrierRecords) {
  const fares = [...new Set((c.record.allowances ?? []).map((a) => a.fare_class).filter(Boolean))];
  /* The airline's own word for each fare — "Light", "SMART" — which beats
     anything we can derive from the key, because it is what the reader saw
     when they booked. Only about a fifth of rows have one; ui/fare.mjs falls
     back and also rejects the ones that were assembled from a key rather than
     read off a page. */
  const fareNames = {};
  for (const a of c.record.allowances ?? []) {
    if (a.fare_class && a.fare_name && !fareNames[a.fare_class])
      fareNames[a.fare_class] = a.fare_name;
  }
  carriers.push({
    iata: c.iata,
    name: c.name,
    region: c.record.region ?? null,
    strictness: c.strictness,
    fares: fares.length ? fares : ['economy'],
    fare_names: fareNames,
    /* Only what toCarrier() reads, so the browser resolves a booking exactly
       as the build does — same code, same answer. Evidence, dossiers and audit
       notes are research, not runtime: they belong on the carrier page, not in
       every visitor's download. Trimming them halved this payload. */
    record: {
      iata: c.record.iata,
      name: c.record.name,
      region: c.record.region,
      type: c.record.type,
      status: c.record.status,
      strictness: { score: c.record.strictness?.score },
      operates_regional_jets: c.record.operates_regional_jets,
      agent_commission: c.record.agent_commission
        ? {
            amount_usd: c.record.agent_commission.amount_usd,
            where: c.record.agent_commission.where,
          }
        : null,
      cabin_absence: c.record.cabin_absence,
      /* Provenance travels with the data to the browser.

         Any airline the page NAMES as the reason for an answer — "set by
         Ryanair", "Ryanair decides this trip" — has to come with a way for the
         reader to check it. A claim they cannot verify is the thing this site
         exists not to be, and a link is two fields.

         `placeholder` ships too so future incomplete records can be identified.
         The 2026-08-31 audit removed the remaining size placeholders;
         researched allowances still require publication review. */
      source_url: primarySource(c.record)?.url ?? null,
      verified_at: primarySource(c.record)?.at ?? null,
      placeholder: c.record.placeholder === true,
      allowances: (c.record.allowances ?? []).map((a) => ({
        type: a.type,
        fare_class: a.fare_class,
        cabin_class: a.cabin_class,
        addon: a.addon,
        max_cm: a.max_cm,
        max_in: a.max_in,
        max_kg: a.max_kg,
        /* Ships because toCarrier() reads it: it is what tells the engine
           whether a cabin weight cap covers this bag alone or this bag plus
           the personal item. It was absent, so the browser computed a
           different — and more generous — answer than the build did, on the
           axis a US traveller has never had to think about. */
        allowance_group: a.allowance_group,
        applies_to: a.applies_to,
        cabin_absence: a.cabin_absence,
      })),
    },
  });
}

const payload = {
  generated: new Date().toISOString().slice(0, 10),
  bags: bags.map((b) => ({
    slug: b.slug,
    brand: b.brand,
    model: b.model,
    external_cm: b.external_cm,
    soft: b.soft,
    weight_kg: b.weight_kg,
    shell: b.shell,
    type: b.record.type ?? null,
    expands_cm: b.expands_cm,
    dim_source: b.dim_source,
    measured: b.measured,
  })),
  carriers,
};

mkdirSync(new URL('../public/', import.meta.url), { recursive: true });
writeFileSync(new URL('../public/catalogue.json', import.meta.url), JSON.stringify(payload));
const kb = (JSON.stringify(payload).length / 1024).toFixed(0);
console.log(
  `catalogue.json — ${payload.bags.length} bags, ${payload.carriers.length} carriers, ${kb} kB`
);
