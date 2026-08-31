# Launch coverage: which airlines, and why those

**The target, in one sentence:** a US traveller booking from the US, who may add
an intra-EU leg or two, and who may fly domestically in Thailand, Indonesia,
China or Japan.

100–150 carriers is months away. This is what "enough" looks like now.

---

## The principle: an airline earns its place by changing an answer

Coverage is not a count. Two carriers with the same allowance and the same
enforcement add one fact between them, and the second one only makes the list
longer. What matters is whether adding a carrier can flip a verdict for someone
on this itinerary.

Our own data says where that happens, and it is not where I assumed:

| Type | Carriers | Distinct cabin boxes | Weight caps |
|---|---|---|---|
| Full service | 42 | 12 | **5–12 kg** |
| LCC | 11 | 5 | 7–15 kg |
| ULCC | 3 | 3 | 10–16 kg |

I expected full-service carriers to cluster at 55 × 40 × 23 and the budget
airlines to be the interesting ones. Half right. The **sizes** do cluster, but
the **weight caps** spread from 5 kg to 12 kg — and the low end is entirely
Asian full-service carriers. Air China allows 5 kg. Ten more allow 7 kg.

That matters more than it sounds, because **13 of the 39 bags we hold a weight
for use more than half of a 7 kg allowance while completely empty.** The
heaviest is 4.94 kg before anything goes in it.

So for the markets named above, the binding constraint is frequently weight, not
size — and a US traveller has almost certainly never met a weighed carry-on. US
carriers essentially never weigh one.

**Consequence for sequencing:** an Asian carrier with a 7 kg cap changes more
answers than a fourth European flag carrier at 55 × 40 × 23.

---

## Where we are: 58 carriers

| Region | Have | Verdict |
|---|---|---|
| EU | 30 | **Strong.** Every ULCC and LCC that matters is in |
| AS | 17 | **Misleading.** Long-haul flag carriers only — see below |
| NA | 6 | **Weakest, and it is the home market** |
| ME | 5 | Adequate for connections |

### Asia looks covered and is not

Seventeen Asian carriers, and they are almost all long-haul flag carriers: the
airlines a US traveller takes *to* Asia. Frank named four markets. Here is what
we hold for flying *within* them:

| Market | Carriers we have | Domestic reality |
|---|---|---|
| **Thailand** | **none** | TG is the flag carrier; FD, SL, DD, VZ fly the domestic network |
| **Indonesia / Bali** | **none** | GA, plus JT, QG, ID and IU on the domestic routes |
| **China** | CA, MU, CZ | The big three, yes — but not 9C, the LCC that behaves differently |
| **Japan** | JL, NH, ZG | The two majors, but neither Japanese LCC |

**Thailand and Indonesia are at zero.** Someone flying Bangkok to Phuket, or
Jakarta to Denpasar, currently gets no answer from us at all — on two of the four
markets named as launch targets.

### North America is thin

Six carriers, and one of them (Spirit) had to be deleted when it ceased.
Missing: **Alaska**, which is a top-five US carrier, and **Allegiant**, a ULCC
whose personal-item enforcement is exactly our subject matter.

---

## The list, in priority order

**Tier 1 — named markets at zero coverage.** Nothing else on this page beats
these, because they are the difference between a wrong answer and no answer.

| | IATA | Airline | Why |
|---|---|---|---|
| 1 | `TG` | Thai Airways | Thai flag carrier; a named market with nothing in it |
| 2 | `FD` | Thai AirAsia | Dominant Thai domestic LCC. 7 kg |
| 3 | `AK` | AirAsia (Malaysia) | The SE Asia LCC backbone. 7 kg, enforced |
| 4 | `GA` | Garuda Indonesia | Indonesian flag carrier — Bali |
| 5 | `JT` | Lion Air | Largest Indonesian domestic operator |
| 6 | `QG` | Citilink | Garuda's LCC arm; the cheap Bali hop |

**Tier 2 — the home market.**

| | IATA | Airline | Why |
|---|---|---|---|
| 7 | `AS` | Alaska Airlines | Top-five US carrier, missing entirely |
| 8 | `G4` | Allegiant | ULCC. Small personal item, hard enforcement |
| 9 | `AC` | Air Canada | "Booked from the US" routinely includes Canada |
| 10 | `SY` | Sun Country | ULCC-adjacent, leisure routes |
| 11 | `WS` | WestJet | Canadian counterpart to Southwest |

⚠️ **Do not add `HA` Hawaiian as a separate record.** Alaska and Hawaiian moved
to a single passenger service system in April 2026 and all flights transition to
`AS` codes; Hawaiian continues as a brand but not as a booking code. One record,
with a note. This needs confirming against Alaska's own site before it is
written down — it is the kind of thing that changes.

**Tier 3 — Asian LCCs, which is where the 7 kg caps live.**

| | IATA | Airline | Market |
|---|---|---|---|
| 12 | `MM` | Peach | Japan domestic |
| 13 | `GK` | Jetstar Japan | Japan domestic |
| 14 | `9C` | Spring Airlines | China domestic LCC |
| 15 | `VJ` | VietJet | Vietnam |
| 16 | `5J` | Cebu Pacific | Philippines |
| 17 | `7C` | Jeju Air | Korea |
| 18 | `6E` | IndiGo | India's largest airline by a wide margin |
| 19 | `MH` | Malaysia Airlines | |
| 20 | `SL` | Thai Lion Air | Thailand |
| 21 | `DD` | Nok Air | Thailand |
| 22 | `HU` | Hainan Airlines | China |

**Tier 4 — cheap ways across the Atlantic, and Gulf connections.**

| | IATA | Airline | Why |
|---|---|---|---|
| 23 | `N0` | Norse Atlantic | Transatlantic LCC — squarely the persona |
| 24 | `OG` | PLAY | Same, via Iceland |
| 25 | `EY` | Etihad | The Gulf hub we lack |

That is **83**. The last ~17 to 100 are EU regionals (`BT`, `OU`, `RO`, `QS`,
`GQ`) and Oceania (`QF`, `JQ`, `VA`, `NZ`) — worth having, not worth
prioritising, because none of them changes an answer for this traveller.

---

## What is deliberately not on the list

- **More EU flag carriers.** Thirty is already generous, and the marginal one
  sits at 55 × 40 × 23 alongside eleven others.
- **Ryanair UK, Buzz, Lauda, easyJet Switzerland.** Separate AOCs, same
  published allowance as their parent. A record each would inflate the count
  and add no fact.
- **Regional US operators** (SkyWest, Republic, Envoy). They fly under the
  majors' codes. The thing that matters about them — the bins on a CRJ-200 —
  is already modelled as `operates_regional_jets` on the mainline carrier.

---

## The gap this exposes in the product

The `/check` page offers a fixed list of airlines. Someone flying Thai AirAsia
does not get a wrong answer — they cannot find their airline at all, and the
page says nothing about why.

**That needs a route: "my airline isn't listed".** It should say plainly that we
do not cover it yet, and it should be countable, because what people search for
is the only unbiased signal about which carrier to research next. Right now the
priority order on this page is my reasoning about a persona. It could be
evidence.

Not a launch blocker. It is the cheapest research instrument we could build, and
it gets more valuable the longer it runs, so it should go in early.
