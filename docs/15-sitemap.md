# Sitemap and navigation

## Navigation

**Three items at launch.** The nav's only real jobs are getting someone from a deep page into the tool, and signalling that we're a site rather than a widget.

```
[wordmark]        Bags   Guide        [ Check a bag ]
```

| Item | Route | Why it's here |
|---|---|---|
| **Bags** | `/bags` | The catalogue. Commercial surface, and where measured dimensions live. |
| **Guide** | `/guide` | The link-earning hub |
| **Check a bag** | `/check` | The tool. Button-styled, visually distinct, always the rightmost thing. |

### Airlines is deliberately absent at launch

An earlier draft had a fourth item pointing at a `/luggage-for` index. Cut for v1, on an asymmetry worth stating plainly:

> **Our bag data is a strength at launch. Our airline coverage is a weakness.**

Sixty measured bags is more than anyone in this category has. Fifty airlines against a competitor's 190 is the single number where we look small — and an index page's whole promise is comprehensiveness. Someone who opens "Airlines", scans for their carrier and doesn't find it has learned something bad about us in four seconds. The Bags page has the opposite effect.

**The per-carrier pages still ship.** `/luggage-for/[carrier]` and `/luggage-for/[carrier]-[fare]` are the SEO spearhead ([10](10-discoverability.md)) and are reached from search, from the check tool, and from bag pages. Only the *index* waits.

**Add it when coverage stops being the weak number** — roughly when a month of search data shows few visitors arriving for a carrier we don't cover. Judge on misses, not on a round number of airlines.

**The three doors are not nav items.** They're modes of `/check`, and the homepage presents all three. A deep page's CTA opens the relevant door pre-loaded — "Check your bag against Ryanair" — rather than sending someone to a generic front door.

**When Airlines does return, it points at `/luggage-for`, not `/airline`.** People scan for the word; the destination should be the page that helps them buy something, not a policy directory we'd lose to the airline itself.

### Not in the nav

**How we measure** and **Our sources** are linked *contextually* — from every provenance badge, every strictness score, every source line. That's where someone actually wants them, and it beats a header link nobody clicks.

**Report an error** sits in the footer and inline on data pages. [Doc 14](14-competitive-notes.md) suggested making it top-level after seeing Luggage Validator do it — revisiting that: it works for them because crowdsourced reports are their asset. Ours are parked for v1, so contextual placement is more honest. Reconsider when reports ship.

### Mobile

Logo, then **Check a bag** always visible, then a menu for the other three. A hamburger over four items adds a tap for no reason, but the primary action shouldn't ever be behind one. Phone is likely the majority case.

---

## Sitemap

```
/                          homepage — universal envelope + three doors
/check                     the tool                          noindex
  ?bag= &legs= &region=    shareable state                   noindex

/bags                      catalog index
  /bag/[slug]              measured vs claimed, coverage     ← push
  /bag/[slug]/[carrier]    one pairing, one verdict          ← dynamic

/luggage-for               index, by airline            ← v1.1, not launch
  /luggage-for/[carrier]                                     ← publish
  /luggage-for/[carrier]-[fare]                              ← push hard

/size/[l]x[w]x[d]          who accepts this box              ← publish
/size/universal            works everywhere                  ← publish
/region/[slug]             eu · asia · north-america         ← publish

/airline/[slug]            reference only — not promoted

/guide                     the hub                           ← push hard
/methodology               how we measure and score
/sources                   annotated register

/about  /contribute  /changelog
/privacy  /terms  /disclosure
```

Tier meanings in [12-entry-points.md](12-entry-points.md). `/airline/*` is deliberately unpromoted — [we can't outrank the airline and the intent is wrong](10-discoverability.md).

---

## Footer

Three columns, plus the required strings.

| Find luggage | How we know | About |
|---|---|---|
| Check a bag | How we measure | About |
| All bags | Our sources | Contribute a correction |
| By airline | Changelog | Privacy · Terms |
| By size | Report an error | Affiliate disclosure |

Then, in small type: the FTC affiliate disclosure and the Amazon Associates string — *"As an Amazon Associate I earn from qualifying purchases."* Omitting that one is expressly a material breach ([06](06-monetization.md)).

---

## Two rules

1. **Every deep page has a contextual CTA**, never a generic one. From `/luggage-for/ryanair-basic` it's "Check your bag against Ryanair Basic," pre-loaded.
2. **Never change a URL without a 301.** A ranking page that moves silently is the most expensive self-inflicted wound available, and this is an acquisition business.
