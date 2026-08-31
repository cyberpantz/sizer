# Fare tiers, and one open question

**The rule: never misrepresent what an airline publishes, and never claim more
than its cheapest fare actually gives.**

## Why names cannot be trusted

`cabin_class` is null on 97 of the 99 cabin rows in the dataset. Airlines
publish a **fare brand**, not a travel class, and they do not agree on
vocabulary:

| Airline | Bottom rung | Next rung up |
|---|---|---|
| easyJet | Standard / Basic | **Plus** |
| Lufthansa | Basic | **Economy** |
| Finnair | Light | Classic |
| LOT | Economy Saver | Economy Standard |
| JetBlue | Blue Basic | Blue |

The same word sits at different heights. `plus` is an ordinary economy rung at
one carrier and a **paid upgrade** at another.

This is not theoretical. The engine ranked fare brands against a global ordered
list, and for easyJet it picked `plus` — so we told easyJet Basic passengers
their bag was fine at 56 × 45 × 25, when that allowance requires the
`large_cabin_bag` add-on or a buy-up. Ryanair's identical structure was caught;
easyJet's was not, purely because easyJet's buy-up tier had a name on our list.

## What replaced it

**Membership is by name; rank is by entitlement.**

- `classifyFare()` answers only "is this an economy fare, a premium cabin, or a
  paid add-on" — the one question a name can genuinely answer. An unrecognised
  brand **fails the build** and names the carrier, rather than silently dropping
  it out of every coverage figure.
- Which tier is *cheapest* is read from the airline's own data: the tier
  entitling you to least. A tier with no free cabin bag ranks below one with a
  small bag, which ranks below one with a large bag. No vocabulary required, and
  it cannot be wrong about an airline nobody has taught us about.

## The open question

Where an airline publishes a row literally called `economy`, we answer on it —
even when a cheaper Basic exists with no cabin bag. That leaves an
inconsistency driven purely by naming:

| | Cheapest tier | Next rung | We answer |
|---|---|---|---|
| **Lufthansa** | Basic — no cabin bag | Economy — 55×40×23 | **55×40×23** |
| **easyJet** | Basic — no cabin bag | Plus — 56×45×25 | **no cabin bag** |

Same structure. Opposite answers. Lufthansa calls its second rung "Economy" and
easyJet calls it "Plus".

**Ten carriers sit on the generous side of that line:** AF, DE, DY, EW, HV, KL,
LH, PC, V7, XQ. A passenger on any of their Basic fares is currently told their
bag fits when it would be charged at the gate.

Three options, none of them free:

1. **Always answer on the cheapest tier.** Consistent and cautious. Ten major
   carriers start reporting "no cabin bag", which is true of their cheapest
   ticket and wrong for most of what people buy.
2. **Always answer on the cheapest tier that includes a bag.** Also consistent,
   and over-promises in exactly the way the easyJet bug did.
3. **Answer on the cheapest tier and say which fare we answered on**, with a
   control to change it. Most honest, most work — and `/check` already has a
   per-leg fare selector this could reuse.

Until this is decided, the guard in `engine/__tests__/fare-brands.test.mjs` is
scoped to the unambiguous half: we may never reach past the cheapest tier at a
carrier that never named one `economy`.
