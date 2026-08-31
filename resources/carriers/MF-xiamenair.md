# XiamenAir (MF) research dossier

- Verified: 2026-08-31
- Research status: official allowances researched; publication review still required.

## Sources read

- Economy cabin: https://www.xiamenair.com/en-ca/article-detail?articleLink=%2Fcms-i18n-ow%2Fcms-en-ca%2Fchannels%2F11753.json
- Economy personal: https://www.xiamenair.com/en-ca/article-detail?articleLink=%2Fcms-i18n-ow%2Fcms-en-ca%2Fchannels%2F11753.json

## Scope and decisions

Official baggage instructions researched. XiamenAir publishes a linear-only cabin limit; checked allowances vary by route and were not modeled in this pass.

## Schema overflow, ambiguity, and gaps

- Enforcement behavior and physical sizer dimensions were not researched; strictness remains the type/region prior.
- `includes_wheels` is `null` unless the airline explicitly states whether fittings are included.
- Route or fare variations not represented in the JSON remain explicit gaps rather than inferred allowances.
