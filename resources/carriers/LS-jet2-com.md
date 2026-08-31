# Jet2.com (LS)

- Record: `data/carriers/LS.json`
- Researched by: Codex
- Read on: 2026-08-30
- Status: partial — official allowance research complete for the listed fares; human publication audit pending

## Allowances and scope

Flight-only adult fare: both cabin items included; paid hold baggage up to three 22 kg bags. Package holidays can include checked baggage and are not modeled here. A compliant overhead bag can still be placed in the hold on busy flights. Hand-bag dimensions explicitly include wheels/handles; the personal-item paragraph does not repeat that qualification. Numerical checked dimensions not verified.

| Stored fare and airline label | Cabin | Personal item | Checked |
|---|---|---|---|
| basic: Flight-only | 1 × 56 × 45 × 25 cm; 10 kg | 40 × 30 × 20 cm; unspecified kg | 0 included; 22 kg per bag |
| economy: Flight-only | 1 × 56 × 45 × 25 cm; 10 kg | 40 × 30 × 20 cm; unspecified kg | 0 included; 22 kg per bag |

When combined_max_kg is present, both cabin items share that total; the table's cabin weight is not an additional allowance. A zero checked total/piece count means none included; numeric limits on that row describe paid baggage. Null means unknown, not unrestricted.

## Sources actually opened and read

1. [Official policy](https://www.jet2.com/en/baggage) — tier 1. Read Our baggage policy, 10kg hand luggage, Small under-seat bag, Guaranteed Cabin Luggage and hold-baggage FAQ.

Only the listed sections were audited, not unrelated page content. No archived snapshot created. Search snippets were not used as the verification basis for allowance rows.

## Enforcement and remaining review

The score 9 is the existing `priorFor('lcc', 'EU')` prior, not an empirical enforcement rating. No traveller-report sample, staff-incentive investigation or complete fee-asymmetry study was performed. Physical sizer dimensions and aircraft exceptions remain unknown. Official enforcement statements in the scope notes are policy statements, not observed stop rates. This is a researched record, not a placeholder. Publication review remains pending separately (publication_ready: false).

The engine currently does not fully enforce combined cabin weights, weight-system checked totals, or additional per-axis/circumference constraints. Do not present a complete baggage-compliance verdict without honoring the notes. No app code changed in this task.
