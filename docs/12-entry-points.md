# Entry points

Two coupled questions: what does a stranger see when they arrive with no context, and which deep pages should we invite strangers into at all.

---

## Part 1 — What's safe to land on cold

### The test

> **Does this page make sense to someone with zero context, no input, and no memory of how they got here?**

A page can be excellent as a destination *inside* the app and terrible as a Google landing, because someone inside has state — a bag, an itinerary — and someone from a search has nothing.

### Noun pages vs. query-state URLs

| | Noun page | Query-state URL |
|---|---|---|
| Describes | A stable thing | One person's momentary question |
| Example | `/luggage-for/ryanair-basic` | `/check?bag=monos&legs=FR.basic` |
| Timeless? | Yes | No |
| Shareable? | Yes | Yes |
| **Indexable?** | **Yes** | **No — `noindex`** |

Both are shareable. Only nouns are indexable. Landing on a stranger's saved query is confusing in exactly the way you'd expect, and it dilutes our own pages by competing with them for the same terms.

### Verdict per page type

| Route | Cold landing? | Reasoning |
|---|---|---|
| `/luggage-for/[carrier]-[fare]` | ✅ **Strongest** | A shopping question with urgency. The spearhead. |
| `/bag/[slug]` | ✅ **Strong** | "Is the Monos Carry-On Pro too big?" Our measurement, commercially valuable |
| `/bag/[slug]/[carrier]` | ✅ **Strong** | The most specific complete question there is. Zero ambiguity. |
| `/size/[l]x[w]x[d]` | ⚠️ **Conditional** | Only if framed as an *answer* — "Bags this size fly on 62 of the 100 airlines we track" — not as a filter result |
| `/region/[slug]` | ✅ Fine | "What size luggage works in Europe?" |
| `/airline/[slug]` | ⚠️ **Reference only** | Exists for transparency and internal linking. **Not an SEO surface** — we can't outrank the airline for its own policy, and the intent is wrong. See [10-discoverability.md](10-discoverability.md). |
| `/check?…` | ❌ **`noindex`** | App state, not a page |
| Filter permutations | ❌ Never a URL | Ephemeral by definition |
| Paginated grids | ❌ Don't paginate | Load more, single URL |

### Two rules that keep quality up

**1. Only index bag pages for bags we've measured.**

A bag page showing nothing but manufacturer claims is the exact content we criticize everyone else for publishing. Indexing it undercuts our own positioning and gives a visitor no reason to prefer us. Unmeasured bags exist in the catalog and are reachable — they just aren't invited in from search until someone has put a tape on them.

This also makes the measurement queue self-prioritizing: the bags people search for are the bags worth measuring next.

**2. Every deep page carries context forward.**

The failure mode is an orphan landing — a correct answer with no obvious next move. Every deep page needs three things:

- The answer **above the fold, in text, no interaction**
- A next action **specific to why they landed** — on `/luggage-for/ryanair` the CTA is *"Check your bag against Ryanair,"* pre-loaded with Ryanair, never a generic "try our tool"
- Internal links that make sense **from here** — fare variants, bags that clear, the region envelope

Context carrying forward is most of the difference between a landing page that converts and one that bounces.

---

## Part 2 — The cold homepage

### The governing idea

**Demonstrate, then ask.**

An earlier draft opened with the universal envelope — *40 × 30 × 20 cm flies everywhere*. That was wrong, and worth explaining why: **it's a fact, not a hook.** It's useful, it's true, and nothing about it is about *you*. It creates no tension and gives no reason to keep reading.

The strongest asset we have is the one thing no competitor can show: **the gap between what the label says and what we measured.** Lead with it as a demonstration on a bag people recognize, and the visitor's first thought is *"wait — what about mine?"* That question is the engagement.

> **Show the gap. Then ask about their bag. Everything else is below the fold.**

### The attention budget

| Window | What has to happen |
|---|---|
| **0–3s** | Self-relevant tension. Not a form, not a stat. |
| **3–10s** | One input, one tap, immediate payoff |
| **10–30s** | Proof that we're credible |
| **30s+** | What to buy |

### Sketch

