# Aegean Airlines (A3)

- Researched by: Codex
- Date: 2026-08-30
- Status: official economy allowance research; publication review pending separately
- Record: `data/carriers/A3.json`

## Sources read

1. [Aegean baggage policy](https://en.aegeanair.com/travel-info/travelling-with-aegean/baggage/baggage-allowance/) — tier 1. Opened in web research and the in-app browser. Read the rendered Economy table (Light, Flex, ComfortFlex, Family), adult size/weight rows and policy notes. The initial text fetch contained unfilled table variables; only the rendered values were used for fare entitlements.
2. [Aegean/Olympic cabin policy](https://en.aegeanair.com/en/travel-information/travelling-with-olympic-air/baggage/hand-luggage-and-essentials/?app_version=1&origin=app&sc_site=olympicair) — tier 1. Read economy allowances and the explicit Airbus footnote confirming wheels, handles and pockets are included.

## Recorded allowances

Adult Airbus cabin limit: 56 × 45 × 25 cm, 8 kg. Turboprops: 55 × 40 × 23 cm. Personal items must fit under the seat; no numerical size or weight inferred.

| Stored fare | Airline fare | Cabin entitlement | Included checked baggage |
|---|---|---|---|
| basic | Light | Cabin bag OR personal item | None |
| economy | Flex | Cabin bag AND personal item | None |
| comfort_flex | ComfortFlex | Cabin bag AND personal item | 1 × 23 kg |
| family | Family | Cabin bag AND personal item | None |

Checked size: 158 cm linear. Overweight charges may apply above 23 kg; 32 kg is the acceptance ceiling, not the free economy allowance.

## Schema limitations and review

Light's two alternative rows share allowance_group=light_cabin_choice and group_max_count=1. These are additive metadata, not a claim that the engine implements the choice constraint. A cabin row remains necessary because Light DOES allow an overhead bag when selected instead of the personal item.

The cabin rows model Airbus flights only. The current matcher does not choose rules by aircraft; a flight on an Olympic Air turboprop needs the smaller limit. Do not count Olympic Air as a separate carrier added by this task. Business fares, loyalty benefits, infants and route exceptions are outside this extraction.

Strictness is the existing full-service/EU prior, not measured enforcement. Physical sizers and regional-jet operation remain unknown. The record is researched (placeholder=false) but publication_ready=false until these limitations are handled. No archived snapshot was created.
