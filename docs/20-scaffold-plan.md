# Scaffold plan

Landing page first, on Astro + Cloudflare. Decisions in [17](17-tech-stack.md).

**Rule:** every step ends green on `npm run check`. No step is "done" without its acceptance line.

---

## 0 · Finish the extraction *(before Astro)*

Four duplicated sources of truth remain. They must not be carried into components.

| What | Copies | Action |
|---|---|---|
| `BAGS[]` | 3 pages | Generate from `data/bags/` (11 mock slugs don't exist there) |
| `AIR[]` | check.html, bag.html | Generate from `data/carriers/` (index.html already done) |
| Unit converter | 5 pages | → `src/ui/units.mjs` |
| Verdict labels | 3 pages | → `src/ui/verdict.mjs` — **already drifted** ("Won't fit" vs "It won't fit") |

**Accept:** one source per fact; `verify-pages` passes; golden verdicts unchanged except where bag data legitimately changes.

⚠️ Wiring real bag data will change which bags the landing page shows. Expected, not a regression.

---

## 1 · Astro skeleton

```
astro.config.mjs      output: 'hybrid', @astrojs/cloudflare
src/pages/            routes
src/components/       Header, Nav, Footer, UnitToggle
src/styles/tokens.css extracted from the mockups (5 copies today)
```

- `npm run dev` serves a blank layout
- Engine imported from `src/engine/` — **no inlining**; `build-mockups.mjs` retires when the last mockup does

**Accept:** dev server runs; `npm test` still green; tokens.css is the only place colours are defined.

---

## 2 · Components

Per the repetition rule — three uses or interactive.

| Component | Tested? | Why |
|---|---|---|
| `Header` / `Nav` / `Footer` | no | Static, 3+ uses |
| `UnitToggle` | **yes** | State, persistence, the thing corrected three times |
| `VerdictBadge` | **yes** | Renders band + advisories; must never invent a verdict |
| `BagCard` | no | Presentational |

**Accept:** each interactive component has tests; no component exists with one use.

---

## 3 · Landing page

The honest test of the stack: engine, bag data, carrier data, unit toggle, verdict copy.

- Static-rendered (build-time engine)
- Bags from `data/bags/`, carriers from `data/carriers/`
- **Must not promote any bag with `measured_cm: null`** — the release gate from [19](19-dataset-build.md)

**Accept:** page renders from real data; the gate is a test, not a convention; Lighthouse ≥95.

---

## 4 · Outbound links

`/go/[merchant]/[bag]` — one Worker. Click logging deferred with D1.

**Accept:** redirects work; affiliate disclosure present.

---

## Deferred

D1 · corrections endpoint · Resend (blocked on a domain, blocked on the name) · `/check`, `/bags`, `/guide` routes.

## Order

`0 → 1 → 2 → 3` is strict. `4` any time after `1`.

Carrier audit and bag measurement run in parallel — neither blocks this.
