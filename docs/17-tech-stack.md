# Tech stack and deployment

Decisions, with the reasoning and the honest alternative for each. Nothing here is exotic — the interesting parts of this project are the data and the measuring, and the stack should stay boring enough to disappear.

## What the architecture actually demands

From [01-mvp.md](01-mvp.md#architecture) and [10-discoverability.md](10-discoverability.md), the real constraints:

| Requirement | Consequence |
|---|---|
| Every indexable URL returns real HTML | Server-rendered or pre-rendered. No client-only routes. |
| Most of the site is content, one part is a tool | Ship almost no JS on content pages; hydrate the tool only |
| Three rendering tiers | Pre-render + on-demand-with-cache + client state, in one framework |
| Read data is version-controlled JSON | Type-safe file-based content, not a CMS |
| A thin write path | Email capture, click log, corrections. Nothing else. |
| One person, two weeks, low running cost | Boring, cheap, minimal moving parts |

## Framework — Astro

**Why.** This is a content site with one interactive island, and that's precisely the shape Astro is built for. Content pages — guide, bag pages, `/luggage-for/*`, `/size/*` — ship **zero JavaScript**, which is exactly the SEO surface where a JS payload buys nothing. The Strip and the check tool become islands that hydrate on their own. Content Collections give schema-validated JSON with TypeScript types generated from a Zod schema, so [05-schema.md](05-schema.md) becomes enforceable at build time rather than aspirational.

```
npm create astro@latest
```

**The honest alternative: Next.js.** Bigger ecosystem, better hiring pool, and App Router handles the tier model fine. It also ships a JS runtime to every page by default and has substantially more concepts to hold. For a solo two-week build of a mostly-static site, Astro is less to fight. If the plan were an app with accounts and dashboards, this recommendation would flip.

**Not recommended:** 11ty (would need bolting-on for the dynamic tier), SvelteKit (fine, smaller ecosystem, no advantage here for a JS/TS developer).

### How the three tiers map

```js
// astro.config.mjs
export default defineConfig({
  output: 'hybrid',            // pre-render by default, opt into SSR per route
  adapter: cloudflare(),
});
```

| Tier | Astro | Routes |
|---|---|---|
| **Promoted** | `export const prerender = true` (default) | `/`, `/guide`, `/bags`, `/bag/[slug]`, `/luggage-for/*`, `/size/*`, `/region/*`, `/methodology`, `/sources` |
| **Available** | `export const prerender = false` + cache header | `/bag/[slug]/[carrier]` |
| **Ephemeral** | Island state only, `history.replaceState` | Door inputs, filters |

`/check` is prerendered as a shell; its state lives entirely in the URL and the island ([11](11-sharing-and-permalinks.md)).

## Hosting — Cloudflare Pages + Workers

**Why.** The free tier covers this build comfortably at the traffic we're modelling, the write path is a Worker rather than a separate service, and there are no cold starts. On a site plausibly earning $1–5k/month ([06](06-monetization.md)), hosting cost is not a rounding error and shouldn't be treated as one.

| Need | Cloudflare piece | Cost at our scale |
|---|---|---|
| Static + SSR | Pages (Workers runtime) | Free |
| Write path | Workers Functions | Free tier: 100k req/day |
| Click log, email list, corrections | **D1** (SQLite) | Free tier: 5 GB |
| Cached on-demand pages | **KV** or the Cache API | Free tier ample |
| Measurement photos | **R2** | Free egress — meaningful for images |
| Analytics | Web Analytics | Free, cookieless |

`@astrojs/cloudflare` is a first-party adapter and stable.

**The honest alternative: Vercel.** Better DX, the smoothest Astro deploy there is, and preview deploys that just work. It's also materially more expensive once functions and bandwidth scale, and R2's zero egress matters for a site serving measurement photographs. **If DX is worth more to you than cost, take Vercel and don't agonise** — nothing in this spec depends on the choice.

**Not recommended:** self-hosted anything. The maintenance is the product's scarcest resource ([04](04-data-sources.md)), and it should go into measuring bags.

## Repo layout

```
/
├─ src/
│  ├─ pages/              route files, thin — no logic
│  ├─ components/         Astro components (zero JS)
│  ├─ islands/            the Strip, the check tool — the only hydrated code
│  ├─ lib/
│  │  ├─ engine.ts        fit() and envelope() — pure, no imports beyond types
│  │  ├─ engine.test.ts   the band tests
│  │  └─ format.ts        units, dates, dimension strings
│  └─ styles/tokens.css   ← single source for design tokens
├─ content/
│  ├─ carriers/           FR.json, BA.json … one per carrier
│  └─ bags/               one per bag
├─ public/measure/        measurement photographs
├─ functions/             Workers: /api/click, /api/subscribe, /api/report
├─ scripts/
│  ├─ check-drift.mjs     doc consistency ([README](README.md#canonical-decisions))
│  ├─ check-tokens.mjs    design tokens vs build
│  └─ validate-data.mjs   the CI rules in [05](05-schema.md#validation)
└─ docs/
```

**`src/styles/tokens.css` is the one thing to get right early.** The five mockups currently duplicate the whole token block — fine for sketching, wrong the moment this becomes a build. One file, imported once.

**`lib/engine.ts` imports nothing.** It's the piece where a bug costs a user money, so it stays trivially testable and framework-independent.

## The write path

Three endpoints, no more. Each is a Worker writing to D1.

```sql
-- click log: Amazon's own reporting is degrading, so we keep our own
CREATE TABLE clicks (
  id       INTEGER PRIMARY KEY,
  ts       INTEGER NOT NULL,
  bag      TEXT    NOT NULL,
  merchant TEXT    NOT NULL,
  network  TEXT,
  page     TEXT    NOT NULL,   -- which template sent them
  door     TEXT,               -- bag | airline | region
  verdict  TEXT,               -- the band they were shown
  session  TEXT                -- rotating, anonymous, no PII
);

CREATE TABLE subscribers (
  id INTEGER PRIMARY KEY, email TEXT UNIQUE NOT NULL,
  ts INTEGER NOT NULL, source TEXT, confirmed INTEGER DEFAULT 0
);

CREATE TABLE reports (          -- "this is wrong" from any data page
  id INTEGER PRIMARY KEY, ts INTEGER NOT NULL,
  kind TEXT, subject TEXT, body TEXT, url TEXT
);
```

Outbound links route through `/go/[merchant]/[bag]` — a Worker that logs, then 302s. Tracking becomes structural rather than a script that can be blocked. Use `rel="sponsored nofollow"`.

**Recording `verdict` on the click is the interesting column.** It answers a question only our data can: *does a "won't fit" verdict convert better than "it fits"?* Almost certainly yes — that's the moment someone realises they need a different bag — and knowing by how much shapes where the recommendations go.

## CI

Everything already written as a check should run on every push. GitHub Actions, one workflow, under a minute:

```yaml
- npm test                          # engine bands, boundaries, no fall-through
- node scripts/validate-data.mjs    # source_url, verified_at, staleness, provenance
- node scripts/check-tokens.mjs     # design tokens match the spec
- node scripts/check-drift.mjs      # docs match the canonical decisions
- npx astro build                   # it compiles
```

**`validate-data.mjs` is the one that matters.** It enforces the rules in [05](05-schema.md#validation): every allowance has a source and a date, nothing is stale past 180 days, measured bags have a photograph, no Amazon price field is ever populated. Those are the promises the whole site rests on, and a promise you don't test is a promise you'll break.

## Domain and email

- Registrar: Cloudflare Registrar (at-cost, no renewal markup) once the name is chosen ([09](09-naming.md))
- Email on the domain from day one — affiliate networks reject free-provider addresses ([07](07-affiliate-setup.md))
- Fastmail or Google Workspace; either is fine

## What we are deliberately not using

| Not using | Why |
|---|---|
| A CMS | Data is JSON in git — that's what makes `verified_at` reviewable |
| A component library | Five components, one design system, no dependency worth the weight |
| Tailwind | Tokens plus ~400 lines of CSS covers the whole site. Not a criticism of Tailwind; it just isn't earning its place here. |
| React on content pages | Zero-JS is the point of choosing Astro |
| A database for the read path | Static JSON is faster, cheaper, and diffable |
| Docker, Kubernetes, a monorepo | One site, one person |

## Two-week sequence

| Days | Build |
|---|---|
| 1–2 | Repo, Astro, tokens, `engine.ts` + tests. No UI. |
| 3–4 | Carrier data migrated and audited ([01](01-mvp.md)) |
| 5 | Bag measuring — tape, scales, photographs |
| 6–7 | The Strip and the results view |
| 8–9 | `/bag/*`, `/luggage-for/*`, `/size/*` |
| 10 | Guide, methodology, sources |
| 11 | Write path, click tracking, analytics |
| 12 | Affiliate wiring ([07](07-affiliate-setup.md)) |
| 13 | Accessibility, Lighthouse, mobile |
| 14 | Ship |

The riskiest days are 3–5, and none of the risk is technical.

---

## Decisions taken while building (2026-08-30)

Answers to the questions that were open when the scaffold started. Recorded here rather than in a new doc — the answers *were* the plan.

### Where the engine runs: both, which is why it is pure

Static pages compute verdicts at **build time**; the interactive query — a traveller's own itinerary and their own bag — computes in the **browser**. Same module either way.

This is the reason `src/engine/` has no DOM, no I/O, no unit formatting and no copy. Anything that touched `document` or `localStorage` would be unusable at build time; anything that formatted inches would be unusable in a page that offers a unit toggle. The purity was not tidiness, it was this requirement.

### Components: the rule is repetition, not importance

> "Repeat something three times, turn it into a shared component."

Header, nav and footer are components. Interactive pieces get components **with unit tests**. Everything else is a plain Astro page — no component for its own sake.

That rule also settled the extraction backlog: the unit converter is duplicated across five mockups and the verdict labels across three, where they have **already drifted** ("Won't fit" vs "It won't fit"). By the repetition rule those are shared modules now, not later.

### First route: the landing page

It is the honest test of the stack — it needs the engine, the bag data, the carrier data, the unit toggle and the verdict copy. Every other route is a variation on it.

### Email and the corrections endpoint: Resend

Cloudflare Workers run on V8 with **no TCP sockets**, so SMTP libraries cannot work at all — outbound mail has to be an HTTP API. MailChannels, which used to be the free path for Workers, [sunset that service in August 2024](https://support.mailchannels.com/hc/en-us/articles/4565898358413-Sending-Email-from-Cloudflare-Workers-using-MailChannels-Email-API).

**Resend over HTTP** ([Cloudflare's own tutorial](https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/)). Cloudflare Email is an alternative — public beta since April 2026, $0.35/1,000 — but Resend is the documented path and portable off Cloudflare if we ever move.

Inbound is separate and free: Email Routing forwards mail on the domain, and Email Workers can process it in code.

### D1: deferred past MVP

D1 is Cloudflare's managed SQLite. The read path is version-controlled JSON served statically, so D1 would exist only for the **write** path — outbound click tracking and email capture. Neither needs a database on day one. Ship static plus one Worker for `/go/*` redirects; add D1 when the corrections endpoint lands.

---

## User corrections — the write path, when it comes

Wanted soon after soft launch, possibly at MVP. Infrastructure is the easy half.

| Need | Answer |
|---|---|
| API | A Worker. `POST /api/report` is a file in the repo, same domain, no separate backend. |
| Storage | D1 for reports, R2 if we ever accept photos |
| Spam | **Turnstile plus rate limiting, not optional.** A public write endpoint is abused within days. |
| Outbound mail | Resend over HTTP |

Three rules that matter more than any of that:

**1 · A report is `observed` provenance.** The weakest tier, and [already in the schema](05-schema.md) — the Rick Steves buyer reporting *"too wide for Turkish air, Swiss air"* is exactly this record type. The slot existed before we knew we would need it.

**2 · A report never edits the dataset.** It is evidence, queued for a human, like everything else. An auto-editing public endpoint lets a brand or a competitor rewrite our numbers, and the entire proposition is that the numbers are ours.

**3 · Structured, not free text.** Which airline, which bag, were you stopped, gate or check-in — dropdowns. Free-form comment about a named carrier collides with [16](16-editorial-policy.md), and a defamation claim over an airline is a bad day. Structured input also yields data we can count rather than prose someone has to read.

### Why this may earn its place in the MVP

The strictness ceilings — 5.0 / 3.0 / 1.5 / 0 cm — are **judgement, not measurement**, and [05-schema](05-schema.md) says so. Reports of bags actually being stopped are the only thing that turns them into something derived from evidence.

*"Was your bag checked?"* is an honest question, costs almost nothing to ask, and compounds. Nothing else we could build improves the core verdict over time.
