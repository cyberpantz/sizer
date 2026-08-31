/* One payload for the interactive check.

   /check runs the engine in the browser — that is the whole reason the engine
   has no DOM, no I/O and no units in it. It needs the catalogue client-side,
   and 40 bags + 58 carriers is small enough to ship as a single file.

   Generated, never hand-edited. Rebuilt by `npm run build:client-data`, which
   runs before the Astro build. */
import { mkdirSync, writeFileSync } from 'node:fs';
import { loadBags, loadCarriers } from '../src/lib/data.mjs';

const bags = await loadBags();

/* Every fare of every carrier, because the fare is half the answer — Ryanair
   Basic and Ryanair Priority are different questions about the same flight. */
const carrierRecords = await loadCarriers();
const carriers = [];
for (const c of carrierRecords) {
  const fares = [...new Set((c.record.allowances ?? []).map((a) => a.fare_class).filter(Boolean))];
  carriers.push({
    iata: c.iata,
    name: c.name,
    region: c.record.region ?? null,
    strictness: c.strictness,
    fares: fares.length ? fares : ['economy'],
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
        ? { amount_usd: c.record.agent_commission.amount_usd, where: c.record.agent_commission.where }
        : null,
      cabin_absence: c.record.cabin_absence,
      allowances: (c.record.allowances ?? []).map((a) => ({
        type: a.type,
        fare_class: a.fare_class,
        cabin_class: a.cabin_class,
        addon: a.addon,
        max_cm: a.max_cm,
        max_in: a.max_in,
        max_kg: a.max_kg,
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
console.log(`catalogue.json — ${payload.bags.length} bags, ${payload.carriers.length} carriers, ${kb} kB`);
