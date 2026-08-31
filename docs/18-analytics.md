# Measurement and analytics

What to instrument, what to ignore, and the one number that decides whether this works.

## The governing constraint

This is an **acquisition business, not a retention business** ([01](01-mvp.md#usage-model--read-this-before-the-architecture)). People research hard for one to three days before a trip and then disappear. Every visit is effectively a new user.

That makes most standard analytics actively misleading here. **A short session is the product working.** Someone who lands, gets an answer in nine seconds and leaves has been served perfectly, and any dashboard that scores that as a failure will push the site in exactly the wrong direction.

## Track these

| Metric | Where | Why |
|---|---|---|
| **Impressions + position per page *template*** | Search Console | The whole growth thesis. Not per-URL — per template, so you can see whether `/luggage-for/*` is working as a class |
| **Distinct fare-class and size pages earning impressions** | Search Console | **The single most important number in the first 90 days.** See below. |
| **Outbound click rate, per template and per door** | Own click log | Which pages and which entry doors actually produce buyers |
| **Conversion per session, by entry door** | Own log × network reports | Tells you where to spend month two |
| **Conversion by verdict band** | Own click log | Does "won't fit" convert better than "it fits"? Nobody else can answer this. |
| **LCP, and whether the verdict is in the first paint** | Web Vitals | Time-to-answer *is* the product |
| **Correction reports received** | D1 `reports` | A rising rate means people trust the data enough to argue with it |

### The 90-day number

> **How many distinct `/luggage-for/[carrier]-[fare]` and `/size/*` pages are earning impressions?**

Total traffic will be noisy and small early on. *Breadth* is the leading indicator: if twenty different long-tail pages are each picking up a trickle, the thesis in [10](10-discoverability.md) is real and the answer is to make more of them. If all the traffic sits on the homepage, the long tail isn't working and the strategy needs rethinking rather than more pages.

## Ignore these

| Metric | Why it misleads |
|---|---|
| Return visitor rate | They're not coming back. That's the model, not a failure. |
| Sessions per user | Same. |
| **Time on page** | Inverted here. Faster is better. |
| Bounce rate on answer pages | A bounce after a correct answer is a success |
| Pageviews as a headline | Only meaningful as display-ad inventory ([06](06-monetization.md)) |

Write these down somewhere visible, because every analytics dashboard ever built will present them prominently and imply you should improve them.

## Tools

| Need | Use | Cost |
|---|---|---|
| Search performance | **Google Search Console** | Free — non-negotiable, set up day one |
| Site analytics | **Cloudflare Web Analytics** or **Plausible** | Free / ~$9 mo |
| Click tracking | **Own D1 log** ([17](17-tech-stack.md#the-write-path)) | Free |
| Core Web Vitals | Search Console + PageSpeed | Free |
| Affiliate revenue | Network dashboards | — |

### Why not GA4

Two reasons, and the first is decisive.

**Cookie consent.** GA4 requires a consent banner for EU visitors. This site's whole opening move is [demonstrate, then ask](12-entry-points.md#the-governing-idea) — putting a modal in front of that is self-defeating, and [12](12-entry-points.md#what-the-homepage-must-not-do) already forbids anything between a visitor and the answer. Cookieless analytics means no banner at all.

**And it measures the wrong things by default.** Engagement rate, session duration, retention cohorts — all foregrounded, all misleading here.

Cloudflare Web Analytics is free, cookieless and adequate. Plausible costs a little and is nicer to use. Either is right; GA4 is not.

## Instrument the click yourself

**Amazon's affiliate reporting is degrading** — SKU-level detail removed, low-volume rows fuzzed ([06](06-monetization.md)). You may be unable to measure your own conversion rate from their dashboard. And your Associates data is contractually confidential, so nobody else's benchmarks are publishable either.

So the click log is not a nice-to-have. It's the only reliable view you'll have of your own funnel.

```
/go/[merchant]/[bag]?from=<template>&door=<door>&verdict=<band>
   → log to D1 → 302 to the affiliate URL
```

Structural rather than script-based, so ad blockers don't erase it. `rel="sponsored nofollow"`, `target="_blank"`.

Reconcile network-reported sales against the click log monthly. The ratio is your true conversion rate, and it's the number every revenue projection in [06](06-monetization.md) actually depends on.

## Dashboard

One page, weekly, five minutes:

```
SEARCH          impressions ·  distinct pages earning them  ·  avg position
TRAFFIC         visits · % from search · top 10 landing pages
FUNNEL          outbound clicks · CTR by template · CTR by door
                CTR by verdict band          ← the interesting one
REVENUE         network-reported sales · reconciled against click log
DATA HEALTH     oldest verified_at · carriers >90 days · reports received
```

**`DATA HEALTH` belongs on the same page as revenue.** Stale data is the one existential risk in [01](01-mvp.md), and it degrades silently — no error, no alert, just answers that quietly stop being true. Putting it next to the money is what keeps it from being ignored.

## Privacy

Consistent with [08](08-business-setup.md) and the site's own posture:

- **No cookies for analytics.** No banner, nothing to consent to.
- **No PII in the click log.** Rotating anonymous session ids only.
- **Emails only for what they were given for** — verdicts and rule changes. No list rental, ever.
- **Publish a real privacy policy**, required for Amazon Associates approval regardless ([07](07-affiliate-setup.md)).

A site whose entire pitch is *"we'll show you our sources"* cannot run surveillance-grade analytics without the contradiction showing.

## What would tell us it isn't working

Worth deciding in advance, while it's cheap to be honest:

| Signal | At | Read it as |
|---|---|---|
| Fewer than ~5 distinct long-tail pages earning impressions | 90 days | The SEO thesis is wrong. Rethink acquisition, don't write more pages. |
| Outbound CTR under ~5% on bag pages | 60 days | Recommendations aren't credible, or they arrive too late in the page |
| Frequent fliers dispute the strictness scores | Anytime | **Stop and fix the data.** The verdicts are the product ([01](01-mvp.md)). |
| Traffic grows, revenue doesn't | 120 days | Wrong queries — informational rather than commercial intent |
| No correction reports at all | 90 days | Either nobody is reading closely, or the reporting route is too hard to find |

None of these mean quit. They mean the failure is upstream of anything more building would fix.
