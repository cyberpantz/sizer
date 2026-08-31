# Finnair (AY)

- Record: `data/carriers/AY.json`
- Researched by: Codex
- Date: 2026-08-30
- Status: partial; official allowance sections read, full publication audit pending

## Allowances

Economy Classic/Flex on North America–Europe. Cabin and personal item share 8 kg. Economy Light has the same cabin allowance; Superlight has no cabin bag.

| Fare | Bag type | cm | kg | Pieces |
|---|---|---|---|---|
| economy | cabin | 55 × 40 × 23 | 8 | 1 |
| economy | personal | 40 × 30 × 15 | unknown | 1 |
| economy | checked | 90 × 75 × 45 | 23 | 1 |
| basic | cabin | 55 × 40 × 23 | 8 | 1 |
| basic | personal | 40 × 30 × 15 | unknown | 1 |
| basic | checked | 90 × 75 × 45 | 23 | 0 |

North America–Europe Economy Classic/Flex. Per-axis external limits 90 × 75 × 45 cm; NOT a linear limit.



## What was read

1. [Official Finnair policy](https://www.finnair.com/us-en/baggage-on-finnair-flights/carry-on-baggage) — tier 1; opened and read the applicable allowance sections/tables and adjacent exceptions on 2026-08-30. Extracted rows cite this URL. No claim that unrelated page sections were audited.
2. [Official Finnair policy](https://www.finnair.com/en/baggage-on-finnair-flights/checked-baggage) — tier 1; opened and read the applicable allowance sections/tables and adjacent exceptions on 2026-08-30. Extracted rows cite this URL. No claim that unrelated page sections were audited.

No archived snapshot was created. Browser-rendered tables were used where the text fetch did not expose policy content. Search snippets alone were not treated as verification.

## Enforcement and gaps

Strictness 7 is the existing engine's type/region prior (full_service, EU), not a researched enforcement rating. Published gauging, fee asymmetry, staff incentives and actual weighing remain unscored; no traveller-report sample collected. Physical sizer dimensions and regional-aircraft operation are unknown. Carrier remains a publication-blocking placeholder.

The 8 kg combined cabin/personal cap is preserved in notes and additive combined_max_kg metadata. The current engine does not enforce combined baggage weights; do not interpret max_kg as a separate allowance for each item.

The checked-bag limit is per axis; linear_max_cm is intentionally null. Do not replace it with the sum of the axes. The linear-only checked matcher cannot fully represent this rule.

Only the listed adult allowances are modeled. Fare labels map to the specific fare names stated above, not every ticket sold under that cabin. Partner-operated flights, status benefits, infants, special baggage, route exceptions and paid upgrades require ticket-specific confirmation. Unknown wheel/handle treatment remains null; use external product dimensions conservatively.
