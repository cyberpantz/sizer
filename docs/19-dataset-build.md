# Dataset build

**Its own workstream, on its own clock.** The product is judged on whether the verdict is right; the dataset is judged on whether it can exercise every path the product has. Those are different jobs and they should not block each other.

The stance: get a fixture set rich enough to test the methodology and the filters, then grow it. A dataset that can't answer everything is fine. A dataset that can't *test* everything is not.

---

## The bar: coverage of paths, not count of rows

"How many bags do we have" is the wrong question. 500 hardside spinners would still leave the under-seat filter empty and the recommendation shelf bare.

The right question is whether every band, filter, shelf, advisory and comparison surface has at least one real bag standing in it. `data/fixture-audit.mjs` answers it and should be run whenever the catalogue changes.

It reads `data/` through the **same loaders the pages use**. It used to parse the
mockup, which let the audit and the landing page disagree about the catalogue —
and they did: the audit reported 4 bags on the top shelf while the page showed 5.
An audit measuring a different dataset than the product reads as coverage while
providing none.

**Current state: 14 of 14 launch paths exercised, 6 deferred.** 61 bags, 40 sized, **9 promotable** on the manufacturer's own overall dimensions. 58 carriers, 3 of which we cannot answer for.

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

### Nothing blocks launch on fixture coverage any more

Both former blockers cleared once Frank's carrier and bag work landed:

| Path | Was | Now |
|---|---|---|
| Carry-on shelf: "goes anywhere" | 1 | **5** |
| filter: 2-wheel roller | 3 | **7** |

⚠️ **That is coverage of product paths, not readiness to publish.** The deferred
list still holds the one that matters:

Everything else is deferred:

| Deferred path | Have | Why it waits |
|---|---|---|
| under-seat category | 2 | Own category. Also blocked on per-carrier personal-item envelopes. |
| filter: backpack | 1 | One-bag audience, not the launch case |
| filter: duffel | 1 | Niche form factor |
| bag over a 7 kg cap empty | 0 | The "tight" advisory tier already renders; "over" is a rare edge |
| cross-source conflicts | 2 | Grows on its own as sources are added |
| bags cited by 2+ publications | 7 | Same |
| **bags promotable** | **9 of 40** | The release gate. Raised by sourcing the maker's own overall figure, not by measuring |

**The top row, scoped honestly, is one bag.** The Patagonia Black Hole 40L duffel, at 24 of 24 — and it has no wheels.

Which means the sharper version of the problem:

> **We currently hold zero wheeled carry-ons that clear 80% of carriers.** The best is the Calpak Luka at 19/24 — 79%, one carrier short of the shelf.

Most people who arrive at this site want a wheeled bag. Right now we cannot name one that goes everywhere. Not because none exists — because the US review circuit optimises for a 22 × 14 × 9 domestic bin and doesn't test the small European-sized hardsides that would clear.

That is the single most important gap in the project, and it is a *measurement* problem, not a research problem. No further review-reading fixes it.

---

## Where the data comes from, in order of trust

| Rank | `dim_source` | What it is | May we recommend on it? |
|---|---|---|---|
| 1 | `measured` | We put a tape on it | Yes — but nobody is planning to |
| 2 | **`maker_overall`** | **The manufacturer states an overall / with-wheels figure explicitly** | **Yes. This is what we build on** |
| 3 | `review` | A publication measured it | No. Displayable and attributed; their method is rarely stated |
| 4 | `maker_unspecified` | Manufacturer gives one figure without saying which | No — it is probably the packing body, which runs small |
| 5 | `maker_packing` | Explicitly the case/packing size | Never compared against an airline limit alone |
| — | `reseller` | Marketplace or retail listing | **Never used as the operative dimension.** Recorded for conflict detection only |

**Everything we hold today is tier 2, and all of it from one publication.** 29 sized bags: 11 from T+L's general guide, 18 from their international list. The Strategist and Pack Hacker publish no dimensions at all, so they contribute reviews and nothing else.

Half the catalogue rests on one outlet's tape measure. That is a single point of failure under the whole product, and no amount of additional review-reading fixes it — the other outlets don't publish the number. **Only measuring does.**

### The rule that keeps this honest

**Superseded gate:** *"no bag appears in a promoted recommendation with `measured_cm: null`."*

That rested on measuring every bag ourselves, which is not happening — getting hold of 100 suitcases to put a tape on them was never a plan, and a gate nothing can pass blocks the product forever rather than protecting it.

The replacement is narrower and reachable:

> A bag may be **promoted** — recommended, shelved, put in front of someone as an answer — only on `measured` or `maker_overall`. Everything else may be displayed, with its source named.

`isPromotable()` in the engine enforces it; `promotable` comes back with every verdict; shelves sort promotable bags first, because the top card is read as the answer whatever the caption says.

**The distinction was never who held the tape — it is which figure.** Overall, wheels and handle included, is what an airline checks. Travelpro publishes both and says which to use; Rick Steves publishes both. That is a better source than a stranger with a tape measure, and it is free.

**What we will not do is take dimensions from a reseller.** Marketplace listings are the weakest source in this category — the same bag carries different dimensions across sellers, usually with no note of which figure is quoted — and they are also the easiest to scrape, which is why the competition uses them. Going to the manufacturer instead is the whole moat now.

Current position: **9 of 40 sized bags are promotable.** The work is replacing `review` dimensions with the maker's own overall figure, one product page at a time.

---

## Build order

**1 · Get the manufacturer's overall dimensions for the 31 bags currently on a review figure.** One product page each. Where the maker publishes both, record both — the gap between them is the thing this site explains, and it is the strongest illustration we have (the Rick Steves Spinner swings from 16 of 24 carriers to 6 between its packing and overall figures).

Where a manufacturer publishes only one number, record it as `maker_unspecified` rather than assuming it is overall. That bag stays displayable and unpromotable until someone finds a better source.

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
