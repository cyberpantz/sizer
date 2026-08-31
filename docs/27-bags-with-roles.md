# Bags have roles, and a fare grants a set

**The change:** on `/check`, each bag you add is either your **carry-on** or
your **personal item**. The tool then answers whether *that combination* works
on each leg — not whether one object could theoretically be either.

---

## Why this is the right model

Every competitor asks the same question: enter one bag, get pass/fail against a
carry-on limit and pass/fail against a personal-item limit. `willmybagfit`
prints two percentages side by side.

That is backwards. **Nobody is undecided about which bag is which.** You have a
roller and a rucksack, and you already know the roller is going overhead. The
question is not *"could this be a personal item?"* — it is *"does my kit work on
this trip?"*

The distinction matters because **allowances are granted as a set, not
individually**, and three things only exist at the set level:

1. **Some fares grant only one bag.** On Ryanair, Wizz, easyJet, Vueling and
   Frontier Basic you get a personal item and nothing else. Checking a carry-on
   against a carry-on limit is answering a question the ticket has already
   settled.
2. **Some airlines share one weight cap across both bags.** Air France, KLM,
   Cathay, JAL, ANA and Scoot publish a single figure covering the carry-on AND
   the personal item together — `allowance_group: cabin_total`. Two bags each
   "passing" can still fail as a pair.
3. **Piece counts.** Two bags where the fare allows one is a set-level failure
   no per-bag check can see.

A per-bag answer cannot express any of these. That is the differentiation, and
it is not cosmetic.

---

## The blocker: the engine cannot see personal items

This has to be fixed first, and it is the same shape as the linear-limit bug
found this morning — **the data is there and the engine is blind to it**.

```
57 of 58 carriers publish a personal-item limit
12 distinct limits, from 40 × 30 × 10 (Singapore) to 45.7 × 35.6 × 20.3 (Frontier)
toCarrier() returns exactly one allowance: the cabin one
```

Worse, `fits_personal_item` on every bag record is computed against a single
hardcoded `PERSONAL_ITEM_CM = [40, 30, 20]` — a reference envelope, not any
actual airline's rule. So a bag marked "fits as a personal item" has been
checked against a number no carrier necessarily publishes.

Singapore's personal item is **40 × 30 × 10 cm**. Ten centimetres deep. A normal
laptop bag fails it, and today the site cannot say so.

### What changes

`toCarrier()` returns allowances keyed by role:

```js
{
  allowances: {
    cabin:    { max_cm, max_kg, linear_max_cm, weight_shared, count } | null,
    personal: { max_cm, max_kg, count } | null
  },
  weight_group: { cap_kg, covers: ['cabin', 'personal'] } | null
}
```

`allowance` stays as an alias for `allowances.cabin` so nothing breaks in one
go. The golden snapshot must stay identical through that step — if a verdict
moves while only adding a field, something else moved too.

---

## How much personal-item data we actually hold

Audited before assuming a research pass was needed. It mostly is not.

```
58 carriers
  48  personal item WITH published dimensions
   9  personal row, no dimensions
   1  no personal row at all  (Emirates)
```

**Eight of those ten are FINDINGS, not gaps.** The intake read the page and
recorded that the airline publishes no number:

| Carrier | What the research says |
|---|---|
| Delta | *"Underseat item; no numerical dimensions published on reviewed page."* |
| Southwest | *"Must fit beneath seat; no numeric dimensions on reviewed policy."* |
| Qatar | *"Small purse or briefcase; no numeric personal dimensions given."* |
| Aegean | *"numerical personal-item limits not published in the reviewed table"* |
| Air Serbia, China Southern, China Eastern, Air China | same shape |

That a major carrier declines to publish a personal-item size is **worth saying
out loud**. It means the limit is the physical space under the seat — which
varies by aircraft and by seat — and no website can honestly give you a number.
Every competitor either invents one or shows nothing. Saying *"Delta publishes
no size; it has to fit under the seat in front of you"* is a better answer than
both, and we can only give it because somebody recorded the absence.

