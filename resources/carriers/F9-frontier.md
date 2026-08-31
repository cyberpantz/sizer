# Frontier Airlines (F9)

- **Record:** `data/carriers/F9.json`
- **Researched by:** claude, at Frank's direction
- **Date:** 2026-08-30
- **Status:** partial — enforcement researched, allowances NOT verified

> ⚠️ The allowance figures in `data/carriers/F9.json` are **placeholder data
> lifted from the mockup**. Nobody has read Frontier's baggage page. Only
> section 2 below is real.

---

## 1. Allowances — the carrier's own page

**Not done.** `placeholder: true` stands until someone reads frontier.com.

## 2. Enforcement

### `staff_incentive` — TRUE, tier 1

The strongest single piece of enforcement evidence in the dataset, and it is a
congressional investigation rather than a travel blog.

> "Frontier and Spirit paid **$26 million** to gate agents and other personnel
> between 2022 and 2023 to catch passengers allegedly not following airline bag
> policies, often forcing those passengers to **pay a bag fee or miss their
> flight**. Frontier personnel can earn **as much as $10 for each bag** a
> passenger is forced to check at the gate."
>
> — Senate Permanent Subcommittee on Investigations, press release, 26 Nov 2024

**What was actually read:** the subcommittee's press release, in full. The
55-page report itself has **not** been read. The `verified_against` field in the
JSON says exactly this.

**Corrections made to an earlier version of this citation**, recorded because
the mistake is instructive:

| First written | Verified |
|---|---|
| aol.com aggregator as the source | PSI report is the primary source; the aggregator was summarising it |
| *"may inappropriately encourage abuse of discretion"* quoted as the report's words | **Not in the source read.** It came from a search-result summary. Removed. |
| "$10 per bag on domestic flights" | *"as much as $10"* — a maximum, and the domestic/international split was the aggregator's detail, not the primary source's |

The first version was written from a search summary and marked verified. That is
the failure this project exists to correct, and it is why the JSON now requires a
`verified_against` field stating what was opened.

### `published_gauging` — unknown
Not researched. Frontier's own baggage page has not been read.

### `fee_asymmetry` — unknown, but expected TRUE
Frontier's gate price for a carry-on is widely reported as several times the
online price. **Not verified against frontier.com. Do not populate until it is.**

### `weighs_at_checkin` — unknown

## 3. Prior and score

- Type `ulcc` · Region `NA` · Prior **9** (ULCCs are at the ceiling; the region
  shift does not apply)
- Derived **9**, confidence **0.2** — one of four components known
- `provisional: true`

Note the prior and the evidence agree here, which is reassuring and not
independent: the prior was fitted partly against hand-assigned scores.

## 4. Traveller reports

None yet. n = 0.

## 5. Conflicts and open questions

- **Is the $10 a maximum or a flat rate?** Source says "as much as", so it is
  recorded as `amount_is_maximum: true`.
- **Has the scheme continued past 2023?** The PSI data covers 2022–23. Frontier
  confirmed the practice publicly in 2023. Current status unverified.
- **Does an incentive change the verdict for a compliant bag?** This is why the
  `agentCommission` advisory fires even on CLEARS. The subcommittee describes
  passengers "allegedly" not following policy — the word is theirs.

## 6. Sources

| # | Source | Tier | Read? | URL |
|---|---|---|---|---|
| 1 | Senate PSI press release, 26 Nov 2024 | 1 | **yes, in full** | https://www.blumenthal.senate.gov/newsroom/press/release/senate-permanent-subcommittee-on-investigations-releases-majority-staff-report-slamming-sky-high-airline-junk-fees |
| 2 | PSI Majority staff report, *The Sky's the Limit* (55pp) | 1 | **no** | https://www.hsgac.senate.gov/subcommittees/investigations/library/files/majority-staff-report-the-skys-the-limit-the-rise-of-junk-fees-in-american-travel/ |
| 3 | The Hill — Frontier confirms gate agent incentive | 2 | no, search result only | https://thehill.com/homenews/4019832-frontier-airlines-confirms-gate-agent-incentive-for-baggage-fees-after-viral-tiktoks/ |
| 4 | frontier.com baggage page | 1 | **not visited** | — |
