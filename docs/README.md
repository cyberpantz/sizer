# Docs

Working specification for the luggage fit-and-recommendation site.

| Doc | What's in it |
|---|---|
| [01-mvp.md](01-mvp.md) | What ships in two weeks, what doesn't, and the definition of done |
| [02-design-system.md](02-design-system.md) | Aesthetic vision, palette, typography, components, motion |
| [03-ui-flows.md](03-ui-flows.md) | The three entry doors and the results screen, screen by screen |
| [04-data-sources.md](04-data-sources.md) | Every dataset: how to build it, how to keep it current |
| [05-schema.md](05-schema.md) | Data schema and the fit engine's contract |
| [06-monetization.md](06-monetization.md) | Affiliate, display, and the longer list of options |
| [07-affiliate-setup.md](07-affiliate-setup.md) | Step-by-step signup, in the order to do it |
| [08-business-setup.md](08-business-setup.md) | US entity, EIN, tax forms — background, not legal advice |
| [09-naming.md](09-naming.md) | Name candidates and domain strategy |
| [10-discoverability.md](10-discoverability.md) | **The growth plan.** Query taxonomy, page architecture, LLM citation, link acquisition |
| [11-sharing-and-permalinks.md](11-sharing-and-permalinks.md) | URL state, share cards, permanence, and the long-horizon return |
| [12-entry-points.md](12-entry-points.md) | The cold homepage, and which deep links are safe to land on |
| [13-guide-page.md](13-guide-page.md) | The `/guide` hub — angle, structure, and what makes it ours |
| [14-competitive-notes.md](14-competitive-notes.md) | What to borrow, what to avoid, where we're behind |
| [15-sitemap.md](15-sitemap.md) | Navigation, routes, footer |
| [16-editorial-policy.md](16-editorial-policy.md) | How we write about named brands — measurements, not accusations |
| [17-tech-stack.md](17-tech-stack.md) | Astro on Cloudflare, repo layout, deployment |
| [18-analytics.md](18-analytics.md) | What to track, what to ignore, and why no GA4 |
| [19-dataset-build.md](19-dataset-build.md) | **The dataset as its own workstream** — coverage bar, build order, measurement protocol |

**Every external source used in this project is listed in [`../resources/SOURCES.md`](../resources/SOURCES.md)**, with an honest record of whether it was actually read or only seen as a search summary. Per-carrier reading lives in `../resources/carriers/[IATA]-[name].md`. A carrier record may not claim verified evidence without pointing at its dossier.

Review data is not in these docs — it's in [`../data/reviews/`](../data/reviews/README.md) as JSON, with the human summaries in `../resources/reviews/`. Prose analysis of a review belongs here; the review's *claims* belong there.

Strategy narrative lives in [`../cabin-index-spec.html`](../cabin-index-spec.html) — open it in a browser. These docs supersede it where they conflict.

## The one-paragraph version

Airlines measure the *external* size — wheels and handle included. That figure is reported inconsistently: some manufacturers publish both it and the packing size and explain the difference (Travelpro, Rick Steves); others publish one number; retail listings are worse again, and often disagree with each other about the same bag. Every tool in this category runs precise math on whichever number it happened to get. We measure bags ourselves, model the fare class the traveler actually booked, and answer in probability bands rather than a boolean — then recommend bags that clear the itinerary. Affiliate revenue, direct-to-consumer first.

## Canonical decisions

**Check here before writing anything.** These were each decided once, mid-project, and then propagated unevenly — which is how a spec quietly contradicts itself. Any doc disagreeing with this table is wrong and should be corrected, not reconciled.

