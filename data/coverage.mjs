/* What the dataset can and cannot answer today. Run before believing any verdict. */
import { readFileSync, readdirSync } from "node:fs";
const dir = new URL("bags/", import.meta.url);
const bags = readdirSync(dir).filter(f => f.endsWith(".json") && f !== "_index.json")
  .map(f => JSON.parse(readFileSync(new URL(f, dir))));

const withDim = bags.filter(b => b.external_cm);
const withW = bags.filter(b => b.weight_kg);
const measured = bags.filter(b => b.measured_cm);
const conf = bags.filter(b => b.conflicts.length);

console.log(`bags in catalogue          ${bags.length}`);
console.log(`  with any dimension       ${withDim.length}   (${Math.round(withDim.length/bags.length*100)}%)  ← can produce a verdict`);
console.log(`  with a weight            ${withW.length}   (${Math.round(withW.length/bags.length*100)}%)`);
console.log(`  MEASURED BY US           ${measured.length}   ← nothing is real until this moves`);
console.log(`  carrying a conflict      ${conf.length}`);

const bySrc = {};
for (const b of withDim) bySrc[b.external_cm.ref] = (bySrc[b.external_cm.ref] ?? 0) + 1;
console.log(`\nevery dimension we hold comes from:`);
for (const [k, v] of Object.entries(bySrc)) console.log(`   ${v.toString().padStart(3)}  ${k}`);

const noDim = bags.filter(b => !b.external_cm);
console.log(`\n${noDim.length} bags we cannot size at all — they appear only in sources that print no dimensions:`);
console.log("   " + noDim.map(b => b.slug).join(", "));

const byType = {};
for (const b of bags) (byType[b.type] ??= { n: 0, dim: 0 }), byType[b.type].n++, b.external_cm && byType[b.type].dim++;
console.log(`\nby type            total   sized`);
for (const [t, v] of Object.entries(byType).sort((a,b)=>b[1].n-a[1].n))
  console.log(`  ${t.padEnd(18)} ${String(v.n).padStart(3)}   ${String(v.dim).padStart(5)}`);
