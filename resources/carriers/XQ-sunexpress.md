# SunExpress (XQ)

- Record: `data/carriers/XQ.json`
- Researched by: Codex
- Read on: 2026-08-30
- Status: partial — official allowance research complete for the listed fares; human publication audit pending

## Allowances and scope

International fares: basic=SunLight, economy=SunValue. SunEco+/SunComfort checked totals vary by route group and are not modeled. Do not give SunValue a separate free 4 kg personal item: the opened page only explicitly grants that allowance to SunLight. SunLight checked page shows a dash for hand baggage but its dedicated hand-baggage page explicitly includes a 4 kg underseat item. Region ME follows the existing Turkish Airlines record. Numeric physical sizers and wheels/handles treatment not verified.

| Stored fare and airline label | Cabin | Personal item | Checked |
|---|---|---|---|
| basic: SunLight | No included overhead bag | 40 × 30 × 20 cm; 4 kg | 0 kg total |
| economy: SunValue | 1 × 55 × 40 × 23 cm; 8 kg | Separate allowance unverified | 20 kg total |

When combined_max_kg is present, both cabin items share that total; the table's cabin weight is not an additional allowance. A zero checked total/piece count means none included; numeric limits on that row describe paid baggage. Null means unknown, not unrestricted.

## Sources actually opened and read

1. [Official policy](https://www.sunexpress.com/en-gb/information/luggage-info/hand-baggage) — tier 1. Read Weight & Dimensions and FAQs: SunLight underseat 4 kg; SunValue/SunEco+/SunComfort main cabin 8 kg.
2. [Official policy](https://www.sunexpress.com/en-gb/information/luggage-info/checked-baggage/) — tier 1. Read SunFares allowance table, route-group footnotes, 158 cm/32 kg per-item restrictions and gate-fee footnote.

Only the listed sections were audited, not unrelated page content. No archived snapshot created. Search snippets were not used as the verification basis for allowance rows.

## Enforcement and remaining review

The score 9 is the existing `priorFor('lcc', 'ME')` prior, not an empirical enforcement rating. No traveller-report sample, staff-incentive investigation or complete fee-asymmetry study was performed. Physical sizer dimensions and aircraft exceptions remain unknown. Official enforcement statements in the scope notes are policy statements, not observed stop rates. This is a researched record, not a placeholder. Publication review remains pending separately (publication_ready: false).

The engine currently does not fully enforce combined cabin weights, weight-system checked totals, or additional per-axis/circumference constraints. Do not present a complete baggage-compliance verdict without honoring the notes. No app code changed in this task.