| Decision | The answer | Where it's argued |
|---|---|---|
| **SEO routes** | `/luggage-for/[carrier]` and `/luggage-for/[carrier]-[fare]`. Never `/airline/*`. | [10](10-discoverability.md#the-airline-is-a-qualifier-not-the-subject) |
| **`/airline/*`** | Exists for transparency and internal linking. Not promoted, not in the sitemap. | [15](15-sitemap.md) |
| **Launch carriers** | **100.** 58 researched so far; ship at 58+ and fill in after. | [04](04-data-sources.md#the-launch-50) |
| **Fare-class carriers** | The 12 where fare changes the answer | [04](04-data-sources.md) |
| **Launch bags** | 60–80 measured | [04](04-data-sources.md) |
| **Units** | Inches for US locale, cm elsewhere. Always-visible header toggle, remembered. Dual display only on the hero envelope. **SSR never infers a locale — static HTML ships metric, the client corrects.** | [01](01-mvp.md#units) |
| **Nav** | Three items: Bags · Guide · Check a bag. No Airlines index at launch. | [15](15-sitemap.md#airlines-is-deliberately-absent-at-launch) |
| **Checked bags** | Data collected week one; shown in the failed-carry-on flow. Dedicated pages are queue item 5. | [01](01-mvp.md#checked-bags-specifically) |
| **Architecture** | Read path = version-controlled JSON, server-rendered. Write path = thin serverless + store, for email, click tracking and corrections only. | [01](01-mvp.md#architecture) |
| **Typeface** | Figtree + IBM Plex Mono. Barlow is gone. | [02](02-design-system.md#the-stack) |
| **CSS** | Tailwind v4, palette declared in `@theme` in `src/styles/app.css`. The one hard rule — blue is the only interactive colour — is checked in `verify-build.mjs` against the built HTML. | [20](20-scaffold-plan.md) |
| **Name** | *Sizer* is a working placeholder, not a decision | [09](09-naming.md) |
| **Engine placement** | Build time for static pages, browser for the interactive query. Same pure module. | [17](17-tech-stack.md) |
| **Components** | Repetition is the trigger — three uses. Header/nav/footer + interactive pieces with tests. Everything else a plain page. | [17](17-tech-stack.md) |
| **First route** | Landing page | [17](17-tech-stack.md) |
| **Outbound email** | Resend over HTTP. Workers have no TCP sockets, so SMTP cannot work. | [17](17-tech-stack.md) |
| **D1** | Deferred past MVP. Read path is static JSON; D1 is only for the write path. | [17](17-tech-stack.md) |
| **User corrections** | `observed` provenance, queued for review, never auto-editing. Structured fields, not free text. | [17](17-tech-stack.md) |

## Numbers that are not yet real

Every coverage figure in these docs — "9 of 24", "clears 0 of 24", the Strategist and T+L cross-reference tables — is computed against **placeholder carrier data in the mockup**. They are directionally useful and **not publishable**. Re-run every one after the 50-carrier audit.

## Open questions

- Name not locked — see [09-naming.md](09-naming.md).
- Wirecutter and Travel + Leisure carry-on guides flagged by Frank as a reality check; both blocked from automated fetch. Save the pages into the project folder to get them reviewed.
- **Rick Steves publishes packing AND with-wheels dimensions** — the only source that does. The Spinner swings 16/24 → 6/24 between them. See [04](04-data-sources.md#rick-steves--a-manufacturer-that-publishes-the-number-we-care-about).
- **Carrier lifecycle is now in the schema.** Spirit ceased operations 2 May 2026 and our data described it as live for three months. Freshness checks cannot catch this — see [05](05-schema.md#carrier-lifecycle--airlines-stop-existing). **The 50-carrier audit must confirm every carrier is still flying.**
- **Pack Hacker ships a carry-on compliance score against 146 airlines** on their review pages, built on manufacturer dimensions. Read [14](14-competitive-notes.md#pack-hacker--the-competitor-i-missed) before writing another word about the competitive gap.
- **Editorial claims hardcoded in mockup strings.** `mockup/bags.html` `FNOTE.roller` cites Pack Hacker's rolling test inside a template literal — no link, no retrieval date, no way to update when they retest. Same debt in the `AIR[]` strictness `e:` strings. Both should read from data before launch, not after.
- **`build-bags.mjs` will erase `measured_cm` on rebuild.** It regenerates every record from sources. Fix the preserve-on-rebuild path *before* the first bag is measured — see [19](19-dataset-build.md#files).
- The "goes anywhere" shelf has 2 bags on it. See [19](19-dataset-build.md#whats-thin-and-why-its-the-same-problem-twice).
- Measurement queue from the Pack Hacker read, none of these are in the catalogue yet: Carl Friedrik Carry-on X, Bellroy Transit, Peak Design Roller Pro, Osprey Transporter Wheeled 38, Aer Carry-On **Small**, Eagle Creek Cargo Hauler XT, Calpak Luka Mini.
- Airline data sourcing thread not yet run in full. Current understanding: no API exists, everything is hand-curated, CarryFit is open source and usable as a cross-check.