```
┌──────────────────────────────────────────────────────────────┐
│  SIZER              Bags  Airlines  Guide  [ Check a bag ]   │
├──────────────────────────────────────────────────────────────┤
│                                                              │
│   MOST CARRY-ONS ARE BIGGER THAN THE LABEL SAYS              │
│                                                              │
│   AWAY BIGGER CARRY-ON                                       │
│                                                              │
│   Away says      5 5 × 4 0 × 2 3  cm                         │
│   We measured    5 6 × 4 0 × 2 4  cm   ◆ photo               │
│                  └──── flips on load ────┘                   │
│                                                              │
│   One centimetre. Enough to be turned away at the            │
│   Air France gate — because Away doesn't measure wheels.     │
│                                                              │
├──────────────────────────────────────────────────────────────┤
│   THE STRIP                                                  │
│                                                              │
│   YOUR BAG              FLYING                    FARE       │
│   ┌────────────────┐   ┌────────────────┐   ┌───────────┐    │
│   │  add a bag     │   │ add an airline │   │     —     │    │
│   └────────────────┘   └────────────────┘   └───────────┘    │
│                                                              │
│   ( Away Bigger )( Monos Pro )( Samsonite Winfield )         │
│   ( Ryanair )( Air France )( I don't know → )                │
│                                                              │
│   Fill in whichever you know. Any one gets an answer.        │
├──────────────────────────────────────────────────────────────┤
│   ▸ THE ANSWER — updates live, never navigates               │
│                                                              │
│   Nothing filled: 40 × 30 × 20 cm flies on all 100 airlines   │
│                   ▓ 12 bags we've measured clear it →        │
├──────────────────────────────────────────────────────────────┤
│   LUGGAGE FOR A STRICT AIRLINE                               │
│   Ryanair Basic · Wizz Air · easyJet · Spirit ·              │
│   Frontier · Vueling · Lufthansa Basic · …                   │
├──────────────────────────────────────────────────────────────┤
│   How we measure  ·  Our sources  ·  What we get wrong       │
└──────────────────────────────────────────────────────────────┘
```

### Why each block earns its place

| Block | Job |
|---|---|
| **The gap** | Attention, in one image. Shows rather than claims, on a bag people own. Proves the moat before asking for anything. |
| **The Strip** | The whole tool, [specced in 03](03-ui-flows.md#the-strip--the-one-component). Three slots, fill any one, answer appears below. No navigation, no wizard, no empty state — the universal envelope is what it shows before you touch it. |
| **The answer** | Lives directly beneath the strip and updates live. This is why nobody leaves the homepage. |
| **Luggage for a strict airline** | Crawl paths to `/luggage-for/*`, and a shortcut for anyone who already knows their problem carrier. Weighted strict — that's where anxiety and purchase intent are. |
| **Footer** | *"What we get wrong"* is a real page. A known-limitations list is the cheapest credibility available and nobody in this category has one. |

### The one animation, spent here

The [split-flap](02-design-system.md#motion) fires once on load: the manufacturer's number flips to ours, digit by digit. It is the brand, the moat and the signature motion in a single gesture — the page literally shows the number changing. Nothing else on the site animates.

Straight cut under `prefers-reduced-motion`.

### Chips do the real work

The typeahead is the obvious control; the chips are what convert. Four recognizable bags plus **"I don't know →"** means a visitor goes from landing to a personal, surprising answer in **one tap, no typing** — which is the whole engagement problem solved.

Pick the four by search volume, not by margin. If the first tap feels like an ad, the demonstration above it stops being believable.

### What the homepage must not do

- **No modal, no email gate, no cookie wall before the answer.** A competitor email-gates their tool and it's the main reason they're beatable.
- **No carousel, no hero photograph of a smiling traveler.** The number is the hero.
- **No "as featured in" logos** we haven't earned.
- **No product grid above the envelope.** The verdict is the service; the recommendation is the consequence.
- **No ads above the fold.** Ever, on any page.

---

## Part 3 — Which deep links to actively promote

Not everything indexable deserves to be *promoted*. Sitemap inclusion is a claim that a page deserves to rank.

| Tier | Pages | Sitemap | Effort |
|---|---|---|---|
| **Push hard** | `/luggage-for/[carrier]-[fare]` — the 12 fare-class carriers | ✅ | Hand-written, real recommendations, FAQ schema |
| **Push** | `/bag/[slug]` — **measured bags only** | ✅ | Templated, but the data is unique to us |
| **Publish** | `/size/*` (~20 common sizes), `/region/*` (4), `/luggage-for/[carrier]` | ✅ | Templated |
| **Available** | `/bag/[slug]/[carrier]` | ❌ | On demand, cached, indexable, not claimed |
| **Reference** | `/airline/[slug]` | ❌ | Exists for transparency. Linked internally, not promoted. |
| **Never** | `/check?…`, filters, pagination | ❌ `noindex` | — |

**Every page in the top three tiers is about luggage.** The airline appears as context — sourced, linked, and necessary — but never as the subject. That's the line that keeps us out of a fight we'd lose and in one nobody else is having.

### Promotion is a feedback loop, not a guess

An "Available" page that starts earning impressions on its own is a signal to promote it — add hand-written content, add it to the sitemap. Far better than picking winners at build time, and it means the effort follows demand rather than intuition.

---

## Open question

The homepage sketch assumes the universal envelope is genuinely interesting — that `40 × 30 × 20 cm` lands as a striking fact rather than a shrug. **Worth testing early**, because the whole front page is built on it. If it doesn't land, the fallback is leading with the measured-vs-claimed gap instead, which is the other candidate for most-interesting-thing-we-know.
