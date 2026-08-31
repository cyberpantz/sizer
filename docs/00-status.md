# Status — 2026-08-30

## Built

| | |
|---|---|
| `src/engine/` | Fit engine. Pure, no deps. **110 tests.** Bands, strictness, advisories, normalize |
| `data/bags/` | **55 records**, 34 sized, provenance-tagged. 0 measured by us |
| `data/carriers/` | **23 records**, all `placeholder: true`. Target 50 |
| `resources/` | Source register + per-carrier research dossiers |
| `mockup/` | 5 pages, engine inlined from `src/`, drift-checked |
| `scripts/` | Build + 4 verification guards |
| git | Initialised today. Nothing was under version control before |

`npm run check` → tests, inline drift, page health, verdict parity, rebuild, validate, doc drift.

## Blocking launch

1. **"Goes anywhere" shelf has 1 bag** (a wheelless duffel). Zero wheeled carry-ons clear 80% of carriers.
2. **No carrier data is real.** 23 placeholder records, 0 baggage pages read.

## Decided this session

- Engine runs at build time *and* in the browser → pure module
- Components on repetition (3 uses); header/nav/footer + interactive pieces with tests
- First route: landing page
- Resend for outbound mail (Workers have no TCP sockets)
- D1 deferred past MVP
- User corrections: `observed` provenance, queued, never auto-editing, structured fields

## Engine model

```
prior (business model + region)  →  components (4 sourceable facts)  →  reports (real outcomes)
                                          override (reason + by + at, stales at 180d)
```

Bands: `EPS_CM 0.3` (measurement error only) + `gambleCeiling(strictness)` 5.0→0.
Advisories never move a band. `agentCommission` is the only one firing on CLEARS.

## Bugs found by running real data

1. Band fall-through at strictness 6–7 → silent CLEARS
2. No rounding tolerance → failed a bag by 0.01 cm
3. Flat 3 cm ceiling ignoring strictness
4. `gambleCeiling(null)` returned the *most permissive* ceiling — unknown now fails safe
5. `build-bags.mjs` erased `measured_cm` on rebuild
6. Five page-level bugs during the engine port, none catchable by `npm test`

## Corrections worth remembering

- **Pack Hacker ships a compliance score vs 146 airlines** — on manufacturer dimensions. Not a handoff, a competitor.
- **Rick Steves and Travelpro publish packing *and* with-wheels dimensions.** Manufacturers are ahead of reviewers here.
- **Cited a news aggregator as a congressional report**, and quoted words not in the source read. Now requires `verified_against`.
- **Spirit ceased operations 2 May 2026.** Record deleted. Freshness checks can't catch a carrier ceasing to exist.

## Next

- Finish extraction: `BAGS[]` (3 copies), unit converter (5 copies), verdict labels (3, already drifted)
- Astro scaffold, landing page first
- 50-carrier audit — collect personal-item envelope and confirm each carrier still flies
