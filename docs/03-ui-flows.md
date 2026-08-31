# UI flows

## The Strip — the one component

Everything below describes the three pathways. **In the interface they are not three things.** They're one component with three slots, and the "door" is simply whichever slot you fill first.

Named for the flight progress strip — the paper slips controllers use. One row, fixed slots, scannable, and useful when it's only partly filled.

### Empty

```
┌──────────────────────────────────────────────────────────────┐
│  YOUR BAG              FLYING                    FARE        │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────┐   │
│  │  add a bag      │   │  add an airline │   │     —     │   │
│  └─────────────────┘   └─────────────────┘   └───────────┘   │
│                                                              │
│  Fill in whichever you know. Any one of them gets an answer. │
└──────────────────────────────────────────────────────────────┘
```

### One slot filled — already an answer

```
┌──────────────────────────────────────────────────────────────┐
│  YOUR BAG              FLYING                    FARE        │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────┐   │
│  │ Away Bigger   ✕ │   │  add an airline │   │     —     │   │
│  │ 56×40×24 ◆      │   └─────────────────┘   └───────────┘   │
│  └─────────────────┘                                         │
├──────────────────────────────────────────────────────────────┤
│  FLIES ON 31 OF 50 AIRLINES                                  │
│  Fails: Air France · KLM · Ryanair Basic · Wizz · +15        │
│                                          ▸ add an airline    │
└──────────────────────────────────────────────────────────────┘
```

### Filled

```
┌──────────────────────────────────────────────────────────────┐
│  YOUR BAG              FLYING                    FARE        │
│  ┌─────────────────┐   ┌─────────────────┐   ┌───────────┐   │
│  │ Away Bigger   ✕ │   │ Air France    ✕ │   │ Economy ▾ │   │
│  │ 56×40×24 ◆      │   │ + add a leg     │   └───────────┘   │
│  └─────────────────┘   └─────────────────┘                   │
├──────────────────────────────────────────────────────────────┤
│  ▓ WON'T FLY                                                 │
│  1 cm too long, 5 cm too wide. €70 at the gate.              │
│  Air France: 55 × 35 × 25 cm · source · verified 28 Aug      │
└──────────────────────────────────────────────────────────────┘
```

### The rule that makes it work

> **Every partial state is a complete answer.**

Not a wizard with steps you must finish. A set of slots where *any subset returns something useful* — which is what lets someone start from whatever they happen to know, and why nobody ever hits a "please complete all fields" wall.

| Filled | Answer |
|---|---|
| Bag only | Flies on *n* of 50 — and which ones fail |
| Airline only | The envelope, and bags that clear it |
| Airline + fare | The precise envelope, with the fare trap named |
| Bag + airline | The verdict |
| All three | The verdict, exact |
| Nothing | The universal envelope |

### Progressive disclosure

Complexity appears only once it means something:

- **Fare** is inert until an airline is chosen — it has no meaning before that. Once set, it's the loudest control on the strip, because it's the largest source of false green lights.
- **`+ add a leg`** appears only after the first airline. Multi-leg is the power case; it shouldn't tax the single-leg majority.
- **Region** ("or anywhere in Europe") is an alternate for the airline slot, offered inside it — not a fourth slot.
- **Risk, filters, units** live below with the results, collapsed. Never in the strip.

### Behavior

