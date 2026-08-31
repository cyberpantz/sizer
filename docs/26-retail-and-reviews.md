# Retail links and reviews — schema readiness

**Status: schema only. Nothing renders this, and a test enforces that.**

The shapes exist so the facts can be recorded from the first day they are true.
The UI arrives when there is something to show.

That order is the whole point, and it is the opposite of the mistake this
codebase just cleaned up: the footer carried *"As an Amazon Associate we earn
from qualifying purchases"* on 63 pages before an account existed, because the
plausible complete version of a site got written instead of the true one.

> **A schema field that is null makes no claim. A rendered element does.**

Adding these shapes is safe. A "Buy it here" button that appears before any
offer is recorded is the same bug wearing different clothes.

---

## 1 · `retail[]` — where to buy it

```json
"retail": [
  {
    "merchant": "monos",
    "name": "Monos",
    "kind": "manufacturer",
    "url": "https://monos.com/products/...",
    "at": "2026-08-31",
    "programme": null,
    "note": null
  }
]
```

| Field | Meaning |
|---|---|
| `merchant` | stable id, used for joins and for the affiliate programme lookup |
| `name` | what a reader sees |
| `kind` | `manufacturer` · `retailer` · `marketplace` |
| `url` | **the real destination, always** — see below |
| `at` | when the link was last confirmed to work |
| `programme` | affiliate programme id, set only when one is live |

### The stored URL is never tagged

Two reasons, both of which bite later rather than now:

1. **A tagged URL rots.** Change programme, add Geniuslink, move from Amazon to
   a direct brand deal, and every record needs rewriting. Tagging is a
   render-time concern; the record says where the bag is sold.
2. **A redirect chain cannot be audited.** *"Where did this come from"* is the
   question this entire project answers. A `geni.us` link is not an answer.

Tagging happens at render, through a `/go/<merchant>/<slug>` redirect we
control. One change turns monetisation on for every link at once. A test
rejects any stored URL carrying a tracking parameter or a known shortener.

### `kind` uses the same taxonomy as the dimension ladder

Because it is the same judgement. A marketplace listing is the weakest thing in
this category — the same bag appears under several sellers with different
numbers — so `marketplace` is link-only and can never be a source for anything.
Manufacturer first, retailer second, marketplace last.

---

## 2 · Third-party reviews — already exist

`reviews[]` already carries what is needed: `publication`, `url`, `at`,
`award`, `praise`, `caveat`, `rank`. No change required. `citationsFor()`
returns the ones with a URL.

---

## 3 · `our_review` — if we ever write our own

```json
"our_review": {
  "status": "published",
  "url": "/reviews/monos-hybrid",
  "author": "Frank Young",
  "published": "2026-09-15",
  "updated": null,
  "sample": {
    "how": "brand_supplied",
    "paid_usd": null,
    "returned": false,
    "disclosure": "Monos sent us this bag. We paid nothing for it."
  }
}
```

### Kept out of `reviews[]` deliberately — this is the important one

`price-band.mjs` uses `reviews[]` as a **quality floor**: a bag nobody has
reviewed cannot enter a price band, so "budget" never fills with junk.

If our own review sat in that array, it would satisfy our own gate. Writing
about a bag would make it eligible for our own recommendation — self-dealing,
however honestly the review was written. Separate fields mean that cannot
happen by accident, and there is a test for it.

### `sample.how` is the field that cannot be retrofitted

`purchased` · `loaned` · `gifted` · `brand_supplied`

A bag the brand sent us is a **material connection** under FTC guidance,
whether or not it changed a word. Recording it the day the box arrives is
trivial. Reconstructing it two years later is impossible — which is the entire
argument for adding the field before we need it, and the one part of this doc
that would be expensive to skip.

`gifted` and `brand_supplied` always produce a disclosure. A published review
missing `sample.how` or `author` fails the tests.

---

## What is deliberately NOT here

- **Prices in `retail[]`.** Price lives in `price_usd` with its own provenance,
  and we do not display it (`docs/06`). A price attached to a merchant row
  would be a second, staler copy inviting exactly the mismatch Amazon's terms
  exist to prevent.
- **Stock status.** We cannot know it and will not guess.
- **Star ratings.** `reviews[]` holds an award and a caveat, which say
  something. A synthesised score would be our opinion wearing a number.

---

## When this gets built

1. The `/go/` redirect, so no link needs editing later.
2. Offers on the bag page, manufacturer first.
3. The disclosure turns itself on via `affiliate.mjs` — nothing to remember.
4. Reviews last, and only with `sample.how` recorded from day one.

The test `nothing renders an offer or a review yet` should be deleted in the
same commit that builds step 2 — deliberately, not by accident.
