# Affiliate setup — step by step

Do these in order. The ordering matters: several networks reject applications from sites with no live content, so **the site has to exist and look finished before you apply anywhere.**

---

## Step 0 — Prerequisites (before any application)

Every network asks for essentially the same things. Have them ready once and the rest is fast.

- [ ] **Live site with real content.** Not a placeholder, not "coming soon." Reviewers open it. This is why affiliate signup is Week 2, not Week 1.
- [ ] **Privacy policy page.** Mandatory for Amazon approval and expected everywhere else.
- [ ] **Affiliate disclosure page** *and* inline disclosures at the point of recommendation.
- [ ] **Terms of use page.**
- [ ] **A real contact method** — an email on your own domain, not Gmail. Free credibility with reviewers.
- [ ] **Tax identity.** SSN or EIN. See [08-business-setup.md](08-business-setup.md) — an EIN is free and keeps your SSN off a dozen third-party systems.
- [ ] **Bank account** for direct deposit.
- [ ] **Traffic story.** Most applications ask how you'll drive traffic. Answer specifically: *"SEO on per-airline and per-size baggage queries; measured luggage dimensions nobody else publishes."* Vague answers get rejected.

---

## Step 1 — Awin (do this first)

Awin carries Béis (15%), Monos, Nomatic (20%) and Db, absorbed ShareASale in October 2025, and has the most workable bulk feeds. It is the highest-value single application on this list.

1. Apply at `awin.com` → Publishers → Sign Up.
2. **Pay the $1 refundable deposit.** This trips people up — it's a real card charge, refunded to your first payout. It exists to filter spam applications.
3. Wait for network approval, typically a few business days.
4. Once approved, apply to each *advertiser* separately. Béis auto-approves. Others are manual.
5. Grab your API key from the dashboard for the feed list endpoint:
   `https://productdata.awin.com/datafeed/list/apikey/{key}`
6. Note each advertiser's cookie window — **Nomatic's is 10 days**, which is short enough to matter for a research-then-buy journey.

**Target advertisers:** Béis, Monos, Nomatic, Db, Cotopaxi (UK).

---

## Step 2 — Amazon Associates

Lower value than Awin (4% vs 15–20%) but necessary for coverage — plenty of bags are only realistically bought there.

1. Apply at `affiliate-program.amazon.com`. Have the live site and privacy policy ready.
2. Choose a store ID; list your site.
3. Describe your traffic and content honestly.
4. Provide tax information (W-9 for a US person) and payment details.

### The 180-day clock — the thing that catches people

**You must generate at least three qualifying sales within 180 days of approval or the account goes inactive.** Three *separate orders*, not three items in one order, and not returned within the return window. If it lapses you can reapply, but don't burn the clock by applying before you have traffic.

**Apply when the site is live and getting visitors — not before.**

### Hard constraints on the build

- **Launch link-only, no Amazon prices.** You may only display Amazon prices obtained via the Creators API, which requires **10 qualifying sales in a trailing 30 days**. Manual or scraped prices violate the agreement. Enforce with a CI check.
- **No price tracking or price-drop alerts.** Prohibited outright.
- Display the exact string **"As an Amazon Associate I earn from qualifying purchases."** Omitting it is expressly a material breach.
- Don't cache Amazon images. Store ASINs — those you may keep indefinitely, and they're your durable join key.
- Note the April 2026 update: purchases from customers referred via paid or boosted ads linking to Amazon are disqualified. Relevant if you ever run paid acquisition.

---

## Step 3 — CJ Affiliate

Carries Travelpro (8–10%, 45-day cookie) and Briggs & Riley, and has the **best dimension schema of any network** — `productLength/Width/Height` plus separate shipping dimensions.

1. Apply at `cj.com` → Publishers.
2. Network approval is stricter than Awin's; a finished site matters here.
3. Apply per advertiser.
4. Generate a Personal Access Token for the GraphQL API (`https://ads.api.cj.com/query`).
5. **Useful quirk:** CJ lets you query product feeds for advertisers you haven't joined, unless the feed is flagged private. Good for evaluating catalog coverage before committing.

---

## Step 4 — Impact

Carries Osprey, Calpak, Peak Design, July (US) and Samsonite.

1. Apply at `impact.com` → Partners.
2. Apply per brand.
3. API: `https://api.impact.com/Mediapartners/{AccountSID}/Catalogs/{Id}/Items`.
4. **Verify Osprey's status** — they appear to have moved from AvantLink to Impact recently while their own site still references AvantLink.

Impact feeds carry shipping dimensions but not item dimensions. Catalog spine only.

---

## Step 5 — AvantLink (later)

Carries Tortuga (10%), Thule and Eagle Creek.

- Free publisher account, REST API with no auth token — the easiest to evaluate.
- **No dimension fields and no availability field.** Catalog spine only, and a weaker one.
- **Tortuga gates at DA 25+ and 50,000 monthly visits**, and excludes outdoor-focused and coupon sites. Not available at launch; revisit at Month 3.

---

## Step 6 — Display advertising (Month 2+)

**Journey by Mediavine** at 1,000 premium sessions per 30 days (US/UK/CA/AU traffic only). One unified application at `mediavine.com/apply` auto-routes you to the right tier. No exclusivity requirement, which is why it's first.

Then **Raptive** at 25,000 pageviews, or **Mediavine** proper at $5,000 trailing annual ad revenue — whichever lands first. Raptive's tier below 100k pageviews requires 50% US/UK/CA/NZ/AU traffic, long-form content, and a domain at least 6 months old.

Ignore Ezoic — 250,000 MAU is effectively closed to a new site.

---

## Step 7 — Tracking

**Do this before the first affiliate link goes live, not after.**

Amazon's reporting is degrading, with SKU-level detail removed and low-volume rows fuzzed. You may be unable to measure your own conversion rate from their dashboard.

- Log every outbound click server-side or via your own analytics: bag slug, merchant, network, page, timestamp, entry door.
- Route outbound links through `/go/[merchant]/[bag]` so tracking is structural rather than bolted on. Use `rel="sponsored nofollow"` and `target="_blank"`.
- Reconcile network-reported sales against your own click log monthly.

Knowing which of the three doors converts is worth more than any single network relationship — it tells you where to spend Month 2.

---

## Realistic timeline

| When | What |
|---|---|
| Site live | Awin (~$1 deposit, few days), CJ, Impact |
| Site live + traffic | Amazon Associates — **start the 180-day clock deliberately** |
| ~1,000 sessions | Journey by Mediavine |
| 25k pageviews | Raptive |
| 50k visits | Tortuga |

---

## Common rejection causes

- Thin or placeholder content at review time
- Missing privacy policy (an automatic Amazon rejection)
- No visible affiliate disclosure
- Vague traffic description
- Free-subdomain hosting
- Contact email on a free provider rather than your domain

None of these are hard to satisfy. They're just the things people skip when they apply too early — which is the actual failure mode.

---

Sources: [Amazon Associates Operating Agreement updates](https://affiliate-program.amazon.com/help/operating/compare) · [Amazon affiliate requirements 2026](https://getaawp.com/blog/amazon-affiliate-program-requirements/) · [Associates approval guide](https://velantio.com/blog/amazon-associates-approval-guide)
