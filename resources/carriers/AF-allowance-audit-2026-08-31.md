# Air France (AF) — allowance audit

Read: 2026-08-31. Researcher: Codex.

Source: [Official baggage policy](https://wwws.airfrance.us/information/bagages/bagage-cabine-soute)

Reading method: Official page text opened and read.

Read Basic option and dimension sections. Basic needs Hand Baggage option unless qualifying status; other Economy includes main bag plus small bag, 12 kg combined. Higher cabins, status exemptions and US-departure restrictions not modeled.

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
