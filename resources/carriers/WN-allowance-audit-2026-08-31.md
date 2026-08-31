# Southwest (WN) — allowance audit

Read: 2026-08-31. Researcher: Codex.

Source: [Official baggage policy](https://support.southwest.com/helpcenter/s/article/carryon-baggage-policy)

Reading method: Live official help article rendered in browser and read.

Read rendered policy: one carry-on 24x16x10 inches including attachments, plus underseat personal item. No numeric personal box or cabin weight stated. Stored exact cm conversion, not rounded-up placeholder. Legacy two-free-checked-bags claim removed; current fees depend on fare/date/status.

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
    "free_pieces": 2,
    "system": "piece",
    "weight_total_kg": null,
    "source_url": "",
    "verified_at": null
  }
]
```