### What genuinely needs work

1. **Label the absences.** These rows carry the explanation in prose and
   `cabin_absence: null`. The taxonomy already exists — `not_published` versus
   `not_researched` — and it is the same distinction that mattered for cabin
   bags: a finding about them, or a gap in us. Until it is set, the engine
   cannot tell the two apart, and this is a schema fix rather than research.
2. **Two real gaps only.** Japan Airlines has a personal row with no dimensions
   *and no note*, so it is unclear whether anyone looked. Emirates has no
   personal row at all.
3. **Weight caps: 36 of the 48 sized rows carry none.** Worth one pass to
   establish whether that is because carriers do not publish a separate
   personal-item weight — likely, since most fold it into a cabin total — or
   because nobody recorded it. Same finding-versus-gap question.

So the ordering is: **fix the labelling first, research second.** Most of what
looks like missing data is present and merely unlabelled — which is exactly the
mistake that made 19 bags look like they had no manufacturer figure this
morning.

---

## The answer it produces

Per leg, for the whole set. The three outputs nobody else can give:

**The fare trap, made concrete**

> **Ryanair — you get one bag, and it is the small one.**
> Your Monos Carry-On has no allowance on a Basic fare at any size. Your
> rucksack fits the 40 × 30 × 20 personal item with 2 cm to spare.
> Priority adds the cabin bag for about €6.

**The shared cap**

> **Air France counts both bags against one 12 kg limit.**
> Empty, your two bags are already 7.2 kg of it. That leaves 4.8 kg for
> everything you pack across both.

**The shallow personal item**

> **Singapore's personal item is 10 cm deep.** Your laptop bag is 15 cm.
> This is the leg that decides your trip, and it is not the carry-on.

---

## Interface

Minimal. One control per bag, not a new mode:

```
Your bags
  [ Monos Carry-On        ▾ ]   ( • Carry-on   ○ Personal item )
  [ Bellroy Transit       ▾ ]   ( ○ Carry-on   • Personal item )
  + Add a bag
```

- **Default the role, don't ask twice.** A bag whose record says
  `role: overhead` defaults to carry-on; a backpack or under-seat bag defaults
  to personal item. The control is there to correct us, not to interrogate.
- **Two bags in the same role is a legitimate state** — some fares allow two
  cabin pieces. Answer it rather than blocking it.
- **The verdict card stays one answer.** The binding leg is still named; what
  changes is that the reason can now be "the fare gives you one bag" or "your
  two bags share a weight cap", not only "3 cm too deep".

---

## What must not regress

- **Absence stays absence.** A carrier with no researched personal row must say
  so, never fall back to `[40, 30, 20]` and present a reference envelope as that
  airline's rule. That hardcoded constant is the bug this work removes; it must
  not survive as a default.
- **`no_cabin_bag` is a finding, not an error.** Today it produces `wont` for
  every bag. Under roles it should produce a *correct* answer for the personal
  item and a clear "no allowance at any size" for the carry-on.
- **The golden snapshot.** 3,861 verdicts. Adding personal-item support must not
  move one of them, because none of them are personal-item verdicts.

---

## Phasing

1. **Engine learns personal items.** `toCarrier` returns both allowances;
   `evaluate` takes a role. No UI. Snapshot unchanged.
2. **Kill `PERSONAL_ITEM_CM`.** Replace `fits_personal_item` with a real
   per-carrier answer. This alone fixes a claim on 59 bag pages.
3. **Roles on `/check`.** The control above, per-bag verdicts by role.
4. **Set-level findings.** Piece counts, shared weight caps, the fare trap
   copy. This is the part competitors cannot reach, and it should be built last
   because it depends on all three above being right.

Phase 2 is the cheapest real win: a claim on every bag page is currently
measured against a number no airline published.
