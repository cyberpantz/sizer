# Monetization

## Principle

The verdict is the service; the purchase is a consequence. Every monetization decision below is subordinate to that ordering, because the moment the site reads as a storefront with a calculator attached, the trust that makes the calculator worth using is gone — and the trust is the only thing a competitor can't clone.

Practically: no product grid on a query the user asked as a question and got a "yes" to. A passing bag gets "you're fine" and nothing else. That restraint is what makes the recommendation credible when it does appear.

---

## Primary: affiliate

### Route to DTC aggressively — this is the single largest lever

| Merchant | Rate | Cookie | Network | Notes |
|---|---|---|---|---|
| **Nomatic** | 20% | 10 d | Awin | AOV $250+. Short cookie hurts research-then-buy. |
| **Béis** | 15% | 30 d | Awin | Auto-approve. 60d validation, 45d returns. |
| **Tortuga** | 10% | 30 d | AvantLink | Gate: DA 25+, **50k monthly visits**. Not available at launch. |
| **Travelpro** | 8 / 9 / 10% | 45 d | CJ | Tiers at $500 and $1,000. AOV $165. |
| **Osprey** | 8% | 30 d | Impact | Recently moved off AvantLink — verify. |
| **Cotopaxi** | 5–10% | 30 d | AvantLink (US) | UK on Awin. |
| **Antler** | 3.2% | **1 d** | Webgains | Has a real feed, but a 1-day cookie is near-useless. Deprioritize. |
| **Amazon** | 4% | 24 h | Associates | Fallback only. |

**Every sale routed to Béis or Nomatic instead of Amazon is a 4–5× multiplier on the identical click.** Rate is the one variable fully under your control — it doesn't require more traffic, better copy, or a higher conversion rate. Get it right first.

Unverified rates: Monos, Calpak, Peak Design, July (US), Paravel, Thule, Eagle Creek publish nothing publicly. Resolve by opening free publisher accounts on Awin, Impact and AvantLink — that alone closes most of the gaps.

### Ordering priority

Where a bag is available from several merchants, rank offers by **expected value**, not by rate alone: `rate × AOV × cookie_confidence`. Then override for user interest — if the DTC price is meaningfully higher than a legitimate alternative, show both. A user who finds out later that you buried a cheaper option won't come back, and the return visit is worth more than the margin.

### The Amazon constraint — read before building

Three hard rules, not preferences:

1. **PA-API 5.0 is deprecated.** The Creators API replacing it requires **10 qualifying sales in a trailing 30 days**, and access is revocable if sales lapse.
2. **You may only display Amazon prices obtained through that API.** Manually entered or scraped prices are a violation of the operating agreement. So: **launch with Amazon as link-only, no prices anywhere.** A CI check should enforce this.
3. **Price tracking is prohibited outright.** No "notify me when this drops." The alerting product must be about *rule* changes — which is a better product anyway, and one no competitor offers.

Two more that will bite a comparison site specifically:

- **Comparison-format rule.** If you show Amazon prices in a comparison alongside non-Amazon prices, you must also display Amazon's lowest new and used prices. Another reason to launch price-free.
- **You may not use Amazon Program Content to promote products offered elsewhere.** Amazon-sourced data and DTC-sourced data need separate render paths. This is easy to violate accidentally on exactly the pages this site is made of.

Also worth planning around: Amazon's affiliate reporting is degrading, with SKU-level detail removed. **Instrument your own outbound click tracking from day one** — otherwise you cannot measure your own conversion rate.

### Realistic revenue

At 50,000 monthly visits, using a broker's standard underwriting model (20% click-through to merchant, 5% conversion, $200 AOV):

| Scenario | Monthly |
|---|---|
| Pessimistic | ~$1,100 |
| Base | ~$5,000 |
| Optimistic | ~$12,000 |

**The spread is an order of magnitude, and that's honest reporting rather than hedging** — two of the three multipliers have no primary benchmark data behind them at all. The most-cited affiliate survey in the industry was taken offline in 2026 and can no longer be verified at source. Treat any confident number in this category, including this one, with suspicion.

---

## Secondary: display advertising

Entry requirements were rewritten across late 2025 and most published guidance is stale.

