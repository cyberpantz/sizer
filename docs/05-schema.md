# Schema

Four entities, two pure functions. Everything else is presentation.

**Read-path data is version-controlled JSON** — corrections *are* the git history, which gives auditability for free and makes the `verified_at` discipline enforceable in code review.

There is a **thin write path** as well: email capture, outbound click tracking and error reports need somewhere to persist ([01](01-mvp.md#architecture)). Serverless functions plus a small managed store. It never serves the read path.

```
data/
  carriers/        one file per carrier — FR.json, BA.json …
  bags/            one file per bag
  airports.json    IATA → city, country, region
  regions.json     region → carrier list
```

---

## Carrier

Research status and publication readiness are separate. `placeholder: true` identifies unresearched/mockup data. Official-source allowance research uses `placeholder: false` and `research_status: "official_allowances_researched"`; dated source URLs identify the specific rows checked. `publication_ready: false` independently blocks publication while the issues in `audit_note` and the research dossier remain unresolved. A researched allowance does not imply that enforcement scores, all fares, or every exception have been verified.

```jsonc
{
  "iata": "FR",
  "icao": "RYR",
  "name": "Ryanair",
  "region": "EU",
  "type": "ulcc",              // ulcc | lcc | full_service | regional
  "strictness": {
    "score": 9,                // 1–10
    "contested": false,        // true when credible sources disagree — surfaced in UI
    "evidence": [ /* see below — every entry is cited */ ],
    "updated": "2026-08"
  },
  "sizer": {
    "at_gate": true,           // true | false | "checkin_only"
    "cabin_cm": [55, 40, 20],
    "personal_cm": [42, 20, 30]  // physical frame, NOT the published number
  },
  "allowances": [ /* see below */ ],
  "source_url": "https://www.ryanair.com/…/baggage-policy",
  "verified_at": "2026-08-28",
  "verified_by": "frank"
}
```

### Allowance

One row per **fare class × bag type**. Denormalized on purpose — allowances are read constantly and written rarely, and flattening removes an entire class of lookup bug.

```jsonc
{
  "fare_class": "basic",       // basic | standard | flex | premium | business
  "type": "personal",          // personal | cabin | checked
  "max_cm": [40, 30, 20],      // [length, width, depth] — see convention below
  "max_kg": null,
  "includes_wheels": true,     // false is rare and always worth flagging in UI
  "count": 1,
  "note": "No wheeled cabin bag on this fare at any size.",
  "source_url": "…",           // overrides carrier-level when the fare has its own page
  "verified_at": "2026-08-28"
}
```

### Two published units that disagree

Carriers publish both, and the two contradict each other. [United's carry-on](https://www.united.com/en/us/fly/baggage/carry-on-bags.html) is *"22 × 14 × 9 in (56 × 35 × 23 cm)"* — but 14 in is **35.56 cm**, not 35.

| | in → cm | published cm | difference |
|---|---|---|---|
| Carry-on | 55.88 × 35.56 × 22.86 | 56 × 35 × 23 | −0.12 / **+0.56** / −0.14 |
| Personal item | 43.18 × 25.4 × 22.86 | 43 × 25 × 22 | +0.18 / +0.4 / **+0.86** |

**A 35.5 cm wide bag passes their inch limit and fails their centimetre limit.** Same page, same airline, and the gap exceeds our own `EPS_CM` of 0.3 — so it is not rounding noise we can absorb.

```jsonc
"max_cm": [56, 35, 23],
"max_in": [22, 14, 9]
```

`reconcileUnits()` takes the **stricter figure on each axis independently** — United is looser in inches on width and tighter on length and depth, so picking one unit wholesale would be generous on whichever axis happens to bind. Both published figures are kept so a page can show the airline its own numbers, along with `conflict: true` and the per-axis difference.

Being wrong toward caution costs a reader some convenience. The other direction costs them a gate fee.

`validate-carriers.mjs` rejects a `max_in` that isn't three numbers, and flags a `max_cm`/`max_in` pair differing by more than 2 cm — that is a transcription error, not a unit disagreement.

### An allowance can depend on the route

United Basic Economy, from their own page:

> "You can't bring a carry-on bag unless you're flying to South America, across the Atlantic or across the Pacific."

Same fare, same passenger, opposite answers. **The transatlantic case is precisely our audience** — a US flyer connecting to Europe — and before this we told them they had no carry-on.

```jsonc
{ "type": "personal", "fare_class": "basic", "cabin_absence": "not_permitted",
  "applies_to": { "except": ["SA", "TATL", "TPAC"] } },
{ "type": "cabin",    "fare_class": "basic", "max_cm": [56, 35, 23],
  "applies_to": { "regions": ["SA", "TATL", "TPAC"] } }
```

Regions are coarse on purpose — `domestic`, `shorthaul`, `TATL`, `TPAC`, `SA`, `ME`, `AF`, `international`. These are the buckets carriers use in their own baggage copy; anything finer would invent precision the source lacks.

Three rules:

1. **A row with no `applies_to` applies everywhere.** Most allowances are unconditional and requiring the field would make every record noisier for no gain.
2. **Route filtering runs before fare matching**, so a domestic booking cannot reach a transatlantic-only row.
3. **No route given is `route_dependent`, not `not_permitted`.** A gap in the *question* is distinct from a gap in our *data*, and both are distinct from a finding. The page should say "this depends on where you're flying" and ask.

| Booking | Verdict |
|---|---|
| Basic, domestic | **won't fit** — no cabin bag |
| Basic, transatlantic | at the line — 55.88 × 35 × 22.86 |
| Basic, route not asked | **no verdict** — `route_dependent` |

`validate-carriers.mjs` rejects an unknown region name, an empty `applies_to`, and a row carrying both `regions[]` and `except[]`. A typo in a region silently makes a row apply nowhere, which reads as "no allowance" — the expensive direction again.

### Fares are three axes, not one string

Across the researched set, `fare_class` held all of:

| Value | What it actually is |
|---|---|
| `economy`, `business` | **cabin class** — what you fly |
| `basic`, `flex`, `max`, `plus`, `comfort_flex`, `family` | **fare brand** — which ticket |
| `priority` | **a paid add-on** — €6 on top of a fare |

One string cannot represent that, and *"economy"* alone cannot tell a Ryanair Basic from a Ryanair Basic **+ Priority** — which is the difference between no cabin bag at any size and 55 × 40 × 20. It is the highest-value distinction in the product.

```jsonc
{ "type": "cabin", "cabin_class": "economy", "fare_class": "basic", "max_cm": … }
{ "type": "cabin", "cabin_class": "economy", "addon": "priority", "max_cm": … }
```

A booking is `{ class, fare, addons[] }`. `resolveFare()` matches **add-on → fare → class**, most specific first, and reports which axis matched so a page can distinguish *"we answered for your fare"* from *"we fell back to your cabin class"*. A bare string still resolves, so existing callers keep working.

**An add-on row is opt-in only.** Two bugs surfaced writing this, both in the expensive direction:

- `a.cabin_class === b.class` was `undefined === undefined` and matched the first row in the file. **Third time today** that shape has bitten, after `gambleCeiling(null)` and the missing cabin row.
- A Ryanair **Basic** booking then matched the **Priority** row through `cabin_class: economy` — telling a passenger with no cabin allowance that their bag was fine. A row carrying `addon` is now unreachable unless that add-on is in the booking.

`validate-carriers.mjs` rejects an unknown `cabin_class` and an add-on row with no fare or class, which would be an allowance no booking can ever reach.

### Absence must say why — unknown is not banned

**Superseded rule:** *"a fare with no cabin row means no cabin bag at any size."* That was safe while every record was placeholder. It stopped being safe the moment a real audit began, because a **half-researched carrier also has no cabin row** — and telling a traveller their bag is banned when nobody has looked is a worse error than any dimension we could get wrong. To the reader the two are indistinguishable.

Same shape as `gambleCeiling(null)` returning the most permissive ceiling: an absent value silently produced a confident answer.

```jsonc
"cabin_absence": "not_permitted"   // a FINDING — no cabin bag at any size
                 "not_researched"  // nobody has read this fare yet
                 "not_published"   // the carrier doesn't say, and we couldn't establish it
                 "out_of_scope"    // a fare we deliberately don't model
```

Only `not_permitted` produces a refusal. The other three produce **no verdict at all** — `band: null`, with the reason carried so the page can say which kind of gap it is. Silence with no `cabin_absence` defaults to `not_researched`, because the conservative reading of silence is "we do not know".

Engine consequences, all tested in `absence.test.mjs`:

- An unknown fare returns `band: null`, never `wont`.
- Unknown carriers **leave the coverage denominator**. "Clears 41 of 58" must not include six nobody researched. `coverage()` reports `unknown` and `not_flying` separately, because *"we could not answer"* and *"this airline is gone"* are different statements.
- An unknown leg **does not shrink a multi-leg envelope**, but it **does decide the itinerary** — a trip is only as answerable as its least-known leg.

`validate-carriers.mjs` requires a carrier with no cabin rows to state a `cabin_absence`, and prints the split every run:

```
fares with no cabin bag: N not permitted (a finding) · M unanswerable (a gap)
```

Still never a zero-size row — a zero would silently pass a naive comparison.

### Checked rows

Checked allowances use a **linear** constraint rather than per-dimension, so they carry different fields. Collect them during the same audit pass — they're on the same page ([04](04-data-sources.md#collect-checked-allowances-in-the-same-pass)).

```jsonc
{
  "fare_class": "economy",
  "type": "checked",
  "linear_max_cm": 158,        // length + width + height
  "max_kg": 23,
  "free_pieces": 1,            // often 0 on basic fares
  "system": "piece",           // piece | weight
  "weight_total_kg": null,     // weight-system carriers only
  "source_url": "…",
  "verified_at": "2026-08-28"
}
```

The engine change is one comparison:

```
cabin:    delta = max(bag[i] − allowance.max_cm[i])
checked:  delta = sum(bag) − allowance.linear_max_cm
```

Same four bands, same strictness input, same provenance. **The measurement error compounds here** — a bag 1 cm over on each side is 3 cm over the linear limit — which makes measured dimensions matter more for checked bags than for cabin, not less.

`free_pieces: 0` is the checked equivalent of a missing cabin row, and deserves the same loud warning: *"This ticket includes no checked bag."*

---

## Bag

```jsonc
{
  "slug": "monos-carry-on-pro",
  "brand": "Monos",
  "model": "Carry-On Pro",
  "claimed_cm": [55, 40, 20],
  "measured_cm": [56, 40, 23],
  "provenance": "measured",       // measured | manufacturer | reported
  "measured_at": "2026-08-24",
  "measured_by": "frank",
  "measurement_photo": "/img/measure/monos-carry-on-pro.jpg",
  "soft": false,
  "compress_cm": 0,               // depth reducible when packed thin; soft bags 2–3
  "expands_cm": 3,                // expansion zip — a trap, warn when used
  "weight_kg": 3.4,
  "capacity_l": 38,
  "price_usd": 295,
  "offers": [
    {
      "merchant": "Monos",
      "network": "awin",
      "url": "…",
      "price_usd": 295,
      "commission_pct": null,
      "updated_at": "2026-08-29"
    }
  ]
}
```

### Size variants are separate records, never one entry per product line

```jsonc
"line": "aer-carry-on",      // groups variants; not a page, just a key
"variant": "Small",          // null for single-size products
```

Pack Hacker picks the **Aer Carry-On Small** over the regular one, and says why: *"we prefer the Small version, as it's more compatible with the most popular airlines."* Same brand, same line, different verdict.

That difference is the entire product. A catalogue that collapses variants into one row throws away the only fact we exist to report — and a reader searching "Aer Carry-On" has to land somewhere that tells them which one clears their flight. Each variant gets its own slug, its own measurement session, its own photo.

Where a line has multiple sizes we surface the comparison directly on the bag page: same bags, same carrier table, one clears and one doesn't. That's a stronger argument for the site than any copy we could write.

**Corollary for the offers array:** merchant URLs must resolve to the specific size. A link that dumps the reader on a size-picker after we told them the Small fits undoes the work.

### Every field carries its provenance, not just dimensions

If we don't take the maker's word on size, there's no principled reason to take it on anything else. So each fact is a small object, never a bare value:

```jsonc
"weight_kg":  { "v": 4.0,  "src": "measured",     "at": "2026-08-24" },
"capacity_l": { "v": 34.2, "src": "manufacturer" },        // we can't verify this yet — say so
"shell":      { "v": "polycarbonate", "src": "manufacturer" },
"warranty":   { "v": "limited lifetime", "src": "brand terms", "url": "…" }
```

`src` is one of **`measured`** (we did it, with a date), **`manufacturer`** (their claim, unverified), **`review`** (a third party tested it, attributed), or **`observed`** (physically checkable but not measured — shell material, wheel count).

The UI renders `manufacturer` differently from `measured` everywhere, without exception. A page full of manufacturer claims dressed as facts is the thing we exist to fix; doing it ourselves on the fields we happen not to have measured would be worse than not launching.

Manufacturer-only catalog research is maintained in `data/manufacturer-bags.json` and included by `data/build-bags.mjs`. Each record carries `manufacturer_source` (official product URL, retrieval date, title, and research dossier), and each specification carries `src: "manufacturer"`, its URL in `ref`, and retrieval date in `at`. `external_cm` is populated only when the source establishes overall dimensions including wheels and handles; `claimed_packing_cm` remains separate. These research records have empty `reviews`, null physical measurements, and `needs_measurement: true`. They are catalog candidates, not measured recommendations. The builder also respects `kind: "manufacturer"` on legacy store sources instead of labeling their specifications as review measurements.

### Third-party reviews — cited, never absorbed

We assess **fit**. We do not assess **quality** — durability, wheels, whether the handle survives two years. Those are real buying criteria and other people test them properly. Cite them; don't launder their judgement into ours.

```jsonc
"reviews": [
  {
    "outlet": "Travel + Leisure",
    "award": "Best for international travel",
    "date": "2026-06-10",
    "url": "https://…",
    "tested": true,                       // did they physically test it?
    "their_dims_in": [22, 14, 9],         // what they published, for conflict detection
    "praise": "Zipperless build makes it impossible to overpack past international limits",
    "caveat": "No expansion; 8.8 lb empty"
  }
]
```

Store `praise` and `caveat` as **their** words, attributed. Never paraphrase a reviewer into our voice — that's how a citation quietly becomes a claim we're responsible for.

#### Conflicts are data, not noise

Where two outlets publish different figures for the same bag, record both:

```jsonc
"conflicts": [
  { "field": "weight", "values": [
      { "src": "The Strategist", "v": "7.3 lb" },
      { "src": "Travel + Leisure", "v": "7.7 lb" }
  ], "note": "Possibly different model years. Neither publishes a method." }
]
```

That disagreement is the plainest argument for measuring, and burying it would waste the best evidence we have.

#### The two axes, and why we don't require both

| | Who answers it | How |
|---|---|---|
| **Does it fit?** | Us | Measured, dated, photographed |
| **Is it any good?** | Reviewers | Cited, attributed, linked |

A bag scoring well on both is a genuine recommendation. But **we do not require a review to list a bag**, for a specific reason: the under-seat bags that serve a Ryanair Basic passenger best are exactly the ones US roundups never cover. Requiring editorial validation would delete the most useful part of the catalogue for our audience.

So list everything we've measured, and be plain when nobody has reviewed it:

> **No independent review we could find.** We measured it ourselves, so we can tell you it fits. We can't tell you how it holds up after a year — nobody we trust has tested it.

That sentence is more useful than a fabricated confidence, and it invites exactly the correction we want.

### Why `claimed_cm` and `measured_cm` both persist

The gap between them is the product. Displaying the manufacturer's claim struck through beside our measurement is the most persuasive moment on the site — deleting the claim would throw away the argument.

### `provenance` is not optional and never defaults

Every dimension displayed anywhere renders with its badge. Consider a lint rule: no template may print a dimension without also printing provenance.

---

## Dimension convention

**Store as `[length, width, depth]`, longest to shortest, always in centimetres, always external, always including wheels and handles.**

Three rules that prevent the bugs that will otherwise dominate this codebase:

1. **Normalize on write, never on read.** Sort every triple descending at ingest. Airlines publish in inconsistent orders and a bag rotates freely — a bag fits if its sorted triple fits the sorted allowance.
2. **Centimetres are canonical.** Inches are a display conversion only. Round display to one decimal; never round before comparing.
3. **`includes_wheels: false` is a data-quality flag, not a measurement.** A handful of carriers state dimensions excluding protrusions. Surface it in the UI; do not silently adjust.

---

## The engine

Two pure functions. No I/O, no dates, no config — fully unit-testable, which matters because a bug here costs a user money.

```ts
function envelope(legs: Leg[]): Envelope
// → { max_cm, bound_by: [{ leg_index, dimension }], excluded: Carrier[] }

function fit(bag: Bag, allowance: Allowance, carrier: Carrier): Verdict
// → { band, binding_dim, delta_cm, fee, copy }
```

### Band rules

Evaluated in order; first match wins.

```
effective = bag.measured_cm
            − (bag.soft ? [0, 0, bag.compress_cm] : [0, 0, 0])
            + (bag.expands_cm applied only if user toggles "expanded")

delta = max(effective[i] − allowance.max_cm[i])  for i in 0..2

WON'T        delta > 3       OR (delta > 0 AND strictness >= 8)
GAMBLE       0 < delta <= 3  AND strictness <= 5
AT THE LINE  delta <= 0      AND |delta| < 2 AND strictness >= 7
CLEARS       otherwise
```

> ⚠️ **The rules above are wrong. Corrected version below.** Left in place because the failure mode is instructive: a bag 2 cm **over** the limit on a strictness-6 or -7 carrier matched none of the first three rules and fell through to `CLEARS`. The prose claimed it fell through to `WON'T`. The prose and the code disagreed, and the code was the dangerous one — it would have told someone their oversize bag was fine on American or Lufthansa.

### Band rules — corrected

Evaluated in order, first match wins. Exhaustive over the whole space with no fall-through gap.

```
effective = bag.measured_cm
            − (bag.soft ? [0, 0, bag.compress_cm] : [0, 0, 0])
            + (bag.expands_cm applied only if user toggles "expanded")

delta  = max(effective[i] − allowance.max_cm[i])  for i in 0..2
margin = −delta                                    // room to spare when delta ≤ 0

1. WON'T        delta > 3  OR  (delta > 0 AND strictness >= 6)
2. GAMBLE       0 < delta <= 3  AND  strictness <= 5
3. AT THE LINE  delta <= 0  AND  margin < 2  AND  strictness >= 7
4. CLEARS       otherwise
```

`GAMBLE` (`<= 5`) and `WON'T` (`>= 6`) now partition the over-limit space exhaustively. **Anything over the published limit on a carrier scoring 6 or above is `WON'T`.**

The asymmetry is deliberate: **the cost of a false green light is a €70 fee and a user who never returns; the cost of a false red is a bag purchase they might not have strictly needed.** Bias toward the second error, always.

Unit tests must cover the boundaries explicitly — `delta = 0`, `delta = 3`, `delta = 3.1`, `strictness = 5`, `strictness = 6`, `margin = 2` — and assert that no input produces no match.

### Measurement tolerance — the second band-rule bug

The rules above had no tolerance floor: any positive delta on a strictness-6+ carrier was a hard WON'T. The Travelpro Maxlite 5 International broke that.

That bag is built to the European standard, 55 × 40 × 20. Travelpro publishes in inches — 21.75 × 15.75 × 7.75 — and the conversion gives 55.245 × 40.005 × 19.685 cm. So the engine failed it on seven carriers, including **Iberia by 0.01 cm. One tenth of a millimetre.**

Nothing in this system resolves that finely. Not a soft-sided bag under compression, not a tape measure, not a gate sizer with a rubber lip, and certainly not a unit conversion. A delta inside the tolerance is not a failure — it is a measurement that cannot tell.

```
EPS_CM = 0.3          // our measurement error. Squish is an advisory, below.

gambleCeiling(strictness):     how far over is still worth showing as a risk
   1–3   5.0 cm      effectively never measured
   4–5   3.0 cm      occasional, usually only when the bins are full
   6–7   1.5 cm      frames at the gate, staff use judgement
   8–10  0           measured as routine — over is over

1. WON'T        delta > ceiling(st)  AND  delta > EPS
2. GAMBLE       delta > EPS
3. AT THE LINE  delta > 0                        // over, but inside our own error
4. AT THE LINE  delta > -2  AND  strictness >= 6 // legal, no margin, they measure
5. CLEARS       otherwise
```

Rule 4 exists so a bag that is *technically* over — even by a hair — never renders as a clean pass. The traveller is told it's at the line, which is true, instead of "it fits," which we cannot know.

**This is the second fall-through bug in these rules**, after the strictness-6/7 gap. Both were found by running real data through them rather than by reading them. Add a case to the band test whenever a new one surfaces.

⚠️ **The tolerance is a floor on our confidence, not a licence.** It must never widen to absorb a real overage, and it is not the wiggle-room axis — that stays [strictness](#strictness-evidence).

#### The first version of this was 0.5 cm, and the number was doing two jobs

Frank's read of it: *"that is a very small measurement that could probably get stuffed in one of those sizers."* Correct — and it exposed that a single constant was standing in for three unrelated things:

| | What it is | Size | Varies with |
|---|---|---|---|
| **Measurement noise** | our tape, their rounding, inch→cm conversion | ~0.3 cm | nothing — every bag equally |
| **Squish** | the bag deforming into the sizer frame | 0 to 3 cm | **construction, entirely** |
| **Sizer slop** | the frame not built to the published number | unknown | the carrier |

A flat tolerance treats a Rimowa aluminium case and a Patagonia duffel identically. They are not identical: one dents, the other folds.

**Only the first may move a band.** `EPS_CM = 0.3` — inside it we genuinely cannot tell over from under, so calling it a failure is false precision.

**Squish never moves a band.** Testing it as a tolerance moved the Maxlite 5 Compact from 9 carriers to 18 — a nine-carrier swing produced by a constant, silently, with no way for the reader to see it happened. That is *exactly* the thing ruled out in [the position on wiggle room](#the-position-on-wiggle-room): looseness must never replace the published limit. A generous squish allowance is wiggle room wearing a lab coat.

So it becomes an advisory, like strictness and weight:

```
SQUISH_CM = { aluminium 0 · hardside 0.3 · softside 1.5 · backpack 2.5 · duffel 3.0 }

over, and deformable, and within squish   → "It might still go in"
over, and rigid                           → "No give in it"
```

The band still says the bag is over. The advisory says it may compress anyway, and whose decision that is. **Two facts, stated separately** — which is what lets the traveller make the call instead of us making it for them silently.

The rigid case is the one worth having. The intuition *"it's only a few millimetres, it'll squeeze"* is reasonable for a duffel and completely wrong for a polycarbonate shell, which either goes in the frame or doesn't. Saying so is more useful than staying quiet.

#### The fuzz factor scales with enforcement, because that is what varies

The rules this replaced had two defects, both from treating strictness as a switch:

- **A flat 3 cm ceiling that ignored strictness entirely.** Southwest does not own a gate sizer and is scored 3 out of 10; Ryanair pays staff a bonus for catching oversize bags and is scored 9. A bag 3.1 cm over read as WON'T on both.
- **A binary threshold at 6.** A 1-to-10 scale produced exactly two behaviours, so strictness 3 and strictness 5 were identical, and so were 6 and 9.

`gambleCeiling()` replaces both. It is the wiggle-room axis doing real work at every level, and it is legitimate for the same reason the strictness score is: **it never touches the published limit.** The delta is always computed against the airline's real number and always shown to the traveller. What the ceiling decides is only whether an overage is presented as a risk they can weigh (GAMBLE, shown with a warning) or as a non-starter (WON'T).

This is what makes the two halves of the requirement compatible:

| | Mechanism |
|---|---|
| Don't hide a bag over a rounding error | `EPS_CM`, flat, tiny, identical on every carrier |
| Do hide a bag that honestly doesn't fit | `ceiling` shrinks to **zero** at strictness 8+ |
| US carriers are lax, Ryanair is not | the ceiling curve, 5.0 cm down to 0 |

At strictness 8 and above the ceiling is zero, so anything past our own measurement error is WON'T. On Ryanair, Wizz, Vueling, Spirit and Frontier the published number is the number. That is the correct behaviour and it falls out of the curve rather than needing a special case.

**Invariants**, all covered by the band test:

- No delta lands outside the four bands, at any strictness.
- Rounding error is never a failure, on any carrier.
- A bag honestly over is WON'T on every strict carrier.
- A bag far over is WON'T even on the laxest carrier.
- **Monotonic:** a stricter carrier is never more permissive than a laxer one at the same delta.

⚠️ The ceiling numbers are judgement, not measurement. They should be re-derived from `observed` outcomes — reports of bags actually being stopped — once we have enough of them. Until then they are the most defensible guess, and they are a single table rather than five copies of a magic number.

#### Sizer slop is the honest home for "it'll get stuffed in"

The carrier schema already has the right field and it is unpopulated:

```jsonc
"sizer": { "at_gate": true, "cabin_cm": [55, 40, 20] }   // physical frame, NOT the published number
```

The real answer to *"could it get stuffed in the sizer"* is that gate frames are not always built to the published number, and that is a **per-carrier measurable**, not a global fudge. Measure frames opportunistically during the carrier audit. Until then the field stays null and the published limit stands — which is the conservative direction to be wrong in.

`EPS_CM` is 0.3 because that is roughly where our own precision ends. Revisit after the first fifty bags are measured, not before.

### Regional operators are legs, not carriers

`check.html` carried a hand-written `UAX: United Express` entry, which contradicts this schema: American Eagle, Delta Connection, United Express and Alaska Horizon publish the **mainline** limits, so they are `operates_regional_jets: true` flags, not records.

The mockup invented a carrier because its leg picker needed something selectable. The right model is that **regional-ness is a property of the leg**, not of the airline — the same United flight number is mainline on one route and an ERJ-145 on another. A leg is `{ carrier, regional?: true }`, and the flag drives the [regional-jet advisory](#advisories--orthogonal-to-the-bands) without duplicating an allowance.

⚠️ The generated block now emits only real carriers, so `check.html`'s picker has lost its regional option until the leg shape is implemented. Deliberate: better a missing option than a fictional airline.

### Carrier lifecycle — airlines stop existing

```jsonc
"status": "operating",     // operating | ceased | merged | suspended
"ceased_at": null,
"successor": null,         // IATA of the absorbing carrier, when merged
"status_evidence": { "claim": "…", "url": "…", "tier": 2 }
```

**Spirit Airlines ceased operations on 2 May 2026** and our dataset went on describing its baggage policy as current for three months. Frank caught it; nothing in the system would have.

Over the five-to-seven year horizon in [11](11-sharing-and-permalinks.md) this is routine rather than exceptional. Airlines fail, merge and rebrand, and the failure modes are all bad: a defunct carrier in a comparison, a bag recommended as clearing an airline that does not exist, a `/luggage-for/spirit` page ranking in Google and answering a question nobody can act on.

**This is a step change, not staleness.** The 90/180-day freshness checks in [04](04-data-sources.md) would have flagged Spirit in October — five months after the last flight. Freshness measures whether a number has been re-read; it cannot notice that the subject has gone.

Engine behaviour, all tested:

- **No verdict at all.** `band: null`, not `clears` and not `wont` — both would be wrong. The honest answer is that the question no longer applies.
- **Excluded from the coverage denominator**, never counted as a failure. "Clears 19 of 24" must not quietly become "19 of 25" because a dead carrier is still in the file.
- **Excluded from a multi-leg envelope**, so it cannot constrain a living itinerary.
- **Absence of a status means operating.** Unlike a missing cabin row — where absence *is* the signal — a record with no status is one nobody has thought about, and almost every carrier is flying.

`validate-carriers.mjs` requires a date for `ceased`, a successor for `merged`, and a **source for any non-operating status**, because that flag removes a carrier from every result on the site.

**Records are deleted, not flagged.** Spirit's was removed outright.

A `status: ceased` field keeps a defunct airline in the file, in anything that iterates carriers, and in every future code path that forgets to check `flying`. It makes correctness depend on every caller remembering. Deleting removes the class of bug instead of guarding against it, and nobody should be shown an airline that no longer exists.

The lifecycle fields stay in the schema regardless, because `merged` is a different case — when a carrier is absorbed, the successor matters and a redirect is the right answer, so that record has somewhere to point.

What survives a deletion:

- `data/carriers/_index.json` logs the removal, with the date and the reason. A bare deletion invites someone to re-add the carrier from an old list.
- The research dossier stays in `resources/carriers/`. **The reason for a deletion is worth more than the deleted row.**
- Evidence that outlived the carrier moves somewhere it still applies. The Senate PSI finding on per-catch commissions covered Frontier *and* Spirit, and it is now in `resources/carriers/_ULCC-enforcement.md` — it did not stop being true about how ULCCs behave.

### Advisories — orthogonal to the bands

Some facts change what happens to a bag without changing whether it's within the limit. They ride alongside the verdict rather than altering it — the same separation as [the wiggle-room decision](#the-position-on-wiggle-room).

```jsonc
"advisories": [
  {
    "type": "regional_jet",
    "applies_when": { "operated_by_regional": true },
    "text": "Often flown on a CRJ-200 or ERJ-145. Overhead bins on these aircraft won't take a 22-inch roller — expect it to be valet-checked at the jetbridge.",
    "severity": "high",
    "changes_band": false
  }
]
```

**The regional-jet advisory is the important one for a US audience**, and no competitor has it.

American Eagle, Delta Connection and United Express publish the *mainline* carrier's limits — so a bag can be fully compliant and still be taken at the jetbridge, because the bin on a CRJ-200 or ERJ-145 physically won't hold it. This is not a policy failure and it should never be scored as one. It's an operational fact, and the traveler needs it.

```
▓ CLEARS — 2 cm to spare on United's limit

⚠ But this route is usually flown by United Express on an
  ERJ-145. Bins on that aircraft won't take a bag this size.
  Expect a free gate-check at the jetbridge — you won't have
  it with you onboard.
```

Aircraft where a 22-inch roller generally does **not** fit: ERJ-135/145, CRJ-200, Dash 8 / Q400. Generally does fit: E175, CRJ-900, all mainline narrowbodies.

Modeling this at aircraft level per route is out of scope for v1 ([01-mvp.md](01-mvp.md)). **The v1 approximation is to flag the airport, not the route** — which needs no aircraft or schedule data and is stable for years:

```jsonc
// airports.json
"ITH": {
  "city": "Ithaca", "country": "US", "region": "NA",
  "regional_only": true,              // no mainline service at all
  "typical_aircraft": ["ERJ-145", "CRJ-200"],
  "bin_takes_22in": false
}
```

Airports like Ithaca, Elmira, Binghamton and Watertown have **no mainline service** — every departure is a regional jet. So an origin flag fires the advisory accurately without knowing anything about the specific flight. Pair it with `operates_regional_jets` on the mainline brands and the common case is covered.

Two sub-cases worth encoding:

- **Essential Air Service airports** — Ogdensburg, Massena, Saranac Lake, Plattsburgh. Cape Air flies nine-seat Cessna 402s with weight-and-balance limits, where "carry-on" means a personal item. Not a stricter version of the normal problem; a different one. Flag as `eas: true` and show the carrier's own limits, never the mainline's.
- **Gate-check tagging** — ⚠️ **needs research.** A valet-checked bag is usually returned at the jetbridge on the next leg, which is merely inconvenient. If it's tagged through to the final destination, the traveler's carry-on has become checked luggage for an international trip — with real consequences for medication, laptops and valuables. Practice varies by carrier and by whether the connection is international. **Resolve before writing advisory copy**; the two outcomes warrant very different warnings.

#### Weight headroom — the second gate, and we were failing it silently

The original rule only warned when the **empty bag exceeded the cabin limit**. That essentially never happens, so the warning essentially never fired. Meanwhile the case that actually bites went unreported.

Travel + Leisure's international list names the Away Aluminum Edition as its best aluminum pick at **10.5 lb / 4.8 kg empty**. On Emirates, Qatar, Singapore or Cathay — 7 kg in the cabin — that bag is **68% of your entire allowance before a single shirt goes in**, leaving 2.2 kg. Our engine said nothing. It compared 4.8 against 7, found it lower, and moved on.

```
weightNote(bag, allowance):
  no cap, or no measured weight  → silent
  empty >= cap                   → "over"    — over before you pack anything
  empty / cap >= 0.4             → "tight"   — state what's left to pack
  otherwise                      → silent
```

The threshold is deliberately about **what remains**, not what the bag weighs. 4 kg is unremarkable on Air France's 12 kg and close to disqualifying on Emirates' 7. Only the ratio carries that.

Like every advisory here, it **never changes the band**. Dimensions decide whether the bag goes through the frame; weight is a separate gate, enforced by a different person at a different point in the airport. Collapsing them would misreport both.

Also worth noting: the copy states the arithmetic and stops. It doesn't tell the traveler 2.2 kg is too little — we haven't measured what people pack, so we don't know.

#### Per-catch commission — a third outcome the bands cannot hold

The engine models two: the bag fits, or it is over and may be caught. Frontier and Spirit pay gate agents **per oversize bag charged** — $10 and $5 on domestic flights — and a congressional report found the two paid roughly **$26M in such commissions across 2022–23**, Frontier about $18.8M of it, noting the incentives *"may inappropriately encourage abuse of discretion."*

That is a third outcome: **a compliant bag charged anyway.** Strictness cannot express it. Strictness scales the GAMBLE ceiling, and the ceiling only applies when `delta > 0` — a bag that clears never reaches it. So on Frontier our engine says "It fits", which is true and incomplete.

Hence `agentCommission`: the only advisory that fires on a **CLEARS** verdict.

#### How this citation was got wrong, and what changed

The first version of this cited a syndicated news aggregator, quoted *"may inappropriately encourage abuse of discretion"* as the report's words, and set `unverified: false` — **all from a search-result summary, without opening anything.** That is precisely the failure the provenance model exists to catch, committed by its author.

Reading the [subcommittee's own release](https://www.blumenthal.senate.gov/newsroom/press/release/senate-permanent-subcommittee-on-investigations-releases-majority-staff-report-slamming-sky-high-airline-junk-fees) corrected three things:

| Claimed | Verified |
|---|---|
| aggregator URL | [PSI Majority staff report](https://www.hsgac.senate.gov/subcommittees/investigations/library/files/majority-staff-report-the-skys-the-limit-the-rise-of-junk-fees-in-american-travel/), *"The Sky's the Limit"*, 26 Nov 2024 — **tier 1** |
| *"may inappropriately encourage abuse of discretion"* | **not in the source read.** Removed. |
| "$10 per bag, domestic" | *"as much as $10 for each bag a passenger is forced to check at the gate"* |
| Spirit $5 per bag | **unverified** — only the joint $26M figure is in the primary source |

The verified wording is also stronger than what I paraphrased: passengers were *"often forcing... to pay a bag fee **or miss their flight**."*

**New rule, enforced in `validate-carriers.mjs`:** `unverified: false` is itself a claim — it asserts a human opened the source. It now requires a `verified_against` field saying what was actually read. Frontier's says *"subcommittee press release read in full; the 55-page report itself has NOT been read."* "I saw a summary" and "I read the source" are different facts and the schema must distinguish them.

Per [16](16-editorial-policy.md) the engine returns the figure and the citation, never a characterisation. The report's words are quoted as the report's. There is a test asserting the advisory carries no judgemental language, because this is the single most tempting place in the codebase to editorialise.

It also corrects a regional generalisation: `REGION_SHIFT.NA = 0` describes US **legacy** carriers relaxing — American removed its gate sizers in Oct 2025 — not the US being lenient. US ULCCs run the most aggressively incentivised enforcement documented anywhere.

Other advisories worth carrying: carry-on weighed at check-in (common in Asia, unheard of in the US), TSA CT-scanner aperture limits, and seasonal bin pressure on full flights.

### Verdict copy

Generated, never hand-written per carrier, so it stays consistent as data changes:

```
WON'T        "{carrier}, {delta}cm too {dimension}. {fee} at the gate."
GAMBLE       "Over the limit. {carrier} rarely measures — we can't promise it."
AT THE LINE  "Legal, but {carrier} uses a gauge. Pack it thin."
CLEARS       "Fits, with {margin}cm to spare."
```

**The tool never says "you'll be fine."** It states the rule, the observed behavior, and the cost of being wrong. That framing is simultaneously the honest one, the legally safe one, and the more useful one.

---

## The position on wiggle room

The single most important architectural decision in the engine, stated plainly:

> **We never adjust the airline's published limit. Tolerance is a separate axis — the probability of enforcement — reported alongside the comparison, never folded into it.**

Three distinct numbers, kept distinct, never merged:

| Number | Source | Ever modified? |
|---|---|---|
| **Published limit** | The carrier's own baggage page | **Never.** Reproduced exactly, with source URL and date. |
| **Gauge dimension** | The physical sizer frame | Never. Stored separately where it differs — Ryanair's small-bag frame is 42 × 20 × 30 against a published 40 × 20 × 25. |
| **Strictness** | Enforcement evidence — bonus programs, sizer policy, fee severity | Scored 1–10 with published basis |

### Why not just apply a tolerance to the dimensions?

It's the obvious implementation and it's wrong three times over:

1. **It publishes a number the airline didn't say.** The moment we display 57 cm as Ryanair's limit because "they're loose on depth," we own that number and we're wrong on our own terms. The published figure has to stay verifiable against the source link sitting next to it.
2. **Enforcement isn't dimensional.** A carrier isn't lenient *about depth* — it's lenient, or it isn't, about the whole bag. Encoding that as centimetres models it as the wrong kind of thing.
3. **It destroys the explanation.** "Over the limit, but this carrier rarely measures" is useful and honest. A silently widened limit that returns a green tick teaches the user nothing and can't be argued with.

### The two adjustments that *are* dimensional

Both modify the **bag**, never the allowance, and both are physical properties rather than tolerance:

- `compress_cm` — a soft-sided bag genuinely occupies less depth when packed thin. Applies only when `soft: true`.
- `expands_cm` — an expansion zip genuinely makes the bag bigger. Applied only when the user opts in, and flagged as a trap when they do.

### What this means at the interface

The published limit and the enforcement judgment are always shown as two separate facts:

> **Wizz Air — 40 × 30 × 20 cm** · source · verified 28 Aug 2026
> Strictness **9/10** — gate gauges enforced, spotting bonuses paid to agents
> Your bag: **45 × 30 × 20** · ▓ **WON'T** — 5 cm too long. €70 at the gate.

The user can check our arithmetic against the airline's own page, and can separately judge whether they trust our read on enforcement. **Both claims stay falsifiable.** That's the whole reason to keep them apart.

---

## Strictness evidence

Every strictness score is built from cited evidence. **A `basis` string with no source is not acceptable** — that's an assertion, and assertions about a company's conduct are the one thing on this site that could reasonably be challenged.

```jsonc
"evidence": [
  {
    "claim": "Pays gate agents a per-bag bonus for identifying oversize luggage",
    "type": "incentive",        // policy | incentive | infrastructure | reporting | measurement | reader
    "direction": "stricter",    // stricter | looser
    "weight": "high",           // high | medium | low
    "source_url": "https://…",
    "source_title": "Ryanair raises baggage spotting bonus to €2.50",
    "publisher": "Reuters",
    "published_at": "2025-11-03",
    "accessed_at": "2026-08-28",
    "quote": "raised the per-bag bonus from €1.50 to €2.50 and removed the monthly cap"
  }
]
```

`quote` is capped at 25 words and exists so a reader can verify we characterized the source correctly without leaving the page.

### Evidence hierarchy

Strongest to weakest:

| Tier | Type | Example |
|---|---|---|
| 1 | **Carrier's own statement or policy** | American announcing gate sizer removal, Oct 2025 |
| 2 | **Documented incentive programs** | Financial disclosures, union statements, court filings |
| 3 | **Reputable journalism** | Reuters, AP, established trade press |
| 4 | **Our own measurement** | We measured the gauge frame at the gate |
| 5 | **Aggregated reader reports** | Volume required — never a single anecdote |

### The asymmetric bar

> **To score a carrier as *looser* than published requires at least one tier 1–3 source. Reader reports alone can never move a carrier into `GAMBLE` territory.**

This is the safety rule, and it follows directly from the false-green/false-red asymmetry. A "stricter" claim makes us conservative and costs a user a bag purchase. A "looser" claim invites them to risk a fee. The claim that can hurt someone carries the higher burden.

### Language discipline

State **observed facts**, never characterizations of intent or compliance:

| ✅ Publishable | ❌ Never |
|---|---|
| "Removed gate sizers in Oct 2025; agents instructed to err toward the customer." | "Doesn't enforce its own limits." |
| "Pays a per-bag bonus for spotting oversize luggage." | "Incentivizes agents to target passengers." |
| "Gauge measures 42 × 20 × 30 against a published 40 × 20 × 25." | "Lies about its baggage sizes." |

The left column is defensible because each statement is a sourced fact. The right column is a characterization of conduct, and it's the only category of content here with real legal exposure. Never publish it — and note that the facts alone make the point more convincingly anyway.

### When sources disagree

Set `contested: true` and show both. A carrier where reputable sources conflict is genuinely more uncertain, and **saying so is more useful than silently averaging** — it tells the traveler the situation is unpredictable, which is itself actionable.

### Where evidence surfaces

- **Airline page** — full cited list, always visible, never collapsed
- **`GAMBLE` verdict** — the *looser* evidence inline, at the decision point. This is the moment someone is choosing whether to risk a fee, and it's the moment they deserve to see our reasoning and judge it themselves.
- **`/methodology`** — how scores are constructed, with the hierarchy above published in full

A score is a number someone can dismiss. A score with four dated citations is an argument.

---

## Source linking

**Every published allowance links back to the airline's own page, so the user can check us.** Not the homepage — the specific baggage page, and the fare-specific one where it exists.

The purpose is verification, not attribution. A traveler about to risk a €70 fee on our say-so should be one click from the carrier's own words, and they should not have to hunt for that click. **We are not the authority here — the airline is.** Our value is measurement, synthesis and enforcement judgment; on the published limit itself we are a messenger, and the interface should say so by making the primary source trivially reachable.

This also inverts the usual failure of the category. Every competitor asks you to trust their table. Being the one that says *"here's our number, here's theirs, go look"* is a stronger position than being the one that sounds most confident.

```jsonc
"source": {
  "url": "https://www.ryanair.com/gb/en/useful-info/help-centre/…/cabin-bags",
  "archive_url": "https://web.archive.org/web/20260828143000/https://…",
  "title": "Cabin Bags — Ryanair Help Centre",
  "locale": "gb-en",
  "verified_at": "2026-08-28",
  "verified_by": "frank",
  "last_reachable": "2026-08-30"
}
```

### Archive the page at verification time

The gap a live link alone leaves: **if the carrier edits the page, our link now shows a policy we never verified.** The citation silently starts contradicting the number next to it — and it's the one place on the site where being caught out costs the most.

So at every verification, submit the URL to the Wayback Machine and store the timestamped snapshot alongside the live one. This is cheap (one API call), and it buys three things:

1. **The citation stays honest.** "As published on 28 Aug 2026" links to the page *as it read that day*.
2. **Change detection for free.** A live page that no longer matches its snapshot is a carrier that changed policy — the exact event we most need to catch.
3. **It powers the changed-verdict message** in [11-sharing-and-permalinks.md](11-sharing-and-permalinks.md). "Ryanair changed this on 4 Nov 2026" is only credible with both versions on file.

Display the live link primarily; offer the snapshot as a secondary "as published" link.

### Link integrity

Airline sites restructure constantly, and **a dead source link is worse than no link** — it destroys precisely the trust it was placed there to build.

- CI checks every `source_url` resolves 200; a failure blocks the merge
- A weekly job re-checks all of them and files an issue per break
- When a live URL dies, the UI falls back to the archive link automatically and flags the carrier for re-verification
- `last_reachable` records the most recent successful check

### Two implementation notes

- **Do not `nofollow` these links.** Outbound citations to authoritative primary sources are an editorial signal and a positive one. Only affiliate links carry `rel="sponsored nofollow"`. Getting this backwards is an easy and costly mistake.
- **Store a canonical locale.** Airline baggage pages vary by region and language — `ryanair.com/gb/en` differs from `/ie/en`. Pin one, record which, and note where regional policies genuinely diverge rather than papering over it.

### Where the link appears

| Surface | Treatment |
|---|---|
| Every allowance figure | Inline source line — `SOURCE ryanair.com · VERIFIED 28 Aug 2026` |
| Verdict block | Link on the carrier name that produced the binding constraint |
| Airline page | Full source list, all fare classes, always visible |
| Results footer | Every carrier used in the calculation |
| `/methodology` | How sourcing and verification work |

**Never behind a disclosure.** The source link is not a footnote — it's the reason to believe the number, and it belongs beside it.

---

## Derived indexes

Built at compile time, not runtime — they're what make the static pages instant.

```jsonc
// coverage.json — per bag
{ "monos-carry-on-pro": { "clears": 28, "total": 40, "fails": ["FR:basic", "W6:basic"] } }

// envelopes.json — per region × coverage threshold
{ "EU:100": [40,30,20], "EU:95": [55,40,20], "worldwide:100": [40,30,15] }
```

---

## Validation

Runs in CI; a failure blocks the merge.

- Every allowance has `source_url` and `verified_at`
- No `verified_at` older than 180 days (warn at 90)
- Every `strictness.evidence` entry has a resolving `source_url`, `publisher` and `published_at`
- Every carrier has ≥ 2 evidence entries
- **Any carrier scoring ≤ 5 has ≥ 1 evidence entry with `direction: "looser"` at tier 1–3** — enforces the asymmetric bar in CI, so a lax score can never ship on anecdote
- No `quote` exceeds 25 words
- `measured_cm` sorted descending
- No bag has `provenance: "measured"` without `measurement_photo`
- Every offer URL resolves 200
- No Amazon price field is populated anywhere — see [06-monetization.md](06-monetization.md)
