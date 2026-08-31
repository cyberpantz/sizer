# Dataset build

**Its own workstream, on its own clock.** The product is judged on whether the verdict is right; the dataset is judged on whether it can exercise every path the product has. Those are different jobs and they should not block each other.

The stance: get a fixture set rich enough to test the methodology and the filters, then grow it. A dataset that can't answer everything is fine. A dataset that can't *test* everything is not.

---

## The bar: coverage of paths, not count of rows

"How many bags do we have" is the wrong question. 500 hardside spinners would still leave the under-seat filter empty and the recommendation shelf bare.

The right question is whether every band, filter, shelf, advisory and comparison surface has at least one real bag standing in it. `data/fixture-audit.mjs` answers it and should be run whenever the catalogue changes.

**Current state: 12 of 14 launch paths exercised, 6 deferred.** 52 bags, 29 of them sized.

Not every gap blocks. The audit splits **blocking** from **deferred** — a path is deferred when the product ships fine without it, or when it's waiting on data we haven't collected. Without that split everything looks equally urgent and nothing gets prioritised.

### What's ready

Every verdict band is reachable by 20+ bags. Hardside and softside spinners are well covered. The weight-headroom advisory has 20 bags that trip it. All three product lines needed for the variant-comparison surface exist — Away, Béis, Bellroy — each with two sized variants. Verbatim quotes and reviewer fit-rejections both have real examples to render.

### Scope: the shelves are overhead carry-ons only

**Under-seat is its own category, not a way to fill the carry-on shelf.**

An under-seat bag clears a strict carrier by *not being a carry-on*. Counting one as a bag that "goes anywhere" answers a question nobody asked — the person searching arrived wanting to know which **overhead** bag survives their itinerary. My first pass had the Kenneth Cole Underseater sitting second on the top shelf and recommended sourcing more under-seat bags to fill it. That was padding the number with bags that dodge the problem.

So `role` is now a field, and it's about **intent, not size**: which allowance the bag is built to use. It's orthogonal to `type` — a duffel or a travel backpack is an overhead carry-on; a small tote is not.

Under-seat still matters and gets its own shelf eventually — it's the honest answer for a Ryanair or Wizz Basic passenger, who is allowed no overhead bag at any size. But it is **deferred, not urgent**, for two reasons:

1. It isn't why this site exists. The launch question is which *overhead* carry-on survives an itinerary.
2. **It's blocked anyway.** Scoring an under-seat bag needs a personal-item envelope for every carrier, and the carrier dataset doesn't hold one — we record the fare's allowance, which is the personal item only on the ULCC basic fares. Building the shelf before the carrier audit would mean guessing.

Two bags today. Pad it out after launch, when the carrier work has supplied the envelope it needs.

A separate derived flag, `fits_personal_item`, records whether an overhead carry-on *also* fits a 40 × 30 × 20 envelope. Useful on a bag page, never a reason to reshelve.

> First thing it caught: the Kenneth Cole **Underseater**, at 43.2 × 33 × 22.9 cm, does not fit the personal-item allowance on Ryanair, Wizz or Vueling. A bag named for the space it doesn't fit in. That is exactly the kind of finding this site exists to publish.

### What actually blocks launch — two things

| Path | Have | Need |
|---|---|---|
| **Carry-on shelf: "goes anywhere"** | **1** | 5 |
| filter: 2-wheel roller | 3 | 4 |

Everything else is deferred:

| Deferred path | Have | Why it waits |
|---|---|---|
| under-seat category | 2 | Own category. Also blocked on per-carrier personal-item envelopes. |
| filter: backpack | 1 | One-bag audience, not the launch case |
| filter: duffel | 1 | Niche form factor |
| bag over a 7 kg cap empty | 0 | The "tight" advisory tier already renders; "over" is a rare edge |
| cross-source conflicts | 2 | Grows on its own as sources are added |
| bags cited by 2+ publications | 5 | Same |

**The top row, scoped honestly, is one bag.** The Patagonia Black Hole 40L duffel, at 24 of 24 — and it has no wheels.

Which means the sharper version of the problem:

> **We currently hold zero wheeled carry-ons that clear 80% of carriers.** The best is the Calpak Luka at 19/24 — 79%, one carrier short of the shelf.

Most people who arrive at this site want a wheeled bag. Right now we cannot name one that goes everywhere. Not because none exists — because the US review circuit optimises for a 22 × 14 × 9 domestic bin and doesn't test the small European-sized hardsides that would clear.

That is the single most important gap in the project, and it is a *measurement* problem, not a research problem. No further review-reading fixes it.

---

## Where the data comes from, in order of trust

| Tier | Source | Provenance | Trust |
|---|---|---|---|
| 1 | We measured it, with a photo | `measured` | The asset |
| 2 | A publication measured it | `review` | Usable, must be re-measured |
| 3 | Manufacturer spec sheet | `manufacturer` | Packing dimensions — wrong by design |
| 4 | Retail listing | `manufacturer` | Same, plus transcription errors |

