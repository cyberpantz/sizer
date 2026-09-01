# GA — Garuda Indonesia allowance research

Verified 2026-09-01 from Garuda Indonesia's official baggage page:
https://www.garuda-indonesia.com/static/en/garuda-indonesia-experience/baggage-info.html?lang=en&loc=id&v=817585f2-55a7-4803-a169-e699dc0d956d

## Cabin and personal item

- One standard cabin bag may measure up to 56 × 36 × 23 cm, must remain within
  115 cm total, and may weigh up to 7 kg.
- Garuda expressly says the dimensions include wheels, handles and side
  pockets.
- Economy flights on CRJ and ATR aircraft instead use 41 × 34 × 17 cm, 92 cm
  total, and 7 kg.
- Garuda lists a laptop bag, handbag, purse or pocketbook among free carry-on
  items but gives no separate dimensions for that personal item.

## Schema gap

The smaller CRJ/ATR allowance depends on aircraft type. `applies_to` supports
route regions, not aircraft equipment, and `operates_regional_jets` is only a
carrier-level warning. The standard allowance is active; the smaller rule is
preserved here until a booking can select an aircraft-specific allowance. It
must not be converted into a guessed route restriction.

## Unmodeled or unresolved

- Checked allowances vary by itinerary and market and were not activated in
  this pass.
- The free-item list does not establish a numeric personal-item box.
- No physical sizer dimensions or independent enforcement evidence were found.
