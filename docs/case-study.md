# Sizer — portfolio entry

Written to the real shape of `frank-portfolio/src/data/projectsV2.ts`, not to a
generic case-study format. That file is strict about a few things, and my first
draft got all of them wrong:

- **`para` is one paragraph.** The Crumb's is ~130 words, MealTrip's ~150. Not
  a document with headings — the headings live in `notes`.
- **`notes` labels are sentence case**: "The problem", "Product decisions",
  "Tech". Both existing entries use exactly those three.
- **Captions are sentence case too.** `CaseStudy.astro:141` applies
  `uppercase` in CSS, so writing them in caps double-uppercases.
- **The cover is 4:3**, pre-cropped. The file says why: these screens are shot
  at 1.6–2.3, and a centred auto-crop "throws away 17–42% of the width".
- **Shots are PNG**, imported so `astro:assets` can emit its own AVIF/WebP.

Sizer is project `04`. Paste-ready block at the bottom.

---

## tag

> Every airline measures your bag differently. This one tells you which flight
> is the problem.

## para

> I bought a suitcase with "carry-on" printed on the box and paid a gate fee for
> it anyway. Luggage is sold on the space inside; airlines measure the outside,
> wheels and handle included, and the gap between those two numbers is about
> four centimetres and roughly a hundred euros. Sizer answers the question the
> box doesn't: your bag, your airline, the fare you actually booked — across 75
> airlines and 57 bags — and tells you which leg of your trip is the one that
> decides. It is usually not the leg you were worried about. The unglamorous
> half is provenance: every dimension carries a record of where it came from,
> ranked, and only the manufacturer's own outside figure is allowed to become a
> recommendation. Twenty of the fifty-seven bags are held back under that rule
> and shown anyway, with their source named. I have personally measured zero
> bags, which the site admits on every page. Product, design, data research,
> engine and front end.

## notes

**The problem**

> Everyone answering this question is selling you a bag. The affiliate roundups
> copy dimensions off retail listings, which are wrong in the generous
> direction — conveniently, the direction that sells bags. The airlines publish
> the truth and then bury it three clicks into a fare table. Nobody was
> answering the specific question because answering it properly is boring, and
> boring is expensive.

**Product decisions**

> Five answers, not two: a centimetre over is a non-event at one airline and
> eighty euros at another, so a verdict carries how strictly that airline
> actually checks and you choose how much risk you want. Flights before bags,
> which was a late reversal and the right one — asking which suitcase before
> knowing whether the ticket even includes one is asking for input you may have
> to throw away. And an airline we haven't researched is left out of every count
> rather than assumed lenient, because an absent fact must never produce a
> confident answer.

**What went wrong**

> For one afternoon every bag page carried a note explaining that its own
> figures were not trustworthy — including the thirty-seven where they were
> perfectly fine. One expression checked a property that didn't exist,
> `undefined` is falsy, and the site achieved a state of total and
> indiscriminate humility. I found it by reading the deployed page instead of
> the code, which is the actual lesson. The other one: I wrote a privacy policy
> claiming the site *couldn't* track you because it was static and had no
> server. That's false — client-side analytics needs no server of mine at all. I
> had dressed a choice up as a law of physics, on a site whose entire argument
> is that luggage brands do exactly that with dimensions.

**Tech**

> Astro with Preact islands, Tailwind, deployed static on Cloudflare Workers.
> The fit engine is a standalone module pinned by a golden snapshot of 3,861
> verdicts that has to stay byte-identical, plus 694 tests — most of which exist
> because something specific went wrong once and I wanted it to stay fixed.

*Note: The Crumb and MealTrip both use exactly three notes. "What went wrong" is
a fourth and the schema allows it, but delete it if you'd rather keep the
rhythm — the two stories would fold into `para` at some cost to its length.*

## stack

> Astro · TypeScript · Preact · Tailwind · Cloudflare Workers

## captions and alt text

Sentence case. Order runs as the narrative does: the pitch, the answer, the
thing only this site can do, then how it knows.

| shot | caption | alt |
|---|---|---|
| `sizer-landing` | Landing — three ways in, because people arrive with different questions | Sizer's landing page: the headline "Will your bag fit?" above three entry points — check a trip, browse bags, or describe a bag you already own. |
| `sizer-check-verdict` | Trip checker — the same suitcase, cleared in New York and refused in Beijing | The trip checker with two flights entered. One bag clears American on a basic fare and is refused by Air China, with the deciding leg named. |
| `sizer-check-envelope` | Trip envelope — the biggest bag that survives every leg, not just the worst one | A panel showing one box that clears every flight on the trip, which airlines set each dimension, and the roomiest bags that fit inside it. |
| `sizer-bag-provenance` | Bag detail — where the figure came from, and what the wheels add to it | A bag page showing outside dimensions, packing dimensions, and a breakdown of how much the wheels, handle and feet add. |
| `sizer-bag-airlines` | Bag detail — every airline we can answer for, on its cheapest fare | The airline table on a bag page, grouped by region, each row showing the fare checked, how strictly that airline measures, and the margin in centimetres. |
| `sizer-catalogue` | Catalogue — shelved by how widely a bag fits, not by brand or price | The bag catalogue, grouped into shelves by how many airlines each bag clears. |
| `sizer-methodology` | Methodology — the sourcing ladder, and how many bags sit on each rung | The methodology page: a table of dimension sources ranked by trust, with a live count of how many bags sit on each rung. |

