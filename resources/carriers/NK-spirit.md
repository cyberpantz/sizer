# Spirit Airlines (NK) — CEASED OPERATIONS

- **Record:** none — deleted 2026-08-30. This file is the only thing that remains.
- **Researched by:** claude, at Frank's direction
- **Date:** 2026-08-30
- **Status:** **ceased 2 May 2026** — retained for the record, excluded from every result

> ## Spirit stopped flying on 2 May 2026
>
> All operations ceased in a court-supervised wind-down after a second Chapter 11
> filing (29 Aug 2025) failed to produce a reorganisation. The first major US
> airline to fail financially in 25 years.
>
> Everything below about baggage enforcement is **historical**. It describes how
> Spirit behaved while it was flying and cannot describe a flight anyone will
> take. It is kept because the enforcement research is still evidence about how
> ULCCs behave, and because deleting a record loses the reason it was deleted.
>
> Flagged by Frank on 2026-08-30 — three months after the fact, and after the
> assistant's knowledge cutoff. **Our own dataset had it as an operating carrier
> with a live baggage policy.**
>
> **The carrier record was deleted rather than flagged.** A `status: ceased`
> field keeps a defunct airline in the file, in the picker's data, and in
> anything that iterates carriers without checking — relying on every future
> caller to remember. Deleting removes the class of bug. This dossier is what
> remains, and it is here because the enforcement research is still evidence
> about how ULCCs behave, and because the reason for a deletion is worth more
> than the deleted row.

---

## 1. Allowances

**Not done.** Placeholder data from the mockup.

## 2. Enforcement

### `staff_incentive` — TRUE (existence), amount UNVERIFIED

The PSI report's $26M figure is **joint** across Frontier and Spirit, and the
per-bag amount quoted in the press release is Frontier's. A $5 per-bag figure for
Spirit appeared in a syndicated summary that was **not opened**.

So: the existence of a per-catch commission is tier 1. The amount is not
evidenced and the JSON carries `amount_verified: false` with
`unverified_why` explaining precisely this.

Resisting the temptation to write "$5" as though it were established is the whole
point of keeping these files.

### `published_gauging` · `fee_asymmetry` · `weighs_at_checkin` — unknown

## 3. Prior and score

Type `ulcc` · Region `NA` · Prior **9** · Derived **9**, confidence **0.2**

## 4. Traveller reports

None yet.

## 5. Conflicts and open questions

- **What is Spirit's actual per-bag commission?** Needs the 55-page report, or a
  primary source naming Spirit specifically.
- The $26M is a combined figure and must never be attributed to either carrier
  alone.

## 6. Sources

| # | Source | Tier | Read? | URL |
|---|---|---|---|---|
| 1 | Senate PSI press release, 26 Nov 2024 | 1 | **yes, in full** | https://www.blumenthal.senate.gov/newsroom/press/release/senate-permanent-subcommittee-on-investigations-releases-majority-staff-report-slamming-sky-high-airline-junk-fees |
| 2 | PSI Majority staff report (55pp) | 1 | **no** — likely holds the Spirit figure | https://www.hsgac.senate.gov/subcommittees/investigations/library/files/majority-staff-report-the-skys-the-limit-the-rise-of-junk-fees-in-american-travel/ |
| 3 | AOL — Spirit/Frontier commission figures | 3 | **no, search result only** | https://www.aol.com/spirit-frontier-employees-earn-bonuses-131502823.html |
| 4 | spirit.com baggage page | 1 | **not visited** | — |
