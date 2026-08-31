# Product images

**Decision: no manufacturer product images at launch. The silhouettes stay.**

Two reasons — one editorial, one legal — and they point the same way.

---

## The editorial reason, which matters more

A manufacturer's product shot is the manufacturer's marketing image, on a page
whose entire argument is that **the manufacturer's presentation is not what the
airline measures**.

The silhouettes in `src/components/BagSilhouette.astro` are deliberately
generic. They say *this shape* and claim nothing else — which is exactly the
claim we can support, because we hold a type and a dimension and no photograph.
A glossy three-quarter render says *this exact product, as the brand wants you
to see it*, which is the frame the site exists to push back on.

There is also a practical version of the same point: a wall of product shots is
harder to scan than a wall of tinted silhouettes, because every brand shoots on
a different background at a different angle. The coverage tint does real work on
`/bags` — green to red at arm's length, before a number is read — and a
photograph would destroy it.

---

## The legal position — Amazon, verified

Read from [Associates Program
Policies](https://affiliate-program.amazon.com/help/operating/policies), updated
14 April 2026, section *Associates Program IP License and Usage Requirements*.

**Amazon is not a route to product images. Two independent blockers:**

### 1. Images may not be stored, cached, or self-hosted. At all.

> §2(h): "You will **not store or cache** Product Advertising Content
> **consisting of an image**, but you may store a link to Product Advertising
> Content consisting of an image for **up to 24 hours**."

That kills the pipeline I was sketching — download, resize, convert to
AVIF/WebP, serve from our own CDN. It is expressly prohibited. Images must be
served live from Amazon and re-fetched at least daily.

### 2. Our site probably fails their purpose test anyway.

> §2(c)(i): "You will not use Creators API, PA API, Data Feeds, or Product
> Advertising Content with any site or application, or in any other manner, that
> **does not have the principal purpose of advertising and marketing an Amazon
> Site and driving sales** of products and services on an Amazon Site."

The principal purpose of this site is telling someone whether their bag fits.
That is not advertising an Amazon Site. Affiliate links can live on it, but
Product Advertising Content — including images — arguably cannot.

### Two more clauses worth knowing, unrelated to images

> §2(e): no "aggregating, analyzing, extracting, or repurposing any Product
> Advertising Content" without written approval.

**This is why dimensions must never come from Amazon.** Aggregating and
analysing product data is precisely what this site does. Our figures come from
manufacturers, which keeps the whole catalogue outside this clause.

> §1: "You will not, and will not allow any third party to, use Program Content
> to, directly or indirectly, develop or improve large language or multimodal
> models, machine learning models or related technology."

Relevant to how research on this project is done.

---

## The route that might actually work

**Direct brand programmes through affiliate networks** — Awin, Impact, CJ,
AvantLink (see [07-affiliate-setup.md](07-affiliate-setup.md)). Their product
feeds usually include image URLs, and merchants commonly grant the right to
display and sometimes host them.

⚠️ **"Usually" and "commonly" are not verified.** Amazon's terms above were read
in full at source; the network position is **not** — image rights in those
programmes are set **per merchant**, in each merchant's own terms, and they
vary. Nobody has read Béis's or Monos's.

So the rule is the same one the rest of this project runs on:

> **No image goes on the site until someone has read the merchant terms granting
> it, and recorded where that permission came from — the same standard as a
> dimension.**

An image needs provenance for the same reason a number does. If it is on the
page, we are asserting we are allowed to publish it.

### If we do this, record it like data

Add to the bag record, mirroring `external_cm`:

```json
"image": {
  "url": "https://...",
  "src": "awin_feed" | "merchant_direct" | "manufacturer_press",
  "rights": "hosted" | "hotlink_only" | "24h_cache",
  "granted_by": "https://link-to-the-terms-that-say-so",
  "at": "2026-09-01"
}
```

`rights` is the field that stops a future rebuild from hosting something we may
only hotlink.

---

## What to do instead, and it is better

The high-value picture on this site is **not** a product shot. It is the
**comparator** on `/check`: your bag drawn to scale against the box that decides
your trip, on labelled axes.

Nobody else has that image, it is generated from our own data, it needs no
licence, and it illustrates the argument rather than the merchandise. If the
site needs to look less plain, that is where the effort goes.

---

## Sequencing

1. **Now** — nothing. Silhouettes, and more work on the comparator.
2. **When affiliate applications go in** (docs/07) — for each merchant, read the
   image clause and record it. That is a line item on the application, not an
   afterthought.
3. **Only then** — build the pipeline, for the merchants that permit hosting.

The dependency is worth stating plainly: **images are blocked on the affiliate
programmes, not on a technical decision.** Nothing about the build is in the
way.
