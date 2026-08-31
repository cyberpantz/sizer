/* Derives what I had been finding by hand: cross-source conflicts, and how many
   independent lists a bag appears in. Nothing here is authored — change mentions.json
   and the answers change. Run: node data/reviews/derive.mjs */
import { readFileSync } from "node:fs";
const R = JSON.parse(readFileSync(new URL("./mentions.json", import.meta.url)));
const S = JSON.parse(readFileSync(new URL("./sources.json", import.meta.url))).sources;

const byBag = new Map();
for (const m of R.mentions) (byBag.get(m.bag) ?? byBag.set(m.bag, []).get(m.bag)).push(m);

/* A disagreement worth surfacing, not float noise. Weight is the sharp one:
   on a 7 kg carrier a 0.6 lb spread is 4% of the whole allowance. */
/* Relative tolerance alone was wrong here. A 5% rule suppressed the Away Aluminum
   weight disagreement (10.1 vs 10.5 lb = 3.96%) — but 0.4 lb is 2.6% of an entire
   7 kg cabin allowance, which is the number the traveler actually feels. So weight
   flags on EITHER an absolute or a relative threshold. Capacity has no such
   downstream consequence and stays relative-only. */
const TOL = { weight_lb: 0.05, capacity_l: 0.05, dimensions_in: 0.02 };
const ABS = { weight_lb: 0.25 };
const num = v => (Array.isArray(v) ? null : typeof v === "number" ? v : null);

const conflicts = [];
for (const [bag, ms] of byBag) {
  if (ms.length < 2) continue;
  for (const field of ["weight_lb", "capacity_l"]) {
    const vals = ms.map(m => [m.source, num(m.claimed?.[field])]).filter(v => v[1] != null);
    if (vals.length < 2) continue;
    const lo = Math.min(...vals.map(v => v[1])), hi = Math.max(...vals.map(v => v[1]));
    const spread = (hi - lo) / lo;
    if (spread > TOL[field] || (ABS[field] && hi - lo >= ABS[field]))
      conflicts.push({ bag, field, spread, abs: +(hi - lo).toFixed(2), vals });
  }
  const dims = ms.map(m => [m.source, m.claimed?.dimensions_in]).filter(v => Array.isArray(v[1]));
  if (dims.length > 1 && new Set(dims.map(d => d[1].join("x"))).size > 1)
    conflicts.push({ bag, field: "dimensions_in", spread: null, vals: dims });
}
conflicts.sort((a, b) => (b.spread ?? 9) - (a.spread ?? 9));

console.log("── Conflicts across publications ──");
for (const c of conflicts) {
  const pct = c.spread == null ? "differ" : Math.round(c.spread * 100) + "%";
  const tag = c.field === "weight_lb" ? `${pct} · ${c.abs} lb · ${Math.round(c.abs*0.4536/7*100)}% of a 7 kg allowance` : pct;
  console.log(`\n${c.bag} · ${c.field} · ${tag}`);
  for (const [src, v] of c.vals) console.log(`   ${S[src].publication.padEnd(28)} ${Array.isArray(v) ? v.join(" × ") : v}`);
}

const multi = [...byBag].filter(([, ms]) => ms.length > 1)
  .sort((a, b) => b[1].length - a[1].length);
console.log("\n── Corroboration: bags appearing in more than one independent list ──");
for (const [bag, ms] of multi)
  console.log(` ${String(ms.length)}×  ${bag.padEnd(30)} ${ms.map(m => m.award ?? "unranked").join(" · ")}`);

const solo = [...byBag].filter(([, ms]) => ms.length === 1).length;
console.log(`\n${multi.length} bags corroborated, ${solo} appear in one list only.`);
