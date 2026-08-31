# Sources

Every external source used to form a position in this project, with an honest
record of **whether it was actually read**.

That last column is the point. A citation asserts someone opened the thing. During
the Frontier work a source was cited, marked verified, and quoted — entirely from
a search-result summary, and the quote turned out not to be in the document. This
file exists so that failure is visible rather than repeatable, and so the
`/methodology` page can be built from something real.

**Read?** — `full` opened and read · `partial` opened, skimmed or section-read ·
**`summary`** never opened; only a search result or another article's account of it ·
`blocked` fetch refused

**Tier** — 1 primary (the carrier's own page, a government document, our own
measurement) · 2 established publication or testing outlet · 3 aggregator, forum,
single account

---

## Luggage reviews — the bag catalogue

| Source | Tier | Read? | What it gave us | URL |
|---|---|---|---|---|
| Travel + Leisure, *Best Carry-On Luggage 2026* | 2 | full (summarised locally) | 11 picks **with dimensions** | [link](https://www.travelandleisure.com/style/travel-bags/best-carry-on-luggage) |
| Travel + Leisure, *14 Best International Carry-ons* | 2 | full (summarised locally) | 18 sized picks; the "wrong size filter" finding | [link](https://www.travelandleisure.com/best-international-carry-on-luggage-7866989) |
| NY Mag / The Strategist, *The Very Best Carry-on Luggage* | 2 | full (summarised locally) | 18 picks, weights and capacities, **no dimensions** | [link](https://nymag.com/strategist/article/best-carry-on-luggage.html) |
| Pack Hacker, *Best Luggage for International Travel* | 2 | **full, fetched directly** | Rolling-surface test; the claim-and-retraction FAQ | [link](https://www.packhacker.com/blog/general/best-luggage-for-international-travel/) |
| Pack Hacker, Monos Carry-On review | 2 | **full, fetched directly** | Their **carry-on compliance score vs 146 airlines** | [link](https://www.packhacker.com/travel-gear/monos/carry-on-2/) |

⚠️ The three T+L / Strategist entries were read as **summaries Frank provided
locally**, not fetched — the originals were blocked. What we hold is a
second-hand rendering of those articles, and any figure taken from them inherits
that.

## Manufacturers — the only sources publishing both dimensions

| Source | Tier | Read? | What it gave us | URL |
|---|---|---|---|---|
| Rick Steves, carry-on collection | 3 | full | Filter facets exposing the size range | [link](https://store.ricksteves.com/collections/carry-on-luggage) |
| Rick Steves, Rolling Carry-On | 3 | full | **Packing and with-wheels dimensions**; honest expansion labelling | [link](https://store.ricksteves.com/products/rolling-carry-on) |
| Rick Steves, Spinner Carry-On | 3 | full | The 16→6 of 24 swing; two customer gate reports | [link](https://store.ricksteves.com/products/carry-on-spinner-luggage) |
| Travelpro, Maxlite 5 21" | 3 | partial | Three-variant comparison table | [link](https://travelpro.com/products/maxlite%C2%AE-5-21-expandable-carry-on-spinner) |
| Travelpro, Maxlite 5 International | 3 | partial | *"We publish both numbers… compare the overall number"* | [link](https://travelpro.com/products/maxlite%C2%AE-5-international-expandable-carry-on-spinner) |

## Enforcement — strictness scoring

| Source | Tier | Read? | What it gave us | URL |
|---|---|---|---|---|
| Senate PSI press release, 26 Nov 2024 | 1 | **full** | $26M in gate-agent commissions; *"as much as $10 for each bag"* | [link](https://www.blumenthal.senate.gov/newsroom/press/release/senate-permanent-subcommittee-on-investigations-releases-majority-staff-report-slamming-sky-high-airline-junk-fees) |
| PSI Majority staff report, *The Sky's the Limit* (55pp) | 1 | **summary** | The primary document. **Not opened.** Likely holds Spirit's figure | [link](https://www.hsgac.senate.gov/subcommittees/investigations/library/files/majority-staff-report-the-skys-the-limit-the-rise-of-junk-fees-in-american-travel/) |
| The Hill — Frontier confirms gate agent incentive | 2 | **summary** | Corroboration only | [link](https://thehill.com/homenews/4019832-frontier-airlines-confirms-gate-agent-incentive-for-baggage-fees-after-viral-tiktoks/) |
| AOL — Spirit/Frontier commission figures | 3 | **summary** | Where the unverified Spirit $5 came from | [link](https://www.aol.com/spirit-frontier-employees-earn-bonuses-131502823.html) |

## Competitors

| Source | Tier | Read? | What it gave us | URL |
|---|---|---|---|---|
| Luggage Validator, *How We Calculate Strictness* | 2 | **full** | Their six factors; prompted the prior/evidence/measurement split | [link](https://luggagevalidator.com/guide/how-calculate-strictness) |
| Luggage Validator, airline index | 2 | partial | ~190 airlines, weekly refresh, embeddable widget | [link](https://luggagevalidator.com/airlines/) |
| CarryFit (open source dataset) | 2 | partial | 172-airline cross-check; **licence not yet read** | [link](https://github.com/AxelUser/carry-fit) |

## Infrastructure

| Source | Tier | Read? | What it gave us | URL |
|---|---|---|---|---|
| Cloudflare — Send emails with Resend | 1 | **summary** | The documented Workers email path | [link](https://developers.cloudflare.com/workers/tutorials/send-emails-with-resend/) |
| Resend — Cloudflare Workers docs | 1 | **summary** | No TCP sockets, so HTTP API only | [link](https://resend.com/docs/send-with-cloudflare-workers) |
| MailChannels — Workers sunset | 1 | **summary** | Free path ended Aug 2024 | [link](https://support.mailchannels.com/hc/en-us/articles/4565898358413-Sending-Email-from-Cloudflare-Workers-using-MailChannels-Email-API) |

## Blocked — cited by Frank, never retrieved

| Source | Why it matters |
|---|---|
| Wirecutter carry-on guide | Flagged as a reality check. Fetch refused; **never obtained** |
| NY Mag Strategist (original) | Obtained only as a local summary |
| Travel + Leisure (originals) | Same |

## Carrier pages

| Source | Tier | Read? | What it gave us | URL |
|---|---|---|---|---|
| United — carry-on bags | 1 | **full, via browser** | Allowances; the units contradiction; route conditions; gate-check retrieval | [link](https://www.united.com/en/us/fly/baggage/carry-on-bags.html) |

⚠️ united.com is **client-rendered** — a plain fetch returns a JavaScript shell
with no content. It had to be read in a browser. Expect the same on other
carrier sites, and never record an empty fetch as "no data".

## Carrier status

| Source | Tier | Read? | What it gave us | URL |
|---|---|---|---|---|
| NPR — Spirit ceases operations | 2 | **summary** | Ceased 2 May 2026; carrier record deleted | [link](https://www.npr.org/2026/05/02/nx-s1-5807933/spirit-airlines-ceases-operations-folds) |
| CNBC — Spirit's final hours | 2 | **summary** | Corroboration | [link](https://www.cnbc.com/2026/05/02/spirit-airlines-shutdown-inside-the-final-hours.html) |
| CNN — Spirit halts all flights | 2 | **summary** | Corroboration | [link](https://www.cnn.com/2026/05/02/business/spirit-to-halt-all-flights) |
| Flightradar24 — Spirit ceases operations | 2 | **summary** | Corroboration | [link](https://www.flightradar24.com/blog/aviation-news/airline-news/spirit-airlines-ceases-operations/) |

Four outlets agreeing, none opened. The fact is not in doubt; by our own rule the status is `summary`, not verified.

## Legal and regulatory

| Source | Read? | Bearing |
|---|---|---|
| *Feist v. Rural Telephone* (US 1991) | summary | Facts are not copyrightable |
| *Ryanair v. PR Aviation* (CJEU 2015) | summary | Database unprotected, but ToS enforceable — the reason we don't scrape |
| European Parliament, cabin-size standardisation | **summary** | ⚠️ Recorded as "proposal, not law". Luggage Validator now publishes *2027 EU rules* content, so **this may have moved and needs re-checking** |

---

## What this list says about the project

- **Only one tier-1 source has been read in full**: the PSI press release.
- **Zero carrier baggage pages have been visited.** All 24 carrier records are
  `placeholder: true`, and that is not a formality.
- Every bag dimension we hold traces to **one publication**, obtained second-hand.
- The one thing we claim as our own — measured dimensions — has **no sources at
  all yet**, because nobody has measured a bag. That is the intended state: it is
  the work, not a gap in the reading.

## Rules

1. A source enters this table **when it is used**, not afterwards.
2. `summary` is a legitimate status. Citing a summary as though it were the
   document is not.
3. `data/carriers/*.json` may not claim `unverified: false` without a
   `verified_against` field naming what was opened. Enforced by
   `data/validate-carriers.mjs`.
4. Per-carrier reading goes in `resources/carriers/[IATA]-[name].md`, from
   `_TEMPLATE.md`. The JSON is an extract of the dossier, never the reverse.
