# Carrier intake brief

**Paste everything between the rules below into ChatGPT, one airline at a time.**

One airline per conversation. Twenty-two at once produces twenty-two records of
even quality, which sounds good and means the careful ones and the guessed ones
are indistinguishable.

Then: save the JSON to `data/carriers/[IATA].json` and run `npm run validate:carriers`.
It rejects a record that claims to be researched without saying where from, so a
plausible-looking invention fails on the way in rather than on the site.

---

## The 22

These produce verdicts on the live site today from records nobody has read.
Roughly worst-first — a ULCC's limit is smaller, enforced harder, and wrong more
expensively than a full-service carrier's.

| | IATA | Airline | Why it matters |
|---|---|---|---|
| 1 | `FR` | Ryanair | ULCC. Basic fare is under-seat only; the single most consequential record here |
| 2 | `W6` | Wizz Air | ULCC, same shape |
| 3 | `U2` | easyJet | LCC, and the large-bag add-on changes the answer |
| 4 | `F9` | Frontier | ULCC. Also the gate-agent commission carrier |
| 5 | `VY` | Vueling | LCC |
| 6 | `TR` | Scoot | LCC, 7 kg cabin cap territory |
| 7 | `LH` | Lufthansa | Basic fare permits no wheeled cabin bag from May 2026 — verify, don't assume |
| 8 | `WN` | Southwest | Hybrid, unusual policy |
| 9 | `AA` | American | Basic Economy DOES include a carry-on — the opposite of United |
| 10 | `DL` | Delta | Same |
| 11 | `BA` | British Airways | Generous, and the hand-baggage-only fare is its own case |
| 12 | `AF` | Air France | |
| 13 | `KL` | KLM | |
| 14 | `IB` | Iberia | |
| 15 | `B6` | JetBlue | Blue Basic historically excluded the carry-on — check whether it still does |
| 16 | `EK` | Emirates | |
| 17 | `QR` | Qatar | |
| 18 | `TK` | Turkish | |
| 19 | `SQ` | Singapore | 7 kg cabin cap |
| 20 | `CX` | Cathay Pacific | 7 kg cabin cap |
| 21 | `NH` | ANA | |
| 22 | `JL` | Japan Airlines | |

---

## The prompt

> I need the current cabin and checked baggage allowances for **[AIRLINE]**,
> taken **only from the airline's own website**. Not a comparison site, not a
> travel blog, not an aggregator, and not your own recollection.
>
> **Ground rules, in order of importance:**
>
> 1. **If you cannot open the airline's page, say so and stop.** An answer you
>    are unsure of is worse to me than no answer, because I cannot tell the two
>    apart once it is in a file. "I could not access this" is a completely
>    acceptable result.
> 2. **Every number carries the URL you read it on**, and the date you read it.
>    If different fares are documented on different pages, each row cites its
>    own page.
> 3. **Never fill a gap with a plausible value.** If the page does not publish a
>    weight limit, the field is `null`. If it does not publish a personal-item
>    size, omit the row. A typical figure for that airline's peer group is a
>    guess wearing a uniform.
> 4. **Distinguish "no cabin bag" from "we don't know".** If the cheapest fare
>    genuinely permits no overhead bag at any size, that is a finding: set
>    `"cabin_absence": "not_permitted"` and quote the sentence that says so. If
>    you simply could not find it, that is a gap: `"not_researched"`. These are
>    different facts and conflating them is the single most expensive error you
>    can make here.
> 5. **Dimensions must be the OUTSIDE of the bag** — wheels and handles
>    included, which is what airlines measure. If the page gives inches and
>    centimetres and they disagree, record both; do not reconcile them.
> 6. **Quote, don't paraphrase, for anything unusual.** If a fare rule is
>    surprising, put the airline's own sentence in `note`.
>
> Return **only** a JSON object in exactly this shape, no commentary:
>
> ```json
> {
>   "iata": "XX",
>   "name": "Airline Name",
>   "region": "EU",
>   "type": "full_service",
>   "source_url": "https://airline.com/baggage",
>   "verified_at": "2026-08-31",
>   "research_status": "official_allowances_researched",
>   "publication_ready": false,
>   "operates_regional_jets": null,
>   "sizer": { "at_gate": null, "cabin_cm": null, "personal_cm": null },
>   "strictness": {
>     "score": 7,
>     "score_basis": "type_region_prior_only",
>     "contested": false,
>     "evidence": [],
>     "components": {},
>     "note": "Existing type/region prior, not a researched enforcement rating."
>   },
>   "allowances": [
>     {
>       "fare_class": "basic",
>       "fare_name": "Their name for this fare",
>       "type": "cabin",
>       "max_cm": [55, 40, 23],
>       "max_in": null,
>       "max_kg": 8,
>       "includes_wheels": true,
>       "count": 1,
>       "source_url": "https://airline.com/the-exact-page",
>       "verified_at": "2026-08-31",
>       "note": "Anything surprising, in the airline's own words."
>     },
>     {
>       "fare_class": "basic",
>       "type": "personal",
>       "max_cm": [40, 30, 20],
>       "count": 1,
>       "source_url": "https://airline.com/the-exact-page",
>       "verified_at": "2026-08-31"
>     },
>     {
>       "fare_class": "basic",
>       "type": "checked",
>       "linear_max_cm": 158,
>       "max_kg": 23,
>       "free_pieces": 0,
>       "system": "piece",
>       "source_url": "https://airline.com/the-exact-page",
>       "verified_at": "2026-08-31"
>     }
>   ]
> }
> ```
>
> **Field rules:**
>
> - `region`: one of `EU` `NA` `AS` `ME`
> - `type`: one of `full_service` `lcc` `ulcc` `hybrid`
> - `fare_class`: `basic` for the cheapest fare, `economy` for standard economy,
>   then `premium_economy` / `business` / `first`. Use `addon` instead for a
>   paid extra such as Ryanair Priority — an add-on must never be recorded as
>   something a fare includes by default.
> - `type` on a row: `cabin` (overhead), `personal` (under-seat), `checked`
> - `system`: `piece` (a number of bags, each capped) or `weight` (one total)
> - **Leave `strictness` exactly as written above.** How strictly an airline
>   enforces is scored separately from evidence, and a number invented here
>   would silently override that.
> - If a fare permits no overhead bag, use a cabin row of
>   `{"fare_class": "...", "type": "cabin", "cabin_absence": "not_permitted", "note": "<their sentence>"}`
>   with no `max_cm`. **Never a row of zeroes.**
>
> Finally, after the JSON, list separately: anything on the page you found
> ambiguous, and anything you could not find at all.

---

## After it comes back

1. Save to `data/carriers/[IATA].json`. The filename must match `iata`.
2. Delete `"placeholder": true` **only if** the record cites a real source you
   have clicked. That flag coming off is the assertion that a human read it.
3. `npm run validate:carriers`
4. `npm run check`

The validator will reject a record that claims to be researched without a
`source_url` and a `verified_at`, one whose cm and inch figures disagree by more
than 2 cm (a transcription error, not rounding), an add-on row no booking can
reach, a zero-size allowance, and an unknown region or fare class.

**What it cannot check is whether the numbers are true.** Open the cited URL for
each of the first few and confirm the figures by eye. If the URL does not
contain the number, that record is fabricated and the rest of that batch needs
the same treatment — one invention means the source rule was not being followed,
not that one number slipped.

## What this does not cover

`strictness` stays a type/region prior until someone researches enforcement, and
`publication_ready` stays `false` until that review happens. Filling these 22 in
makes the allowances real and the citations clickable; it does not make the
enforcement scores researched. Those are separate claims and the site says so.
