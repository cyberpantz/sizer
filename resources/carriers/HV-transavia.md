# Transavia (HV)

- Record: `data/carriers/HV.json`
- Researched by: Codex
- Read on: 2026-08-30
- Status: partial — official allowance research complete for the listed fares; human publication audit pending

## Allowances and scope

HV is the Netherlands Transavia entry; Transavia France (TO) is not added as a second brand in this pass. economy=Smart; basic=Basic; plus=Plus; max=Max. Important official-source discrepancy: the cabin FAQ mentions 70 × 60 × 30 cm for checked baggage, but the dedicated checked-rules page says 165 cm linear. The latter is recorded and the conflict remains a publication blocker. Do not silently convert per-axis numbers to a linear limit.

| Stored fare and airline label | Cabin | Personal item | Checked |
|---|---|---|---|
| basic: Basic | No included overhead bag | 40 × 30 × 20 cm; 10 kg | 0 kg total |
| economy: Smart | 1 × 55 × 40 × 25 cm; 10 kg | 40 × 30 × 20 cm; unspecified kg | 0 kg total |
| plus: Plus | No included overhead bag | 40 × 30 × 20 cm; 10 kg | 20 kg total |
| max: Max | 1 × 55 × 40 × 25 cm; 10 kg | 40 × 30 × 20 cm; unspecified kg | 30 kg total |

When combined_max_kg is present, both cabin items share that total; the table's cabin weight is not an additional allowance. A zero checked total/piece count means none included; numeric limits on that row describe paid baggage. Null means unknown, not unrestricted.

## Sources actually opened and read

1. [Official policy](https://www.transavia.com/help/en-eu/baggage/cabin-baggage/how-much-to-bring) — tier 1. Read full allowance answer, combined weights, included Smart/Max and wheels/handles footnote.
2. [Official policy](https://www.transavia.com/help/en-uk/baggage/checked-baggage/checked-baggage-rules) — tier 1. Read full checked rules: 165 cm linear, 32 kg per piece, distribute weight across up to five pieces.
3. [Official policy](https://www.transavia.com/help/en-nl/search-and-book/basic-smart-plus-max-fare/basic-fare) — tier 1. Read Basic inclusions and extras; checked baggage is purchased. HV flight-number examples refer to Netherlands/Belgium flights.
4. [Official policy](https://www.transavia.com/help/en-nl/search-and-book/basic-smart-plus-max-fare/what-do-i-get-with-the-smart-fare) — tier 1. Read Smart inclusions and extras; overhead bag included, checked baggage purchased.
5. [Official policy](https://www.transavia.com/help/en-nl/search-and-book/basic-smart-plus-max-fare/plus-fare) — tier 1. Read Plus inclusions: personal item and 20 kg checked; overhead bag is an extra.
6. [Official policy](https://www.transavia.com/help/en-nl/search-and-book/basic-smart-plus-max-fare/max-fare) — tier 1. Read Max inclusions: both cabin items share 10 kg; 30 kg checked.

Only the listed sections were audited, not unrelated page content. No archived snapshot created. Search snippets were not used as the verification basis for allowance rows.

## Enforcement and remaining review

The score 9 is the existing `priorFor('lcc', 'EU')` prior, not an empirical enforcement rating. No traveller-report sample, staff-incentive investigation or complete fee-asymmetry study was performed. Physical sizer dimensions and aircraft exceptions remain unknown. Official enforcement statements in the scope notes are policy statements, not observed stop rates. This is a researched record, not a placeholder. Publication review remains pending separately (publication_ready: false).

The engine currently does not fully enforce combined cabin weights, weight-system checked totals, or additional per-axis/circumference constraints. Do not present a complete baggage-compliance verdict without honoring the notes. No app code changed in this task.
