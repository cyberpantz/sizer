# Design system

## Calibration note — read first

An earlier version of this document specified a dark, condensed, departure-board look. **That was the aesthetic of wayfinding rather than its principles**, and it failed the actual brief.

Real airport signage is high-contrast, large, plain and deliberately boring, because it must work for a stressed 79-year-old reading from thirty feet. A dark ground with condensed uppercase and 10.5px labels is a *style* borrowed from that world while abandoning what makes it work.

The target is **solid, trusted, unpretentious** — not luxury, not cool-for-designers. Think well-made institutional design: a good transit map, an Ordnance Survey sheet, a Bosch tool. Confident because it's clear, not because it's styled.

**Approachable and powerful are not in tension** — that's what the disclosure ladder in [03-ui-flows.md](03-ui-flows.md#the-disclosure-ladder) is for. Level 0 is plain enough for someone who has never used a tool like this. Depth — sources, evidence, per-leg detail, URL state, keyboard control — is one tap down, where it rewards a power user without taxing anyone else.

### Legibility rules, non-negotiable

| Rule | Why |
|---|---|
| **Light ground by default** | Older eyes read dark-on-light more comfortably; dark UI also signals "tech product," not "trustworthy utility" |
| **17px body minimum, 13px absolute floor** | No 10–11px labels anywhere |
| **Sentence case for anything over three words** | Uppercase is the least legible setting available |
| **Condensed type only for large display numbers** | Never for reading text |
| **44px minimum touch targets** | |
| **Plain words over labels** | "Your bag," not "BAG." "They check bags at the gate," not "Strictness 9/10" alone. |
| **Every number explained in a sentence** | A figure without a plain-English gloss is for insiders only |

## Aesthetic vision

**The site should feel like a well-made public utility, not a blog about airports and not a startup.**

Wayfinding design is the most trusted graphic language most people encounter. Nobody doubts a gate sign. It earns that trust by being declarative rather than persuasive — it states, it never sells, and it is legible under stress by someone who is late and carrying too much. That is exactly the register this product needs: a traveler arrives anxious about a specific thing and needs an unambiguous answer fast.

The reference points are Vignelli's transit work, Frankfurt and Zurich airport signage, the Swiss school, and the split-flap departure board. What we take from them: solid color, hard edges, strict grid, no gradients, no illustration, no stock photography of smiling people with suitcases.

### The four adjectives, made operational

| Adjective | How the design delivers it |
|---|---|
| **Trustworthy** | Every number shows its provenance and date inline. Nothing is asserted without a source visible next to it. |
| **Confident** | Declarative type, no hedging microcopy, high contrast, generous scale. The verdict is the largest thing on the screen. |
| **Legitimate** | Consistent grid, real typographic hierarchy, no affiliate-site tells — no starbursts, no countdown timers, no "BEST VALUE!" ribbons, no stars-out-of-five borrowed from a feed. |
| **Cool** | Restraint plus one signature move: the split-flap verdict. Nothing else animates. |

### The north star, in Frank's words

> **"Clean and professional without being overly Silicon Valley slick."**

That's the target, and it's a narrow band. Too plain and it reads as unmaintained; too polished and it reads as a startup that will pivot or disappear. What keeps it in the band:

| Do | Don't |
|---|---|
| Warm paper, soft shadows, generous space | Gradient heroes, glassmorphism, glow effects |
| One interactive colour, semantic status colours | A second brand accent, decorative colour |
| Real numbers in mono, sources beside them | Big vague claims, social proof counters |
| Plain sentences explaining every figure | Jargon, or numbers with no gloss |
| Restraint as the personality | Animation used to seem alive |

### What we are deliberately not

Not editorial, not a magazine, not a boutique — those registers read as *opinion*, and this product's claim is *measurement*.

Warmth, though, we now do want. An earlier draft ruled it out; that was wrong. Warmth in the **shell** — rounded corners, soft shadow, warm paper, a friendly typeface — makes the thing approachable without touching the data. Precision lives in the numbers, not in the corners. **Warm frame, exact contents.**

---

## Color

### Principle

Colour means something or it isn't there. Every colour in this system carries information; a colour that appears without meaning is a bug.

### The one rule that makes it learnable

> **Blue is the only interactive colour. Green, amber, orange and red are only ever status.**

Coloured text always means an outcome; blue always means you can act. Someone works that out in about ten seconds without being told, and it's the main reason the page reads as solid rather than styled.

**There is no decorative brand accent.** An earlier draft made departure-board amber do double duty as brand and caution; it failed contrast as text on light, and a brand colour competing with a status palette was a mistake regardless. Status carries the colour, everything else is ink and paper, and that restraint *is* the unpretentious quality.

### Tokens

Light ground. Warm-neutral rather than cold grey — cold reads clinical, warm reads like paper.

