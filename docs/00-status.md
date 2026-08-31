# Status — 2026-08-31

## Built

| | |
|---|---|
| `src/engine/` | Pure fit engine — bands, strictness, advisories, normalize. No deps |
| `src/lib/` | `data.mjs` (the only thing that knows where data lives, async, throws rather than degrades) · `shelves.mjs` |
| `src/components/` | Header, Footer, UnitToggle, VerdictBadge, BagCard |
| `src/pages/index.astro` | Landing page on real data |
| `data/bags/` | 61 records · 40 sized · **9 promotable** |
| `data/carriers/` | 58 · 36 researched · 3 unanswerable · target 100 |
| `resources/` | Source register + per-carrier dossiers |
| **214 tests** | `npm run check` = lint → tests → mockup drift → verdict parity → spacing → data → docs → build → shipped HTML |

Stack: Astro (static, no adapter yet) · Tailwind v4 · Biome · pnpm.

## The pivot that reshaped everything

**We are not measuring bags.** The old release gate — *no bag promoted with `measured_cm: null`* — rested on hand-measuring 100 suitcases and sat permanently at 0.

Replacement: **the manufacturer's own overall figure, never a reseller's.**

```
measured · maker_overall   → promotable (recommendable)
review · maker_unspecified → displayable, attributed
maker_packing · reseller   → never the operative dimension
```

The distinction was never who held the tape — it's *which figure*. Overall, wheels and handle included, is what an airline checks. Travelpro and Rick Steves publish both and say which to use. **9 of 40 promotable**; raised by reading product pages.

## Open

1. **31 bags on a review dimension** — replace with the maker's overall figure, one product page each
2. **58 → 100 carriers**, and 0 are `publication_ready`
3. Schema gaps still unbuilt: three-point fees + effective dates, per-operator regional flags, passenger-attribute exemptions (`docs/21`)
4. `/bags` and `/check` routes
5. No deploy — no wrangler, no CI, `site:` is a placeholder. Name still undecided, which also blocks Resend

## Corrections worth remembering

- **Headline accused manufacturers of what listings do.** Travelpro publishes both figures *and* says which to use; we'd quoted them, then contradicted it on the front page. Rule in `docs/16`: name the behaviour, not the actor.
- **Pack Hacker ships a compliance score vs 146 airlines** on manufacturer dimensions — a competitor, not a handoff.
- **Spirit ceased operations 2 May 2026.** Record deleted; freshness checks can't catch a carrier ceasing to exist.
- **Cited an aggregator as a congressional report.** Now requires `verified_against`.
- **United publishes inches and cm that disagree** — 35.5 cm passes one, fails the other.
- **Unknown ≠ banned.** A missing cabin row meant "no bag at any size"; now `cabin_absence` distinguishes a finding from a gap.

## Bugs found by running real data

1. Band fall-through at strictness 6–7 → silent CLEARS
2. No rounding tolerance → failed a bag by 0.01 cm
3. Flat 3 cm ceiling ignoring strictness
4. `gambleCeiling(null)` returned the **most permissive** ceiling
5. `build-bags.mjs` erased `measured_cm` on rebuild
6. Five page-level bugs in the engine port, none catchable by `npm test`
7. Node 22's `navigator` reports en-US — SSR would have opened every page in inches
8. Colour guard passed a tamper test it should have failed (minifier rewrites `#ff0000` → `red`)
9. `undefined === undefined` matched the first fare row — **third time** an absent value produced a confident answer
10. A Ryanair **Basic** booking reached the **Priority** allowance through cabin class
11. Drift checker's regex was two-digit only — could never match "100 carriers"
12. `fixture-audit` read the mockup, so it disagreed with the page about the catalogue
13. Astro drops whitespace before a wrapped element — "differentsets of dimensions"

## Guards, and the lesson

`verify:inlined` · `verify:pages` · `verify:spacing` · `verify:engine` (golden verdicts) · `verify:build` · `validate` · `validate:carriers` · `drift`

**Every one needed tamper-testing before it could be trusted.** Three were written broken and reported green.
