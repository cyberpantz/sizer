# Data sources and maintenance

Four datasets. Three are cheap and one is the entire competitive position.

| Dataset | Size at launch | Build cost | Defensibility |
|---|---|---|---|
| Carrier allowances | 100 carriers | ~4 days | Low — anyone can copy it |
| Strictness scores | 100 carriers | ~2 days | **Medium** — methodology is the asset |
| Bag dimensions | 60–80 bags | ~3 days | **High** — nobody else does this |
| Product offers | 200+ SKUs | ~½ day | None — it's a feed |

**Where to spend the effort is not evenly distributed.** Allowances are table stakes that four competitors already have. Measured dimensions are the only thing on this list that can't be scraped from you in an afternoon.

---

## 1. Carrier allowances

### There is no API. Don't go looking for one.

| Source | Status |
|---|---|
| **Open-source API for carry-on dimensions** | **Doesn't exist.** |
| **[CarryFit](https://github.com/AxelUser/carry-fit)** | Open-source *dataset*, 172 airlines. A cross-check, not a feed. **Read the licence before reusing anything.** |
| **Luggage Validator** | 190 airlines, weekly refresh, changelog. Offers an embeddable widget, no public API. |
| **GDS APIs** — Amadeus, Sabre, Duffel | Carry baggage allowance inside fare offers, but typically **piece count and weight in a booking context**. ⚠️ **Unverified** whether any exposes cabin dimensions. Requires partner access regardless. Worth 30 minutes to check the Duffel docs; don't build a plan on it. |
| **Airline developer portals** | Some exist. Baggage dimension data is not generally in them. |

**The strongest evidence is structural:** CarryFit and Luggage Validator are both hand-maintaining ~180 airlines. If a feed existed, neither would be doing that.

### Why we don't scrape either

Hand-entry is a deliberate choice, not a fallback:

1. **Legal exposure is real and specific.** Airline sites generally prohibit automated access in their terms, and **Ryanair in particular has actively litigated against screen-scraping** — repeatedly, and against much larger companies. They are also the single most important carrier in our dataset. That's not a risk worth taking to save a few hours.
2. **The pages are prose, not tables.** Allowances live in marketing copy with fare-class conditionals, route exceptions, and footnotes. A scraper reliably extracts the number and reliably misses *"except on flights operated by…"*. The interpretation is the work, and it's the part that has to be right.
3. **Brittle by nature.** Baggage pages get restructured constantly. A scraper is a permanent maintenance burden that fails silently — and silent failure on stale data is the one existential risk in [01-mvp.md](01-mvp.md).
4. **The volume doesn't justify it.** 100 carriers, re-verified quarterly. Automation would cost more to build and babysit than the manual pass costs to run.
5. **Hand-entry produces the trust asset.** A human read the page, recorded the URL, and dated it. That chain is what `verified_at` means, and it's not something a scraper can honestly claim.

### The legal picture, briefly

*Not legal advice — see [08-business-setup.md](08-business-setup.md). Worth understanding because it converges with the product decisions.*

**Copyright risk on the facts themselves is low.** Facts aren't copyrightable (*Feist v. Rural Telephone*, US 1991). A size limit is a fact. The EU's sui generis database right is a genuine difference, but **Ryanair v PR Aviation** (CJEU, 2015) found Ryanair's database protected by neither copyright nor database right.

**The exposure is contractual, and that same case is why.** Because the database wasn't protected, the court held Ryanair was free to impose and enforce **terms of use** against scrapers. That's the hook Ryanair has used repeatedly — PR Aviation, Booking.com, Kiwi.com, On the Beach. They litigate persistently.

**Two things that lower the risk for us specifically:**

1. **We don't scrape**, so no ToS-breach hook exists.
2. **Our pages aren't mirrors of their policy tables.** A page about bags *we measured*, citing and linking the airline's allowance as context, is doing what a journalist does. A page that reproduces the carrier's full fare matrix is a substitute for their page — a materially weaker position, and one with a plausible commercial-harm story attached.

**The asymmetry to plan for:** an unmonetized hobby tool is not worth suing. A profitable site with traffic is. Design for the successful case.

This means the [decision not to build airline policy pages](10-discoverability.md) is doing double duty — it's the better SEO call *and* the lower-risk one. Convergence worth noticing.

### What to automate instead: detection, not extraction

The actual risk isn't entry cost, it's **not noticing when a rule changes.** So automate that:

- **Watch CarryFit's commit log.** A solo maintainer tracking 172 airlines is, in effect, a free change-detection service. A commit touching a carrier we cover is a prompt to go re-read the source ourselves.
- **Diff-monitor the source pages.** Low-frequency, well-behaved fetches that alert a human when a page changes. Detecting *that* something changed is cheap and low-risk; deciding *what it means* stays human.
- **Google Alerts** on `"[carrier] baggage policy change"`.
- **CI staleness checks** — warn at 90 days, fail at 180.

### One thing to watch

The European Parliament has been working on [standardised carry-on dimensions](https://oeil.europarl.europa.eu/oeil/en/document-summary?id=1760613). As of this writing it's a **proposal, not law** — but if it passes, a large part of the European dataset collapses into one standard, and the product's centre of gravity shifts toward enforcement and measurement rather than per-carrier limits. That would be good for us — those are the two things competitors can't copy — but it's worth tracking.

### Build

Hand-enter from each carrier's official baggage page. One JSON file per carrier, each allowance carrying its own `source_url` and `verified_at`. Roughly four days for 100 carriers including the fare-class rows.

**Cross-check against [CarryFit](https://github.com/AxelUser/carry-fit)**, which is open source and covers 172 airlines. Use it to catch omissions and disagreements — a disagreement is a signal to go read the airline page a third time. Do not copy it wholesale: their data has the same manufacturer-vs-external problem on the bag side, their licence terms need reading, and a dataset you didn't verify is a dataset you can't defend.

### The launch 100

Scoped to the audience in [01-mvp.md](01-mvp.md): **US passengers flying to Europe and Asia.** Selection follows the realistic itinerary — a domestic connection, a long-haul, and the budget carrier onward — not fleet size.

**MVP requires 100 carriers.** The dataset currently has 58 records, leaving 42 additions. The groups below are the original 50-carrier candidate shortlist, not the current roster or the complete launch list; candidates still require eligibility and source checks. Use `data/carriers/_index.json` for the current roster and prioritize additional US–Europe, US–Asia, and European budget airlines.

**US mainline (10)** — the long-haul and the domestic connection
American, United, Delta, Southwest, JetBlue, Alaska, Hawaiian, Spirit, Frontier, Allegiant

**US regional (4 + flags)** — where the bag disappears on leg one
Cape Air, Silver Airways, Contour, JSX carry their own (much tighter) limits and real weight restrictions.
American Eagle, Delta Connection, United Express and Alaska Horizon publish the *mainline* limits — so they aren't separate carrier records. They're `operates_regional_jets: true` flags on the mainline, driving the [regional-jet advisory](05-schema.md#advisories--orthogonal-to-the-bands).

**Europe full-service (12)** — the transatlantic leg
Lufthansa, British Airways, Air France, KLM, Iberia, Swiss, Austrian, SAS, Finnair, TAP, Aer Lingus, Virgin Atlantic

**Europe budget (7)** — the onward trap, highest anxiety in the set
Ryanair, Wizz Air, easyJet, Vueling, Transavia, Eurowings, Norwegian

**Asia full-service (10)** — the transpacific leg, and where weight bites
Singapore, Cathay Pacific, JAL, ANA, Korean Air, EVA Air, China Airlines, Air China, China Eastern, Thai

**Asia budget (4)** — the onward trap, Asia edition
AirAsia, Scoot, Jetstar, Cebu Pacific

**Middle East (3)** — common one-stop connections to Asia
Emirates, Qatar, Turkish

**Deliberately out for now:** Canada, LatAm, Africa, Oceania, intra-US ULCC edge cases. Add on evidence of demand, not on completeness instinct.

### Collect checked allowances in the same pass

**They're printed on the page you're already reading.** Capturing them during the audit is close to free; returning to 100 carriers later is two days' work. Even though checked is a second- or third-order concern for v1, collect it now.

Per carrier, per fare class:

| Field | Notes |
|---|---|
| `linear_max_cm` | Usually 158 cm / 62 in. Length + width + height. |
| `max_kg` | Typically 23 kg economy, 32 kg business |
| `free_pieces` | **Often 0 on basic fares** — the same trap as the cabin bag |
| `system` | `piece` or `weight` — see below |
| `weight_total_kg` | Weight-system carriers only |

**Piece vs weight system matters and is easy to miss.** Piece system (transatlantic, transpacific, the Americas) gives you *n* bags each with its own limit. Weight system (much of Asia and intra-Europe) gives you a total allowance to split however you like. Mixing them on a connecting itinerary is one of the most common expensive surprises, and it's a real question our engine could answer once the data exists.

**Fees are optional and high-volatility.** Capture them if they're easy, but flag them separately — baggage fees change far more often than dimensions and will go stale first. Never let a stale fee sit next to a fresh dimension without its own date.

This makes `/luggage-for/[carrier]-checked` and the 158 cm envelope buildable later at **zero additional research cost**.

### Two fields that matter more for this audience than the generic case

- **`max_kg` is required, not optional.** Asian carriers weigh at check-in as routine — Singapore and Cathay 7 kg, Air China 5 kg. US carriers essentially never do. A US traveler has no mental model for this, and for them weight may cause more failures than dimensions.
- **`operates_regional_jets`** on US mainline brands. The bag is legal and still gets valet-checked because a CRJ-200 bin won't take it.

### Fare classes — the twelve that matter

Full fare-class breakdown is expensive. Do it only where the fare genuinely changes the allowance:

Ryanair, Wizz, easyJet, Vueling, Spirit, Frontier, Lufthansa, American, United, Delta, British Airways, Air France.

For everything else, a single `standard` row is honest and sufficient.

### Two traps

1. **Gauge ≠ published.** Ryanair's small-bag frame is physically 42 × 20 × 30 against a published 40 × 20 × 25, and bags fail on an internal warning line that wheels cross. Store both. The gauge number is what actually decides.
2. **Rules move.** Ryanair changed its free underseat allowance on 4 Sept 2025 and half the tools online still show the old figure. Lufthansa Economy Basic changed 19 May 2026.

### Keep current

| Cadence | Action |
|---|---|
| Monthly | Re-verify the 12 fare-class carriers. Bump `verified_at`. |
| Quarterly | Full sweep of all 40. |
| Continuous | Google Alerts on `"[carrier] baggage policy change"`; watch CarryFit's commit log — a solo maintainer tracking 172 airlines is a free change-detection service. |
| CI | Warn at 90 days stale, fail at 180. |

**Never let a `verified_at` go dark silently.** Stale data that admits it is stale costs far less than confident data that's wrong. The staleness date is displayed in the UI precisely so the incentive to maintain it is visible.

---

## 2. Strictness scores

The most defensible thing on the site, and the thing most likely to be dismissed as invented if the methodology isn't public. **Publish the reasoning before you publish the score.**

### What the competition gets wrong — read this first

[Luggage Validator publishes a strictness methodology](https://luggagevalidator.com/guide/how-calculate-strictness). It's the closest thing to a competitor for our core differentiator, and examining it shows the opening is wider than it looks.

Their six factors: free baggage allowance, carry-on size limits, carry-on weight limits, gate enforcement, baggage fees, personal item rules. **Five of the six are restatements of the published policy.** Their own summary confirms it: *"All scores are based on official airline rules published on their websites."*

That produces a **restrictiveness** score — how tight the written rules are — and labels it strictness. Those are different quantities, and the one travelers actually need is the other one. Only their factor 4 touches enforcement, and it's unsourced: *"Airlines known for regular gate checks."* Known by whom, from what?

**The failure is visible on their own page.** They score British Airways 7/10 "Strict." Four lines below, their own traveller feedback reads: *"BA is pretty relaxed — I've flown hundreds of times and never had my cabin bag weighed or measured."* Their related-airlines sidebar shows Aegean 7/10, Aer Lingus 7/10, Aer Lingus Regional 7/10, Aeroflot 7/10. The score barely discriminates, because policy tightness clusters while enforcement behavior does not.

### What ours must do differently

| | Theirs | Ours |
|---|---|---|
| Measures | How tight the written policy is | **How likely you are to be stopped** |
| Sources | The airline's own rules page | Bonus programs, sizer policy changes, dated reporting |
| Citations | None per factor | **Every evidence entry linked and dated** |
| Discrimination | Most carriers cluster at 7 | Southwest 3 vs Ryanair 9 — a real spread |
| Contradicts itself? | Score vs. user reports on the same page | `contested: true` surfaces conflict explicitly |

A restrictiveness score is derivable from data we already publish — it's the *allowance table*. An enforcement score requires going and finding evidence, which is why nobody has one, and why it's worth building.

**Never call our score "strictness of the rules."** It's a prediction about behavior at a gate. Name it accordingly and the difference is self-evident.

### Inputs, all independently sourceable

| Input | Weight | Where it comes from |
|---|---|---|
| Gate-agent incentives | High | Public record. Frontier $10/Spirit $5 per caught bag, $26M paid 2022–23. Ryanair €1.50 → €2.50, cap removed. |
| Gauge presence at gate | High | Carrier policy + news. American removed gate sizers entirely Oct 2025 — a single variable that splits the field. |
| Gauge vs published gap | Medium | Measured or reported |
| Fee severity | Medium | Published fee schedules |
| Reported enforcement | Low at launch | Forums now; our own reports later |

### Scoring

1–10, built from a **cited `evidence` array** — every entry carries a source URL, publisher, and publication date. See the evidence schema and hierarchy in [05-schema.md](05-schema.md#strictness-evidence). A score without visible citations is a number you made up.

**The asymmetric bar applies here and CI enforces it:** scoring a carrier as *looser* than published requires a tier 1–3 source (carrier statement, documented incentive program, or reputable journalism). Reader anecdotes can support a strict rating but can never justify a lax one — because the lax rating is the one that invites someone to risk a fee.

Anchors from current research: Ryanair, Wizz, easyJet, Allegiant ≈ 9. American, United, Lufthansa, BA, Emirates ≈ 7. Delta ≈ 6. JetBlue, JAL ≈ 5. Southwest ≈ 3.

Note the live counter-trend worth writing up: **US enforcement is bifurcating.** ULCCs are tightening while legacy carriers loosen at the gate. That's a genuinely interesting piece of analysis and nobody has published it.

### Keep current

Quarterly review. Re-score immediately on any bonus-program or sizer-policy news. Every change gets a changelog entry — a public, dated changelog is itself a trust asset and costs nothing.

---

## 3. Bag dimensions — the moat

### Why this is the whole business

Manufacturers publish packing dimensions; airlines measure external ones. Consumer Reports measured a Briggs & Riley advertised 22 × 14 × 9 in at 22.5 × 14.5 × 9.25. A Samsonite spokesperson has confirmed the company doesn't measure handles or wheels.

**And the error is not a uniform offset.** The same testing found the Eagle Creek Tarmac 22 — marketed 22 × 14 × 9 — measuring 22.25 × **15** × **8.5**: over on width, under on depth. So adding a fudge factor to manufacturer figures doesn't just fail, it fails dangerously, because *the binding dimension moves*. Correct for height and the bag gets caught on width.

Measurement is the only thing that works. That is the argument, and it is why this dataset can't be shortcut.

### Method — write it down and publish it

1. Bag empty, upright, on a hard flat surface, against a wall
2. Telescoping handle fully retracted
3. Measure the **widest point** on each axis — wheels, feet, handle housing, side pockets at rest
4. Record to 0.5 cm
5. ⚠️ **Superseded.** This step read: *"Photograph the tape against the bag on the binding dimension. This photo is the proof and it is the moat in one image."* Nobody is measuring bags — see [19-dataset-build.md](19-dataset-build.md). The proof is now the manufacturer's own page, linked and dated on every bag page. A photograph of our own tape measure would be the strongest claim on the site and we cannot make it.
6. Record date and measurer

Publish this as `/methodology`. A method anyone can replicate is a method people believe.

### Sourcing bags to measure

In rough cost order:

- **Own them / borrow them.** Friends, family, colleagues. Free, and it's how the first 20 happen.
- **Retail floor.** Bring a tape to a luggage department. Measure openly — nothing prohibits it. Twenty bags in an afternoon.
- **Buy-measure-return.** For high-search-volume bags nobody around you owns. Costs shipping and some hassle; reserve for the ten bags that most queries hit.
- **Reader submissions.** Post-launch, photo required. Never accept a submitted dimension without evidence — the whole value is that ours are verified.

### Let the best-of lists pick the queue

**The bags we measure should be the bags people are already being told to buy.** Cross-reference the published roundups — Strategist, Wirecutter, Pack Hacker, OutdoorGearLab — and measure what appears on them first.

Three reasons, and the third is the one that matters most:

1. **Search volume follows those lists.** A bag with a "Best overall" badge gets looked up.
2. **It stops the catalogue looking arbitrary.** A shortlist of bags no reviewer rates reads as affiliate-driven, whatever the measurements say.
3. **It's the honest division of labour.** Reviewers answer *is this a good bag* — durability, wheels, warranty, whether the handle lasts. We answer *will it get on the plane*. Neither answer substitutes for the other, and a reader needs both.

That third point should be visible on every bag page, not just true internally. See `What we don't tell you` in the bag mockup — naming what we can't assess, and crediting whoever can, is a stronger position than implying we settle the whole question.

#### What one list already tells us

Cross-referencing our mock catalogue against [The Strategist's June 2026 roundup](../resources/reviews/nymag-strategist-best-carry-on-luggage.md):

| Their pick | Our coverage |
|---|---|
| Tortuga Travel Backpack 40L — *best backpack, long trips* | 18 / 24 |
| Away The Carry-On — **best overall** | 9 / 24 |
| Rimowa Essential Cabin — *best statusy* | 8 / 24 |
| Béis The Carry-On Roller — *best with luggage scale* | 5 / 24 |
| Amazon Basics 21" — *best ABS* | 5 / 24 |
| Away The Bigger Carry-On — *best overall, larger* | 4 / 24 |

**Five of their six picks that we hold clear fewer than 10 of 24 airlines.** That is the entire product thesis in one table — and it is not a criticism of the roundup, which is answering a different question perfectly well.

#### The second list is more damning, and more instructive

[Travel + Leisure's June 2026 roundup](../resources/reviews/travel-and-leisure-best-carry-on-luggage.md) publishes **exterior dimensions for every pick** — which the Strategist does not — so their list can be run through the engine directly rather than reasoned about.

| T+L award | Dimensions (cm) | Clears |
|---|---|---|
| Runner-up — Tumi Alpha International | 55.9 × 35.6 × 22.9 | 9 / 24 |
| Most durable — Samsonite Proxis | 55.9 × 35.6 × 22.9 | 9 / 24 |
| **Best for international travel** — Monos Hybrid | 55.9 × 35.6 × 22.9 | **9 / 24** |
| Best compression — Away Carry-On Flex | 55.1 × 36.6 × 22.9 | 6 / 24 |
| Best packing cubes — Travelpro VersaPack+ | 58.4 × 36.8 × 24.1 | 2 / 24 |
| Largest — July Carry-on Max | 58.4 × 40.6 × 22.9 | 2 / 24 |
| **Best overall** — Samsonite Freeform | 58.4 × 38.1 × 25.4 | **0 / 24** |
| Most stylish — Delsey Chatelet Air 2.0 | 57.8 × 38.1 × 25.4 | 0 / 24 |
| Best budget — Amazon Basics 21" | 55.1 × 37.6 × 25.4 | 0 / 24 |
| Best rolling duffel — Bric's X-Bag | 55.9 × 31.8 × 25.4 | 0 / 24 |
| Best design — Hartmann Reserve | 58.4 × 38.1 × 25.4 | 0 / 24 |

**Five of eleven clear no carrier in our set. Median coverage is 2 of 24. The best-overall pick clears none.**

#### But they say so — and that's the actual point

This is **not** a gotcha, and must never be written as one. T+L's FAQ states outright that several picks exceed 22 × 14 × 9, and the per-pick notes flag it individually: *"may be too large for some overhead bins"*, *"23-in height risks a forced check on smaller airlines"*, *"may be gate-checked"*, *"some international airlines may force a check when fully expanded"*. After 621 bags across five years, they know exactly what they are recommending.

> **"May be too large for some overhead bins" and "clears 0 of 24 airlines" are the same fact. Only one of them is actionable.**

That sentence is the product. The information already exists in good journalism; it is qualitative, buried in a FAQ, and detached from the pick it applies to. Our contribution is turning it into a number attached to the bag — not discovering it.

Even the pick explicitly awarded *best for international travel* clears 9 of 24, because it is built to the American standard. That is not an error either; it is what "international" means to a US publication.

#### A third source, and now it's a pattern

[Pack Hacker's international-travel roundup](../resources/reviews/pack-hacker-best-luggage-international.md) publishes **no dimensions and no weights at all** — in a piece titled *Best Luggage for International Travel*.

| Source | Picks | Dimensions | Weight | Capacity |
|---|---|---|---|---|
| The Strategist | 18 | **none** | all | all |
| Travel + Leisure — general | 11 | all | all | most |
| Travel + Leisure — **international** | 14 | all | all | most |
| Pack Hacker | 10 | **none** | **none** | 3, in passing |

Four roundups, ~53 picks, and **exterior dimensions appear in two of them — both from the same publication.**

⚠️ **This table is about roundups, and roundups are summaries.** Pack Hacker's per-product *review pages* publish dimensions, weight, capacity and a carry-on compliance score against 146 airlines — none of which appears in the roundup above. Read the primary source before characterising an outlet: [14](14-competitive-notes.md#pack-hacker--the-competitor-i-missed).

#### Correction: they *do* say which bags meet the requirement

An earlier read of this recorded Pack Hacker as simply publishing no size data. That undersold what they do, and re-reading the source corrected two things.

**They assert compliance for every ranked pick**, in the FAQ:

> "Carry On Luggage is carry on-sized, so they should work with most airlines."

And then withdraw it two sentences later:

> "Sometimes, bag manufacturers make bags that are meant to be used as a carry on but are slightly too large to be used with some airlines. We recommend checking your specific airline before flying."

**Claim and retraction in the same paragraph.** That is a sharper statement of the gap than "they publish no dimensions" — the reader is told the bag fits, then told to go verify it themselves, with nothing given to verify it against.

They also make specific, comparative compliance judgments throughout, and these are genuinely useful:

| Bag | What they say | Kind |
|---|---|---|
| Aer Carry-On | *"we prefer the Small version, as it's more compatible with the most popular airlines"* | ranked variant |
| Away Carry-On Flex | *"The expansion system may affect carry on compliance"* | expansion risk |
| Bellroy Transit | *"helps if you regularly fly strict airlines where every kilo matters"* | weight |
| Peak Design Roller Pro | *"At roughly 34L … it's sized for carry-on travel"* | asserted |
| Calpak Luka Mini | *"it slides under the seat in front of you"* | under-seat role |

All of it is captured in `mentions.json` as `compliance_claim`, with a `basis` field recording what the claim rests on: `assertion_only`, `product_name`, or an actual dimension.

Which produces the number that names our market:

> **11 bags are asserted carry-on legal by a reviewer. 9 of them have no dimension from any source we hold.** Someone told the reader it fits, and nobody has a measurement behind it.

**Second correction: the article covers checked bags too**, which the title says and my first pass missed. The "best splurge" pick — the Briggs & Riley Torq *Extra Large Trunk Spinner*, "room for everything including the kitchen sink" — is checked luggage, and I had filed it as a carry-on. It now carries `role: "checked"` and is excluded from every carry-on surface. Roundups mix the two without flagging it, so the schema has to be able to tell them apart.

Two also-rans were also missed: the **Calpak Luka Mini** (an under-seat bag, and only the second in our catalogue) and the **Eagle Creek Cargo Hauler XT**, whose product name carries its own size claim.

#### Their testing is not lazy — the size gap is specific

And Pack Hacker is not a lazy outlet — they've tested since 2017, run a physical rolling course over smooth ground, cobblestones and grass, and publish weighted numeric scores. On size, they say this:

> **"Sometimes, bag manufacturers make bags that are meant to be used as a carry on but are slightly too large to be used with some airlines. We recommend checking your specific airline before flying."**

That is the most experienced tester in the category describing our product and declining to build it. Quote it on `/methodology` — with attribution and a link, per [16](16-editorial-policy.md).

#### Their rolling test is worth citing, and isn't ours to replicate

Monos 7.05, Travelpro Maxlite 6.7, Aer Small 6.7, July 6.4, and the two-wheeled Osprey Transporter highest on brick. A real physical measurement with a stated method, of a property we don't assess.

**It also corrects something we wrote.** Our own filter note said two-wheel rollers win on value, build or capacity. Pack Hacker's testing gives the better reason: **rollers win on rough ground** — cracked concrete, cobblestones, old European streets — because the second pair of wheels stops helping the moment the surface does. That's a tested claim, it's more useful than ours, and it happens to describe exactly where our audience is going.

#### The one list built on a size filter used the wrong size

[T+L's international list](../resources/reviews/travel-and-leisure-best-international-carry-on-luggage.md) is the closest anyone comes to doing our job. It has a hard selection rule, stated up front: nothing larger than **22 × 14 × 9 in**, described as "the most common international-carrier limit."

That is the **US domestic** standard. And their own FAQ, further down the same page, says so:

> international carry-ons generally must be smaller than the US-standard 22 × 14 × 9 in — sometimes **under 21.7 in tall including handle and wheels** — with stricter weight rules.

The article contradicts its own filter. Run their picks through our engine (placeholder carriers, so directional only) and the cost of that shows up immediately:

| Pick | Their award | cm | Clears or at the line |
|---|---|---|---|
| Patagonia Black Hole 40L | Best duffel | 50 × 31.8 × 21.6 | **24 / 24** |
| Calpak Luka | Best laptop compartment | 53.3 × 34.9 × 22.9 | 19 / 24 |
| Herschel Heritage | Best minimalist | 50.2 × 33 × 22.9 | 18 / 24 |
| **Samsonite Uplift** | **Best overall** | 55.9 × 35.6 × 22.9 | **9 / 24** |
| Traveler's Choice Maxporter II | Best features | 55.9 × 35.6 × 22.9 | 9 / 24 |
| Béis Hybrid Roller | Best design | 55.9 × 35.6 × 22.9 | 9 / 24 |
| Thule Aion | Best compression | 55.1 × 35.1 × 23.1 | 6 / 24 |

**The three bags sitting exactly on their filter clear 9 of 24 carriers.** The bag that clears everything is the one pick with no wheels, ranked ninth. Their winner is at the ceiling of a limit they themselves say is too generous for the trip the article is about.

This is the clearest illustration yet of the gap, and it's the one to use — because it isn't a publication being careless. It's a publication doing everything right *except* the thing we do, on the article where it mattered most.

**Editorial handling.** Per [16](16-editorial-policy.md): we don't say the list is wrong. The bags are good — the testing behind them is far beyond ours. We say the filter was the domestic limit, quote their own FAQ agreeing, and show the carrier table. The reader draws it themselves.

#### They do our job — in the section nobody reads

Their "others we liked" also-rans reject bags on exactly our grounds:

- Lojel Cubo Small Lite — *"14.2 in wide may exceed some airline limits"*
- Dagne Dover Smaller Seattle — *"over 9 lb empty eats into strict international weight allowances"*

So the analysis exists. It's applied to the bags that didn't make the list, not to the ranked picks, and it never touches a specific carrier. Worth being fair about when we cite them.

#### Weight is a second gate, and this list surfaced it

Every pick carries an empty weight, and T+L's FAQ notes many international carriers cap the cabin at **15–22 lb**. Their best-aluminum pick weighs **10.5 lb**. Against a 7 kg (15.4 lb) allowance — Emirates, Qatar, Singapore, Cathay — that is 68% of the allowance empty, leaving 2.2 kg.

This found a real gap in our engine, now fixed: we only warned when the *empty bag exceeded the cap*, which never happens. See [05-schema.md](05-schema.md#weight-headroom--the-second-gate-and-we-were-failing-it-silently).

#### Two publications, one product, different numbers

Amazon Basics 21" Hardside:

| Source | Weight | Capacity |
|---|---|---|
| The Strategist | 7.3 lb | 37 L |
| Travel + Leisure | 7.7 lb | 34 L |

Two careful outlets, the same bag, figures that don't agree. **Neither is being sloppy** — they're likely different model years or measured differently, and neither publishes a method. That disagreement is the plainest possible argument for measuring the thing ourselves and saying when we did it.

The international list adds two more, and they aren't edge cases — both are top-ten picks in both publications:

| Product | T+L international | The Strategist | Spread |
|---|---|---|---|
| Away Carry-On Aluminum | 10.5 lb · 32 L | 10.1 lb · 35 L | 0.4 lb **and** 3 L |
| Patagonia Black Hole 40L | 2.1 lb | 2.7 lb | **0.6 lb — 29%** |

A 29% disagreement on the weight of a bag both outlets physically handled. And on a 7 kg carrier, 0.6 lb is 4% of the entire allowance.

**T+L also disagrees with itself.** The Bagsmart Roamer is *Best value* here and a runner-up in their general guide. The Tumi is headed "19 Degree Lite" and called "10 Degree Lite International" in the body. The Bagsmart is $110 in the specs and "coming in at $150" in the prose. The intro claims 600+ bags tested; the methodology section says 270 carry-ons.

None of that makes them a bad source — it makes them a **normal** one. Which is the point: every number in this category comes from somewhere, and almost none of it comes with a date, a method, or a model year. Populate `conflicts[]` ([05](05-schema.md)) with all of these and let the bag page show the disagreement rather than silently picking a winner.

⚠️ **All coverage figures above use placeholder carrier data.** Re-run once the real 50 are audited before quoting any of them publicly.

**Gaps to measure first**, all rated there and all absent from our catalogue: **Quince Small Carry-On** ($120, their *best less expensive* — likely high search volume), Solgaard Carry-On Closet, Aer Carry-On Max, Cotopaxi Allpa 35L, Patagonia Black Hole 40L, Travelpro VersaPack+ and Maxlite 5, Calpak Hue, Eagle Creek Gear Warrior XE.

From the international list, prioritising the ones that **clear more carriers than the bags we already stock** — these are the answers to the question the site asks, and we don't have them: **Patagonia Black Hole 40L** (24/24), **Herschel Heritage** (18/24), **Calpak Luka** (19/24), Kenneth Cole Reaction Underseater (19/24), Bellroy Lite, Pacsafe Venturesafe EXP45, Thule Aion, Bagsmart Roamer, Samsonite Uplift, Traveler's Choice Maxporter II, Béis Hybrid Roller, Tumi 19 Degree Lite, Away Carry-On Aluminum.

**Béis needs care:** the Hybrid Carry-On Roller (8.39 lb, 35 L) and The Carry-On Roller (8.36 lb, 49–61 L) are different products with near-identical weights. Separate records, per the [variant rule](05-schema.md#size-variants-are-separate-records-never-one-entry-per-product-line). Merging them would be an easy and invisible mistake.

### The launch 60–80

Weight toward search volume, not brand prestige: Away, Monos, Béis, Samsonite, Travelpro, Calpak, July, Rimowa, Tumi, Briggs & Riley, Amazon Basics, Antler, American Tourister, plus the onebag set — Tortuga, Osprey Farpoint/Fairview, Peak Design, Nomatic, Cotopaxi Allpa, Eagle Creek, Db.

Cover the ULCC-compliant underseat category deliberately. It's underserved, it's exactly what a Ryanair Basic passenger needs, and those are the most anxious searches on the internet.

### Keep current

Bags change silently between model years. Record the model year, re-measure on redesign, and never carry a measurement forward to a new revision.

---

## 4. Product offers

The one dataset that's genuinely easy — and the one worth the least.

### Feeds solve the catalog, not the dimensions

Awin's own spec rates its `dimensions` column as populated in a third to two-thirds of feeds, and it's free text: `'12 x 30 cm'`, `'15 inches'`. Treat feed dimensions as a hint for the manual queue, never as display data.

**Use feeds for the spine only:** name, image, price, URL, stock, GTIN.

⚠️ **`image` is not free to take.** Feed rights vary per merchant and Amazon
forbids hosting outright — [23-product-images.md](23-product-images.md).

### Priority

1. **Awin** — Béis, Monos, Nomatic, Db. Best bulk CSV. Feed list at `https://productdata.awin.com/datafeed/list/apikey/{key}`.
2. **CJ** — Travelpro, Briggs & Riley. GraphQL; best dimension schema of any network (`productLength/Width/Height` *and* shipping dims).
3. **Impact** — Osprey, Calpak, Peak Design, July, Samsonite. REST Catalogs API.
4. **AvantLink** — Tortuga, Thule, Eagle Creek. Rich outdoor coverage but **no dimension and no availability fields.**

Skip Rakuten unless a merchant is exclusive to it — two approval gates and slow.

### Amazon is a special case

PA-API 5.0 is deprecated. Its replacement, the Creators API, requires **10 qualifying sales in a trailing 30 days**, and the operating agreement permits displaying Amazon prices *only* if obtained through it. Manually entered or scraped prices are a violation.

**Launch Amazon as link-only with no prices.** See [06-monetization.md](06-monetization.md).

### Keep current

Daily feed pull. Prices go stale fast and a wrong price is a support email and a broken trust signal. Non-Amazon prices carry an `updated_at`; Amazon carries no price at all.

---

## Maintenance summary

| Dataset | Cadence | Automatable? |
|---|---|---|
| Carrier allowances | Monthly (12) / quarterly (all) | No — the verification is the work |
| Strictness | Quarterly + on news | No |
| Bag dimensions | On model revision | No — and that's the point |
| Offers | Daily | Yes, fully |

Three of the four are deliberately manual. That's not a gap in the plan; it's the reason the site is defensible. A competitor can clone the interface in a weekend and cannot clone eighty photographs of a tape measure.

**Budget roughly a day a month** on data maintenance once launched. If that feels like too much, the honest read is that this is the wrong business — because that day is the business.

---

## Rick Steves — a manufacturer that publishes the number we care about

Direct-sold, designed for European travel, and **absent from all four roundups** — which is the US review circuit's blind spot showing up exactly where predicted. Reviews are scarce; that isn't a reason to skip them, it's a reason they're ours to cover.

They do something no other source in this project does. Both figures, on the product page:

```
Rolling Carry-On    20 × 13.5 × 9 in main compartment  (21 × 13.5 × 9 with wheels)
Spinner Carry-On    19.5 × 14 × 9 in main compartment  (21.75 × 14 × 10 with wheels)
```

**Packing dimension and external dimension, printed side by side, by the manufacturer.** That distinction is the entire premise of this site, and here it is stated plainly by a company selling the bag.

### The Spinner is the clearest illustration we have of the whole problem

| | cm | Clears or at the line |
|---|---|---|
| If you believe the packing dims | 49.5 × 35.6 × 22.9 | **16 / 24** |
| Using the external dims | 55.2 × 35.6 × 25.4 | **6 / 24** |

**A ten-carrier swing, from wheels and a handle.** The wheels add 5.7 cm of length and 2.5 cm of depth — and a spec sheet that printed only the first number would be off by enough to fail Turkish, Lufthansa, Ryanair and seven others.

Note which way the form factor cuts: the two-wheeler adds **2.5 / 0 / 0**, the spinner adds **5.7 / 0 / 2.5**. Recessed wheels versus protruding castors. That is a measurable, structural reason a roller clears limits its spinner sibling fails — and it now has numbers behind it rather than assertion.

### A customer confirmed our engine, in a product review

Our engine says the Spinner **won't fit Turkish** — 0.4 cm too deep on external dimensions. On that same product page:

> "Even with closed extensor zipper, it is **too wide for some airlines (Turkish air, Swiss air)** and does not fit width wise in the sample for allowable space for overhead compartment — I've had to check bag a few times."

A traveller, on the airline our model named, made to check the bag. Stored as `observed` provenance — the weakest tier of evidence and the only tier that reflects what actually happened at a gate.

And directly beneath it, another buyer:

> "meets size regulations for every domestic and international airline I have checked"

Same bag, same page, opposite conclusions. **That is the product in miniature.** One traveller flew a carrier that measures, the other didn't; both wrote a review, and neither is lying. A `conflicts[]` case that comes from users rather than publications.

### They label their expansion honestly

> "Gain an extra 2 inches of cargo depth in a pinch (**making it 'fatter' than the carry-on limit, but perfect for checking**)."

The only manufacturer we've seen state that its own expansion breaks compliance. Compare Away's Flex, where Pack Hacker had to add the warning on the brand's behalf. Worth citing when we write about expanders.

### Still tier 3

They're a manufacturer, the numbers are self-reported, and they don't stop needing verification because they're unusually forthcoming. What publishing *both* numbers buys them is **falsifiability** — a single spec figure can't be wrong in a checkable way, and two can. Re-measure like everything else.

⚠️ Their own marketing contradicts itself: the collection page says the bags are "designed to fit in standard US airline bins," while the Rolling Carry-On page says "Fits European overhead bins with room to spare." Ask which, on the record, before quoting either.

---

## Travelpro — the thesis, in a manufacturer's own FAQ

Frank asked about the Maxlite 5. It was already in the catalogue twice, from two publications, with no dimensions and possibly conflated variants. The manufacturer's page settled all of it and more.

### They publish both numbers, and explain why

> **"We publish both numbers.** The case dimensions (the packing body only) are 19 x 15 x 7.75 in. The overall dimensions, which include wheels and carry handles, are 21.75 x 15.75 x 7.75 in. **When airlines publish size limits they mean the overall size, so compare the overall number to your airline's limit.**"

That is this entire site's premise, written by a luggage manufacturer in its own product FAQ. Rick Steves prints both figures; **Travelpro prints both and tells you which one to use.** Two manufacturers now do what none of the four review publications do.

Which corrects something written a few sections up: Rick Steves is no longer "the only source that publishes both." It is one of two — and the more useful pattern is that **manufacturers are ahead of reviewers on this**, not behind them.

### Three variants, three different answers

| Variant | Overall (in) | cm | Their claim | Clears or line |
|---|---|---|---|---|
| Carry-On, sold as 21" | 23 × 14.5 × 9 | 58.4 × 36.8 × 22.9 | "most major US airlines" | **2 / 24** |
| Compact | 22 × 14 × 9 | 55.9 × 35.6 × 22.9 | "nearly all major domestic" | 9 / 24 |
| **International** | 21.75 × 15.75 × 7.75 | **55.2 × 40 × 19.7** | "many international airlines" | **14 / 24** |

Three observations.

**The International is a genuinely European bag.** 55 × 40 × 20 is the European envelope, and it is the only bag in our catalogue built to it — trading depth (19.7 cm) for width (40 cm) instead of maximising a US-shaped box. Its 12 "at the line" results are honest rather than disappointing: a bag designed *to* a limit sits *on* it everywhere, with nothing to spare. The right copy is "it fits, with no margin — any bulge is a problem," not "it fits."

**The one sold as a 21-inch carry-on measures 23 inches** and clears 2 of 24. Per [16](16-editorial-policy.md) that gets stated as measurement, never accusation: the product name describes a category, the spec describes the bag, and we print the spec.

**The variant named "International" is not the one to reach for automatically** — but here it *is* the best of the three. Worth checking rather than assuming, which is the general lesson.

### It caught a publication error, automatically

`derive.mjs` flagged a conflict nobody was looking for:

```
travelpro-maxlite5-compact · capacity_l · 21%
   The Strategist                46
   Travelpro                     38
```

The Strategist lists the **Maxlite 5 Compact** at 5.4 lb / 46 L. Travelpro's Compact is 5.1 lb / 38 L — and 5.4 lb / 46 L is the **21-inch Carry-On**, a different variant that clears 2 of 24 rather than 9. The specs were attached to the wrong variant's name.

This is exactly the failure the [variant rule](05-schema.md#size-variants-are-separate-records-never-one-entry-per-product-line) exists to prevent, found by derivation rather than by reading. The reason for keeping variants as separate records stopped being theoretical.

### They also ship a competing feature

Travelpro publishes per-airline carry-on size guides at `/pages/airline-guides`, including a regional-jet gate-check warning. That is the second incumbent with airline-sizing content ([Pack Hacker](14-competitive-notes.md#pack-hacker--the-competitor-i-missed) was the first), and this one is a manufacturer with an obvious interest in the answer. Add to [14](14-competitive-notes.md) after a proper look.

---

## Where the reading is recorded

Two layers, mirroring the review pipeline: humans read into markdown, machines read the JSON extracted from it.

| | |
|---|---|
| `resources/SOURCES.md` | **Every** external source, with a read-status column: `full`, `partial`, `summary`, `blocked` |
| `resources/carriers/[IATA]-[name].md` | Per-carrier dossier from `_TEMPLATE.md` — the template doubles as the audit checklist |
| `data/carriers/*.json` | The extract. Never edited ahead of the dossier |

`validate-carriers.mjs` enforces the link: evidence marked `unverified: false` needs both a `verified_against` field saying what was opened, and a `research_dossier` pointing at where the reading was written down.

**The read-status column is the honest part.** `summary` — never opened, only a search result or another article's account — is a legitimate status. Citing a summary *as though it were the document* is what produced the Frontier error, where a quote was attributed to a congressional report and turned out not to be in the source that was read.

### What the register currently says about us

- **One tier-1 source has been read in full**: the Senate PSI press release.
- **Zero carrier baggage pages have been visited.** All 24 records are `placeholder: true`, and that is not a formality.
- Every bag dimension traces to **one publication**, obtained second-hand as a local summary rather than fetched.
- The thing we sell — our own measurements — has **no sources at all**, because nobody has measured a bag yet. That is the work, not an omission.

This register is also the raw material for a public `/methodology`. "Here is every source, and here is what we did and did not actually read" is a stronger claim than any competitor in this category makes.
