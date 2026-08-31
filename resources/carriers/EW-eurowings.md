# Eurowings (EW)

- Record: `data/carriers/EW.json`
- Researched by: Codex
- Read on: 2026-08-30
- Status: partial — official allowance research complete for the listed fares; human publication audit pending

## Allowances and scope

BASIC has no overhead bag unless purchased. economy maps to SMART; business to BIZclass. Numerical physical sizer and checked-bag size limits were not verified. Hand-baggage page promises size/count checks for every passenger; this does not establish weighing frequency. Different starting prices appear on the same page, so no fees are modeled.

| Stored fare and airline label | Cabin | Personal item | Checked |
|---|---|---|---|
| basic: BASIC | No included overhead bag | 40 × 30 × 25 cm; unspecified kg | 0 included; 23 kg per bag |
| economy: SMART | 1 × 55 × 40 × 23 cm; 8 kg | 40 × 30 × 25 cm; unspecified kg | 1 included; 23 kg per bag |
| business: BIZclass | 2 × 55 × 40 × 23 cm; 8 kg | 40 × 30 × 25 cm; unspecified kg | 2 included; 32 kg per bag |

When combined_max_kg is present, both cabin items share that total; the table's cabin weight is not an additional allowance. A zero checked total/piece count means none included; numeric limits on that row describe paid baggage. Null means unknown, not unrestricted.

## Sources actually opened and read

1. [Official policy](https://www.eurowings.com/en/information/baggage/hand-baggage-policy.html) — tier 1. Read Hand baggage per fare, Size and weight, and Good to know: BASIC personal only; SMART one cabin bag; BIZclass two.
2. [Official policy](https://www.eurowings.com/en/information/baggage/checked-baggage.html) — tier 1. Read Free baggage allowance per fare and Additional checked baggage: BASIC paid, SMART 23 kg, BIZclass two 32 kg bags.

Only the listed sections were audited, not unrelated page content. No archived snapshot created. Search snippets were not used as the verification basis for allowance rows.

## Enforcement and remaining review

The score 9 is the existing `priorFor('lcc', 'EU')` prior, not an empirical enforcement rating. No traveller-report sample, staff-incentive investigation or complete fee-asymmetry study was performed. Physical sizer dimensions and aircraft exceptions remain unknown. Official enforcement statements in the scope notes are policy statements, not observed stop rates. This is a researched record, not a placeholder. Publication review remains pending separately (publication_ready: false).

The engine currently does not fully enforce combined cabin weights, weight-system checked totals, or additional per-axis/circumference constraints. Do not present a complete baggage-compliance verdict without honoring the notes. No app code changed in this task.
