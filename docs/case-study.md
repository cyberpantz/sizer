# Sizer — case study copy

Drafted to match the structure and voice of `/work/mealtrip` and `/work/the-crumb`:
first person, compressed, dry, honest about the parts that went wrong. Section
headings match the existing pages so this drops straight in.

---

**PROJECT 04 — 2026 · LIVE**

# Sizer

*A bag either fits or it doesn't. Four months later I had five answers.*

Luggage is sold on the space inside it. Airlines measure the outside. Wheels,
handle and feet live in the gap between those two numbers, and that gap is why
a bag with the words "carry-on" printed on the box gets stopped at the gate by
someone with a metal frame and no interest in your afternoon.

That is the entire product. I did not expect it to take four months.

It took four months because the honest version of "does it fit" turns out to
have a lot of load-bearing qualifiers. Fits *what* — the overhead bin or the
space under the seat, which are unrelated boxes? On *which fare*, given five
airlines here sell you a seat and a bag separately and will happily let you
discover that at the gate? Measured *how*, when a manufacturer publishes one
number and never says whether the wheels are in it? Sizer holds 75 airlines and
57 bags and will tell you, per leg, which one of your flights is the one that
actually decides. Usually it is not the one you were worried about.

The unglamorous half is provenance. Every dimension carries where it came from,
ranked, and only the top rung — the manufacturer's own outside figure — is
allowed to be a recommendation. Twenty of the fifty-seven bags are held back
under that rule. They are still shown, with their source named, because hiding
them would be its own kind of lie. I have measured exactly zero bags myself.
The site says so, on every page, in writing. I have decided this is integrity
rather than laziness and I would ask you not to interrogate that too closely.

## THE PROBLEM

Every site answering this question is selling you a bag. The affiliate roundups
copy dimensions off retail listings, which are wrong in the generous direction,
which is a very convenient direction for someone earning a commission on the
bag. The airlines publish the truth and bury it. Nobody was answering the
actual question — *my* bag, *my* airline, *my* fare — because answering it
properly is boring, and being boring is expensive.

The other problem was me. Given a five-band verdict engine and a golden
snapshot of 3,861 verdicts that must stay byte-identical, I will absolutely
spend a Sunday on whether 0.3 cm is the right threshold below which nothing
resolves. It is, for the record. Neither a tape measure nor a soft-sided bag
nor a gate frame is more precise than that, and pretending otherwise would be
inventing confidence.

## PRODUCT DECISIONS

**Five answers, not two.** Yes/no is the wrong shape. A centimetre over is a
non-event at one airline and eighty euros at another, so the verdict carries
how strictly that airline actually checks, and you choose how much risk you
want to take.

**The fare, not the airline.** Cabin allowance is a property of the ticket. The
same aircraft, the same route, a different fare, a different answer.

**Flights first, then bags.** This was a late reversal and it was the right
one. Asking which bag before knowing whether the ticket permits one means
asking for input you may have to throw away.

**Say what we don't know.** Unresearched airlines are excluded from every
count rather than assumed to be lenient. An absent fact must never produce a
confident answer, which is a sentence I have now written in about nine code
comments.

## WHAT WENT WRONG

Two failures worth keeping.

For one afternoon, every single bag page carried a note explaining that its own
dimensions were not trustworthy — including the thirty-seven where they were
perfectly fine. One expression checked a property that didn't exist, `undefined`
is falsy, and the site achieved a state of total, indiscriminate humility. I
found it by reading the deployed page rather than the code, which is the lesson.

And I wrote a privacy policy claiming the site couldn't track you because it
was static and had no server. That is false — client-side analytics needs no
server of mine at all. I had dressed a choice up as a law of physics, which
reads as more trustworthy than the truth. On a site whose whole argument is
that luggage brands do exactly this with dimensions. It now says "this is a
choice, not a technical impossibility," and the policy is generated from a file
declaring what is actually running, so it can't quietly go stale the week I add
analytics.

## TECH

Astro, Preact islands, Tailwind, deployed static on Cloudflare Workers. The fit
engine is a standalone module with a golden snapshot of 3,861 verdicts; 694
tests, most of which exist because something specific once went wrong and I
wanted it to stay fixed.

**ASTRO · TYPESCRIPT · PREACT · TAILWIND**

---

## Image captions

Caps, one line, in the house style — each says what the screen shows and what
it argues.

- **LANDING — THREE WAYS IN, BECAUSE PEOPLE ARRIVE WITH DIFFERENT QUESTIONS**
- **TRIP CHECKER — THE SAME BAG, CLEARED IN NEW YORK AND REFUSED IN BEIJING**
- **TRIP CHECKER — THE BIGGEST BAG THAT SURVIVES EVERY LEG, NOT JUST THE WORST ONE**
- **BAG DETAIL — WHERE THE FIGURE CAME FROM, AND WHAT THE WHEELS ADD TO IT**
- **BAG DETAIL — EVERY AIRLINE WE CAN ANSWER FOR, ON ITS CHEAPEST FARE**
- **CATALOGUE — SHELVED BY HOW WIDELY A BAG FITS, NOT BY BRAND OR PRICE**
- **METHODOLOGY — THE SOURCING LADDER, AND HOW MANY BAGS SIT ON EACH RUNG**

## Alt text

Longer, descriptive, for the `alt` attribute rather than the caption.

- Sizer's landing page: the headline "Will your bag fit?" above three entry
  points — check a trip, browse bags, or describe a bag you already own.
- The trip checker with two flights entered. The same suitcase clears American
  on a basic fare and is refused by Air China, with the deciding leg named.
- The trip envelope panel: one box that clears every leg of the trip, the
  airlines that set each dimension, and the roomiest bags that fit inside it.
- A bag detail page showing the outside dimensions, the packing dimensions, and
  a breakdown of how much the wheels, handle and feet add.
- The full airline table on a bag page, grouped by region, each row showing the
  fare checked, how strictly that airline measures, and the margin in
  centimetres.
- The bag catalogue, grouped into shelves by how many airlines each bag clears.
- The methodology page: a table of dimension sources ranked by trust, with a
  live count of how many bags sit on each rung.