- **Never navigates.** Slots expand inline, results update live below. The homepage is the tool.
- Tapping a slot expands it in place — typeahead plus chips for common values. No modals, no dropdowns that cover the answer.
- Each slot writes to the URL ([11](11-sharing-and-permalinks.md)) so the state is shareable and survives a phone-to-laptop handoff.
- On mobile the slots stack; the answer stays pinned below and visible.
- The [split-flap](02-design-system.md#motion) fires on the verdict when it changes. Nowhere else.

---

## The architectural claim

**Three doors, one room.** The pathways are not three products — they are three ways of arriving at the same object: an **envelope**, the largest box clearing every constraint in play. All three converge on one results screen.

In the interface, they're the three slots above. This is the reason a two-week build is possible: build the strip and the results view once, and the doors stop being features.

```
Door A  itinerary ──┐
Door B  bag ────────┼──→  envelope  ──→  RESULTS  ──→  verdict + ranked bags
Door C  region ─────┘
```

Door B differs in one respect: it carries a bag *into* the results, so the screen leads with a verdict on that bag. A and C arrive empty-handed and lead with the envelope.

---

## Door C — Region-first (the homepage)

Ranked first because it is the homepage, the SEO surface, and the only door that works with zero user input. It is also where the highest commercial intent lives: someone asking for a bag that works everywhere is someone about to buy a bag.

### Screen

```
┌────────────────────────────────────────────────────────────┐
│  LUGGAGE THAT ACTUALLY FITS                                │
│  Measured by us. Wheels and handles included.              │
│                                                            │
│  I need a bag that works across                            │
│  ┌────────┐┌────────┐┌──────────────┐┌────────────┐        │
│  │ EUROPE ││  ASIA  ││ NORTH AMERICA││ EVERYWHERE │        │
│  └────────┘└────────┘└──────────────┘└────────────┘        │
│                                                            │
│  and I'll accept                                           │
│  ○ every carrier   ● 95% of carriers   ○ 90%               │
└────────────────────────────────────────────────────────────┘
```

The coverage toggle is the interesting control and it needs to feel like a tradeoff, not a setting. Selecting 100% shrinks the envelope visibly and names what it costs: *"Clears all 100 carriers. Wizz Air and Gulf Air are what make this small."*

### Result

Envelope stated at full display size in mono, the gauge graphic beneath it, then the bag grid. Below that: the excluded-carrier list, always visible, never behind a disclosure. Naming what you *don't* cover is the cheapest trust purchase available.

---

## Door A — Itinerary-first

### Screen

Legs are added as departure-board rows. Fare class is a required field, not an optional refinement — it's the single largest source of false green lights in every competing tool, and defaulting it silently would reproduce their bug.

```
┌────────────────────────────────────────────────────────────┐
│  WHO ARE YOU FLYING?                                       │
│                                                            │
│  CARRIER          ROUTE          FARE                      │
│  ┌─────────────┐ ┌───────────┐ ┌────────────┐              │
│  │ Ryanair   ▾ │ │ STN → ALC │ │ Basic    ▾ │   ✕          │
│  └─────────────┘ └───────────┘ └────────────┘              │
│  ┌─────────────┐ ┌───────────┐ ┌────────────┐              │
│  │ Vueling   ▾ │ │ ALC → BCN │ │ Basic    ▾ │   ✕          │
│  └─────────────┘ └───────────┘ └────────────┘              │
│                                                            │
│  + ADD A LEG                                               │
└────────────────────────────────────────────────────────────┘
```

**Fare class is the interaction that carries the product's intelligence.** Luggage Validator models fare class correctly and still buries the consequence in a caveat. The data model isn't the hard part — **articulating what it means to a person is.**

The failure underneath it: many travelers don't hold "personal item" and "cabin bag" as separate categories at all. They think "carry-on" is one thing. So a warning phrased as a rule doesn't land — it has to be phrased as *what you get*.

**Show slots, not rules.** The clearest possible articulation:

```
RYANAIR · BASIC — WHAT THIS FARE INCLUDES

  ✓  UNDER THE SEAT     40 × 30 × 20 cm      included
  ✕  OVERHEAD BIN       not on this fare     +£/€ to add at booking

  Your envelope below is for the under-seat item.
```

Two slots, one filled and one struck out, with the size on the one you have. A traveler understands that instantly in a way they don't understand "Basic fares include a small personal item only, subject to conditions."

**Never let a fare downgrade be silent.** If the user switches from Standard to Basic and their bag goes from CLEARS to WON'T, the change is announced, not just recalculated:

> Switching to Basic removed your overhead bin allowance. Your bag no longer fits.

That single interaction is worth more than the rest of the screen, and no competitor articulates it.

### Result

Envelope, then a departure-row per leg showing which one binds:

```
FR   STN → ALC   BASIC     40×30×20   ← BINDS on all three
VY   ALC → BCN   BASIC     40×30×20   ← BINDS on width
```

Naming the binding leg turns a number into an explanation, and explanations are what get shared.

---

## Door B — Bag-first

### The cold-start problem — get this right and Door B wins

**Most people don't know their bag's dimensions.** They have a bag in a closet and no tape measure. CarryFit — the best-built tool in the category — opens by asking for three numbers, and that's the moment most visitors leave.

Never open with a dimension input. Open with identification:

> **What bag do you have?**
> `[ Away Bigger Carry-On                    ]`
> Don't know the model? · Enter dimensions instead

The inversion is the entire moat expressed as one interaction: **you don't measure your bag — tell us what it is, and we already did.** No competitor can offer that, because none of them measured anything.

Fallback ladder, in order of preference:

| If they… | Offer |
|---|---|
| Know brand + model | Typeahead → our measured dimensions. **The default path.** |
| Know the brand only | Show that brand's range with photos, let them point at it |
| Know only "it's a 22-inch carry-on" | Show what bags marketed that way actually measure — a category answer, and a persuasive one |
| Know nothing | Measuring guide, with the wheels-and-handles warning up front |
| Have a tape measure already | Direct dimension entry, always available, never the opener |

### Screen

Three ways in, ordered by how many people can use them:

1. **Pick a known bag** — typeahead over the catalog. **The primary path.** Selecting one loads our *measured* dimensions and shows the manufacturer's claim struck through beside it. This is the single most persuasive moment on the entire site:

   > Monos Carry-On Pro
   > **56 × 40 × 23 cm** ◆ measured
   > ~~55 × 40 × 20 cm~~ manufacturer claim

   No argument needed. The strikethrough makes the case.

2. **Enter dimensions** — three mono steppers. Copy under them reads: *"Measure the widest points. Include wheels, handles, and any pocket that bulges when packed."* Plus a soft-bag checkbox, which unlocks the compression allowance in the engine.

Then the same itinerary control from Door A.

### Result

Leads with the verdict at full display size, split-flap resolve, then the per-leg breakdown, then — only if any leg fails — the upgrade path:

```
▓ WON'T FLY
Wizz Air, 5 cm too wide. €70 at the gate.

────────────────────────────────────────
BAGS THAT WOULD CLEAR THIS TRIP
[grid]
```

**Sequencing matters here.** The verdict is the service; the recommendation is the consequence. Leading with products on a query that was a question would make the site read as what it's trying not to be. A user whose bag passes gets a clean "you're fine" and no product grid at all — and that restraint is what makes the recommendation credible when it does appear.

---

## The results screen

One screen, three entry states.

```
┌────────────────────────────────────────────────────────────┐
│  [ VERDICT or ENVELOPE — full display size ]               │
│  [ gauge graphic: bag inside the sizer frame ]             │
├────────────────────────────────────────────────────────────┤
│  PER-LEG BREAKDOWN — departure rows                        │
├──────────┬─────────────────────────────────────────────────┤
│ FILTERS  │  BAG GRID                                       │
│          │                                                 │
│ Price    │  [card] [card] [card]                           │
│ Band     │  [card] [card] [card]                           │
│ Coverage │                                                 │
│ Softside │                                                 │
│ Brand    │                                                 │
├──────────┴─────────────────────────────────────────────────┤
│  SOURCES — per-carrier links + verified dates              │
└────────────────────────────────────────────────────────────┘
```

### Filters — the rail

Modelled on flight-aggregator filter rails: simple by default, arbitrarily specific on demand. Three patterns worth taking directly from KAYAK's:

1. **Annotate every option with its consequence.** KAYAK puts `$852` next to "2+ stops" so you know the cost of the filter before applying it. Ours shows counts: `CLEARS (12)`, `AT THE LINE (7)`. Never make someone apply a filter to discover it returns nothing.
2. **Disable, don't hide.** KAYAK greys out "Nonstop" when none exist rather than removing it. If no bag in the catalog clears this itinerary, `CLEARS (0)` stays visible and greyed — absence is information.
3. **One control per leg.** KAYAK gives separate time sliders for each direction. Multi-leg itineraries get per-leg rows, not a merged blur.

**Sections, collapsed by default except the first two:**

| Section | Control | Notes |
|---|---|---|
| **Risk** | 3-position segmented | The headline control — see below |
| **Verdict** | Checkboxes + counts | `CLEARS (12)` · `AT THE LINE (7)` · `GAMBLE (4)` |
| **Coverage** | Checkboxes | "Also works across Europe" / "Works everywhere" |
| Price | Dual range | |
| Type | Toggle | Soft / hard / expandable |
| Brand | Checkbox list | Collapsed past 6 |
| **Sources** | Expandable | Advanced. Contested carriers and evidence weighting. |

**Coverage is the commercial filter.** It converts a trip-specific answer into a purchase rationale — someone shopping for one trip is browsing; someone told a bag solves *every* trip is buying.

### The risk control

The single most important control on the page, and it replaces asking the user to referee sources.

```
HOW MUCH RISK?
┌────────────┬────────────┬────────────┐
│   STRICT   │  BALANCED  │ CHANCE IT  │
└────────────┴────────────┴────────────┘
             ↑ default
```

| Position | Behavior |
|---|---|
| **Strict** | Published limits only. Enforcement evidence ignored entirely. `GAMBLE` disappears; anything over is `WON'T`. For people who cannot risk a fee. |
| **Balanced** | Default. The four bands as specified in the schema. |
| **Chance it** | Surfaces `GAMBLE` results prominently with the looser evidence inline. Never changes a `WON'T` — the hard ceiling stays hard. |

This is the tolerance model made tangible in one control, and it's honest: the user sets their own risk appetite rather than us deciding for them. It also does the fare-class job KAYAK does with "Hide basic tickets" — a **"My fare includes a cabin bag"** toggle sits directly beneath it, because that's the same trap in the same place.

---

## Defaults — the governing rule

> **A user who touches nothing gets a good answer.** Every control below is pre-set. The specificity is available, never required.

Most people arrive from a search, anxious, on a phone, and want one thing. The filter rail exists for the minority who want to interrogate the answer — it must never tax the majority who don't.

### Every default, and why

| Control | Default | Reasoning |
|---|---|---|
| Risk | **Balanced** | The four bands as specified. Honest without being alarmist. |
| Filter rail | **Collapsed** | On desktop a summary line, not an open sidebar. On mobile a bottom sheet behind one button. |
| Verdict filter | **All shown** | Hiding results by default hides the answer |
| Fare class | **Standard economy** | Most common, and we warn loudly when it matters |
| Units | **in / lb** for US visitors, **cm / kg** elsewhere; header toggle, remembered | Locale sets the default, the toggle is always visible — see [01](01-mvp.md#units) |
| Sort | **Verdict, then price** | Bags that clear come first. Not sponsored, not rate. |
| Coverage | **Off** | Trip-specific unless they ask to broaden |
| Sources panel | **Collapsed** | Present for the 2% who look, invisible to the 98% |
| Soft-bag compression | **Applied when `soft: true`** | A physical property, not a preference |
| Expansion zip | **Off** | Expanding is the user's choice and a known trap |

### The disclosure ladder

```
Level 0   The verdict.                    no input, no controls to consider
Level 1   Filters.                        one tap
Level 2   Evidence behind a claim.        one tap on an inline marker
Level 3   Full methodology.               a link
```

Each level is one interaction from the last, and **nothing at level 1 or below is required to reach a correct answer.**

### Mobile

The rail is a bottom sheet behind a single `Filters` button showing the active count. Never a sidebar, never a permanently visible panel. Given burst-usage behavior, phone is likely the majority case and should be designed first.

---

## Holding disagreement

Travel publications reach different conclusions about this, and the interface has to accommodate that without becoming a debate.

### Scope the problem first

Disagreement is narrower than it appears, because **publications don't get a vote on the published limit.** That comes from the carrier's own page, primary-sourced and dated. Publications legitimately differ on exactly two things:

| What's contested | Where it lives | How it's handled |
|---|---|---|
| **Enforcement** — is this carrier actually strict? | `strictness.evidence` | Weighted, with `contested: true` when credible sources conflict |
| **Measurement** — how big is this bag really? | `claimed_cm` vs `measured_cm` vs `provenance` | Show all figures we have, attributed |

Everything else is settled by going to the source.

### The stance

> **We synthesize, then show our work. We do not ask the user to referee.**

Making someone choose between Wirecutter and Travel + Leisure offloads our job onto them — synthesis is the product's value. But the synthesis has to be inspectable, or it's just another unsourced assertion.

So: one answer by default, the disagreement one tap away.

### Contested carriers

An inline marker on the strictness score, nothing more at rest:

```
STRICTNESS  6/10  ⚑ sources differ
```

Expanded:

```
⚑ SOURCES DIFFER ON THIS CARRIER

STRICTER  Trade press, Mar 2026 — gate agents measuring on
          European routes                    [source]
LOOSER    Carrier statement, Oct 2025 — gate sizers removed,
          agents told to err toward the customer   [source]

We scored 6/10, weighting the carrier's own policy change
most heavily. Both sources are dated and linked — judge for
yourself.
```

**Disagreement is information, not a defect.** A carrier where credible sources conflict genuinely *is* less predictable, and saying so is more useful than silently averaging to a confident-looking number.

### Contested measurements

The bag page shows every figure we have, attributed:

```
MEASURED BY US    56 × 40 × 23 cm   ◆  24 Aug 2026  [photo]
MANUFACTURER      55 × 40 × 20 cm   ◇  monos.com
CONSUMER REPORTS  56 × 40 × 22 cm   ○  Mar 2024     [source]
```

We compute from ours and say so. Showing the others costs three lines and is the most persuasive block on the page — the spread *is* the argument for why measuring matters.

### What not to do

- **No source-weighting sliders.** "Trust Wirecutter 60%" is a toy, not a tool.
- **No averaging without disclosure.** A confident number hiding a real conflict is the failure this whole section exists to prevent.
- **No hiding a conflict to look authoritative.** Surfacing it *is* the authority.
- **No debate framing.** Not "experts disagree" — that reads as evasion. Show two dated facts and our weighting.

### Sources footer

Every carrier used in the calculation, its source URL, and its `verified_at` date. Permanently visible, not collapsed. This is the cheapest credibility on the site and it costs a footer.

---

## Static pages

Not marketing pages — this is the whole acquisition strategy. Server-rendered, fully functional with JavaScript disabled. Two competing tools render nothing without JS, which makes them invisible to crawlers and to LLM answers.

| Route | Content | Query it answers |
|---|---|---|
| `/luggage-for/[carrier]` | Bags that clear this airline, with the allowance as sourced context | "best carry on for ryanair" |
| `/luggage-for/[carrier]-[fare]` | The fare trap, plus the bags that survive it | "luggage that fits ryanair basic" |
| `/size/[w]x[h]x[d]` | Which carriers accept this box, which bags match | "55x40x20 luggage" |
| `/bag/[slug]` | Measured vs claimed, coverage %, per-carrier table | "monos carry on pro size" |
| `/methodology` | How strictness is scored, how bags are measured | trust, and citations |
| `/sources` | The annotated register | trust |

`/luggage-for/[carrier]-[fare]` is the sleeper. Nobody targets those queries, they carry the highest anxiety, and — unlike the policy-query equivalent — no airline competes for them. `/airline/*` pages exist for transparency and internal linking but are **not** an SEO surface ([10](10-discoverability.md)).

---

## Cross-cutting

### Your Kit
Persistent bar once a bag is saved: *"Your Kit: Monos Carry-On Pro"* with a check-another-trip link. `localStorage`, no account. This is the return-visit engine.

### Rule-change alerts
Email capture appears **after** a verdict, never before, and never as a modal. The pitch is specific, because a specific pitch converts and a generic one annoys:

> Ryanair changed its underseat allowance on 4 Sept 2025. We'll email you if a rule on this trip changes.

### Affiliate disclosure
At the point of recommendation, above the first link, in the same visual block. Not the footer — the FTC is explicit that a sitewide footer disclaimer does not satisfy the standard.

### Empty and error states
- **No bags clear** → *"Nothing in our catalog clears this itinerary. The binding constraint is Wizz Air at 40 × 30 × 20."* Then show the closest misses with their deltas. A dead end with an explanation is still useful.
- **Carrier not in our data** → say so plainly and exclude it from the calculation rather than guessing. Offer the alert signup.
- **Dimensions look implausible** (any side > 120cm) → inline note asking whether they meant inches. Don't block.

### Accessibility
Verdict never communicated by color alone — always color block plus uppercase label plus text. Steppers are real number inputs. Visible focus rings, `--amber` at 2px offset. Departure rows are real tables with proper headers. Target WCAG 2.1 AA; the contrast targets in the design system already clear it.
