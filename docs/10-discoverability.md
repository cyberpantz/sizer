# Discoverability

**This is the entire growth plan.** No app, no habit, no network effect, no returning audience to speak of. People research hard for one to three days before a trip and then disappear. Every visit is effectively a new user, arriving from a search box.

So the question isn't "how do we do SEO well." It's: *when someone types the thing they're anxious about, are we the answer?*

---

## 1. The query taxonomy

Actual searches, in rough order of intent, mapped to the page that should own them.

| Query pattern | Intent | Owning page | Competition |
|---|---|---|---|
| `luggage that fits ryanair basic` | **Shopping, urgent** | `/luggage-for/ryanair-basic` | **Almost none** |
| `underseat bag ryanair` | Shopping, specific | `/luggage-for/ryanair-basic` | **Low** |
| `best carry on for european budget airlines` | Shopping | `/luggage-for/eu-budget` | High but winnable |
| `does monos carry on fit ryanair` | Verdict | `/bag/[slug]/[carrier]` | **None** |
| `monos carry on pro real dimensions` | **Our measurement** | `/bag/monos-carry-on-pro` | **None** |
| `is monos carry on pro too big` | Pre-purchase doubt | `/bag/monos-carry-on-pro` | **Almost none** |
| `55x40x20 luggage` | Shopping by envelope | `/size/55x40x20` | **Low** |
| `luggage that fits all airlines` | Shopping | `/size/universal` | Medium |
| `carry on dimensions with wheels` | The core insight | `/methodology` + guide | **Low** |
| ~~`ryanair carry on size`~~ | ~~Policy lookup~~ | **Concede to the airline** | Unwinnable |

### The airline is a qualifier, not the subject

The correction that shapes everything below. **We do not build airline policy pages.**

| | Airline-policy query | Luggage query, airline-qualified |
|---|---|---|
| Example | `ryanair carry on size` | `best carry on for ryanair basic` |
| Who wins it | **ryanair.com.** Always. | **Us.** Airlines don't compete here. |
| Intent | Wants a number, then leaves | Wants a bag |
| Commercial value | Near zero | High |
| Who targets it | Every unmonetized tool in the category | Almost nobody |

Three reasons not to build airline policy pages as an SEO surface (they exist only as unpromoted reference):

1. **We cannot win it.** Their brand, their policy, their domain authority on their own name. Google prefers the primary source and it's right to. Competing is a guaranteed loss.
2. **The intent is wrong.** Someone who wants a number gets it and leaves. That isn't our user.
3. **It's the category's failure mode.** Four competitors already publish airline size tables and none of them earn anything. Being the fifteenth isn't a strategy.

**Airline data still exists and stays visible** — it powers the engine, and every allowance links back to the carrier's own page so users can check us ([05-schema.md](05-schema.md#source-linking)). It simply isn't a page we compete for.

### Field evidence: the best tool in the category is invisible

CarryFit covers 172 airlines, auto-rotates dimensions, models soft-bag flex, and parses a product URL. It is comfortably the best-built tool in the space — and it **did not surface in any of Frank's own luggage searches.**

The reason is structural, not editorial: **it's a single-page app.** One URL, no per-airline pages, no per-size pages, nothing for a query to match. A tool is not a site. It can rank for perhaps one query and it has no surface area for anything else.

That's the clearest possible argument for the page architecture below. The pages *are* the distribution — and a competitor being better than us at the tool while remaining unfindable is the exact gap this document exists to exploit.

### The thesis, in one line

**Own luggage queries that name an airline. Concede airline queries that name a policy.**

`/luggage-for/ryanair-basic` is the spearhead. Someone searching it has just discovered they have a problem — no overhead bin on their fare — and is looking for exactly the thing we recommend. Highest urgency, clearest commercial intent, and no airline competes for it, because it isn't about them.

The page answers a shopping question, not a policy question:

