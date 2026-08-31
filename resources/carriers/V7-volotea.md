# Volotea (V7)

- Record: `data/carriers/V7.json`
- Researched by: Codex
- Read on: 2026-08-30
- Status: partial — official allowance research complete for the listed fares; human publication audit pending

## Allowances and scope

basic=Standard without Priority Boarding, economy=Standard with purchased Priority Boarding. Priority is an add-on, not a separate cabin class. Membership products are not exhaustively modeled. The current page gives cabin depth 25 cm; do not reuse older 20 cm material. Both cabin items share 10 kg. Checked baggage is purchased in 10/20/25 kg options; the row uses the 25 kg option, not the 32 kg absolute acceptance ceiling. Numerical checked dimensions and wheel treatment are unverified.

| Stored fare and airline label | Cabin | Personal item | Checked |
|---|---|---|---|
| basic: Standard | No included overhead bag | 40 × 30 × 20 cm; unspecified kg | 0 included; 25 kg per bag |
| economy: Standard + Priority Boarding | 1 × 55 × 40 × 25 cm; 10 kg | 40 × 30 × 20 cm; unspecified kg | 0 included; 25 kg per bag |

When combined_max_kg is present, both cabin items share that total; the table's cabin weight is not an additional allowance. A zero checked total/piece count means none included; numeric limits on that row describe paid baggage. Null means unknown, not unrestricted.

## Sources actually opened and read

1. [Official policy](https://www.volotea.com/en/baggage/) — tier 1. Read Standard/Megavolotea sections, hand luggage without/with Priority Boarding, combined weight and checked-luggage options.

Only the listed sections were audited, not unrelated page content. No archived snapshot created. Search snippets were not used as the verification basis for allowance rows.

## Enforcement and remaining review

The score 9 is the existing `priorFor('lcc', 'EU')` prior, not an empirical enforcement rating. No traveller-report sample, staff-incentive investigation or complete fee-asymmetry study was performed. Physical sizer dimensions and aircraft exceptions remain unknown. Official enforcement statements in the scope notes are policy statements, not observed stop rates. This is a researched record, not a placeholder. Publication review remains pending separately (publication_ready: false).

The engine currently does not fully enforce combined cabin weights, weight-system checked totals, or additional per-axis/circumference constraints. Do not present a complete baggage-compliance verdict without honoring the notes. No app code changed in this task.
