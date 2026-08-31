# UTair (UT) research dossier

- Verified: 2026-08-31
- Primary official source: https://www.utair.ru/support/1/tarify_i_usloviya
- Research status: official allowances researched; publication review still required.

## Scope and decisions

Official fare-conditions table researched. The site treats its included 40 × 30 × 20 cm item and an additional backpack/handbag rule separately; both are retained.

## Schema overflow, ambiguity, and gaps

- Enforcement behavior and physical sizer dimensions were not researched; strictness remains the type/region prior.
- `includes_wheels` is `null` unless the airline explicitly stated that wheels or fittings are included.
- Fare and route variants not represented in the JSON remain outside this pass; see the record audit note and allowance notes.
