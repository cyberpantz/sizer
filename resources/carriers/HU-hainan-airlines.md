# Hainan Airlines (HU) research dossier

- Verified: 2026-08-31
- Research status: official allowances researched; publication review still required.

## Sources read

- Economy — domestic China cabin: https://www.hnair.com/lvxingxinxi/xlxx/stxl/
- Economy — domestic China personal: https://www.hnair.com/lvxingxinxi/cxzb/ysztj/2017gnysztj/202601/t20260125_82769.html
- Economy — domestic China checked: https://www.hnair.com/lvxingxinxi/cxzb/ysztj/2017gnysztj/202601/t20260125_82769.html

## Scope and decisions

Official current hand-baggage and domestic conditions pages researched. The JSON models domestic economy as a documented scope; international cabin and checked rules differ by route and remain in this dossier gap.

## Schema overflow, ambiguity, and gaps

- Enforcement behavior and physical sizer dimensions were not researched; strictness remains the type/region prior.
- `includes_wheels` is `null` unless the airline explicitly states whether fittings are included.
- Route or fare variations not represented in the JSON remain explicit gaps rather than inferred allowances.
