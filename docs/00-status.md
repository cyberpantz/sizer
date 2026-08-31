# Status — 2026-08-30

## Built

| | |
|---|---|
| `src/engine/` | Fit engine. Pure, no deps. Bands, strictness, advisories, normalize |
| `src/ui/` | Units + verdict copy. Replaced 5 and 3 duplicated copies |
| `src/components/` | Header, Footer, UnitToggle |
| `src/styles/tokens.css` | 27 tokens, extracted from 5 duplicated copies |
| `data/bags/` | 55 records, 34 sized, **0 measured by us** |
| `data/carriers/` | 23 records, all placeholder. Target 50 |
| `resources/` | Source register + per-carrier research dossiers |
| `mockup/` | 5 pages, all data generated from `data/` |
| **147 tests** | `npm run check` = tests → mockup drift → verdict parity → data → docs → build → shipped HTML |

## Blocking launch

1. **"Goes anywhere" shelf has 1 bag** (wheelless duffel). Zero wheeled carry-ons clear 80%.
2. **No carrier data is real.** 0 baggage pages read.

## Scaffold plan (docs/20)

- **0 · Extraction — done.** No hand-kept data literal in any mockup
- **1 · Astro skeleton — done.** Builds, verified
- **2 · Components** — VerdictBadge, BagCard ← next
- 3 · Landing page
- 4 · `/go/*` redirects

**Open: Tailwind or stay on Astro scoped CSS + tokens?** Cheap to switch now (4 components), expensive later. Current setup lets `verify-build.mjs` enforce the one design rule automatically — every colour must resolve through a token.

## Engine model

```
prior (business model + region) → components (4 sourceable facts) → reports (real outcomes)
                                        override (reason + by + at, stales at 180d)
```

Advisories never move a band. `agentCommission` is the only one firing on CLEARS.

## Bugs found by running real data

1. Band fall-through at strictness 6–7 → silent CLEARS
2. No rounding tolerance → failed a bag by 0.01 cm
3. Flat 3 cm ceiling ignoring strictness
4. `gambleCeiling(null)` returned the *most permissive* ceiling
5. `build-bags.mjs` erased `measured_cm` on rebuild
6. Five page-level bugs during the engine port, none catchable by `npm test`
7. **Node 22's `navigator` reports en-US** — SSR would have opened every page in inches
8. Colour guard passed a tamper test it should have failed (minifier rewrites `#ff0000` → `red`)

## Corrections worth remembering

- **Pack Hacker ships a compliance score vs 146 airlines** — on manufacturer dimensions. A competitor, not a handoff.
- **Rick Steves and Travelpro publish packing *and* with-wheels dimensions.** Manufacturers are ahead of reviewers.
- **Cited an aggregator as a congressional report** and quoted words not in the source read. Now requires `verified_against`.
- **Spirit ceased operations 2 May 2026.** Record deleted. Freshness checks can't catch a carrier ceasing to exist.
- **No git repo existed** until today.

## Next

- Decide Tailwind
- Components → landing page
- 50-carrier audit: allowances, personal-item envelope, gate/online fees, confirm each still flies
