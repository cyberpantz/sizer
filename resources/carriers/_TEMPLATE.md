# [Carrier name] ([IATA])

- **Record:** `data/carriers/[IATA].json`
- **Researched by:**
- **Date:**
- **Status:** unresearched | partial | complete

> This file is where the reading happens. The JSON record is an *extract* of it.
> Nothing may be marked `unverified: false` in the JSON unless the source is
> listed below with a note saying **what was actually opened and read** — not
> what a search result said about it.

---

## 1. Allowances — the carrier's own page

**Source URL:**
**Retrieved:**
**Read in full?** yes / no — skimmed / summary only

| Fare | Cabin (cm) | Weight | Personal item (cm) | Checked | Notes |
|---|---|---|---|---|---|
| | | | | | |

- Does the page state dimensions **including wheels and handles**?
- Any route or aircraft exceptions in the small print?
- Fares where **no cabin bag is permitted at any size**? (absence is the signal — no zero rows)

## 2. Enforcement — the four scored components

Only behaviour and motive belong here. How restrictive the rules are is already
in the allowance above; putting it here too would count it twice.

### `published_gauging` — weight 3
Does the carrier's own site say bags are gauged, sized or placed in a frame?

- **Verbatim quote:**
- **URL:**
- **Answer:** true / false / unknown

### `fee_asymmetry` — weight 3
Gate price ÷ online price for a carry-on. ≥3× counts as true.

- Online: · At the gate: · Ratio:
- **URL:**
- **Answer:** true / false / unknown

### `staff_incentive` — weight 2
Documented per-catch payment to staff.

- **Source (primary, not an aggregator):**
- **Answer:** true / false / unknown

### `weighs_at_checkin` — weight 2
Are cabin bags actually weighed, not merely capped on paper?

- **Answer:** true / false / unknown

## 3. Prior and score

- Type: · Region: · Prior:
- Derived: · Confidence:
- Override? score / reason / by / date — **only with a reason**

## 4. Traveller reports

Counts feeding `reports`. Not anecdotes to reason from; a sample to measure.

- n = · stopped = · stop rate =

## 5. Conflicts and open questions

Where sources disagree, or where a number could not be verified. **Say so here
rather than resolving it silently** — an unresolved conflict is data.

## 6. Sources

| # | Source | Tier | Read? | URL |
|---|---|---|---|---|
| 1 | | | | |

**Tier 1** carrier's own published page, or a government/regulatory document ·
**Tier 2** established news reporting or a testing publication ·
**Tier 3** forums, social, single traveller accounts

---

*Anything asserted in the JSON must be traceable to a row in section 6.*
