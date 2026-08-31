# United Airlines (UA)

- **Record:** `data/carriers/UA.json`
- **Researched by:** claude, at Frank's direction
- **Date:** 2026-08-30
- **Status:** allowances researched · **not publication ready**

> Page read **in full**, in a browser. `mcp__workspace__web_fetch` returned only
> a JavaScript shell — united.com is client-rendered, so a plain fetch shows
> nothing. Worth knowing for the rest of the audit: several carrier sites will
> behave this way, and an empty fetch must never be recorded as "no data".

---

## 1. Allowances

**Source:** https://www.united.com/en/us/fly/baggage/carry-on-bags.html · read 2026-08-30

| Fare | Type | Published cm | Published in | Note |
|---|---|---|---|---|
| Basic Economy | personal | 43 × 25 × 22 | 17 × 10 × 9 | **No carry-on on most routes** |
| Economy | cabin | 56 × 35 × 23 | 22 × 14 × 9 | |
| Economy | personal | 43 × 25 × 22 | 17 × 10 × 9 | |

> "When measuring your bag, be sure to include the handle and wheels."

Directly supports our whole premise, in the carrier's own words.

### Their two units contradict each other

| | in → cm | published cm | difference |
|---|---|---|---|
| Carry-on | 55.88 × 35.56 × 22.86 | 56 × 35 × 23 | −0.12 / **+0.56** / −0.14 |
| Personal | 43.18 × 25.4 × 22.86 | 43 × 25 × 22 | +0.18 / +0.4 / **+0.86** |

A 35.5 cm wide bag **passes their inch limit and fails their centimetre limit.**
We compare against the stricter figure on each axis and say so.

## 2. Not yet modelled — see `docs/21-schema-gaps.md`

- **Route conditions.** *"You can't bring a carry-on bag unless you're flying to
  South America, across the Atlantic or across the Pacific."* Same fare, same
  passenger, allowance flips on region. **Our exact audience.** We currently
  record Basic Economy as carry-on-prohibited, which is wrong for a
  transatlantic booking.
- **Status and card exemptions.** Premier, travelling with a Premier member,
  Star Alliance Gold, or a qualifying MileagePlus card → free carry-on in Basic.
  The Gateway and MileagePlus Select cards explicitly do **not** qualify.
- **Fees, three points and a cutoff.** Tickets bought before 3 Apr 2026:
  $35 prepay / $40 lobby / $65 gate. On or after: $45 / $50 / $75.
  Gate-to-prepay ratio is **1.67×**, not the 3× our `fee_asymmetry` threshold
  assumes — that threshold was judgement and should be re-derived.
- **Per-operator regional rules.** CommutAir: personal item only. Other United
  Express: carry-on allowed, limited space. Our `operates_regional_jets` is a
  single boolean on the mainline.

## 3. Enforcement

Nothing scored yet. Note for later: United **removed** nothing — it is American
that pulled its gate sizers in Oct 2025. United still directs passengers to bag
sizers at the airport, which is `published_gauging` evidence:

> "If you're at the airport and not sure if your carry-on is the right size, you
> can use our bag sizers to measure your bag."

Not yet entered as a component — it needs the fee figures alongside it.

## 4. Answers an open question

`docs/05-schema.md` flagged gate-check retrieval as *"needs research"*:

> "For most United flights, gate-checked bags can be picked up at baggage claim
> at your final destination. However, on United Express flights, gate-checked
> bags **may be picked up at baggage claim or on the jet bridge**."

*"May be"* — genuinely uncertain, which is itself the finding. Advisory copy
should tell travellers to take medication, laptops and valuables out of the bag
before it goes, because they cannot rely on getting it back at the jetbridge.

## 5. Sources

| # | Source | Tier | Read? | URL |
|---|---|---|---|---|
| 1 | United carry-on bags page | 1 | **yes, in full (browser)** | https://www.united.com/en/us/fly/baggage/carry-on-bags.html |
| 2 | United Basic Economy page | 1 | no | linked from the above |
| 3 | United bag fee calculator | 1 | no | linked from the above |
