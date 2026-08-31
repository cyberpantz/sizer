# Singapore (SQ) — allowance audit

Read: 2026-08-31. Researcher: Codex.

Source: [Official baggage policy](https://www.singaporeair.com/en_UK/us/travel-info/baggage/cabin-baggage/)

Reading method: Official page text opened and read.

Read cabin table and additional-items section. Economy: 1 piece, 7 kg, sum of dimensions <=115 cm; no per-axis box published. Removed unsupported 55x40x20 placeholder. Keep linear rule as published_cabin_allowances until engine supports linear-only cabin constraints.

## Scope and limitations

Standard adult cabin and personal-item rules only unless explicitly stated. This audit does not verify enforcement scores, physical sizers, infant/medical allowances, codeshare policies, or every status and route exception. Manufacturer-style dimension inference was not used. Null means not established by the reviewed policy, not unlimited.

Shared weight caps are stored on allowance groups; do not sum the main and personal weight limits as separate entitlements. Linear limits are additional constraints, not alternative rectangular boxes. These relationships still need engine/publication review.

Unverified checked-bag rows from the mockup were removed rather than re-dated as verified. Checked allowance collection remains pending. Their historical values are retained below solely as an audit trail, not active rules:

```json
[
  {
    "fare_class": "economy",
    "type": "checked",
    "linear_max_cm": null,
    "max_kg": null,
    "free_pieces": 1,
    "system": "piece",
    "weight_total_kg": null,
    "source_url": "",
    "verified_at": null
  }
]
```
