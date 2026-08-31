# The mockups are frozen

**Decision, 2026-08-31: `mockup/*.html` stays as it is. We have moved past it.**

The site is Astro now (`src/pages/`). The four mockup pages are not a surface
anyone uses. What they still are is the **fixture that proves the engine port
was faithful**, and that is worth keeping.

---

## What the freeze protects

`scripts/verdicts.golden` holds 3,861 verdicts, taken **before** the fit engine
was extracted out of the mockup JavaScript. `mockup/*.html` holds the dataset as
it stood at that moment — 58 carriers, 39 bags. Two scripts replay it:

| Script | What it asserts |
|---|---|
| `verify-port.mjs` | the current `src/engine/` produces the same 3,861 verdicts |
| `verify-mockup-engine.mjs` | the engine inlined in the pages produces them too |

That is a real regression test on the thing that decides whether someone's bag
gets on a plane — and it works **only because both sides are held still**.

Rebuild the mockups and the data blocks refresh to whatever `data/` holds today.
The verdict count moves (6,897 when this was written) and the golden cannot
validate any of them. You would not have caught a regression. You would have
deleted the only thing that could catch one.

---

## Consequences, stated plainly

- **`verify:inlined` is no longer in `npm run check`.** It reports drift between
  the inlined engine and `src/engine/`, and that drift is now the expected
  state. It is what "frozen" means. Running it by hand is fine; failing CI on it
  is not.
- **`verify:engine` and `verify:port` stay in the chain.** They still assert
  something true, and they are the reason the freeze is worth anything.
- **The mockups do not reflect the current dataset.** They are 10 carriers and
  21 bags behind on the day of this decision, and will fall further behind. That
  is fine. Nobody should read a number off them.

---

## What was broken, and why nobody noticed

`build-mockups.mjs` crashed two ways, and the crash is how the freeze happened —
by accident rather than by decision:

1. `b.external_cm.v` assumed every sized bag carries that field. Several do not:
   Béis has only `claimed_*`, which `isSized()` rightly counts. One good record
   killed the whole build.
2. `a.max_cm[0]` on Singapore, whose cabin rule is a sum (`115 cm`) and no box
   at all, so `max_cm` is legitimately `null`.

Both are fixed, so the script runs if it is ever needed. The important part is
what the crash concealed: **`verify:inlined` was the third step of
`npm run check`, so every step after it had stopped running** — `validate`,
`validate:carriers`, `drift`, `build`, `verify:build`. The chain reported a
failure, and the failure looked like a mockup problem rather than what it was:
the whole gate switched off.

That is the same shape as the exclusion register that excluded nothing, and the
`data-kg` loop with no emitters. A check that cannot run is indistinguishable
from a check that passes, right up until it matters.

---

## If the fixture ever needs to grow

Take a **new** baseline, deliberately, in a commit of its own that does nothing
else — so the diff is the baseline and a reviewer can see what moved. Never as a
side effect of a rebuild, because then the old guarantee is gone and nothing
records that it went.