Cover: `sizer-cover` (4:3) — a composed window on the trip checker showing the
two-leg verdict. Alt: *Sizer's trip checker showing one suitcase judged against
two airlines, cleared on one leg and refused on the other.*

---

## Paste-ready entry

Goes after the `mealtrip` object in `PROJECTS_V2`. Import lines are generated
into `shots-imports.txt` by `npm run shots` — add them beside the others at the
top of the file.

```ts
  {
    id: 'sizer',
    n: '04',
    name: 'Sizer',
    year: '2026',
    status: null,
    tag: 'Every airline measures your bag differently. This one tells you which flight is the problem.',
    cover: sizerCover,
    coverAlt:
      'Sizer\'s trip checker showing one suitcase judged against two airlines, cleared on one leg and refused on the other.',
    para:
      'I bought a suitcase with "carry-on" printed on the box and paid a gate fee for it anyway. Luggage is sold on the space inside; airlines measure the outside, wheels and handle included, and the gap between those two numbers is about four centimetres and roughly a hundred euros. Sizer answers the question the box doesn\'t: your bag, your airline, the fare you actually booked — across 75 airlines and 57 bags — and tells you which leg of your trip is the one that decides. It is usually not the leg you were worried about. The unglamorous half is provenance: every dimension carries a record of where it came from, ranked, and only the manufacturer\'s own outside figure is allowed to become a recommendation. Twenty of the fifty-seven bags are held back under that rule and shown anyway, with their source named. I have personally measured zero bags, which the site admits on every page. Product, design, data research, engine and front end.',
    notes: [
      {
        label: 'The problem',
        body: 'Everyone answering this question is selling you a bag. The affiliate roundups copy dimensions off retail listings, which are wrong in the generous direction — conveniently, the direction that sells bags. The airlines publish the truth and then bury it three clicks into a fare table. Nobody was answering the specific question because answering it properly is boring, and boring is expensive.',
      },
      {
        label: 'Product decisions',
        body: 'Five answers, not two: a centimetre over is a non-event at one airline and eighty euros at another, so a verdict carries how strictly that airline actually checks and you choose how much risk you want. Flights before bags, which was a late reversal and the right one — asking which suitcase before knowing whether the ticket even includes one is asking for input you may have to throw away. And an airline we haven\'t researched is left out of every count rather than assumed lenient, because an absent fact must never produce a confident answer.',
      },
      {
        label: 'What went wrong',
        body: 'For one afternoon every bag page carried a note explaining that its own figures were not trustworthy — including the thirty-seven where they were perfectly fine. One expression checked a property that didn\'t exist, undefined is falsy, and the site achieved a state of total and indiscriminate humility. I found it by reading the deployed page instead of the code, which is the actual lesson.',
      },
      {
        label: 'Tech',
        body: 'Astro with Preact islands, Tailwind, deployed static on Cloudflare Workers. The fit engine is a standalone module pinned by a golden snapshot of 3,861 verdicts that has to stay byte-identical, plus 694 tests — most of which exist because something specific went wrong once and I wanted it to stay fixed.',
      },
    ],
    stack: 'Astro · TypeScript · Preact · Tailwind · Cloudflare Workers',
    url: 'https://sizer.phranque-y.workers.dev',
    cta: 'Visit Sizer',
    shots: [
      {
        src: sizerLanding,
        caption: 'Landing — three ways in, because people arrive with different questions',
        alt: 'Sizer\'s landing page: the headline "Will your bag fit?" above three entry points — check a trip, browse bags, or describe a bag you already own.',
      },
      {
        src: sizerCheckVerdict,
        caption: 'Trip checker — the same suitcase, cleared in New York and refused in Beijing',
        alt: 'The trip checker with two flights entered. One bag clears American on a basic fare and is refused by Air China, with the deciding leg named.',
      },
      {
        src: sizerCheckEnvelope,
        caption: 'Trip envelope — the biggest bag that survives every leg, not just the worst one',
        alt: 'A panel showing one box that clears every flight on the trip, which airlines set each dimension, and the roomiest bags that fit inside it.',
      },
      {
        src: sizerBagProvenance,
        caption: 'Bag detail — where the figure came from, and what the wheels add to it',
        alt: 'A bag page showing outside dimensions, packing dimensions, and a breakdown of how much the wheels, handle and feet add.',
      },
      {
        src: sizerBagAirlines,
        caption: 'Bag detail — every airline we can answer for, on its cheapest fare',
        alt: 'The airline table on a bag page, grouped by region, each row showing the fare checked, how strictly that airline measures, and the margin in centimetres.',
      },
      {
        src: sizerCatalogue,
        caption: 'Catalogue — shelved by how widely a bag fits, not by brand or price',
        alt: 'The bag catalogue, grouped into shelves by how many airlines each bag clears.',
      },
      {
        src: sizerMethodology,
        caption: 'Methodology — the sourcing ladder, and how many bags sit on each rung',
        alt: 'The methodology page: a table of dimension sources ranked by trust, with a live count of how many bags sit on each rung.',
      },
    ],
  },
```

**The URL is the temporary workers.dev one.** Swap it for the real domain before
this goes live, or drop `url` and `cta` to `null` until then — `mealtrip` shows
the null case working fine.
