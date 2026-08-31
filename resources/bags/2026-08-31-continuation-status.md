# Bag intake continuation — 2026-08-31

Nine additional existing bags researched sequentially from official manufacturer product pages. No schema, conversion code, or test changes made in this pass.

| Slug | Result | Remaining qualification |
|---|---|---|
| aer-carryon-max | Both dimension units, weight, capacity | Claimed dimensions; ambiguous regular price omitted |
| aer-carryon-small | Both dimension units, weight, capacity | Claimed dimensions; ambiguous regular price omitted |
| calpak-hue | Exterior/interior inches, weight, capacity, list and sale documented | Handles not explicit; exterior retained as claimed |
| carl-friedrik-carryon-x | Browser Specs read; both unit systems, weight, capacity, USD price | Dimensions not explicitly qualified as overall |
| cotopaxi-allpa-35 | Browser specs read; both unit systems, published kg, capacity, USD price | Current version; dimensions remain claimed |
| eagle-creek-cargo-hauler-xt | Explicit overall dimensions, published kg, USD price | Current 32L version; capacity unit conflict |
| eagle-creek-gear-warrior-xe | Explicit standard/expanded exterior, weight, standard capacity, USD price | Expanded capacity unit conflict |
| osprey-transporter-wheeled-38 | Both dimension/weight units, capacity | Claimed dimensions; variant price unresolved |
| quince-small | Claimed exterior inches, weight, capacity, USD price | Only two interior axes; depth missing |

Each has a dated dossier and an entry in `data/manufacturer-bags.json`. Published units are unchanged; conversion happens only through the existing build. Expanded measurements remain in dossiers/notes, not substituted for unexpanded size.

## Unresolved priority records

Individual `*-gap.md` files record these attempts:

- Amazon Basics 21-inch: marketplace restriction; no eligible source established.
- Briggs & Riley Torq XL: no readable exact product page found; ZDX not substituted.
- CALPAK Luka Mini: product-page access error.
- Solgaard Original Medium: official page fetch failed.
- Tortuga Travel Backpack 40L: product-page access error; Pro versus Lite identity not silently assumed.

## Validation

- Bag build: 61 total records.
- Browser data build: 55 bags, 58 carriers.
- Tests: 333 passed, zero failed.
- Manufacturer intake: 23 distinct records, no duplicate slugs.

Run `node scripts/bag-intake-worklist.mjs` for remaining work. P1 includes claimed-only dimensions that are visible in the current browser catalogue; its 'invisible' label is not a current visibility count. No worklist code was changed.

The previous priority status file records an earlier snapshot. Its four test failures are superseded by this successful run against the current shared checkout. The full catalogue audit remains incomplete; lower-priority upgrades and prices remain on the generated worklist.
