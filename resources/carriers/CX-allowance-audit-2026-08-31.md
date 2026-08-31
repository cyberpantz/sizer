# Cathay Pacific (CX) — allowance audit

Read: 2026-08-31. Researcher: Codex.

Source: [Official baggage policy](https://www.cathaypacific.com/content/dam/cx/legal-and-privacy/cx-et-conditions-of-contracts-notices.pdf)

Reading method: Official PDF page 6 cabin baggage paragraphs opened and read.

Read page 6, cabin baggage: standard non-status Economy outside the special Hong Kong/New Zealand itinerary. 7 kg combined across cabin bag and small item. Status and NZ exceptions not modeled.

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

## Checked-bag follow-up from the same source

Sourced checked rows were added after the cabin audit. Only the explicitly stated limits and entitlements are retained. Route descriptions that cannot be represented safely by existing route tags are stored as scope notes requiring confirmation. Remaining checked-fare gaps are not filled from the historical mockup.