**Everything we hold today is tier 2, and all of it from one publication.** 29 sized bags: 11 from T+L's general guide, 18 from their international list. The Strategist and Pack Hacker publish no dimensions at all, so they contribute reviews and nothing else.

Half the catalogue rests on one outlet's tape measure. That is a single point of failure under the whole product, and no amount of additional review-reading fixes it — the other outlets don't publish the number. **Only measuring does.**

### The rule that keeps this honest

A tier-2 dimension may populate the catalogue and drive the mockups. It may **not** ship as a verdict without a re-measure. `validate.mjs` enforces the provenance half of this; the release gate enforces the rest:

> No bag appears in a promoted recommendation with `measured_cm: null`.

That's the line between "we read some reviews" and "we measured it ourselves," and it is the only thing we sell.

---

## Build order

**1 · Measure the 29 we can already size.** Cheapest first pass, because a disagreement with T+L is itself a finding — and if we agree with them consistently, tier 2 becomes a much more useful shortcut for everything after.

**2 · Fill the "goes anywhere" shelf with WHEELED overhead carry-ons.** Target: 15+ clearing 80%, most of them wheeled, because that's what people want and it's the thing we currently cannot answer. Sourced by *dimension*, not by award: the small European-sized hardsides — Monos Cabin, Travelpro Platinum Elite 20" International, Samsonite's international-sized lines, Antler, American Tourister's EU range, Cabin Zero. Most will never appear in a US best-of list. That is the point, and it's the moat.

**3 · Size the 21 we can't.** Rimowa Essential, Away Carry-On, Monos, Quince, Tortuga, Cotopaxi, Aer, July, Osprey Transporter, Peak Design Roller Pro and the rest. All are high-search-volume, all are currently unanswerable.

**4 · Widen the review corpus.** Not for dimensions — for corroboration and conflicts, both of which are thin. Non-US sources especially: a European or Asian outlet reviews against a different bin.

**4b · Fees.** Gate price and online price for a carry-on, per carrier. Two reasons, one page: `check.html` needs them to tell a traveller what a mistake costs, and `fee_asymmetry` — weight 3, one of only two tier-1 strictness components — is computed from the ratio. Currently `null` everywhere. Collect during step 5; they are on the same page as the allowance.

**5 · Carriers.** The 50-carrier audit. Independent of all of the above and the blocker on every published number ([04](04-data-sources.md)). **Collect the personal-item envelope while you're on each page** — it costs nothing extra there and it's what unblocks step 6.

**6 · Under-seat, post-launch.** Cabin Max Metz, Narwey, Bagsmart and the ULCC-compliant set, scored against the personal-item envelope rather than the carry-on one. Its own shelf, its own page. Two bags today, and deliberately last.

Steps 1–4 are bag work and can run in any order by whoever has the tape. Step 5 is desk work. They don't block each other. Step 6 waits on step 5.

---

## Files

| File | Role |
|---|---|
| `data/bag-identity.mjs` | Brand, model, variant, line, construction. **No sizes.** Hand-kept. |
| `data/reviews/sources.json` | Publications: method, what they print, what they don't |
| `data/reviews/mentions.json` | One row per bag per publication. Their claims, their words. |
| `data/build-bags.mjs` | Generates `data/bags/*.json`. Never invents a number. |
| `data/validate.mjs` | CI gate. Fails on bare values and on false `measured` claims. |
| `data/coverage.mjs` | What the dataset can and cannot answer today |
| `data/fixture-audit.mjs` | Whether every product path has data behind it |
| `data/verdicts.mjs` | Runs the real catalogue against the carriers |

`build-bags.mjs` is generative: edit the sources and rebuild, never edit `data/bags/*.json` by hand. The exception is `measured_cm`, which is the one field a human writes — and the build must learn to preserve it before the first measurement, or the first rebuild will erase the only valuable data in the repo.

⚠️ **Do that before measuring anything.**

---

## Measurement protocol

Deferred to a working session with a tape in hand, but the non-negotiables:

- **External, maximum extent.** Wheels, handles, feet, expanded bumpers. What the gate frame sees.
- **Empty and unexpanded**, then a second reading expanded where an expander exists.
- **A photo per bag**, tape visible, filed at `/img/measure/[slug].jpg`. The photo is the proof and it is what makes the number defensible.
- **Sorted descending on write.** The engine assumes it.
- **Date and measurer recorded.** `verified_at` is a claim about a moment, not a fact about a bag.
- **Disagreements with a publication are recorded, not resolved.** Both survive in `conflicts[]`.

---

## Why this can be its own task

The dataset has a validator, a coverage report and a fixture audit. All three run without the site existing. That means it can be worked on by someone who never opens the mockups, and progress is legible without a subjective read — the audit either goes from 12/20 to 20/20 or it doesn't.

The reverse also holds: the product can be built and tested against the current fixture set for as long as the audit says the paths are exercised. When a new filter or surface is added, add its check to the audit first. It will usually fail, and knowing that on day one is the entire value.
