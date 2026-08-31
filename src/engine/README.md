# The fit engine

Pure functions. Centimetres in, data out. No DOM, no I/O, no units, no copy.

| File | Role |
|---|---|
| `constants.mjs` | Every tunable number, once. Nothing outside may hard-code a threshold. |
| `fit.mjs` | Bands, delta, envelope, coverage. `createEngine(config)` plus a default instance. |
| `advisories.mjs` | Everything true about a fit that the bands deliberately don't encode. A registry. |
| `normalize.mjs` | Stored record → engine input. Validates; throws `EngineInputError`. |

## Why a factory

`createEngine(overrides)` exists so thresholds are injectable. Tests pin a curve without touching defaults, and a future per-region tuning varies one without a fork. `import { band }` gives the default instance for the common case.

## The rule that keeps being retested

**An advisory never changes the band.** Dimensions decide whether the bag goes through the frame; weight is a different gate enforced by a different person; squish is a property of the bag; aircraft is a property of the route. Folding squish into the tolerance once moved a bag nine carriers, silently — which is wiggle room replacing a published limit, the one thing the spec forbids.

To add an advisory: write a function taking `{ bag, carrier, deltaCm, config }`, return `null` or `{ id, level, ...figures }`, and add it to `DEFAULT_ADVISORIES`. Return figures, never sentences — the same advisory has to render as a headline, a table cell and a tooltip.

## Three bugs, three regression tests

Every one was found by running real data through the rules, never by reading them.

1. **Fall-through at strictness 6–7** — WON'T started at 8, GAMBLE stopped at 5, so a bag 2 cm over on Lufthansa matched nothing and returned CLEARS.
2. **No rounding tolerance** — the Travelpro Maxlite 5 International is built to 55 × 40 × 20 but published in inches; 21.75 in → 55.245 cm failed seven carriers, Iberia by 0.01 cm.
3. **A flat 3 cm ceiling** — 3.1 cm over read the same on Southwest, which owns no gate sizer, as on Ryanair, which pays staff to catch bags.

**When a fourth appears, add the case before the fix.**

## Properties

The property tests matter more than the regressions, because every bug so far came from a case nobody thought to write down:

- exhaustive — no delta falls through, at any strictness
- monotonic in strictness — a stricter carrier is never more permissive
- monotonic in delta — a bigger bag never scores better
- a rounding artefact is never a failure, on any carrier
- a bag far over is refused even by the laxest carrier

## Getting into the pages

Mockups are opened straight off disk, and browsers refuse ES module imports over
`file://`. So `scripts/build-mockups.mjs` **inlines** the engine into each page
between markers. One source of truth: edit `src/engine/`, run the build, every
page moves together.

**Never hand-edit between `/* ENGINE:START */` and `/* ENGINE:END */`.**
`npm run verify:inlined` fails if you do.

The flattener puts every module in one scope, so two things are rejected at build
time rather than shipped:

- `import * as x from` — the namespace vanishes and `x.EPS_CM` throws
- `import { A as B }` — the alias vanishes and `B` throws

Both were real failures during the port. Use plain named imports.

Astro will import the module properly and this script retires.

## Four guards, because the module being right isn't enough

| Command | Catches |
|---|---|
| `npm test` | the engine's logic — 57 tests |
| `npm run verify:inlined` | a page whose inlined copy has drifted from `src/engine/` |
| `npm run verify:pages` | a page that doesn't parse, has two engines, or reimplements the ladder |
| `npm run verify:engine` | a verdict that changed — replays 646 golden verdicts through the built page |

The port found five bugs, and **none of them would have failed `npm test`**: two
un-inlinable import forms, a `const desc` declared twice, superseded constants
left above the markers, and a duplicate `const ENGINE`. Every one was a correct
module inside a page that threw before rendering a pixel. That is what
`verify-pages.mjs` exists for.

`scripts/verdicts.golden` is the pre-port snapshot — 17 bags × 24 carriers ×
fares. Regenerate it only when a verdict change is *intended*, and say so in the
commit.

## Running

```
npm test
npm run check     # tests, inline drift, page health, verdict parity, rebuild, validate, doc drift
```
