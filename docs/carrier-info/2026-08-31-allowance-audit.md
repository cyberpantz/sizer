# Official allowance audit — 2026-08-31

The remaining 22 placeholder carrier records were replaced with research from official airline policies. The catalogue now contains **58 researched carriers, zero size-placeholder records, and 58 records pending publication review**. The MVP target remains 100.

Updated carriers: AA, AF, B6, BA, CX, DL, EK, F9, FR, IB, JL, KL, LH, NH, QR, SQ, TK, TR, U2, VY, W6, WN. United (UA) had already been researched before this pass.

Each updated record has a source URL, retrieval date, research scope, and a linked dossier in `resources/carriers/CODE-allowance-audit-2026-08-31.md`. Dossiers describe the reading method, exceptions, and removed historical checked-bag rows. Those historical values are not active allowances.

## What was verified

The primary scope was standard adult cabin and personal-item allowances, including explicitly documented Basic fares and purchased overhead-bag entitlements. Unpublished numeric limits remain null. Published inches and centimetres are retained where available; conversions are used when only inches were published.

Partial checked-bag research was also collected for BA, CX, F9, FR, QR, TR, and W6. This does not cover every checked fare, route, or status exception. Qatar's route-dependent checked rules are retained separately in `published_checked_allowances` until route selection can represent their scope safely.

## Schema and engine gaps

- Singapore Airlines publishes a 115 cm sum-of-dimensions limit rather than a rectangular cabin box. Its rule is retained in `published_cabin_allowances`; the current engine returns unknown instead of using an invented box. [Official policy](https://www.singaporeair.com/en_UK/us/travel-info/baggage/cabin-baggage/)
- Some carriers impose both per-axis and total-dimension limits. The additional `linear_max_cm` constraint needs engine support.
- Combined main-bag and personal-item weight caps are recorded with `weight_scope`, `allowance_group`, and `group_max_kg`. The engine must evaluate the group rather than treat these as separate allowances.
- Wizz excludes handles and wheels from its published dimensions, with wheels permitted to add up to 5 cm. `includes_wheels: false` preserves the exception, but a structured protrusion allowance would model it better. [Official policy](https://www.wizzair.com/en-gb/help-centre/booking-information-and-services/baggage/baggage-allowance)
- Fare, route, aircraft, status, and purchased-entitlement exceptions still need publication review. An explicit Basic fare restriction now takes precedence over the engine's generic Economy fallback; purchased add-ons can override it.

Enforcement scores, physical sizer measurements, and inherited strictness claims were **not verified** by this allowance audit. Research completion is not publication approval.

## Validation

Carrier shape validation passes. Regression tests cover Basic fare restrictions, purchased add-ons, Lufthansa route uncertainty, Singapore's linear-only rule, JetBlue Blue Basic inclusion, and Wizz's wheel exception.

## Intake-brief reconciliation

The intake brief was supplied after this pass. The work follows its official-source, dated-citation, no-invented-dimension, unknown-versus-prohibited, and unpublished-record principles, but is **not yet fully compliant with the brief**:

- Complete checked-bag coverage remains pending.
- Unusual rules and explicit overhead exclusions need short verbatim evidence excerpts; current notes often paraphrase the policies.
- Legacy fare aliases for purchased extras remain alongside gated add-on rows. These need migration to explicit purchased entitlements without breaking existing bookings or UI selections.
- Some personal-item rows retain a documented entitlement with null dimensions; the brief instead requests omission when a numeric size is unpublished.
- Inherited strictness scores and unverified evidence were preserved and labelled `legacy_prior_only`, rather than replaced with the brief's proposed prior object. Enforcement research remains separate; do not interpret these as verified scores.
- Cabin exclusions are currently attached to personal-item fare rows in some records, rather than dedicated absence-only cabin rows as requested by the brief.

Passing the current validator does not establish brief compliance or factual completeness. The 58 researched / zero size-placeholder count describes research status, not completion of this reconciliation or publication approval.
