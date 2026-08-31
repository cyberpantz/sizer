# Carrier intake brief

**Paste everything between the rules below into ChatGPT, one airline at a time.**

One airline per conversation. Twenty-two at once produces twenty-two records of
even quality, which sounds good and means the careful ones and the guessed ones
are indistinguishable.

Then: save the JSON to `data/carriers/[IATA].json` and run `npm run validate:carriers`.
It rejects a record that claims to be researched without saying where from, so a
plausible-looking invention fails on the way in rather than on the site.

---

## What changed in this revision, and why

This brief was rewritten on 2026-08-31 after auditing what the 58 existing
records actually contain against what the brief asked for. **The vocabulary in
use was roughly twice the vocabulary described.** Fields the engine reads and
the brief never mentioned: `linear_max_cm` on a cabin row, `allowance_group`,
`group_max_kg`, `group_max_count`, `applies_to`, `addon`, and the whole carrier
lifecycle block. Every one of those got into the data because a researcher
noticed something the brief had not anticipated and improvised a field for it.

That is the good outcome, and it is not repeatable. Three concrete failures came
out of the audit:

1. **The old rule 3 said: "If it does not publish a personal-item size, omit the
   row."** That instruction destroys the single most valuable distinction in
   this dataset. Delta, Southwest, Qatar, Aegean, Air Serbia and three Chinese
   majors publish **no** personal-item dimensions — that is a *finding* about
   the airline, and it is a better answer than any number we could print. An
   omitted row is indistinguishable from a row nobody looked for. The
   researchers ignored the instruction and kept the row with an explanatory
   note, which is why the finding survives at all. Rule 3 is now the opposite.

2. **Singapore's cabin allowance has no box.** Their published rule is "the sum
   of the three dimensions must not exceed 115 cm" and nothing else. The brief
   showed `linear_max_cm` only on checked rows, so the figure sat parked outside
   the schema until the engine was taught to read it.

3. **Aegean's Light fare grants a cabin bag *or* a personal item, never both.**
   That is the whole shape of the fare, and it reached the data only as a
   sentence inside a `note`. `allowance_group` + `group_max_count` express it as
   a fact the engine can act on, and the brief never asked for either.

The pattern in all three: **the airline published something true that the brief
had no slot for.** So the last section of the prompt now asks explicitly for
anything that would not fit — that report is more valuable than the JSON.

---

## Which airlines, in what order

**The first 58 are done** — all cite a source and a date.

The next batch and its reasoning live in [docs/22-launch-coverage.md](../../docs/22-launch-coverage.md).
Short version, highest value first:

| Tier | Airlines | Why |
|---|---|---|
| 1 | `TG` `FD` `AK` `GA` `JT` `QG` | Thailand and Indonesia are at **zero** coverage and both are named launch markets |
| 2 | `AS` `G4` `AC` `SY` `WS` | North America is the home market and the thinnest region |
| 3 | `MM` `GK` `9C` `VJ` `5J` `7C` `6E` `MH` `SL` `DD` `HU` | Asian LCCs — where the 5–7 kg cabin weight caps live |
| 4 | `N0` `OG` `EY` | Transatlantic LCCs and the Gulf hub we lack |

⚠️ `HA` Hawaiian is **not** on the list: Alaska and Hawaiian moved to one
passenger service system in April 2026 and flights carry `AS` codes. Confirm
against Alaska's own site before recording it either way.

---

## The prompt

