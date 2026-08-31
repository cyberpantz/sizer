# Away — The Bigger Carry-On

Read 2026-08-31 on the manufacturer's [US product page](https://www.awaytravel.com/products/bigger-carry-on-jet-black). Original `/suitcases/bigger-carry-on` URL redirected here. Selected variant: Jet Black, Classic polycarbonate, Bigger Carry-On. The smaller Carry-On is separately linked; these specifications must not be assigned to it, Flex, or Aluminum.

| Figure | Printed value | Exact label |
|---|---|---|
| Exterior | 22.7" x 15.4" x 9.6" | Exterior measurements |
| Interior | 20.9" x 15" x 7.9" | Interior measurements |
| Weight | 7.9 lbs | Weight |
| Capacity, specification section | 49 L | Capacity |
| Capacity, product summary | 47.9L | Product summary, conflicting claim |
| USD price | $295 | $295 |

Dimension qualification: “Measurements include handles and wheels.” The page does not explicitly label H/W/D ordering; the printed order is preserved. Figures are manufacturer claims, not independent measurements.

The US purchase section repeats $295 as both current and crossed-out comparison price; no distinct discounted price is shown. Recorded $295 as list price for this color on the retrieval date, excluding personalization and bundles.

## Findings and missing information

- Two manufacturer capacity claims conflict. Both are retained; neither is silently selected.
- No metric dimension or weight equivalents found in the reviewed specification. Exact conversions are now stored separately with user authorization.
- No quantified expansion found for this model. Do not borrow figures from Flex.
- No numeric SKU found in the opened page text. Exact product/color URL identifies the selection.
- Interior is explicitly labelled; axis ordering and a separate empty-weight qualifier are not explicit.

## Integration status

Original-unit provenance remains in `data/manufacturer-bags.json` as `external_in`, `claimed_packing_in`, and `weight_lb`. The user authorized clearly labelled metric conversions on 2026-08-31. Calculations used decimal arithmetic and exact factors, without rounding:

- Exterior: 22.7 × 15.4 × 9.6 in → 57.658 × 39.116 × 24.384 cm.
- Interior: 20.9 × 15 × 7.9 in → 53.086 × 38.10 × 20.066 cm.
- Weight: 7.9 lb → 3.583379723 kg.

One inch equals exactly 2.54 cm; one pound equals exactly 0.45359237 kg. These are converted manufacturer claims, not separately published metric specifications or more precise measurements. Each converted field retains its original-field reference, exact factor, and decimal result. The bag now has dimensions the fit engine can consume. Its capacity conflict remains unresolved.