```
/* Ground — warm neutral. Cold grey reads clinical; warm reads like paper. */
--paper       #FBF9F6   page
--surface     #FFFFFF   cards, the tool, panels
--surface-2   #F5F2ED   wells, silhouette plates, strictness box
--rule        #E7E2DA   hairlines
--rule-strong #C8C1B5   borders that must be seen

/* Type — all pass 7:1 on --paper */
--ink         #1C1A17   primary
--ink-2       #4C4741   secondary
--muted       #736C63   captions, timestamps (13px floor)

/* Interactive — blue means "you can act", never status */
--blue        #1D4E89
--blue-hover  #163D6C
--blue-wash   #EDF2F8

/* Semantic — dark enough to be read as text on light */
--green       #14713D   it fits
--green-wash  #E9F3EC
--amber       #8A5D00   just fits
--amber-wash  #FBF3E2
--orange      #B4530F   risky
--orange-wash #FBEEE4
--red         #B3261E   it won't fit
--red-wash    #FAECEA
```

### Usage rules

- **Blue never carries status; status colours never mark something clickable.** Breaking this once undoes the whole scheme.
- **No gradients.** Solid fills only. The single fastest way to make this look generic.
- **Verdict colour always travels with a word and a shape.** Never colour alone — that fails colourblind readers and fails print.
- **Light ground throughout.** The earlier dark-tool / light-content split is gone; it was harder to read and signalled "tech product" rather than "trustworthy utility".

### Shape and depth

| Token | Value | Used for |
|---|---|---|
| `--r` | 14px | Cards, the tool, panels |
| `--r-sm` | 9px | Inputs, notices, small wells |
| pill | 999px | Buttons, chips, filters |
| `--shadow` | soft, low | Resting cards |
| `--shadow-lift` | soft, deeper | The tool, and card hover |

An earlier draft banned any radius above 2px. That belonged to the departure-board direction and worked against approachability — square corners plus condensed caps read as severe, not serious.

### Contrast targets

All body text ≥ 7:1 against its ground. Verdict labels ≥ 4.5:1. Amber on `--ink` measures approximately 10:1 — it's the strongest thing on the page, which is correct, since it marks the situation the user most needs to notice.

---

## Typography

Three families, each with one job. Signage systems are disciplined about this and so is ours.

### The stack

```
Everything            Figtree          400, 500, 600, 700   sentence case
Numbers and data      IBM Plex Mono    400, 500             tabular-nums always
```

**Two families, not three.** Barlow and Barlow Condensed are gone. Figtree is geometric, has a tall x-height and open counters, and reads as friendly without being cute — which is the warmth the shell needed. Large display numbers use Figtree 700 with tight tracking rather than a condensed face; condensed at any size worked against the legibility floor.

Fallbacks: `Figtree, system-ui, -apple-system, sans-serif` / `"IBM Plex Mono", ui-monospace, monospace`.

### Scale

| Role | Size | Notes |
|---|---|---|
| Verdict word | `clamp(2.2rem, 6vw, 3.4rem)` 700 | tracking −0.025em |
| Display number | `clamp(1.6rem, 4vw, 2.15rem)` 700 | tabular, `×` in `--muted` |
| Page heading | `clamp(1.9rem, 4.4vw, 2.9rem)` 600 | tracking −0.02em, balanced |
| Lede | 19px | max 60ch |
| Body | 17px / 1.6 | max 66ch |
| Card / label | 15–16.5px | |
| Caption, source, timestamp | 13–14.5px | **13px is the floor** |

### Rules

- **Every number on the site is mono and tabular.** Dimensions, prices, fees, dates, counts. Numbers are the product; they get their own typeface and they line up in columns.
- Uppercase only for labels, headers, and the verdict word. Never for body text.
- `text-wrap: balance` on all headings.
- Never letterspace lowercase body text.

---

## Layout

### Grid

12 columns, 72rem max width, 24px gutters. Content is left-aligned throughout — centered layouts read as marketing, and this is an instrument. The single exception is the verdict headline, which centers in its panel because it's the one moment the page is making a declaration rather than presenting data.

### Density

Wayfinding is dense within a zone and generous between zones. Rows sit tight (48px, 12px internal padding); sections are separated by 72–96px. The result reads as organized rather than sparse or cramped.

### The gauge

The one graphic worth having, and the answer to "what does 5 cm too wide actually mean."

The airline's limit is drawn as a dashed frame; your bag is drawn inside it to scale, filled in the verdict colour, both sitting on the same floor. Where the bag is over, it visibly breaks out of the frame and a marked line shows by how much. Depth — the third dimension a flat drawing can't show — is stated underneath.

Numbers describe a three-dimensional object badly. This shows instantly which side is the problem.

### The silhouette

Simple line drawings by bag type — spinner, two-wheel roller, backpack, under-seat — tinted to the bag's coverage colour, on a `--surface-2` plate. They give the catalogue visual texture without photography, which would make the site read as a retailer rather than a referee.

The spinner and roller drawings differ where it matters: wheels below the shell versus recessed into the corners. That difference is the reason a spinner runs 1–2 cm taller.

### The split card

Above 900px the verdict card is two columns: **the answer** on the left (verdict, explanation, warnings, figures, strictness, source) and **the evidence** on the right (gauge, what the fare includes). Single column below.

This is a meaningful division, not space-filling — what we're telling you, and how we know.

### Truncated lists

