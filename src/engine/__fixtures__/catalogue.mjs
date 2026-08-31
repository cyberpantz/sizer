/* Real bags and real carriers, taken from the catalogue rather than invented.
   A test written against made-up numbers proves the code matches the test.
   These are the cases that actually taught us something. */

export const carrier = (name, strictness, max_cm, max_kg = null, extra = {}) => ({
  iata: name.slice(0, 2).toUpperCase(), name, strictness, fare_class: 'economy',
  allowance: { max_cm, max_kg }, no_cabin_bag: false, regional_jets: false, ...extra,
});

export const bag = (slug, external_cm, extra = {}) => ({
  slug, brand: slug, model: slug, external_cm, provenance: { src: 'review' },
  measured: false, weight_kg: null, soft: false, type: null,
  shell: 'hardside', expands_cm: 0, ...extra,
});

/* Placeholder carriers from mockup/index.html. Values are not publishable —
   see docs/README "Numbers that are not yet real" — but the SHAPE is right and
   the strictness spread is what the ladder needs to be exercised against. */
export const CARRIERS = {
  ryanair:   carrier('Ryanair', 9, [55, 40, 20], 10),
  wizz:      carrier('Wizz Air', 9, [55, 40, 23], 10),
  vueling:   carrier('Vueling', 8, [55, 40, 20], 10),
  lufthansa: carrier('Lufthansa', 7, [55, 40, 23], 8),
  iberia:    carrier('Iberia', 7, [56, 40, 25], 10),
  turkish:   carrier('Turkish', 7, [55, 40, 23], 8),
  emirates:  carrier('Emirates', 7, [55, 38, 20], 7),
  singapore: carrier('Singapore', 6, [55, 40, 20], 7),
  united:    carrier('United', 6, [56, 35, 22]),
  delta:     carrier('Delta', 5, [56, 35, 23]),
  american:  carrier('American', 5, [56, 36, 23]),
  southwest: carrier('Southwest', 3, [61, 41, 25]),
};

export const ALL_CARRIERS = Object.values(CARRIERS);

export const BAGS = {
  /* Travelpro Maxlite 5 International: built to the European 55x40x20, but
     published in inches. 21.75 x 15.75 x 7.75 in. The bag that found the
     rounding bug — 55.245 vs a 55 limit, and 40.005 vs 40. */
  maxliteIntl: bag('travelpro-maxlite5-international', [55.24, 40.01, 19.68],
    { soft: true, shell: 'softside', weight_kg: 2.4, type: 'softside spinner' }),

  /* Sold as a 21-inch carry-on, measures 23 inches. Clears almost nothing. */
  maxlite21: bag('travelpro-maxlite5-21', [58.42, 36.83, 22.86],
    { soft: true, shell: 'softside', weight_kg: 2.45 }),

  /* Rick Steves Spinner: packing 49.5x35.6x22.9, overall 55.2x35.6x25.4.
     The wheels-and-handle delta is the whole thesis in one product. */
  rsSpinner: bag('ricksteves-spinner-carryon', [55.24, 35.56, 25.4],
    { soft: true, shell: 'softside', weight_kg: 3.04 }),

  /* Away Aluminum: 4.76kg empty against Emirates' 7kg — 68% of the allowance
     before a single shirt. The weight-headroom case. */
  awayAluminum: bag('away-aluminum', [54.6, 34.3, 22.9],
    { model: 'The Carry-On Aluminum Edition', shell: 'aluminium', weight_kg: 4.76 }),

  /* Patagonia Black Hole 40L: the only thing in the catalogue clearing
     everything, and it has no wheels. */
  patagonia: bag('patagonia-black-hole-40', [50, 31.8, 21.6],
    { soft: true, shell: 'duffel', type: 'duffel', weight_kg: 0.95 }),

  /* Samsonite Uplift: exactly 22x14x9in, T+L's "best overall" for
     INTERNATIONAL travel, sized to the US domestic standard. */
  uplift: bag('samsonite-uplift', [55.88, 35.56, 22.86], { weight_kg: 2.3 }),
};
