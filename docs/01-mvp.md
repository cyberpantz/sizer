# MVP definition

## The cut line

These docs specify more than v1 should build. That's fine — the thinking is banked — but **only this ships in two weeks:**

**In**
- ~50 carriers: published limits, `source_url`, `verified_at`
- Fare-class rows for the 12 carriers where it changes the answer
- 60–80 bags with measured dimensions, shown against the manufacturer's claim
- Weight compared alongside dimensions
- The four-band engine
- One results screen, three doors
- **Nav is three items: Bags, Guide, Check a bag.** No Airlines index — see [15](15-sitemap.md#airlines-is-deliberately-absent-at-launch). Per-carrier `/luggage-for/` pages still ship; only the directory waits.
- Affiliate links, DTC-first
- Strictness score with 2–3 cited sources per carrier

**Next — the differentiation queue**

Not v1, but on the radar deliberately. Each one is something **no competitor has**, which is why they're a queue rather than a backlog. Build in this order once v1 is live.

| # | Differentiator | Why it's ours alone | Doc |
|---|---|---|---|
| 1 | **Regional-jet advisory** | The bag is legal and still gets taken at the jetbridge. Hits leg one of our exact target itinerary. Nobody models the aircraft. | [05](05-schema.md) |
| 2 | **Weight-at-check-in advisory** | US travelers have never had a carry-on weighed; Asian carriers do it routinely. Invisible failure mode. | [05](05-schema.md) |
| 3 | **Rule-change alerts** | Requires dated allowance history, which only we keep | [11](11-sharing-and-permalinks.md) |
| 4 | **The guide page** | The measurement angle no policy explainer covers | [13](13-guide-page.md) |
| 5 | **Checked bags** | Same engine, different constraint. Higher AOV than carry-on. See below. | [05](05-schema.md) |
| 6 | **Airport metadata / EAS carriers** | Extends #1 to nine-seat Cessnas and no-mainline airports | [05](05-schema.md) |

### Narrow entry, broad utility

Two failure modes pull in opposite directions, and the answer is not to pick one.

**Too narrow** and this is a fit checker — a feature, not a business. Useful once, to one traveller, for one question. That's what CarryFit is, and it's why nobody can find it.

**Too broad** and it's a generic luggage site competing with Wirecutter, with no reason to exist.

The resolution: **the question that brings people in is narrow. The answer we give can be generous.**

- **The wedge stays sharp** — SEO, the homepage, brand memory, the story that earns links. All of it is "will it fit," because that's the acute, searchable, anxious question.
- **The utility stays wide** — once someone is here, serve the whole luggage decision.

#### The boundary is the moat, not the use case

> **If it depends on a physical fact we verified, it belongs here. If it doesn't, it's dilution — however useful it sounds.**

That single test lets the site grow a long way without ever going generic:

| Belongs | Why |
|---|---|
| Carry-on fit | The wedge |
| Checked linear size + empty weight | Same measurements, different constraint |
| **Real usable capacity** | Brands inflate litre ratings constantly. Measurable, and nobody publishes honest numbers. |
| Weight per litre | Derived from what we already weigh |
| Does the expansion zip actually help | Measured open and closed |
| How much a soft bag really compresses | Measured packed and empty |
| Handle height, wheel roll | Physical, testable |

| Doesn't belong | Why |
|---|---|
| Packing tips | Not a measurement |
| Destination guides | Not luggage |
| Style and colour roundups | Not verifiable |
| "Best luggage 2026" listicles | Borrowed authority; everyone else already owns it |

So the honest framing of the business isn't *carry-on fit checker*. It's **the people who measure luggage properly** — and fit is simply the sharpest thing that unlocks.

#### Checked bags specifically

Serve them **both** ways. As a destination for people who always check — `/luggage-for/[carrier]-checked`, a lightest-bags ranking, the 158 cm envelope. And as the natural continuation of a failed carry-on verdict:

> ▓ **It won't fit** — 5 cm too wide for Air France.
> So you'll be checking it. It's **12 cm inside** the 158 cm limit, and it weighs **3.4 kg empty**, leaving you 19.6 kg of allowance.

The second path costs nothing extra and catches someone at the moment they're deciding to buy.

An earlier draft cut checked baggage entirely as "weaker commercial intent." Wrong on both counts — checked bags cost more, sell as sets, and carry the highest AOV in the category.

Their two acute problems are ours already:

- **Empty weight eats the allowance.** A 5.5 kg hard-shell against a 23 kg limit leaves 17.5 kg of clothes; a 3.2 kg one leaves 19.8 kg. Nobody frames bag weight as a buying criterion, and makers underreport it exactly as they underreport dimensions.
- **Measurement error compounds.** Checked limits are *linear* — length + width + height ≤ 158 cm. A bag 1 cm over on each side is **3 cm** over the limit. Our measured-vs-claimed data matters more here than for carry-on, not less.

**Engine change is small:** an allowance where the constraint is `sum(dims) ≤ linear_max` plus a weight check. Same four bands, same provenance, same fare-class question ("does your ticket include a checked bag?").

**Do this in week one anyway: weigh every bag while it's on the table.** Thirty seconds each. It's the whole dataset for *"the lightest bag that still holds 23 kg"* — a ranking nobody has with verified numbers — and skipping it means physically handling all 80 bags again later.

Surfaces to build when this ships: `/luggage-for/[carrier]-checked`, `/checked/158cm`, and a **lightest-bags** ranking. Plus luggage scales as an accessory — cheap, high-conversion, and genuinely useful to the exact person reading the page.

**V1 keeps a cheap version of #1:** a hardcoded sentence on US regional brands. One paragraph, no data model — enough to prove the idea lands before building for it.

**Polish — whenever convenient**

Archive URLs · evidence tier taxonomy · `contested` flag · share cards and OG images · short links · traveller reports · comparison pages.

Everything here is written down. None of it is a prerequisite for finding out whether the core thing works.

## The one thing it must do

**Given an itinerary and a bag, return a verdict a frequent flyer would agree with.**

Everything else — the catalog, the affiliate links, the SEO pages, the design — is downstream of that sentence. If the verdicts are right, the product works and the rest is execution. If they're wrong, nothing else matters.

## Who this is for

**US passengers flying to Europe and Asia** — but that's two different people, with opposite economics. Both are essential, for different reasons.

| | **The light traveller** | **The occasional flier** |
|---|---|---|
| Who | Business and frequent travellers who go carry-on-only to move fast | Goes abroad every few years |
| Luggage | Already owns good bags, often several | Owns something old, or the wrong size |
| Knows | Their dimensions, roughly. Their usual carriers. | Nothing about fare classes or wheels |
| Returns? | **Yes — monthly, for years** | No. One burst, then gone. |
| Buys? | Rarely | **Yes — that's the visit** |
| Worth to us | **Credibility and distribution** | **Revenue** |

### Why both matter

**The light traveller is the validation layer.** They fly forty times a year and know in their body which carriers actually measure. If they say the strictness scores are right, the scores are right — and if they say we're wrong, we are. They're also the ones who post a link on r/onebag, cite us in a forum thread, and send corrections. Very little direct revenue; almost all of the trust.

**The occasional flier is the business.** High anxiety, high intent, and genuinely in the market for a suitcase. They need plain language and no assumed knowledge. They will not come back, and that's fine — the visit is the whole transaction.

This revises something stated below: the site is **mostly** an acquisition business, but not entirely. The frequent-flier segment does return, and features like Your Kit and rule-change alerts are aimed squarely at them — not at the majority.

### The design consequence

This is the real reason for the [disclosure ladder](03-ui-flows.md#the-disclosure-ladder). It isn't only a legibility nicety — it's **market structure**.

- **Level 0 must assume nothing.** Plain words, one tap, no jargon. If the occasional flier bounces, the revenue bounces.
- **Depth must be one tap away, not absent.** Sources, evidence, per-leg detail, weight headroom, multi-bag kits, hackable URLs. If the light traveller finds it shallow, we lose the people who make us credible.

A site that serves only the first is a toy. One that serves only the second is a spreadsheet. **The same page has to do both, and the ladder is how.**

### The thesis for this audience

> **Your American carry-on probably doesn't fit your flight.**

The US standard is 22 × 14 × 9 in — **55.9 × 35.6 × 22.9 cm**. Nearly every carry-on sold in America is built to it. Against the carriers this audience actually flies:

| Carrier | Limit | A standard US carry-on |
|---|---|---|
| Air France / KLM | 55 × 35 × 25 | **Over on two dimensions** |
| Lufthansa | 55 × 40 × 23 | Over on length |
| Most Asian full-service | 55 × 40 × 20 | Over on length, 3 cm too deep |
| Ryanair Basic | 40 × 30 × 20 (under-seat) | Not close |

This is alarming, true, and exactly the anxiety that drives search. It is also invisible to the traveler until they're at the gate.

### Why US buying advice fails this audience

Not a criticism of the reviewers — a structural mismatch, and the sharpest reason the site needs to exist.

**Almost every major luggage roundup is written in the US, for US domestic travel, against US limits — which are among the most permissive anywhere.** A bag that is genuinely the best choice for someone flying Chicago to Denver is calibrated to a standard much of the world doesn't accept.

A bag built to exactly 22 × 14 × 9 in is accepted by **9 of the 24 carriers** in our mock set — 38%. **Every carrier that rejects it outright is non-US:** Qatar, Ryanair, Vueling, Singapore, Emirates, Scoot, Wizz Air, Air France, KLM, Lufthansa, JAL, ANA, Turkish.

So the failure mode is perverse, and worth stating plainly on the site:

> **Doing the responsible thing — reading a good review site and buying its top pick — is what sets an American traveller up to fail abroad.** The better they research inside the US ecosystem, the worse the outcome on a European or Asian leg.

Cross-referencing our catalogue against one such roundup bears it out: five of its six picks that we hold clear fewer than 10 of 24 airlines, including its "best overall". See [04-data-sources.md](04-data-sources.md#let-the-best-of-lists-pick-the-queue).

**This is complementary, not adversarial.** They answer *is this a good bag* — durability, wheels, warranty — and answer it far better than we will. We answer *will it get on the plane*. Say so on every bag page.

> ⚠️ **Two related claims that did *not* survive checking**, recorded so nobody re-derives them:
> - *"US carriers are much more generous"* — only ~8% on average cabin volume in our set. Too weak to use.
> - *"United and Delta reject the US standard"* — an artefact of placeholder cm conversions in the mock data. US carriers publish in inches; verify against their own pages before ever stating this.

### Weight is the sleeper issue

**US carriers essentially never weigh a carry-on. Asian carriers weigh at check-in as routine** — Singapore and Cathay at 7 kg, Air China at 5 kg. An American traveler has likely never had a carry-on weighed and doesn't know it's a category of problem.

**Consequence for the engine:** weight must be a first-class verdict input, not a footnote. A bag that clears every dimension and fails on 7 kg produces the same gate outcome, and for this audience it may be the more common failure.

- `fit()` returns a weight verdict alongside the dimensional one
- The binding constraint may be weight; say so explicitly
- Bag records carry `weight_kg` as a required field, not optional
- Empty-bag weight is what we measure; packed weight is the user's problem, and the UI should say what headroom they have

### The killer itinerary

The realistic shape is **four legs, and the danger sits at both ends**:

```
ITHACA ──ERJ-145──▶ JFK ──widebody──▶ CDG ──Ryanair──▶ BARCELONA
   ▲                                              ▲
   bag taken at the jetbridge —                   bag doesn't fit
   legal, but the bin won't hold it               at any price
```

**Leg one — the small-airport origin.** Upstate NY is the archetype: Ithaca, Elmira, Binghamton and Watertown have no mainline service at all. Every departure is an ERJ-145 or CRJ-200, and a 22-inch roller doesn't fit the bin. The bag is fully legal and still gets taken at the jetbridge. Worse at Essential Air Service airports — Ogdensburg, Massena, Saranac Lake — where Cape Air's nine-seat Cessna 402s have weight-and-balance limits and "carry-on" means a personal item.

**Leg four — the budget carrier onward.** United to Paris is fine; Ryanair to Barcelona is not. Singapore in, Scoot onward — same shape.

**The middle two legs are the ones people worry about, and they're the safe ones.** That inversion is the product in miniature: the risk is where nobody is looking.

This is the scenario Door A should use as its worked example, and the reason the multi-leg envelope exists.

### Units

This audience thinks in inches and pounds and arrives in a centimetre-and-kilogram world.

**Inches first for US visitors, centimetres everywhere else, with an always-visible toggle.** Locale sets the opening default; an explicit choice overrides it and persists in `localStorage`.

**Inches lead because this site is for Americans** ([above](#who-this-is-for)). They think in inches, their bags are sold in inches, and making the primary audience translate on arrival is friction at exactly the wrong moment.

**The toggle is what protects everyone else.** Imperial-only would tell an EU or Asian visitor the site isn't for them — but a visible `in / cm` control in the header says the opposite in one glance. The default handles the majority; the toggle handles the rest; nobody is stuck.

**Dual display in exactly one situation.** Where a single figure *is* the argument — the universal envelope on the homepage — show both, secondary form in brackets:

> **40 × 30 × 20 cm** (15.7 × 11.8 × 7.9 in)

That figure is quoted, shared and remembered, and a reader shouldn't have to convert it to know whether it means anything to them. Everywhere else — cards, tables, per-leg rows, the gauge — **one unit only**, because a page made of dimensions becomes unreadable if every number is doubled. The toggle still governs which unit leads.

An earlier draft of this doc said *show both, always* and banned the toggle. That was wrong and would have wrecked the interface: nearly every element on this site is a dimension, and `55 cm (21.7 in) × 40 cm (15.7 in) × 20 cm (7.9 in)` is unreadable on a card, worse in a table, and hopeless on mobile. Pick a unit, show it consistently, let people switch.

## Usage model — read this before the architecture

**People use this hard for one to three days before a trip, then not again for a year, or ever.** They're about to fly somewhere significant, and they're either replacing old luggage or wondering whether what they own is about to get gate-checked.

That single fact drives most decisions below:

- **This is an acquisition business, not a retention business.** Every visit is effectively a new user. Judge the site on whether it ranks, how fast it answers, and whether it converts in-session — not on return rate, session count, or any other engagement metric. Those are vanity here.
- **Discoverability is the whole growth plan.** No app, no habit, no network effect. Google — and increasingly LLM answers — is the entire funnel. See [10-discoverability.md](10-discoverability.md).
- **A burst is many pageviews from one person.** Good for display revenue, and it means internal linking earns its keep: verdict → related bags → other carriers on the same trip.
- **Retention features are worth less than they look.** Rule-change alerts are still worth building — they're cheap and no competitor has them — but they are not the growth engine, and shouldn't be resourced as if they were.
- **Better email hook: "email me this verdict."** An in-burst utility for someone comparing bags over three days, rather than a retention pitch to someone who won't come back. Same address captured, much higher take rate.

## Architecture

Two axes, and they're independent — an earlier draft of this doc wrongly collapsed them into "no backend."

### Read path: server-rendered, in three tiers

The requirement is that **every URL returns real HTML when fetched.** Whether that HTML was built ahead of time or rendered on request is an implementation detail — both are equally crawlable, and conflating "static" with "indexable" is a mistake an earlier draft of this doc made.

| Tier | Rendering | Examples |
|---|---|---|
| **Promoted** | Pre-rendered at build, in the sitemap | `/airline/*`, `/airline/*-[fare]`, `/size/*`, `/bag/*`, `/region/*`, guides |
| **Available** | Server-rendered on demand, cached, not in the sitemap | `/bag/[slug]/[carrier]` and other combinatorial routes |
| **Ephemeral** | Client-side | Door inputs, filter state, unit preference |

Source data stays in version-controlled JSON regardless — that's what makes the `verified_at` discipline enforceable in code review, with every correction a reviewable diff.

**The rule that matters:** a stranger landing on any indexable URL gets the answer in the initial HTML, above the fold, without an interaction. Time-to-answer is the product.

**Cache invalidation:** on-demand pages are computed from carrier and bag data — purge on any data change. A cached verdict built on a superseded allowance is precisely the failure this product exists to prevent.

### Write path: a backend, scoped deliberately

Some features genuinely need to write, and we shouldn't contort the product to avoid them. A thin API — serverless functions plus a small managed database — is the right call where a feature earns it.

**In scope for v1:**

| Feature | Why it needs a write path |
|---|---|
| Email capture | "Email me this verdict" and rule-change alerts |
| Outbound click tracking | Amazon's reporting is degrading; we must measure our own conversion |
| Feedback | "This is wrong" on any allowance or measurement — a correction channel from people who just got burned is the cheapest data-quality mechanism available |

**Deferred, but designed for:**

| Feature | Revisit when |
|---|---|
| Reader-submitted measurements | Post-launch; photo required |
| Crowdsourced enforcement reports | There's traffic to generate volume |
| Accounts | There's a reason `localStorage` isn't enough |

**The rule:** a feature may use the backend when it needs to persist something. It may not move the read path off static rendering. If a page a stranger can land on requires a round trip to render its answer, that's a regression against the only growth channel this site has.

Your Kit stays in `localStorage` — it's a within-burst convenience for comparing bags across a few days, not a cross-year retention tool, and it doesn't need an account to do that job.

## In scope

### The engine
- `envelope(legs[])` → strictest common box across an itinerary
- `fit(bag, allowance, carrier)` → one of four verdict bands, with the binding dimension, the delta, and the fee if wrong
- Pure functions, full unit test suite. This is the one place where a bug costs a user money.

### The data
- **50 carriers.** Hand-entered, each with a source URL and a `verified_at` date.
- **Fare-class rows for the twelve that matter:** Ryanair, Wizz, easyJet, Vueling, Spirit, Frontier, Lufthansa, American, United, Delta, British Airways, Air France.
- **Strictness score per carrier**, with written basis. Published methodology page ships in the same pass — it's a trust asset, not documentation.
- **60–80 bags.** Physically measured wherever possible; the rest marked `manufacturer` and visibly labeled as such.

### The screens
- One results view — envelope, verdict, bag grid, filters
- Three entry doors routing into it (see [03-ui-flows.md](03-ui-flows.md))
- Static pages: `/luggage-for/[carrier]-[fare]`, `/size/[w]x[h]x[d]`, `/bag/[slug]`. `/airline/*` exists as unpromoted reference only ([15](15-sitemap.md)).
- Methodology page
- Source register (annotated, not a link dump)

### The money
- Awin first — Béis, Monos, Nomatic, Db
- Amazon as link-only fallback, **no prices** (see [06-monetization.md](06-monetization.md) for why this is a hard constraint, not a choice)
- Own click tracking from day one

### The hook
- **Your Kit** — save bags you own, `localStorage`, no account
- Email capture for rule-change alerts. One field, placed *after* the verdict, never before it.

## Explicitly out of scope

| Cut | Why |
|---|---|
| User accounts | `localStorage` carries Your Kit until there's a reason to need more |
| Crowdsourced enforcement reports | Needs traffic first. Leave a slot in the UI. |
| AR measurement | Accuracy unproven, and it's a week of work alone |
| Price tracking / price-drop alerts | Prohibited outright by the Amazon operating agreement |
| Amazon price display | Blocked until 10 sales/30 days unlocks the Creators API |
| Checked-bag *pages and rankings* | Data is collected in the same audit pass and shown in the failed-carry-on flow; dedicated pages are queue item 5 ([above](#checked-bags-specifically)) |
| Multi-currency | USD and EUR only |
| Aircraft-level underseat modeling | Real, but a rabbit hole. Note it as a known limitation. |
| Multi-leg beyond 4 segments | Cover the 95% case |

## Two-week plan

### Week one — get the truth into a file

1. **Carrier data — migrate and audit, don't re-collect.** Target is **50 carriers** ([04](04-data-sources.md#the-launch-50)). The existing prototype already carries **~39** with dimensions, weights and regional grouping. Most of the collection work is done; the blank page is gone.

   What it does **not** yet have — and what the whole trust argument rests on:

   | Field | Status | Why it's non-negotiable |
   |---|---|---|
   | `source_url` per allowance | Likely missing | The user must be able to check us ([05](05-schema.md#source-linking)) |
   | `verified_at` per allowance | Likely missing | Displayed in the UI; drives staleness checks |
   | `archive_url` | Missing | Keeps the citation honest when the carrier edits the page |
   | Fare-class rows | Missing | The largest single source of false green lights |
   | `strictness.evidence` | Missing | The differentiator |
   | `gauge_cm` vs `max_cm` | Missing | Ryanair's frame ≠ Ryanair's published number |

   **The audit pass is still ~1.5 days and cannot be skipped.** For each of the 39: open the carrier's official page, confirm the number, record the URL, archive it, date it, then add fare-class rows for the twelve that matter. **Inherited numbers with no provenance are exactly what we criticize the category for** — and a wrong number we adopted without checking is worse than one we never had.

   *Extraction step:* pull the carrier array out of the prototype into `data/carriers/` as JSON before anything else, so the audit runs against version control and every correction is a reviewable diff.
2. **Strictness scores** with written basis per carrier. Draft the methodology page while the reasoning is fresh.
3. **Bag measurement.** Measure what you can reach. Photograph the tape measure — that photo is the proof, and it's the whole moat in one image.
4. **The engine + tests.** Pure functions, no UI.

### Week two — build the one screen

1. **Results view.** Envelope, verdict rows, bag grid, filters on price, rating, band, region coverage.
2. **Three doors.** Door C (region-first) is the homepage — it's the only one that works with zero input.
3. **Static pages** per airline, per size, per bag. This is the entire acquisition strategy.
4. **Affiliate wiring.** Awin first. Own click tracking — Amazon's reporting is degrading and you cannot rely on it to measure your own conversion rate.
5. **Email capture** on rule-change alerts.

## Definition of done

Ship when all of these are true:

- [ ] Ten real itineraries produce verdicts that a frequent flyer agrees with on review
- [ ] Every published allowance carries a visible source link and `verified_at` date
- [ ] Every published dimension carries a visible provenance badge
- [ ] The engine's test suite covers all four bands plus the fare-class gate
- [ ] Affiliate disclosure appears at the point of recommendation, above the link — not in the footer
- [ ] Airline, size, and bag pages render fully with JavaScript disabled
- [ ] Methodology page is live and explains the strictness score
- [ ] No Amazon price appears anywhere on the site

## The first thing to test after launch

Not the design and not the catalog — **the strictness scores.** Put them in front of people who fly forty times a year. If those feel right, the product works. If they don't, nothing downstream matters and the fix is upstream of everything.