> **Luggage for Ryanair Basic**
> This fare gives you one under-seat bag, 40 × 30 × 20 cm. No overhead bin at any size.
> Here are 9 bags we've measured that clear it — and 4 popular ones that don't.
> *(Ryanair's own policy page →)*

The allowance appears because it's needed context, sourced and linked. The page is about the bags.

### The bag × carrier matrix — dynamic, not pre-built

80 bags × 100 carriers × fare classes is a combinatorial space too large and too sparse to pre-generate. **This part of the app is dynamic:** `/bag/[slug]/[carrier]` is rendered on demand and cached, not built ahead of time.

This costs nothing in ranking terms. What determines whether a page can rank is that the URL exists and returns real HTML when fetched — not when it was rendered. Server-rendered-on-demand and pre-rendered are equally indexable.

And it's better in three ways:

- **Every combination works**, including the ones nobody would have thought to pre-generate. A user with an obscure bag on an obscure carrier still gets an answer.
- **No sitemap bloat**, which removes most of the scaled-content exposure in §5 — demand discovers these pages rather than us pushing 3,200 URLs at Google.
- **Nothing to rebuild** when a measurement is corrected or a carrier changes policy. The answer is computed from current data on every render.

---

## 2. Page architecture

```
/                                  Door C — region-first, the homepage
/luggage-for/[carrier]             bags that clear this airline                ← publish
/luggage-for/[carrier]-[fare]      the fare trap, plus what survives it        ← push hard
/airline/[slug]                    reference only — not promoted, not in sitemap
/size/[l]x[w]x[d]                  carriers accepting this box + matching bags
/size/universal                    "works everywhere" — high commercial intent
/bag/[slug]                        measured vs claimed, coverage, per-carrier table
/bag/[slug]/[carrier]              one pairing, one answer              ← dynamic
/region/[slug]                     Europe / Asia / North America envelopes
/methodology                       how we measure and score
/sources                           the annotated register
/guides/[topic]                    long-form, link-earning
```

URLs are lowercase, hyphenated, stable. **Never change one without a 301** — a ranking page that moves silently is the most expensive self-inflicted wound available.

### Three rendering tiers

The useful distinction is not static vs. dynamic. It's **what we actively compete for** versus what merely exists and works.

| Tier | Rendering | In sitemap? | What lives here |
|---|---|---|---|
| **1 — Promoted** | Pre-rendered at build | **Yes** | `/`, `/airline/*`, `/airline/*-[fare]`, `/size/*`, `/bag/*`, `/region/*`, `/methodology`, `/sources`, `/guides/*` — roughly 200 pages we're deliberately ranking |
| **2 — Available** | Server-rendered on demand, cached | **No** | `/bag/[slug]/[carrier]` and other combinatorial routes. Indexable, linked internally where relevant, discovered by demand rather than pushed. |
| **3 — Ephemeral** | Client-side only | n/a | Tool state — door inputs, filter selections, unit preference. Never needs a URL. |

Tier 2 pages are real pages: real HTML, correct `<title>`, structured data, canonical to themselves. They're just not something we submit and claim. If one starts earning impressions, that's a signal to promote it to tier 1 with expanded content — which is a much better way to decide what to invest in than guessing at build time.

**Cache invalidation:** tier 2 pages are computed from carrier and bag data, so purge the cache on any data change. A cached verdict built on a superseded allowance is the exact failure mode this product exists to prevent.

---

## 3. What every page must do

### Non-negotiable

- **Fully rendered without JavaScript.** Two competing tools render nothing server-side, which makes them invisible to crawlers *and* to LLM answers. This is the cheapest structural advantage on the list and it's free if the read path stays static.
- **The answer is above the fold**, in text, in the first 100 words. Not behind an interaction. Someone who has to click to find out whether their bag fits will go back to the results page.
- **A dated fact.** "Verified 28 August 2026" with the source link. Freshness signals matter for policy queries, and it's true.
- **`<title>` matching the *shopping* query**, not the policy one: `Luggage That Fits Ryanair Basic (2026) — 9 bags we measured`. A title built around "carry-on size" concedes the query to the airline.
- **LCP under 2.0s.** Static HTML, system-adjacent fonts preloaded, no layout shift from the verdict block.

### Structured data

- `FAQPage` on airline pages — the questions people actually ask, answered in the markup
- `Product` on bag pages, with `size`, `weight`, `brand`, `offers`
- `Table` markup on allowance tables
- `Organization` + `sameAs` sitewide
- `Dataset` on `/methodology` — unusual, appropriate here, and it signals to both Google and LLMs that there's a real dataset behind the claims

### Internal linking

A burst session is many pageviews from one person, so linking earns its keep. Every airline page links to its fare variants, the bags that clear it, and the region envelope. Every bag page links to the carriers it fails and why. Every size page links to bags at that size. Dense, contextual, and genuinely useful — not a footer link farm.

---

## 4. The LLM answer channel

Increasingly people ask an assistant rather than a search engine, and assistants cite sources they can parse. Optimizing for that overlaps heavily with good SEO but has a few specifics:

- **State facts in plain declarative sentences near the top.** "Ryanair Basic includes one personal item measuring 40 × 30 × 20 cm. No wheeled cabin bag is permitted on this fare." That sentence is quotable as-is.
- **Tables over prose** for allowance data. They survive extraction intact.
- **Date and attribute everything.** A model choosing between two sources will prefer the one with a visible source link and verification date.
- **Server-render.** A model fetching your page gets what a crawler gets.

Being the citable source is worth more than a position-three ranking, because a citation carries into an answer the user never leaves.

---

## 5. What not to do

Google's **scaled content abuse** policy is method-agnostic — it judges intent and per-page value, not whether a human or a machine wrote it. The clearest violation is swapping a name into an otherwise identical template with no real per-URL substance. Site reputation abuse is a separate policy targeting borrowed-authority placements on third-party domains.

**Our programmatic pages are defensible, and the reason is worth stating explicitly:** each one contains data that exists nowhere else — a measurement we took, a verdict computed from it, a named binding dimension, a specific fee. That's material information, not template substitution. The distinction is real and it's the thing to protect.

So:

- **Don't put the combinatorial routes in the sitemap.** They render on demand and they're indexable, which is right — but submitting 3,200 URLs is claiming they all deserve to rank, and that's the pattern the policy targets. Let demand find them; promote the ones that earn it.
- **Don't let a tier 2 page be thin.** Even on demand, `/bag/x/ryanair` must carry the measurement, the verdict, the binding dimension, the delta, the fee, and the source — not a one-line yes/no. If a pairing genuinely has nothing to say, canonical it to the parent bag page instead.
- **Don't spin descriptions.** If two pages would say the same thing, they should be one page.
- **Don't chase `best luggage 2026`.** Established affiliate sites with real domain authority own it and you will lose. Win the questions they don't answer.
- **No doorway pages, no expired domains, no guest-post link buying.** Cheap, and it puts the whole asset at risk.

---

## 6. Link acquisition

The measured-dimension dataset is a genuine digital-PR asset, and this is the highest-leverage move available:

> **"We measured 80 suitcases. Most were bigger than advertised."**

That is a real story with real data, in a category travel journalists cover constantly and always with the same secondhand Consumer Reports citation. Pitch it with the photographs and the full table. It earns links from exactly the high-authority travel domains that would never link to a comparison tool — and it costs nothing extra, because the measuring is already the moat.

Supporting tactics, in order of value:

1. **The embeddable widget.** A free "will it fit" embed for travel blogs, carrying attribution. Every embed is a link and a referral path. A competitor already does this and it works.
2. **Rule-change reporting.** Be the first to publish when a carrier changes policy. Those posts get cited because they're timely and specific.
3. **Open the strictness methodology.** A published, reproducible scoring method is citable in a way an opaque score never is.
4. **Reddit and forums** — answer real questions in r/onebag and r/travel with the actual answer, not a link drop. Slow, low-volume, high-trust.

---

## 7. Measurement

Given the usage model, track the things that reflect an acquisition business and ignore the rest.

**Track:**
- Impressions and average position per page *template* (not just per URL) in Search Console
- Time to answer — LCP, and whether the verdict is in the initial paint
- Outbound click rate per template, per door
- Conversion per session, by entry door — this tells you where to spend month two
- Which fare-class pages earn impressions; that's where to deepen coverage

**Ignore:**
- Return visitor rate
- Sessions per user
- Time on page (a fast answer *should* produce a short session — a low number here is the product working)
- Bounce rate on airline pages

The one number that matters most in the first ninety days: **how many distinct fare-class and size pages are earning impressions.** That's the leading indicator of whether the long-tail thesis is real.

---

Sources: [Google spam policy — scaled content abuse](https://bulkbase.ai/seo/understanding-googles-scaled-content-abuse-policy) · [Scaled content abuse compliance 2026](https://bulkbase.ai/seo/scaled-content-abuse-googles-policy-enforcement-how-to-stay-compliant-in-2026) · [Programmatic SEO trends 2026](https://www.tryvizup.com/blog/programmatic-seo-trends-2026)
