# AirAsia Malaysia (AK) research dossier

- Verified: 2026-08-31
- Research status: official allowances researched; publication review still required.

## Sources read

- Low Fare cabin: https://support.airasia.com/s/article/What-are-the-rules-for-cabin-baggage-on-board?language=in
- Low Fare personal: https://support.airasia.com/s/article/What-are-the-rules-for-cabin-baggage-on-board?language=in
- Low Fare checked: https://support.airasia.com/s/article/What-I-need-to-know-about-checked-baggage

## Scope and decisions

Official AirAsia cabin and checked-baggage help pages researched for carrier code AK. The group ranking was resolved to AirAsia Malaysia rather than creating a non-operating holding-company record.

## Schema overflow, ambiguity, and gaps

- Enforcement behavior and physical sizer dimensions were not researched; strictness remains the type/region prior.
- `includes_wheels` is `null` unless the airline explicitly states whether fittings are included.
- Route or fare variations not represented in the JSON remain explicit gaps rather than inferred allowances.
