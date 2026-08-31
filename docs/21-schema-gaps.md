# Schema gaps — stress-tested against United

Frank asked whether the schema can render a per-airline diagram like [United's carry-on page](https://www.united.com/en/us/fly/baggage/carry-on-bags.html). Reading that one page found six things we cannot represent. United is a top-three US carrier and this is their main baggage page — none of this is exotic.

## What the diagram itself needs — we're close

A to-scale carry-on + personal item with dimensions needs `max_cm` per bag type per fare. We have that. Two problems before it can be drawn honestly.

### 1 · United's own inches and centimetres disagree

| | Their inches → cm | Their published cm | Gap |
|---|---|---|---|
| Carry-on | 55.88 × 35.56 × 22.86 | **56 × 35 × 23** | −0.12 / **+0.56** / −0.14 |
| Personal item | 43.18 × 25.4 × 22.86 | **43 × 25 × 22** | +0.18 / +0.4 / **+0.86** |

A 35.5 cm wide bag **passes the inch limit and fails the published cm limit.** Both numbers are United's, on the same page, and the difference exceeds our own `EPS_CM` of 0.3.

This is not a rounding curiosity — it is a `conflicts[]` case inside a single source, and the diagram has to pick one. Proposal: store both, draw the **smaller**, and say which we used. Being wrong toward caution costs a reader convenience; the other direction costs them a gate fee.

```jsonc
"max_cm": [56, 35, 23],
"max_in": [22, 14, 9],
"units_conflict": true,          // derived: |in→cm − cm| > EPS on any axis
"units_authoritative": "cm"      // which we compare against, stated on the page
```

### 2 · Our UA record is already wrong because of this

```
basic     cabin   43x25x22      ← this is the PERSONAL ITEM, filed as a cabin bag
economy   cabin   56x35x22      ← depth should be 23
```

United Basic Economy permits **no carry-on** on most routes. We recorded the personal item in the cabin slot, which the new `cabin_absence` work makes expressible but does not by itself fix. **Fix during the audit.**

---

## What the schema cannot express at all

### 3 · Route-conditional allowances — **highest priority**

> "You can't bring a carry-on bag unless you're flying to South America, across the Atlantic or across the Pacific."

The same fare, same carrier, same passenger — and the carry-on allowance flips on **region of travel**. This is exactly our audience: a US flyer connecting to Europe. We would currently tell a transatlantic Basic Economy passenger they have no carry-on, which is wrong.

```jsonc
"applies_to": {
  "regions": ["SA", "TATL", "TPAC"],   // or "except": [...]
  "note": "Basic Economy includes a carry-on only on these routes"
}
```

### 4 · Passenger-attribute exemptions

> MileagePlus Premier, travelling with a Premier member, a qualifying MileagePlus credit card, or Star Alliance Gold → one free carry-on in Basic Economy. **The United Gateway and MileagePlus Select cards do not qualify.**

An allowance conditional on *who is flying*, with named exclusions. Not modelled.

```jsonc
"unlocked_by": [
  { "kind": "status", "value": "premier_any" },
  { "kind": "alliance", "value": "star_gold" },
  { "kind": "card", "value": "mileageplus_explorer",
    "excludes": ["united_gateway", "mileageplus_select"] }
]
```

⚠️ Worth a deliberate decision rather than a build: this is a real complexity increase for a minority of travellers. It may belong as an **advisory** — *"Premier status or a qualifying card gets you a carry-on here"* — rather than as a second allowance the engine resolves.

### 5 · Fees have three price points and an effective date

> Before 3 Apr 2026: $35 prepay / $40 lobby / **$65 gate**. On or after: $45 / $50 / **$75**.

We modelled fees as a gate/online pair, and `fee_asymmetry` — one of only two tier-1 strictness components — needs the ratio. Reality is three points and a purchase-date cutoff.

```jsonc
"fees": [{
  "kind": "extra_bag",
  "prepay_usd": 45, "lobby_usd": 50, "gate_usd": 75,
  "effective_from": "2026-04-03",
  "applies_to_tickets_purchased": "on_or_after"
}]
```

Note the asymmetry is **1.67×** (75/45), not the 3× our `fee_asymmetry` threshold assumes. Worth re-checking that threshold against real data rather than judgement.

### 6 · Gate-check varies by operating carrier, and the retrieval question is answered

> "If you're flying **CommutAir**, you're only allowed one personal item. All other United Express carriers allow carry-on bags but have limited space."
>
> "For most United flights, gate-checked bags can be picked up at baggage claim at your final destination. However, **on United Express flights, gate-checked bags may be picked up at baggage claim or on the jet bridge**."

Two things. `operates_regional_jets` is a boolean on the mainline, but CommutAir is materially stricter than the other United Express operators — the flag needs to be per-operator.

And this **answers the open question** flagged in [05](05-schema.md#advisories--orthogonal-to-the-bands) as *"needs research"*: whether a gate-checked bag returns at the jetbridge or goes through to the destination. For United it is *"may be"* — genuinely uncertain, which is itself the finding. Medication and laptops should come out of the bag either way.

### 7 · Items that don't count against the allowance

Jacket, umbrella, reading material, food bought airside, mobility devices, car seat or stroller, diaper bag and breast pump, camera. Not modelled, and it is a real part of *"what can I actually bring"*.

Low priority for the verdict, useful on a carrier page.

---

## Verdict on the question asked

**For the diagram: nearly.** Add `max_in` alongside `max_cm`, resolve the units conflict explicitly, and fix the UA record. That is a small change.

**For a page that is honest about United's actual rules: no.** Items 3 and 4 change *whether a bag is allowed at all*, and 3 hits our core audience directly.

## Order

| | Why |
|---|---|
| **1 · units conflict + `max_in`** | Blocks an honest diagram; small; already causing a wrong depth in UA |
| **2 · route conditions** | Changes the answer for transatlantic Basic Economy — our exact reader |
| **3 · fees, three points + effective date** | Feeds `fee_asymmetry`, and the 3× threshold looks wrong against real data |
| **4 · per-operator regional flags** | CommutAir differs from other United Express |
| 5 · passenger attributes | Decide advisory vs allowance before building |
| 6 · free extras | Carrier-page content, not a verdict input |

Same rule as before: **schema, validator and engine move together.** Adding fields alone will not make a recommendation more accurate.
