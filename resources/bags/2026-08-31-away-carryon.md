# Away — The Carry-On

Read 2026-08-31: [manufacturer US product page](https://www.awaytravel.com/products/carry-on-jet-black), reached through `/suitcases/carry-on`. Selected model: Classic polycarbonate Carry-On, Jet Black. The page separately links the Bigger Carry-On; those are distinct sizes. Flex and Aluminum are separate styles, not the subject of this record.

| Figure | Published value | Exact label |
|---|---|---|
| Exterior | 21.7" x 14.4" x 9" | Exterior measurements |
| Interior | 20.1" x 13.9" x 7.5" | Interior measurements |
| Weight, specification section | 7.5 lbs | Weight |
| Weight, product summary | 7.1 lb | Product-summary claim |
| Capacity, specification section | 41 L | Capacity |
| Capacity, product summary | 39.8L | Product-summary claim |
| USD list price | $275 | $275 |

Exterior qualification: “Measurements include handles and wheels.” These are published claims, not our measurements. H/W/D axis names are not explicit, so the triple order is preserved.

Both displayed purchase price and crossed-out comparison price are $275; no distinct sale price was shown for Jet Black. Personalization and bundles excluded.

## Conflicts and missing information

Weight and capacity each have two conflicting claims on the same manufacturer page. Both are recorded under `conflicts`; neither is selected as the sole manufacturer value. Existing review-derived weight/capacity remain attributed to the review, not falsely upgraded.

No numeric SKU, metric equivalents, or quantified expansion found. Empty-weight wording is not explicit. Size is identified by the exact product URL and color. The dimensions from the example in the intake brief were not used: that example contains the Bigger Carry-On's figures despite the smaller bag's slug.

## Integration

Source values are stored only in their published units in `data/manufacturer-bags.json`. Existing build conversion handles metric output. No conversion schema fields or engine changes were added by this intake.
