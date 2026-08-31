# Cebu Pacific (5J) research dossier

- Verified: 2026-08-31
- Research status: official allowances researched; publication review still required.

## Sources read

- GO Basic cabin: https://help.cebupacificair.com/article/ceb-baggage-guidelines-and-upgrade-options-118500
- GO Basic personal: https://help.cebupacificair.com/article/ceb-baggage-guidelines-and-upgrade-options-118500
- GO Basic checked: https://help.cebupacificair.com/article/ceb-baggage-guidelines-and-upgrade-options-118500
- GO Easy cabin: https://help.cebupacificair.com/article/ceb-baggage-guidelines-and-upgrade-options-118500
- GO Easy personal: https://help.cebupacificair.com/article/ceb-baggage-guidelines-and-upgrade-options-118500
- GO Easy checked: https://help.cebupacificair.com/article/ceb-baggage-guidelines-and-upgrade-options-118500

## Scope and decisions

Official current baggage guidelines researched. Wheels and handles are explicitly included in hand-carry measurements; the two cabin pieces share a 7 kg cap.

## Schema overflow, ambiguity, and gaps

- Enforcement behavior and physical sizer dimensions were not researched; strictness remains the type/region prior.
- `includes_wheels` is `null` unless the airline explicitly states whether fittings are included.
- Route or fare variations not represented in the JSON remain explicit gaps rather than inferred allowances.
