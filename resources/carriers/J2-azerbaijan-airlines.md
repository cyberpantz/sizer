# Azerbaijan Airlines (J2) research dossier

- Verified: 2026-08-31
- Primary official source: https://www.azal.az/en/information/baggage/hand
- Research status: official allowances researched; publication review still required.

## Scope and decisions

Official carry-on page researched. Checked baggage was not added because the linked checked allowance detail was not fully retrieved in this pass.

## Schema overflow, ambiguity, and gaps

- Enforcement behavior and physical sizer dimensions were not researched; strictness remains the type/region prior.
- `includes_wheels` is `null` unless the airline explicitly stated that wheels or fittings are included.
- Fare and route variants not represented in the JSON remain outside this pass; see the record audit note and allowance notes.
