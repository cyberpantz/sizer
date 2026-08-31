# Saudia (SV) research dossier

- Verified: 2026-08-31
- Research status: official allowances researched; publication review still required.

## Sources read

- Guest Class cabin: https://prod.dcloud.saudia.com/pages/before-flying/baggage/baggage-allowances
- Guest Class personal: https://prod.dcloud.saudia.com/pages/before-flying/baggage/baggage-allowances
- Business cabin: https://prod.dcloud.saudia.com/pages/before-flying/baggage/baggage-allowances

## Scope and decisions

Official baggage allowance page researched. The USA/Canada departure exception and route-dependent checked allowances are not flattened into the general Guest Class row.

## Schema overflow, ambiguity, and gaps

- Enforcement behavior and physical sizer dimensions were not researched; strictness remains the type/region prior.
- `includes_wheels` is `null` unless the airline explicitly states whether fittings are included.
- Route or fare variations not represented in the JSON remain explicit gaps rather than inferred allowances.
