# Widerøe (WF) research dossier

- Verified: 2026-08-31
- Primary official source: https://help.wideroe.no/hc/no/articles/29531904831378-Bagasjeregler
- Research status: official allowances researched; publication review still required.

## Scope and decisions

Official baggage rules updated 6 July 2026 researched. Smart cabin and checked allowances are modeled; Mini’s personal-item-only finding is documented in the dossier but omitted because the current validator cannot represent a cabin-free fare row.

## Schema overflow, ambiguity, and gaps

- Enforcement behavior and physical sizer dimensions were not researched; strictness remains the type/region prior.
- `includes_wheels` is `null` unless the airline explicitly stated that wheels or fittings are included.
- Fare and route variants not represented in the JSON remain outside this pass; see the record audit note and allowance notes.