Any shortened list ends in **"Show all 24"**, never "and 12 more". Naming the total says what you'll get before you click, and reads as an action rather than an apology for hiding something. Collapses back to "Show fewer". Above 60 items, show 60 and say so.

A dead-end truncation is withholding. There is a CI check for the old pattern.

## Components

### Verdict band

The core component. Four states, each a solid block with a label, a rule, and a consequence.

```
▓ CLEARS        fits every leg with room
▓ AT THE LINE   legal, but this carrier measures
▓ GAMBLE        over the limit — carriers like this rarely check
▓ WON'T         over the limit — named carrier, named fee
```

Always: color block + uppercase label + one-line explanation + (where it applies) the fee in mono. Never color alone.

### Enforcement score

Our highest-value component, and the one where the competition's treatment is most instructive. [Luggage Validator's version](https://luggagevalidator.com/airlines/british-airways) is a purple `7/10` on a green-to-red gradient with the reasoning behind a link — and it renders British Airways, Aegean, Aer Lingus and Aeroflot identically at 7/10.

Four rules follow from that:

1. **Never a gradient.** A smooth ramp claims a precision a rubric doesn't have. Segmented ticks, honest about granularity.
2. **Anchor against carriers, not adjectives.** "7/10" and "Strict" are meaningless in isolation. *"Stricter than Delta, easier than Ryanair"* is instantly legible to anyone who has flown.
3. **Evidence inline, never behind a link.** The citations are the component. Hiding them leaves a bare assertion.
4. **Name what it measures.** Not "baggage policy strictness" — that's the *rules*, which is a different quantity. Ours predicts behavior at a gate ([04-data-sources.md](04-data-sources.md#2-strictness-scores)).

```
HOW LIKELY YOU ARE TO BE STOPPED

  ▓▓▓▓▓▓▓▓▓░   9/10

  SOUTHWEST 3 ····· DELTA 6 ··· AMERICAN 7 ······· ▸ WIZZ AIR 9

  WHY
  ◆ Gate gauges enforced; agents trained on them
    Carrier policy page · verified 28 Aug 2026 →
  ◆ Spotting bonus raised €1.50 → €2.50, monthly cap removed
    Reuters · 3 Nov 2025 →

  Last reviewed 28 Aug 2026
```

**States**

- **Contested** — `⚑ sources differ` beside the score, expanding to both positions with dates ([03-ui-flows.md](03-ui-flows.md#holding-disagreement))
- **Thin evidence** — fewer than two citations shows `limited evidence` rather than a confident number. Never fabricate certainty to fill a component.
- **Compact** — inside a verdict block, the bar and anchors only; evidence stays on the airline page

**Color:** the fill uses the verdict semantic set (green through red), and the anchor rail is `--muted`. No brand amber here — amber means "at the line," and a strictness scale is a different axis. Sharing the palette across unrelated meanings is the mistake the competitor's purple-on-green-gradient makes.

### Provenance badge

Appears next to every dimension, everywhere, without exception.

```
◆ MEASURED       we put a tape on it — links to the photo
◇ MANUFACTURER   the brand's claim, unverified
○ REPORTED       a reader measured it
```

Filled diamond, hollow diamond, hollow circle. Mono, `--muted`, 13px. This badge is the most important component in the system — it's the visible form of the entire competitive position, and it should never be suppressed to make a layout cleaner.

### Bag card

Product image on `--surface` (product photography needs a light ground; forcing it dark looks cheap), then name, measured dimensions in mono with provenance badge, verdict chip for the current itinerary, price, and a single outbound link. No star ratings pulled from feeds — a rating we didn't produce is exactly the kind of borrowed authority the design is trying to avoid.

### Source line

```
SOURCE  ryanair.com/…/baggage    VERIFIED  2026-08-28
```

Mono, small, muted. Appears under every allowance. Stale data that admits it is stale costs far less than confident data that's wrong.

---

## Motion

**One signature move, and nothing else.**

On the homepage, the manufacturer's number flips digit by digit into ours — a split-flap resolve, ~46ms per step with a small stagger. It fires on load and on scenario change, and it lands on the single idea the whole site rests on: the label said one thing, we measured another.

That is the entire personality budget. Spending all of it on the one idea that matters is what stops it reading as decoration.

Everything else: instant, or a 120ms opacity fade. No scroll-triggered reveals, no parallax, no counting-up numbers, no skeleton shimmer. In a wayfinding system, motion that doesn't communicate a state change is noise — and an over-animated page is the fastest tell that something was generated rather than designed.

Respect `prefers-reduced-motion: reduce` — the flip becomes a straight cut.

---

## What would break this design

Worth naming, because these are the defaults everything drifts toward:

- Gradients, glassmorphism, glow, or a coloured hero
- A second brand accent, or any decorative use of colour
- Blue used for status, or a status colour used for a link or button
- Emoji as section markers or inside verdicts
- Star ratings, badges or "editor's choice" ribbons taken from a merchant feed
- Product photography, or lifestyle imagery of any kind
- Type below 13px, or condensed type in reading text
- Animation used to seem alive rather than to show a change
- A number printed without a plain-English sentence next to it
- Jargon that assumes the reader flies often — "sizer", "gate check", "linear inches"
