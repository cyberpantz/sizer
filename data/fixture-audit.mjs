/* Not "how big is the dataset" but "can it exercise every path the product has".
   A fixture set is rich enough when every band, filter, group and edge case has
   at least one real bag standing in it. */
import { readFileSync, readdirSync } from "node:fs";
import { readMockup } from "../scripts/read-mockup.mjs";
const { AIR } = readMockup();
const dir = new URL("bags/", import.meta.url);
const all = readdirSync(dir).filter(f => f.endsWith(".json") && f !== "_index.json")
  .map(f => JSON.parse(readFileSync(new URL(f, dir))));
const sized = all.filter(b => b.external_cm);
/* The carry-on shelves are scoped to role "overhead". An under-seat bag clears a
   strict carrier by not being a carry-on — counting it as a bag that "goes
   anywhere" answers a question nobody asked. Under-seat is its own category. */
const carryon = sized.filter(b => b.role === "overhead");
const underseat = sized.filter(b => b.role === "underseat");
const std = a => a.f.economy ? "economy" : (a.f.priority ? "priority" : (a.f.plus ? "plus" : Object.keys(a.f)[0]));
const desc = a => [...a].sort((x, y) => y - x);
const EPS_CM = 0.3;
/* How far over the published limit is still worth showing, as a function of how
   reliably the carrier enforces it. This is the "fuzz factor", and it belongs
   here rather than in EPS_CM because it is a fact about the airline, not about
   our tape measure.

   It never moves the published limit — the delta is always computed against the
   real number and always shown. What it decides is whether an overage is worth
   presenting as a risk the traveller can weigh (GAMBLE) or is simply not on
   (WON'T). US carriers sit low on the strictness scale and genuinely do wave
   bags through; Ryanair, Wizz and Vueling pay staff to catch them.

   The old rule had a flat 3 cm ceiling that ignored strictness, so 3.1 cm over
   on Southwest — which does not own a gate sizer — read the same as 3.1 cm over
   on Ryanair. And strictness was a binary switch at 6, so a 1-to-10 scale
   produced exactly two behaviours. */
function gambleCeiling(st){
  if (st <= 3) return 5.0;   // effectively never measured
  if (st <= 5) return 3.0;   // occasional, usually only when bins are full
  if (st <= 7) return 1.5;   // frames at the gate, staff use judgement
  return 0;                  // measured as routine — over is over
}

function band(cm, soft, st, lim) {
  const e = desc(cm).slice(); if (soft) e[2] = Math.max(0, e[2] - 2);
  const m = desc(lim); let d = -Infinity;
  for (let i = 0; i < 3; i++) d = Math.max(d, e[i] - m[i]);
  const ceiling = gambleCeiling(st);
  if(d > ceiling && d > EPS_CM)      return "wont";
  else if(d > EPS_CM)                    return "gamble";
  else if(d > 0)                         return "line";
  else if(d > -2 && st >= 6)             return "line";
  else                                       return "clears";
}
/* Not every gap blocks. A path is DEFERRED when the product can ship without it
   or when it's blocked on data we haven't collected yet — those shouldn't drag the
   headline score, or everything looks equally urgent and nothing gets prioritised. */
const need = [], ok = [], later = [];
const R = (label, n, min, defer) => {
  const line = `${label.padEnd(46)} ${String(n).padStart(3)}  (need ${min})`;
  if (n >= min) ok.push(line); else (defer ? later : need).push(line + (defer ? `  — ${defer}` : ""));
};

/* 1. every verdict band must be reachable, and by more than one bag */
const bandCount = { clears: 0, line: 0, gamble: 0, wont: 0 };
const bagsHittingBand = { clears: new Set(), line: new Set(), gamble: new Set(), wont: new Set() };
for (const b of carryon) for (const a of AIR) {
  const v = band(b.external_cm.v, b.soft, a.st, a.f[std(a)].d);
  bandCount[v]++; bagsHittingBand[v].add(b.slug);
}
for (const k of Object.keys(bandCount)) R(`band "${k}" reachable by N bags`, bagsHittingBand[k].size, 3);

/* 2. catalogue filters */
for (const [t, min, defer] of [["hardside spinner",4],["softside spinner",4],["2-wheel roller",4],
     ["backpack",4,"one-bag audience, not the launch case"],["duffel",2,"niche form factor"]])
  R(`carry-on filter: ${t}`, carryon.filter(b => b.type === t).length, min, defer);

/* 3. the three shelf groups on /bags */
const score = b => { let p=0; for (const a of AIR){const v=band(b.external_cm.v,b.soft,a.st,a.f[std(a)].d); if(v==="clears"||v==="line")p++;} return p/AIR.length; };
const shelves = { "goes anywhere (>=0.8)":0, "almost anywhere (0.4-0.8)":0, "US only (<0.4)":0 };
for (const b of carryon) { const s=score(b); s>=0.8?shelves["goes anywhere (>=0.8)"]++:s>=0.4?shelves["almost anywhere (0.4-0.8)"]++:shelves["US only (<0.4)"]++; }
for (const [k,v] of Object.entries(shelves)) R(`carry-on shelf: ${k}`, v, 5);
R("under-seat category (its own shelf)", underseat.length, 6,
  "own category, padded out later. Also blocked: scoring it needs a personal-item envelope per carrier, which the carrier dataset doesn't hold yet.");

/* 4. weight headroom advisory needs bags that trip it */
const tight = carryon.filter(b => b.weight_kg && b.weight_kg.v / 7 >= 0.4).length;
R("trips the weight-headroom advisory at 7kg", tight, 4);
R("would exceed a 7kg cap empty", carryon.filter(b=>b.weight_kg && b.weight_kg.v>=7).length, 1,
  "the 'tight' tier already renders; the 'over' tier is a rare edge case");

/* 5. variant comparison UI needs a line with 2+ SIZED variants */
const lines = {};
for (const b of carryon) if (b.line) (lines[b.line] ??= []).push(b.slug);
const multiVariant = Object.entries(lines).filter(([,v]) => v.length > 1);
R("product lines with 2+ sized variants", multiVariant.length, 3);

/* 6. conflicts + corroboration surfaces */
R("bags carrying a cross-source conflict", all.filter(b=>b.conflicts.length).length, 5,
  "grows on its own as sources are added");
R("bags cited by 2+ publications", all.filter(b=>b.mentions>1).length, 8,
  "grows on its own as sources are added");
R("bags with a verbatim quote to render", all.filter(b=>b.reviews.some(r=>r.verbatim)).length, 3);
R("bags a reviewer rejected on fit grounds", all.filter(b=>b.reviews.some(r=>r.rejected_on_fit)).length, 3);

console.log("READY\n" + ok.map(s=>"  ok    "+s).join("\n"));
console.log("\nBLOCKING — launch paths with no real data behind them\n" + (need.map(s=>"  THIN  "+s).join("\n") || "  none"));
console.log("\nDEFERRED — real gaps, not launch blockers\n" + later.map(s=>"  later "+s).join("\n"));
console.log(`\n${ok.length} of ${ok.length+need.length} launch paths exercised  ·  ${later.length} deferred`);
console.log(`Lines with sized variants: ${multiVariant.map(m=>m[0]+"("+m[1].length+")").join(", ")||"none"}`);
