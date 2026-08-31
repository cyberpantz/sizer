# The guide page

The single most linkable, most citable page on the site. It's the link-acquisition asset from [10-discoverability.md](10-discoverability.md), the LLM-citation surface, and the page that has to survive being read by someone who arrived skeptical.

**Route:** `/guide` · **Tier:** Push hard

---

## The angle

[Luggage Validator's guide](https://luggagevalidator.com/guide/) is a good policy explainer — three baggage categories, weight vs piece systems, regional enforcement patterns, fee ranges. Worth reading once for structure.

It also never once mentions that **manufacturers publish different dimensions than airlines measure.** A complete guide to avoiding baggage fees that omits the most common cause of a gate-check.

That gap is the whole angle:

> **Theirs explains the rules. Ours explains why knowing the rules isn't enough.**

Someone who reads their guide still doesn't know their own bag is 3 cm bigger than the label says. Ours opens there.

### Originality

Facts are free to use — a size limit is a fact and nobody owns it ([04-data-sources.md](04-data-sources.md#the-legal-picture-briefly)). Structure, expression, framing, and examples are ours from scratch. In practice this is easy, because the thesis is different enough that following their outline would actively hurt the page.

---

## Structure

### 1. The hook — the thing nobody else leads with

Open on the gap: a suitcase has two honest sizes, the space you pack into and the outside of the object, and an airline only ever uses the second.

Then the point that makes it actionable — and that no competitor states:

> The gap isn't consistent, so you can't correct for it. One bag runs over on width, another on height. Add a centimetre to every number and you'll still be caught, just on a different side.

**This is the most valuable paragraph on the site.**

⚠️ **What is NOT in the shipped page, and why.** An earlier draft of this section
opened on Consumer Reports' measurements of a Briggs & Riley and an Eagle Creek
Tarmac 22. Those figures appear nowhere in `resources/SOURCES.md`: nobody opened
the original. They are probably accurate, and citing them on our most quotable
page would repeat the Frontier failure exactly — a number credited to a document
we never read. Same for the mockup's Ryanair spotting bonus and American pulling
its gate sizers.

The shipped hook therefore rests on sources we did open — Travelpro publishing
both figures and saying which to use, Rick Steves publishing both, United's own
page contradicting itself between inches and centimetres — plus findings computed
from our own dataset. It is a better page for it: the argument is now
demonstrated by our data rather than borrowed from someone else's.

### 2. The three categories — as a diagram, not prose

The confusion underneath most bad outcomes is that travelers hold "carry-on" as one thing. It's three, and the distinction is *spatial* — which is why prose keeps failing at it.

A single scale diagram: seat, the space under it, the overhead bin, the hold. Each with its typical envelope. Someone understands the personal-item rule instantly from that picture and never from a table.

| Category | Where it goes | Typical envelope |
|---|---|---|
| Personal item | Under the seat in front | 40 × 30 × 20 cm |
| Cabin bag | Overhead bin | 55 × 40 × 23 cm |
| Checked | Hold | ≤ 158 cm linear |

### 3. How to check your own bag

**Rewritten.** This section used to describe "our published method" and promise a photograph of our tape against a bag. We do not measure bags — see [19-dataset-build.md](19-dataset-build.md). A guide that argues for measurement while having none is exactly what a reader notices.

It is now written for the reader measuring the bag they already own, which is a genuinely useful two-minute job: empty, upright, handle retracted, widest point on each axis, wheels and feet and pockets included, to 0.5 cm, rounding up. The section then says plainly that our own figures come from the manufacturer's published overall dimensions, and that every bag names its source.

### 4. Where enforcement actually differs — cited

Their version of this is the best content on their page and it's entirely unsourced: *"many reports,"* *"travelers report."* Ours says the same kind of thing with citations, dates, and links — the [evidence standard](05-schema.md#strictness-evidence) applied to prose.

Real material available now: Frontier's $10 and Spirit's $5 per-bag gate-agent bonuses ($26M paid across 2022–23), Ryanair's €1.50 → €2.50 spotting bonus with the cap removed, American removing gate sizers entirely in October 2025, and Ryanair's small-bag gauge measuring 42 × 20 × 30 against a published 40 × 20 × 25.

Also worth writing up because nobody has: **US enforcement is bifurcating.** ULCCs are tightening while legacy carriers loosen at the gate. That's a genuine piece of analysis and it's the kind of thing that gets cited.

### 5. The fare-class trap

Ryanair Basic is a personal item only. Lufthansa Economy Basic, from May 2026, permits no wheeled cabin bag at any size. US Basic Economy varies by carrier.

Use the slots framing from [03-ui-flows.md](03-ui-flows.md) — *what this fare gives you*, one filled and one struck out — not a rules recital.

### 6. Weight system vs piece system

Genuinely useful, genuinely under-explained, and safe to cover because it's plain fact. Keep it short and lead with the trap: mixing the two on a connecting itinerary.

### 7. What to do if you're already over

The practical section, and the honest one. Soft bags compress and hard shells don't. Wearing the heavy jacket works. Gate-checking is free on some carriers and €70 on others. Paying online beats paying at the airport by 2–3×.

### 8. Bags that solve each case

The commercial layer — and it goes **last**, after the guide has been useful for 2,000 words. Three or four measured recommendations per category, with provenance badges and coverage percentages.

Their guide has no equivalent. That's the whole business in one section, and it only works if everything above it was worth reading.

---

## Requirements

- **Every enforcement claim carries a dated, linked source.** This page will be quoted; every quotable line must be defensible.
- **Tables over prose** for anything comparative — survives extraction into an LLM answer intact.
- **Declarative opening sentences** per section, written to be quoted verbatim.
- **`FAQPage` schema** on the questions section.
- **Internal links** to `/luggage-for/*`, `/bag/*`, `/methodology` — this page is the hub.
- **Dated and versioned**, with a visible changelog entry when it's revised.
- **No generic filler.** "Weigh your bag before you go" appears on ten thousand travel blogs and adds nothing. Every section must contain something only we can say.

## Voice

Plain, specific, unhurried. Never breathless, never listicle. The competitor's guide closes with *"Hope you have a happy and safe trip!"* — ours ends on the useful thing, and stops.

---

## Sequencing

**Superseded.** The old rule was "write it after the first 20 bags are measured," on the assumption the hook needed our own measurements. Nobody is measuring bags, so that gate could never open.

The replacement: the guide ships when every claim on it is either **computed from the dataset** or **backed by a source someone opened**. That bar is met now. `src/lib/guide-facts.mjs` derives every figure — envelope range, fare gaps, strictness distribution, weight caps, empty-bag weights — and `src/lib/__tests__/guide-facts.test.mjs` holds the rules that keep it honest, chief among them: **a fare with no cabin row is a page nobody read, never a fare that forbids a bag.**

Section 8, the recommendations layer, still waits on provenance: it needs bags that pass `isPromotable()`, and 9 of 40 do.