> I need the current cabin, personal-item and checked baggage allowances for
> **[AIRLINE]**, taken **only from the airline's own website**. Not a comparison
> site, not a travel blog, not an aggregator, and not your own recollection.
>
> ### Ground rules, in order of importance
>
> 1. **If you cannot open the airline's page, say so and stop.** An answer you
>    are unsure of is worse to me than no answer, because I cannot tell the two
>    apart once it is in a file. "I could not access this" is a completely
>    acceptable result.
>
> 2. **Every number carries the URL you read it on**, and the date you read it.
>    If different fares are documented on different pages, each row cites its
>    own page.
>
> 3. **Never fill a gap with a plausible value, and never delete a gap either.**
>    If the page does not publish a figure, the field is `null` — but the **row
>    still exists**, carrying a note saying the airline does not publish it.
>    A typical figure for that airline's peer group is a guess wearing a
>    uniform; a missing row is a guess wearing nothing at all, because I cannot
>    tell it apart from one nobody looked for.
>
> 4. **Distinguish a FINDING from a GAP. This is the most important rule here.**
>    - A **finding** is something you established about the airline: they permit
>      no cabin bag on this fare, or they publish no personal-item size.
>    - A **gap** is something about *us*: you could not find it, or could not
>      open the page.
>
>    They look identical in a file and mean opposite things. Every absence must
>    say which it is:
>    - `"not_permitted"` — the fare genuinely grants no bag at any size. Quote
>      the sentence that says so. This is the strongest claim we make.
>    - `"not_published"` — the airline has a rule but publishes no number
>      ("must fit under the seat in front of you"). **This is a real answer and
>      I want it.** Quote their wording.
>    - `"not_researched"` — you could not establish it. Say so plainly.
>    - `"out_of_scope"` — a charter or cargo fare we do not model.
>
> 5. **Dimensions must be the OUTSIDE of the bag** — wheels and handles
>    included, which is what airlines measure. Set `includes_wheels` when the
>    page says either way; leave it `null` when the page is silent rather than
>    assuming. If the page gives inches and centimetres and they disagree,
>    record both; do not reconcile them.
>
> 6. **Some airlines publish a sum, not a box.** If the rule is "length + width
>    + height must not exceed N cm", that is `linear_max_cm` and it belongs on
>    the row — on a **cabin** row just as much as a checked one. Some publish
>    both a box and a sum; record both, they are two constraints. If a cabin
>    rule is a sum only, `max_cm` stays `null` and that is correct.
>
> 7. **Look for rules that bind the two cabin bags TOGETHER.** These are the
>    facts nobody else captures and they change the answer:
>    - **One weight cap covering both bags.** "10 kg total for your cabin
>      baggage" is not 10 kg for the suitcase. Put `allowance_group` on both
>      rows and the cap in `group_max_kg`.
>    - **A choice, not a pair.** "Take a cabin bag *or* a personal item" —
>      same `allowance_group`, plus `group_max_count: 1`.
>    - **More than one of something.** `count` on the row.
>
> 8. **A paid extra is never part of a fare.** Ryanair Priority is about €6 on
>    top of a Basic ticket, and recording it as something Basic includes is the
>    most expensive error in this dataset. It goes in the separate `addon`
>    field, on a row that also names the fare it attaches to.
>
> 9. **If a rule depends on the route, say so.** United's Basic Economy carry-on
>    exists transatlantic and not domestically. That is `applies_to`, not a
>    footnote.
>
> 10. **Quote, don't paraphrase, for anything unusual.** If a fare rule is
>     surprising, put the airline's own sentence in `note`.
>
> ### Shape
>
> Return **only** a JSON object in exactly this shape, no commentary:
>
> ```json
> {
>   "iata": "XX",
>   "name": "Airline Name",
>   "region": "EU",
>   "type": "full_service",
>   "status": "operating",
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
>       "linear_max_cm": null,
>       "max_kg": 8,
>       "includes_wheels": true,
>       "count": 1,
>       "allowance_group": null,
>       "group_max_kg": null,
>       "group_max_count": null,
>       "source_url": "https://airline.com/the-exact-page",
>       "verified_at": "2026-08-31",
>       "note": "Anything surprising, in the airline's own words."
>     },
>     {
>       "fare_class": "basic",
>       "type": "personal",
>       "max_cm": [40, 30, 20],
>       "max_kg": null,
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
> ### Field rules
>
> **On the carrier**
>
> - `region`: one of `EU` `NA` `AS` `ME`
> - `type`: one of `full_service` `lcc` `ulcc` `hybrid`
> - `status`: `operating` unless you find otherwise. `ceased` needs `ceased_at`;
>   `merged` needs `successor`; either needs `status_evidence: {url, at}`.
>   Airlines fail — Spirit ceased operations on 2 May 2026 and our record went on
>   describing its baggage policy as current for months.
> - **Leave `strictness` exactly as written above.** How strictly an airline
>   enforces is scored separately from evidence, and a number invented here would
>   silently override that.
>
> **On every allowance row**
>
> - `type`: `cabin` (overhead) · `personal` (under-seat) · `checked`
> - `fare_class`: the airline's own tier, lowercased and underscored. It must be
>   one of the values below, which is a closed list the build enforces:
>
>   `basic` `light` `lite` `saver` `standard` `classic` `value` `economy`
>   `convenience` `comfort` `comfort_flex` `family` `flex` `plus`
>   `inclusive_plus` `fly_grande` `fly_pro` `max`
>
>   plus the classes `premium_economy` `business` `first`.
>
>   **If this airline's tier is not on that list, do not map it to the nearest
>   one — report it at the end and leave `fare_class` as the airline's own word.**
>   The list is membership only and carries no ranking; `basic` is a *tier of*
>   economy, not a separate class beside it, and mapping "Blue Basic" onto
>   `economy` is how a passenger with no bag allowance gets told their bag fits.
> - `fare_name`: the airline's marketing name, verbatim ("Light", "Blue Basic",
>   "Economy Saver"). This is what the reader recognises on their ticket.
> - `count`: how many bags of this type the fare grants. Default 1.
> - `source_url` + `verified_at`: per row, not just per record.
>
> **Absence**
>
> - A fare that grants no overhead bag gets a **cabin row with no dimensions**:
>   `{"fare_class": "...", "type": "cabin", "cabin_absence": "not_permitted", "note": "<their sentence>"}`.
>   **Never a row of zeroes.**
> - A fare whose personal item has no published size gets a **personal row with
>   no dimensions**: `{"fare_class": "...", "type": "personal", "max_cm": null, "absence": "not_published", "note": "<their sentence>"}`.
> - If you could not establish it at all, the same row with
>   `"not_researched"`. Being honest here costs nothing and is worth more than a
>   number.
>
> **Binding two bags together**
>
> - `allowance_group`: your own short label shared by the rows the rule covers
>   (`"cabin_total"` is the conventional one for a shared weight cap).
> - `group_max_kg`: the shared cap.
> - `group_max_count`: how many bags from that group the passenger may actually
>   carry. Set it to `1` for an "either/or" fare.
>
> **Route conditions**
>
> - `applies_to: { "regions": [...] }` or `{ "except": [...] }` — never both.
>   Regions: `domestic` `shorthaul` `TATL` `TPAC` `SA` `ME` `AF` `international`.
>
> **Paid extras**
>
> - `addon`: the airline's name for the purchase (`"priority"`,
>   `"large_cabin_bag"`). The row must ALSO carry the `fare_class` or
>   `cabin_class` it attaches to, or no booking can ever reach it.
>
> ### Finally — and do not skip this
>
> After the JSON, list separately:
>
> 1. **Anything true on the page that would not fit the shape above.** This is
>    the most useful thing you can give me. Every field in this schema exists
>    because an airline published something the previous version had no slot
>    for. Do not force it into a `note` and move on — describe it plainly and
>    say where you read it.
> 2. Anything you found ambiguous.
> 3. Anything you could not find at all, and whether that is because the airline
>    does not publish it or because you could not get to the page. **Those are
>    different answers.**

---

## After it comes back

1. Save to `data/carriers/[IATA].json`. The filename must match `iata`.
2. Delete `"placeholder": true` **only if** the record cites a real source you
   have clicked. That flag coming off is the assertion that a human read it.
3. `npm run validate:carriers`
4. `npm run check`

The validator will reject a record that claims to be researched without a
`source_url` and a `verified_at`, one whose cm and inch figures disagree by more
than 2 cm (a transcription error, not rounding), a cabin row with neither a box
nor a linear cap, an add-on row no booking can reach, a zero-size allowance, an
unknown route region, and an unknown region, fare class or absence value.

**What it cannot check is whether the numbers are true.** Open the cited URL for
each of the first few and confirm the figures by eye. If the URL does not
contain the number, that record is fabricated and the rest of that batch needs
the same treatment — one invention means the source rule was not being followed,
not that one number slipped.

### Read the "would not fit" list before you read the JSON

The JSON is the part a script checks. The overflow list is the part that tells
you the schema is wrong, and it has been right three times out of three so far.
A researcher who writes "they express the cabin limit as a sum, not a box"
has found a bug in this brief, not in their answer.

## What this does not cover

`strictness` stays a type/region prior until someone researches enforcement, and
`publication_ready` stays `false` until that review happens. Filling these in
makes the allowances real and the citations clickable; it does not make the
enforcement scores researched. Those are separate claims and the site says so.
