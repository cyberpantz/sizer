# Sharing and permalinks

Every meaningful state in the app must be a URL. Right now nothing in the flows is addressable, which breaks four things at once.

## Why this matters more than it looks

| Scenario | Frequency | Currently |
|---|---|---|
| **Phone → laptop handoff** | **Very high** | Impossible |
| Sending a verdict to a travel companion | High | Impossible |
| Answering someone on Reddit or a forum with evidence | Medium | Impossible |
| Returning to a result the next day | High | Impossible |
| A journalist citing a specific finding | Low, high value | Impossible |

The first one is the sleeper. Burst research spans one to three days and almost certainly spans devices — people browse on a phone and buy on a laptop. Without a shareable URL there's no handoff, and the session that would have converted just ends.

The third one compounds: a verdict URL is *evidence*. "Your bag is 5cm too wide for Wizz, here's the source" is a link someone drops into a forum thread, and every one of those is a backlink from a real discussion.

---

## URL design

Readable, hackable, and stable. Someone should be able to look at the URL and understand it — and edit it by hand.

```
/check?bag=monos-carry-on-pro&legs=FR.basic,VY.basic
/check?dims=56x40x23&soft=0&legs=FR.basic
/check?region=eu&coverage=95
/bag/monos-carry-on-pro/ryanair                    ← the canonical single-pairing page
/size/55x40x20
```

**Rules**

- Every door writes its state to the URL as the user edits, via `history.replaceState` — no page reload, no back-button pollution.
- Params are readable and hand-editable. `legs=FR.basic,VY.basic` beats an opaque encoded blob, and it means the URL is legible when pasted into a chat.
- **Filter state stays out of the URL** unless the user explicitly shares. Filters are ephemeral (tier 3); putting them in the shared link means sharing a half-configured view.
- A `/check?...` URL with a single bag and a single carrier **canonicals to** `/bag/[slug]/[carrier]`. Same answer, one indexable home — this avoids competing with yourself for the same query.
- Short links (`/t/a4f2k`) are generated only on an explicit Share action, backed by the write path. Don't mint one per pageview.

---

## The share card

A shared link should unfurl showing the answer, not a generic logo. Dynamically generated Open Graph images, rendered as a departure-board row in the wayfinding system:

```
┌────────────────────────────────────────┐
│  ▓ WON'T FLY                           │
│                                        │
│  MONOS CARRY-ON PRO   56 × 40 × 23 cm  │
│  WIZZ AIR · BASIC     5 cm too wide    │
│  €70 AT THE GATE                       │
└────────────────────────────────────────┘
```

This is one of the highest-leverage things on the roadmap relative to effort. A link that unfurls with a stark verdict is dramatically more clickable than one that unfurls with a wordmark — and the design system already has the visual language for it. `og:image`, `twitter:card=summary_large_image`, generated on demand and cached alongside the page.

---

## Permanence — and the feature hiding inside it

A shared link must still work in 2033. But **the answer may legitimately have changed**, because carriers change their rules — Ryanair moved its underseat allowance in September 2025, Lufthansa changed Economy Basic in May 2026.

Two options, and the obvious one is wrong:

- ❌ **Snapshot the verdict.** Stale forever. Someone acts on a 2029 answer in 2033 and gets charged. This is the failure the whole product exists to prevent.
- ✅ **Recompute live**, but record when the link was created.

Recording the creation date on short links turns a maintenance problem into the single best demonstration of the product's value:

> **This verdict changed since it was shared.**
> When this link was created on 12 Aug 2026, the Monos Carry-On Pro **cleared** Ryanair Basic.
> Ryanair changed its personal item allowance on 4 Nov 2026. It now reads **WON'T FLY**.

Nobody else in the category can produce that message, because nobody else keeps dated allowance history. It proves the rules move, proves we track them, and converts a returning visitor instantly. It costs one timestamp column and the `verified_at` history the schema already keeps.

---

## The long-horizon return

Luggage is a durable good. Someone who researches a bag in 2026 plausibly comes back in 2032 to replace it — which is a real dynamic, but not one you engineer with features.

**Be honest about what does and doesn't survive six years:**

| Doesn't survive | Does survive |
|---|---|
| Email lists — addresses change, people unsubscribe | A memorable name |
| `localStorage` — cleared, new device, new browser | A ranking position on the query they'll search again |
| Accounts nobody logged into for six years | Domain authority and backlinks |
| Any notification cadence | A vague memory: *"the site that actually measured them"* |

So the long-horizon retention mechanism **is the SEO position**, plus a name worth remembering. That's a direct argument for the naming recommendation in [09-naming.md](09-naming.md) — a generic descriptor doesn't get recalled, it gets re-googled, and then whoever ranks wins the visit.

What's worth building for it is small and cheap:

- **Keep URLs stable forever.** A 2026 link that still resolves in 2032 is the entire long-game retention system. Never break one without a 301.
- **Let Your Kit persist** in `localStorage` indefinitely. Most will be gone; the ones that survive produce a genuinely good moment — *"You saved this bag in 2026. Here's what's changed since."*
- **Don't build accounts for this.** A six-year gap makes them worthless, and they'd cost more than they return.

---

## Implementation notes

- `history.replaceState` on every input change; `pushState` only on a door switch, so the back button does something sensible
- Parse URL state on load and hydrate the doors before first paint — a shared link must render its answer server-side, not after a client round trip
- Validate and clamp params; a hand-edited URL must fail gracefully to the empty door, never to an error
- Short-link table: `code`, `state`, `created_at`, `hit_count`. Small, and `created_at` is what powers the changed-verdict message above.
- A visible **Copy link** control on every result. Don't rely on the address bar — most people never look at it on mobile.
