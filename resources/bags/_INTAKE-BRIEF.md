# Bag intake brief

**Paste everything between the rules below into ChatGPT, one bag at a time.**

One bag per conversation. Twenty at once produces twenty records of even
quality, which sounds efficient and means the carefully-read ones and the
half-remembered ones come back indistinguishable from each other. That is the
single worst outcome available here, because a wrong dimension does not look
wrong — it looks like a number.

Then: add the record to `data/manufacturer-bags.json` and run
`npm run build:bags && npm test`. The merge path is already built and tested
(`src/lib/__tests__/bag-merge.test.mjs`) — it upgrades an existing
review-sourced record in place, keeps its reviews, and records whether the two
sources agreed.

---

## Which bags, in what order

**Do not hand-copy a list into this file.** Run:

```
node scripts/bag-intake-worklist.mjs
```

It prints the current worklist from the dataset, in priority order, with the
slug you need for each record. The carrier brief's hand-typed table drifted
within a week of being written; this one cannot.

The three tiers it prints, and why they are in that order:

| Tier | State | What it costs us |
|---|---|---|
| **P1** | No dimensions at all | The bag is **invisible**. No card, no detail page, cannot be the answer to any question. |
| **P2** | Review-sourced dimensions | Shown but **never recommendable** — `isPromotable()` refuses it, so it can never be offered as the alternative to a bag that failed. |
| **P3** | Manufacturer dimensions already | Price only. |

★ marks high-search-demand brands. **P1 ★ is the whole ballgame.** Away,
Rimowa, Monos, July, Béis and Peak Design are in P1 today, which means the site
currently answers nothing about the bags people most often search for.

---

## Why the source rule is absolute

Every number on this site is answerable to "where did you get that?", and two
of the rules below are not editorial preferences.

**Never Amazon, or any marketplace listing.** Two independent reasons:

1. The same bag appears under several sellers with different numbers, and there
   is no way to tell which seller typed it in correctly.
2. **Amazon's Associates operating agreement, §2(e)** bars "aggregating,
   analyzing, extracting, or repurposing any Product Advertising Content"
   without written approval. Sorting our catalogue into price bands is
   aggregation and analysis. Hiding the number does not cure it — the
   restriction is on the analysis, not the display. A manufacturer's own listed
   price is not Amazon content and their agreement does not reach it.

**Overall dimensions, not packing dimensions.** An airline's sizer measures the
outside of the bag: wheels, feet, handles, bumpers and all. Manufacturers
usually publish the *packing* size, because it is the flattering one. Where a
page prints both, we want both — the gap between them is often exactly where a
traveller gets stopped.

---

## The prompt

> I need the manufacturer's own published specifications for the
> **[BRAND] [MODEL]** suitcase, taken **only from the manufacturer's own
> website**. Not Amazon, not a marketplace, not a reseller, not a review site,
> not a comparison site, and not your own recollection.
>
> **Ground rules, in order of importance:**
>
> 1. **If you cannot open the manufacturer's own product page, say so and
>    stop.** An answer you are unsure of is worse to me than no answer, because
>    once it is in a file I cannot tell the two apart. "I could not access this
>    page" is a completely acceptable result and I would rather have it.
>
> 2. **Never use Amazon or any marketplace listing**, even if it looks
>    authoritative or is sold by the brand itself. If the manufacturer's own
>    site is the only place a number appears, that is the number I want; if it
>    appears nowhere on the manufacturer's site, report it as missing.
>
> 3. **Do not convert, round, average, or reconcile anything.** Give me the
>    figures exactly as printed, in the units printed. If the page prints both
>    inches and centimetres and they disagree once converted, report **both**
>    and say they disagree — do not pick one. That disagreement is a finding I
>    want to publish, not a problem to tidy away.
>
> 4. **Distinguish overall size from packing size.** Airlines measure the
>    outside of the bag — wheels, feet, telescoping handle, bumpers included.
>    Many product pages publish only the interior or "packing" dimensions
>    without labelling them as such. For each triple you give me, say explicitly
>    which one it is and quote the page's own wording for it. If the page does
>    not say, tell me it does not say. **Never guess which one it is.**
>
> 5. **Quote, do not paraphrase.** For every figure, give me the sentence or
>    label it came from, verbatim.
>
> **What I need, where the page publishes it:**
>
> - **Overall / exterior dimensions** including wheels and handles — H × W × D,
>   in the units printed, plus the page's exact wording
> - **Packing / interior dimensions**, same treatment
> - **Weight** (empty), units as printed
> - **Capacity** in litres
> - **Expansion**, if the bag expands — how much, in the units printed
> - **Current list price** in USD on the manufacturer's own site, plus the date
>   you saw it. If it is on sale, give me **both** the sale price and the
>   regular/list price, and say which is which.
> - **The exact product URL**, and the variant/SKU if the page has several
>   sizes — I need to know I am looking at the same size you were
>
> **If the bag comes in several sizes**, tell me which sizes exist and confirm
> which one these figures belong to. If you are unsure which size I mean, ask
> me before answering rather than picking one.
>
> Finally: list anything you could **not** find, explicitly. A short answer with
> gaps marked is worth far more to me than a complete-looking one.

