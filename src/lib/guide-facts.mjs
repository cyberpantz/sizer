/* Facts for the guide page, computed from the dataset the site actually ships.

   The guide is the most quotable page here — docs/13 makes it the link and
   citation asset — which means every number on it has to be defensible on the
   day someone quotes it, not on the day it was written. So none of them are
   written. They are derived, here, from the same loaders the rest of the site
   uses, and the page renders whatever comes back.

   Two rules this file exists to hold:

   1. ABSENCE IS NOT A FINDING. Seven carriers have a basic fare with no cabin
      row at all. That does NOT mean the fare forbids a cabin bag — it means
      nobody has read that page yet. Only `cabin_absence: 'not_permitted'`
      is a finding, and only those reach the page. This is the same trap as
      `undefined === undefined` matching a fare row, and it has now been paid
      for three times.

   2. NOTHING UNSOURCED. The mockup carried enforcement claims — a Ryanair
      spotting bonus, American pulling its gate sizers — that appear nowhere in
      resources/SOURCES.md. They are probably true. They are not ours to
      publish until someone opens the source, so they are not here.
*/
import { loadBags, loadCarriers } from './data.mjs';

const cabinRow = (record, fareClass) =>
  (record.allowances ?? []).find((a) => a.fare_class === fareClass && a.type === 'cabin');

const volume = (cm) => cm[0] * cm[1] * cm[2];

/** Every distinct cabin envelope any fare in the dataset publishes. */
function envelopes(carriers) {
  const rows = [];
  for (const c of carriers) {
    for (const a of c.record.allowances ?? []) {
      if (a.type === 'cabin' && Array.isArray(a.max_cm)) {
        rows.push({ name: c.name, fare: a.fare_name ?? a.fare_class, cm: a.max_cm });
      }
    }
  }
  rows.sort((a, b) => volume(a.cm) - volume(b.cm));
  return {
    rows,
    distinct: new Set(rows.map((r) => r.cm.join('×'))).size,
    smallest: rows[0] ?? null,
    largest: rows.at(-1) ?? null,
  };
}

/** Carriers whose cheapest fare and whose standard economy fare do not offer
 *  the same cabin bag. The single most expensive thing to get wrong, because
 *  the bag is unchanged and the answer is not. */
function fareGaps(carriers) {
  const out = [];
  for (const c of carriers) {
    const basic = cabinRow(c.record, 'basic');
    const economy = cabinRow(c.record, 'economy');
    /* Both fares must be present AND sized. One side missing is a gap in our
       reading, not a difference in their policy. */
    if (!basic?.max_cm || !economy?.max_cm) continue;
    if (basic.max_cm.join() === economy.max_cm.join()) continue;
    out.push({
      name: c.name,
      basic: basic.max_cm,
      economy: economy.max_cm,
      loss: volume(economy.max_cm) - volume(basic.max_cm),
    });
  }
  return out.sort((a, b) => b.loss - a.loss);
}

/** Fares we have READ and confirmed carry no cabin bag at all. Never inferred
 *  from a missing row — see the header. */
function noCabinFares(carriers) {
  const out = [];
  for (const c of carriers) {
    for (const a of c.record.allowances ?? []) {
      if (a.cabin_absence === 'not_permitted') {
        out.push({ name: c.name, fare: a.fare_name ?? a.fare_class, note: a.note ?? null });
      }
    }
  }
  return out;
}

function weightFacts(carriers, bags) {
  const caps = new Map();
  for (const c of carriers) {
    for (const a of c.record.allowances ?? []) {
      if (a.type === 'cabin' && a.max_kg) {
        if (!caps.has(a.max_kg)) caps.set(a.max_kg, new Set());
        caps.get(a.max_kg).add(c.name);
      }
    }
  }
  const sorted = [...caps.entries()].sort((a, b) => a[0] - b[0]);
  const lowest = sorted[0] ?? null;

  const weighed = bags
    .map((b) => ({ name: `${b.brand} ${b.model}`, kg: b.record.weight_kg?.v }))
    .filter((b) => b.kg);
  weighed.sort((a, b) => b.kg - a.kg);

  /* A 7 kg cabin cap is common across Asia. The question worth asking is how
     much of it a bag spends on itself before anything goes in. */
  const CAP = 7;
  return {
    caps: sorted.map(([kg, names]) => ({ kg, carriers: names.size })),
    lowestCap: lowest ? { kg: lowest[0], carriers: [...lowest[1]] } : null,
    strictCapCarriers: new Set(sorted.filter(([kg]) => kg <= CAP).flatMap(([, n]) => [...n])).size,
    cap: CAP,
    heaviest: weighed[0] ?? null,
    overHalf: weighed.filter((b) => b.kg > CAP / 2).length,
    weighed: weighed.length,
  };
}

function checkedSystems(carriers) {
  const seen = { piece: new Set(), weight: new Set() };
  for (const c of carriers) {
    for (const a of c.record.allowances ?? []) {
      if (a.type === 'checked' && seen[a.system]) seen[a.system].add(c.name);
    }
  }
  return { piece: seen.piece.size, weight: seen.weight.size };
}

/* Buckets matching gambleCeiling()'s tiers, so the guide and the methodology
   page cannot describe two different scales. */
const TIERS = [
  { lo: 1, hi: 3, label: 'Effectively never measured' },
  { lo: 4, hi: 5, label: 'Occasional, usually when the bins fill' },
  { lo: 6, hi: 7, label: 'Judgement at the gate' },
  { lo: 8, hi: 10, label: 'Measured as routine' },
];

function strictness(carriers) {
  return TIERS.map((t) => ({
    ...t,
    count: carriers.filter((c) => {
      const s = c.record.strictness?.score;
      return typeof s === 'number' && s >= t.lo && s <= t.hi;
    }).length,
  }));
}

/** The most recent day anyone actually opened an airline's baggage page.
 *  A byline date has to mean "the sources behind this were read by then", not
 *  "the site was rebuilt", or it is decoration. */
function verifiedThrough(carriers) {
  const dates = carriers
    .flatMap((c) => (c.record.allowances ?? []).map((a) => a.verified_at))
    .filter(Boolean)
    .sort();
  return dates.at(-1) ?? null;
}

export async function guideFacts() {
  const [bags, carriers] = await Promise.all([loadBags(), loadCarriers()]);
  return {
    verifiedThrough: verifiedThrough(carriers),
    carriers: carriers.length,
    answerable: carriers.filter((c) => !c.cabin_unknown).length,
    envelopes: envelopes(carriers),
    fareGaps: fareGaps(carriers),
    noCabinFares: noCabinFares(carriers),
    weight: weightFacts(carriers, bags),
    systems: checkedSystems(carriers),
    strictness: strictness(carriers),
    bags: bags.length,
  };
}
