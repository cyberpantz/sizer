# airBaltic (BT) research dossier

- Verified: 2026-08-31
- Primary official source: https://www.airbaltic.com/en/baggage/
- Research status: official allowances researched; publication review still required.

## Scope and decisions

Official current cabin and checked pages researched. Economy MINI differs by allowing only a personal item and is not yet modeled because the current validator requires a numeric cabin rule for every cabin fare row.

## Schema overflow, ambiguity, and gaps

- Enforcement behavior and physical sizer dimensions were not researched; strictness remains the type/region prior.
- `includes_wheels` is `null` unless the airline explicitly stated that wheels or fittings are included.
- Fare and route variants not represented in the JSON remain outside this pass; see the record audit note and allowance notes.
