# Nordwind Airlines (N4) research dossier

- Verified: 2026-08-31
- Primary official source: https://nordwindairlines.ru/en/baggage/baggage
- Research status: official allowances researched; publication review still required.

## Scope and decisions

Official baggage table researched. Scheduled-flight Lite and Premium Economy rules are modeled; charter and comfort/business variations remain for later expansion.

## Schema overflow, ambiguity, and gaps

- Enforcement behavior and physical sizer dimensions were not researched; strictness remains the type/region prior.
- `includes_wheels` is `null` unless the airline explicitly stated that wheels or fittings are included.
- Fare and route variants not represented in the JSON remain outside this pass; see the record audit note and allowance notes.