---

## Turning the answer into a record

Add to `data/manufacturer-bags.json` under `bags`. The shape, with every
provenance field required:

```json
{
  "slug": "away-carryon",
  "brand": "Away",
  "model": "The Carry-On",
  "line": "away-carryon",
  "variant": "Carry-On",
  "type": "hardside spinner",
  "soft": 0,
  "wheels": 4,
  "role": "overhead",

  "manufacturer_source": {
    "url": "https://www.awaytravel.com/suitcases/carry-on",
    "retrieved": "2026-08-31",
    "title": "Away — The Carry-On",
    "local": "resources/bags/2026-08-31-away-carryon.md"
  },

  "external_in": {
    "v": [22.7, 15.4, 9.6],
    "src": "manufacturer",
    "ref": "https://www.awaytravel.com/suitcases/carry-on",
    "at": "2026-08-31",
    "unit": "in",
    "quote": "Exterior measurements",
    "note": "Includes handles and wheels. Manufacturer specification, not measured by us."
  },
  "claimed_packing_in": {
    "v": [20.9, 15.0, 7.9],
    "src": "manufacturer",
    "ref": "https://www.awaytravel.com/suitcases/carry-on",
    "at": "2026-08-31",
    "unit": "in",
    "quote": "Interior measurements"
  },

  "weight_lb": { "v": 7.9, "src": "manufacturer", "ref": "…", "at": "2026-08-31", "unit": "lbs" },
  "capacity_l": { "v": 39.8, "src": "manufacturer", "ref": "…", "at": "2026-08-31", "unit": "L" },

  "price_usd": {
    "v": 295,
    "src": "manufacturer",
    "ref": "https://www.awaytravel.com/suitcases/carry-on",
    "at": "2026-08-31",
    "list": true
  },

  "notes": "Page prints inches only; cm are converted at 2.54 and marked as such."
}
```

### Units: record what the page prints, never convert

**Field names carry the unit.** If Away prints inches, the field is
`external_in` and the value is inches. If Samsonite prints centimetres, it is
`external_cm`. Same for `weight_lb` versus `weight_kg`, and
`claimed_packing_in` versus `claimed_packing_cm`.

`data/build-bags.mjs` converts imperial to metric on the way in, records what
it converted from, and keeps the original field untouched. So a centimetre
figure on the site can always be walked back to the sentence on the page.

This is the one instruction the brief previously got wrong: it told the
researcher not to convert, then showed a target shape in centimetres. The Away
intake resolved the contradiction correctly — kept inches, flagged
`intake_status` — and the build silently ignored the field, so a fully
researched bag landed with a price and no dimensions and stayed invisible.
**If a page prints both units, record both**; the printed metric figure wins
over any conversion.

### The fields that are easy to get wrong

**The `note` on the exterior field must say what the figure includes.** This is
what makes the number auditable a year from now. If the page did not say
whether wheels and handles are counted, the note must say *that* — and the
figure belongs under `claimed_*` rather than `external_*`, because an
unlabelled dimension is probably the packing body and must never be promoted.

Whichever unit the page prints: `claimed_in` / `external_in` for an imperial
source, `claimed_cm` / `external_cm` for a metric one. The distinction being
drawn is *labelled exterior* versus *unlabelled*, and it applies identically in
both units.

**`price_usd.list` distinguishes list price from sale price.** Set `true` for
the regular price, `false` for a sale price. We band bags as Budget / Midrange
/ Luxury and **never display the number**, so a sale price would move a bag
into a band it does not belong in and nobody would be able to see why.

**Dates are the date you read the page**, not the date of any event on it.

**A conflict is data.** If the page prints two different triples, record both
under `conflicts` rather than choosing silently — see the Travelpro record in
`data/manufacturer-bags.json` for the shape. Choosing quietly is how a dataset
stops being auditable.

---

## What this unblocks

- **P1 bags become visible at all** — 21 bags currently have no card and no
  detail page, including most of the brands with the highest search demand.
- **P2 bags become recommendable** — `isPromotable()` gates what we may put
  forward as an answer, so a review-sourced bag can never be offered as the
  alternative to one that failed.
- **Price bands** — Budget / Midrange / Luxury on `/bags`, banded by tercile
  over the priced-and-reviewed catalogue (`src/lib/price-band.mjs`). The pills
  stay hidden until enough bags carry a price, so this arrives on its own.