| Network | Minimum | Notes |
|---|---|---|
| **Journey by Mediavine** | 1,000 premium sessions/30d | Down from 10k. No exclusivity. **Start here.** |
| **Raptive** | 25,000 pageviews | Down from 100k. Their own marketing page still says 100k; the help centre is authoritative. |
| **Mediavine** | $5,000 annual ad revenue | The 50k-session rule is gone |
| **Ezoic** | 250,000 MAU | ~25× increase. Effectively closed to a new site. |

Best available travel-vertical anchor is one operator's audited log: **$22–$44 RPM** on US-heavy travel content. At 50k visits and ~1.5 pageviews each, that's roughly **$2,250/month** — the same order of magnitude as base-case affiliate, which argues for running both rather than choosing.

**Placement discipline:** no ads above the verdict, ever. No interstitials, no sticky video, no in-content units inside a results table. The moment the answer is surrounded by advertising, it reads as an affiliate site and the premium positioning is gone. In-content units belong on the long-form pages — methodology, source register, airline detail prose — where a reader is reading rather than deciding.

---

## Brainstorm: everything else

Ordered by fit with the trust-first positioning.

### Strong fit

**Rule-change alert list.** Not directly monetized, but the most valuable asset the site can build. An email list of people who fly and are anxious about baggage is a list that converts on luggage. Free forever; monetized through the recommendations it earns the right to make.

**The measured-dimension dataset as a product.** Nobody else has it. Plausible buyers: luggage brands wanting competitive data, OTAs and booking engines wanting a fit widget, journalists. Licensing is high-margin and doesn't touch the consumer experience. Speculative, but the asset accrues whether or not you ever sell it.

**Embeddable widget.** A free "will it fit" widget for travel blogs, carrying attribution and affiliate links. One competitor already offers this and it's a genuinely good distribution move — every embed is a backlink and a referral path.

**Per-airline luggage pages as an SEO engine.** Not a revenue line but the whole acquisition strategy. `/luggage-for/ryanair-basic` targets the highest-anxiety, highest-intent, lowest-competition queries in the category — a *shopping* query, not a policy lookup we'd lose to the airline.

### Plausible

**Brand partnerships on measurement.** A brand pays to have its range measured and published — *including when the numbers are unflattering.* Only works with an ironclad publish-what-we-find rule stated up front. Real money, real risk to independence.

**"Certified fits" mark.** A badge brands can license for bags that clear a stated envelope by our measurement. Long-term, needs authority first, and it inverts the incentive structure in a way that has to be handled carefully.

**Premium tier.** Unlimited saved kits, itinerary import, alerts across a whole travel calendar. Realistically not worth building until traffic proves the free product.

### Reject

- **Sponsored placement in results.** Kills the entire proposition. Not negotiable.
- **Email gating the tool.** A competitor does this and it's the reason they're beatable.
- **Price-drop alerts.** Prohibited by Amazon's agreement.
- **Ads above the verdict.** See above.
- **Star ratings pulled from merchant feeds.** Borrowed authority is exactly the affiliate-site tell the design is built to avoid.

---

## Compliance

**FTC (16 CFR Part 255).** Disclosure must appear at the point of recommendation, before the link, in the same visual block. A sitewide footer disclaimer does **not** satisfy the standard. The 2023 revision also made merchants jointly responsible, so networks will enforce it on you.

**Amazon operating agreement.** Requires the exact string *"As an Amazon Associate I earn from qualifying purchases."* Violating that clause is expressly a material breach. Images may not be stored or cached at all (a link, for 24 hours, is the whole allowance); ASINs may be stored indefinitely — use the ASIN as the durable join key. Product images are a decision of their own: [23-product-images.md](23-product-images.md).

---

## Sequencing

1. **Week 2** — Awin (Béis, Monos, Nomatic), Amazon Associates link-only, own click tracking
2. **Month 1** — CJ and Impact once the site is live and reviewable
3. **Month 2** — Journey by Mediavine at 1,000 premium sessions
4. **Month 3** — Assess. Raptive at 25k pageviews; Tortuga at 50k visits
5. **Month 6+** — Widget, dataset licensing, alert list monetization

See [07-affiliate-setup.md](07-affiliate-setup.md) for the actual signup steps.
