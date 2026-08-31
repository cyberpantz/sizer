# Competitive notes

What to borrow, what to avoid, and an honest read on where we're behind.

The two tools worth studying:

- **[CarryFit](https://carryon.fit/)** — 172 airlines, open source, single developer. Best-engineered tool in the category. Invisible in search.
- **[Luggage Validator](https://luggagevalidator.com/)** — 190 airlines, fare-class aware, strictness scores, weekly refresh, changelog, free embed. The most complete product. No revenue.

---

## Borrow

### Already in our spec

| Idea | Source | Where |
|---|---|---|
| Fare-class selector with full comparison matrix | LV | [03-ui-flows.md](03-ui-flows.md) |
| Published + last-verified dates, displayed | LV | [05-schema.md](05-schema.md) |
| Link to the carrier's own policy page | Both | [05-schema.md](05-schema.md#source-linking) |
| Strictness score as a first-class concept | LV | [04-data-sources.md](04-data-sources.md) — reworked to measure enforcement |
| Auto-rotate dimensions; order shouldn't matter | CarryFit | [05-schema.md](05-schema.md) — sort descending on write |
| Soft-bag flex allowance | CarryFit | `compress_cm` |
| Public changelog | LV | [04-data-sources.md](04-data-sources.md) |
| Free embeddable widget | LV | [06-monetization.md](06-monetization.md) |
| Weight system vs piece system explainer | LV | [13-guide-page.md](13-guide-page.md) |

### Worth adding — not yet specced

**Structured traveller reports.** LV's feedback carries tags: airport, outcome (`gate-checked`, `charged fee`, `passed inspection`), date. That's much better than free-text anecdotes — tagged reports aggregate into evidence, and `charged fee at Alicante` is a data point where "they were strict" isn't. Adopt the tag structure when reports ship, even though reports themselves stay deferred until there's traffic.

**"Contribute" as top-level navigation.** LV puts a correction channel in the main nav, not the footer. For a product whose whole claim is accuracy, inviting corrections prominently is a trust signal *and* a data source. Cheap, and it pairs with the feedback write path already in [01-mvp.md](01-mvp.md).

**Print stylesheet.** LV has "Print this page." Slightly old-fashioned and genuinely thoughtful for someone about to fly. Trivial to implement.

**Comparison pages.** LV runs `ryanair-vs-wizzair-vs-easyjet-vs-aerlingus` and similar. Some are transparently SEO-farmed (`air-peace-vs-air-corsica-vs-qatar-vs-jal-vs-aer-lingus` is not a real query), but the pattern is sound where the comparison is real — *"Ryanair vs Wizz vs easyJet"* is a question people genuinely ask. Ours would be luggage-framed: **"One bag for Ryanair, Wizz and easyJet"**, which is the shopping version of the same query.

**Paste a product URL to parse dimensions.** CarryFit's cleverest feature. Lower priority for us — our bag lookup returns *measured* dimensions, which is strictly better — but it's a good fallback for bags outside the catalog.

---

## Avoid

| Pattern | Why | Ours |
|---|---|---|
| Strictness derived from policy text | Measures the wrong quantity; BA and Aeroflot both land at 7/10 | Enforcement evidence, cited ([04](04-data-sources.md#2-strictness-scores)) |
| Unsourced enforcement claims | "Many reports," "travelers report" — by whom, when? | Every claim dated and linked |
| Gradient on a rubric score | Implies precision the data lacks | Segmented, anchored ([02](02-design-system.md#enforcement-score)) |
| Reasoning behind a link | Leaves a bare assertion on the page | Evidence inline |
| Generic bag archetypes | "Standard 20-inch Carry-on" — no brand, no path, no value | Real measured bags |
| Airline policy pages as the SEO surface | Unwinnable against the airline; wrong intent | `/luggage-for/*` ([10](10-discoverability.md)) |
| Scraping | ToS exposure, and Ryanair litigates | Hand-entry ([04](04-data-sources.md)) |
| Single-page app with no page surface | CarryFit is the best tool here and cannot be found | Real pages per noun |
| Filler advice | "Weigh your bag before you go" is on ten thousand blogs | Only what we alone can say |

---

## Editorial reviewers are not competitors

Worth separating out, because the instinct is to treat everyone in the category as a rival.

**The tools** — CarryFit, Luggage Validator — compete with us directly. Same question, worse answer.

**The reviewers** — Strategist, Wirecutter, Pack Hacker — answer a different question and answer it better than we ever will. They test durability over years, they have named experts, they photograph things properly. We cannot compete there and shouldn't try.

So cite them, link them, and let their picks drive the [measurement queue](04-data-sources.md#let-the-best-of-lists-pick-the-queue). A bag page that says *"The Strategist rates this; we measured it at 55 × 36 × 24 and it clears 10 of 24"* is more useful and more credible than either source alone.

**One thing their format exposes.** Strategist publishes empty weight, capacity in litres, warranty and construction for every pick — but **no external dimensions at all**, only a blanket claim that everything meets 22 × 14 × 9 in. Their own capacity column contradicts that for seven of eighteen picks, since 22 × 14 × 9 in is a box of just 45.4 litres in total. Nobody in the category publishes external dimensions, which is precisely the gap we exist to fill.

Fields worth stealing from their format: **warranty**, **shell material** (aluminium > polycarbonate > ABS), **wheel behaviour** (brakes, self-braking, 2-wheel for rough ground). All are real product attributes and none of them are ours to assess — attribute them.

## Where we're behind

Worth stating plainly, because design advantage doesn't beat a data head start.

| They have | We have | Closing it |
|---|---|---|
| 190 airlines | **~39, already collected** in the prototype | Audit and enrich, ~1.5 days. Coverage is not the game. |
| Months of refresh discipline | Nothing | Process is specced; it has to actually run |
| A live product | A spec | Two weeks |
| An embed program with installs | Nothing | Month 6+ |
| Crowdsourced reports at volume | Nothing | Needs traffic first — chicken and egg |
| Domain age and backlinks | Nothing | The measurement story is the fastest route ([10](10-discoverability.md#6-link-acquisition)) |

**Coverage is the one that looks scariest and matters least.** 190 airlines is an impressive number and a poor moat — it's a few days of typing, and searches concentrate on maybe 25 carriers. With ~39 already in hand, the gap that remains is provenance, not volume: their 190 rows and our 39 are equally unverified until someone opens the carrier's page and dates it. **That's the axis to compete on, and it's the one they've left open.**

---

## The actual asymmetry

Both competitors are developer-built, and it shows in a specific way: **they solve from data already in hand.**

LV's strictness score is six factors, five of them computed from policy text already in their database. That's the natural engineering move — derive, don't gather. It's also why the score measures restrictiveness rather than enforcement, and why BA scores identically to Aeroflot.

Every genuinely defensible asset in our plan is unautomatable:

- Measuring 80 bags requires a tape measure and a Saturday
- Enforcement evidence requires reading filings and news, then writing down why
- Verifying 50 carriers quarterly requires someone to actually read the pages

None of it derives from anything. **That's why it holds** — not because the work is hard, but because it doesn't look like engineering, so a developer-led competitor won't be drawn to it.

The corollary is a warning: **the moment we start optimizing the manual work away, we've become them.** Automate detection, never judgment ([04](04-data-sources.md)).

---

## Pack Hacker — the competitor I missed

**Correction.** I read Pack Hacker's roundup, saw no dimensions, and filed them as an outlet that hands the size question to the reader. That was the wrong article. Their **per-product review pages** publish dimensions, weight, capacity — and this:

```
Technical Details
  38 %   Carry-on Compliance     [View 55/146 Airlines]
```

**They have built this product.** A per-bag compliance score against **146 airlines** — three times our launch set — with a browsable pass/fail table, inside a review library far larger than our catalogue, on a site with a decade of audience and a paid membership tier.

Two lessons in one. Their beat is travel backpacks and one-bag travel; wheeled luggage is secondary coverage, so judging them on a single roller roundup was the wrong test. And a roundup is a summary — **the review page is the primary source.** Read the primary source before characterising an outlet.

### Their disclaimer is our entire product thesis

> "We take **the measurements of the bag provided by the manufacturer** and compare them to the allowance listed on airline websites. This should be used as a guideline rather than a rule. Bags can change size as you pack them out, and every airline's interpretation of compliance is different."

Every clause of that is a gap we already claim to fill:

| They say | We do |
|---|---|
| measurements provided by the manufacturer | measure externally ourselves, wheels and handles in, with a photo |
| a guideline rather than a rule | four probability bands, not a boolean |
| every airline's interpretation is different | strictness as a scored, evidenced axis |
| bags change size as you pack them | expansion and compression modelled per bag |

So the competitive position did not weaken — it got **specific**. It is no longer "nobody does this." It is: *someone does this at scale, on manufacturer numbers, and says so in their own disclaimer.* That is a harder claim to make and an easier one to prove.

The honest read: they could close this gap by measuring. They have the traffic, the library and the testers. What they'd have to give up is coverage — 146 airlines × hand-measured bags is a different cost structure than 146 airlines × spec sheets. **Our bet is that the depth is worth more than the breadth**, and that bet is now explicit rather than assumed.

### They also validated our engine

Their Monos Carry-On score, and ours, on the same manufacturer dimensions:

```
Pack Hacker    55 / 146 airlines    38%
Us              9 /  24 carriers    38%
```

Two independent implementations, different carrier sets, one point apart. That is the strongest external check the engine has had — and it cuts both ways: it also means our *math* is not the differentiator. **The measurement is.** If we ship on manufacturer numbers we have rebuilt their product with fewer airlines.

### What to do about it

- **Never cite their compliance number as corroboration of ours.** Same input, so agreement proves nothing about the input.
- **Do cite it as the state of the art** on `/methodology`, with the disclaimer quoted in full and attributed. It makes the argument for us, in a competitor's words, which is worth more than making it ourselves.
- **Their compliance % is a measurable target.** Where our measured dimension disagrees with the manufacturer's, our verdict will differ from theirs on the same bag and the same airline. Those disagreements are the product. Track them from the first measurement.
- **Their backpack coverage is our thinnest category** — one sized bag. When we build it out, they are the reference for which packs matter, and manufacturer dimensions are least misleading on soft bags with no protruding wheels. Least misleading is still not measured.
