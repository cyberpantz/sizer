# IndiGo (6E) research dossier

- Verified: 2026-08-31
- Research status: official allowances researched; publication review still required.

## Sources read

- Economy cabin: https://aem-beta-skyplus-prod-canary.goindigo.in/travel-information/en/baggage-allowance.html
- Economy personal: https://aem-beta-skyplus-prod-canary.goindigo.in/travel-information/en/baggage-allowance.html
- Economy — domestic India checked: https://aem-beta-skyplus-prod-canary.goindigo.in/travel-information/en/baggage-allowance.html

## Scope and decisions

Official baggage table researched. Cabin allowance is consistent on IndiGo-operated services; checked baggage is route-specific, so only the domestic India rule is modeled.

## Schema overflow, ambiguity, and gaps

- Enforcement behavior and physical sizer dimensions were not researched; strictness remains the type/region prior.
- `includes_wheels` is `null` unless the airline explicitly states whether fittings are included.
- Route or fare variations not represented in the JSON remain explicit gaps rather than inferred allowances.
