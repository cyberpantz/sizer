# Business setup (US)

> **This is background information, not legal or tax advice.** I'm not a lawyer or an accountant. State rules vary significantly and change. Before forming an entity or making a tax election, talk to a CPA — for a business this size that's usually a few hundred dollars and it's worth it. Anything below marked **verify** should be checked against your state's current rules.

---

## Short answer

**No, you don't need an LLC to start, and forming one now is probably premature.**

You can sign up for every affiliate network on this list as a sole proprietor today. Get an EIN first — it's free, takes about ten minutes, and keeps your SSN out of a dozen third-party systems. Revisit the LLC question when there's revenue to protect or real liability exposure.

The one thing worth doing before launch is the **disclosure and policy pages**, which are a legal obligation regardless of entity type and which affiliate networks check at application.

---

## The options

### Sole proprietorship — the default

You already are one, the moment you earn a dollar. No filing, no fee, nothing to form.

- Income reported on **Schedule C** with your personal return
- Subject to **self-employment tax** (~15.3% on net earnings) on top of income tax
- Affiliate networks accept an SSN or an EIN
- **No liability separation** — your personal assets aren't distinct from the business

Fine for launch. Fine for a long time, honestly.

### LLC — the upgrade

- **Filing fee** varies widely by state — roughly $50 to $500 (**verify** for yours)
- **Ongoing cost** is the part people miss: annual reports and franchise taxes. California charges an **$800 minimum annual franchise tax** regardless of income, which is real money against a site earning $1–5k/month. Delaware, Wyoming and Nevada are cheap but add a registered agent fee and, if you don't live there, foreign-qualification in your home state anyway. **For a solo operator, forming in your home state is usually simpler and cheaper.** (**verify**)
- **Liability separation** — but only if you maintain it: separate bank account, no commingling, business expenses paid from business funds. An LLC you treat as a personal account offers weaker protection than people assume.
- Taxed as a sole proprietorship by default if single-member — an LLC alone changes nothing about your taxes. The S-corp election that sometimes saves self-employment tax generally only makes sense at meaningfully higher profit, and adds payroll and filing costs. Ask a CPA before assuming it applies.

### DBA / fictitious business name

If you operate under a trade name rather than your legal name, most states or counties require registering it. Usually cheap — often $10–$100 (**verify**).

Practically, you'll want this to open a bank account in the business name and to have affiliate payments made out to it. Note it's a **name registration, not liability protection and not a trademark.**

---

## What liability actually exists here

Worth being concrete rather than defaulting to "form an LLC to be safe," because the risks in this particular business are specific:

| Risk | Real? | Mitigation |
|---|---|---|
| A user relies on a verdict, gets charged a fee, is angry | **Yes — the main one** | Language discipline in the product (never "you'll be fine"), plus clear terms |
| Defamation-type claim from an airline or brand over a strictness score or an unflattering measurement | Low but nonzero | Publish methodology, source everything, state facts and label opinions |
| Affiliate network contract breach — e.g. an Amazon operating-agreement violation | Moderate | Follow [06-monetization.md](06-monetization.md) constraints; the exposure is account termination, not usually a lawsuit |
| Someone reuses your measurements commercially | Yes | Terms of use; largely unenforceable in practice |

**The product's language discipline is doing more risk mitigation than an entity would.** A tool that states the rule, states observed behavior, and states the cost of being wrong is much harder to build a claim against than one that says "this bag will be fine."

For content liability specifically, **media liability / E&O insurance** is arguably more targeted than an LLC, and often a few hundred dollars a year. Worth a conversation once there's revenue.

---

## Recommended sequence

### Now — before applying to networks

1. **Get an EIN.** Free, directly from `irs.gov` (never a paid service — they charge for something the IRS gives away). Available to sole proprietors. Takes about ten minutes online.
2. **Open a separate bank account** for the business, even as a sole proprietor. Makes bookkeeping trivial and is required later if you form an LLC.
3. **Write the policy pages:** privacy policy, terms of use, affiliate disclosure. Required for Amazon approval, and the FTC obligations apply regardless of entity.
4. **Register a DBA** if you'll operate under a trade name — needed for the bank account.

### At revenue

5. **Set aside for taxes from the first dollar.** A common rule of thumb is 25–30% of net, and quarterly estimated payments are generally required once you expect to owe $1,000+ for the year. (**verify** with a CPA — this is exactly the kind of thing that's cheap to ask about and expensive to get wrong.)
6. **Expect 1099-NEC forms** from networks paying you $600+.
7. **Revisit the LLC** when revenue is consistent or exposure grows. Converting later is straightforward; you won't have lost anything by waiting.

---

## Taxes, briefly

- Affiliate income is **self-employment income**, Schedule C
- Deductible against it: hosting, domain, software, the bags you buy to measure, a home-office allocation, mileage to measure bags in stores
- **Keep receipts for measured bags** — they're inventory-adjacent business expenses and they'll be a meaningful line item
- **Sales tax generally does not apply** — you're earning commission income, not selling goods. State nexus rules vary. (**verify**)

---

## What you don't need

- A trademark, at launch. Useful later if the name becomes an asset; not a blocker now.
- A registered agent, unless you form an LLC.
- Incorporation in Delaware or Wyoming. Standard advice for startups raising venture capital, largely irrelevant to a solo content business and often actively worse — you end up registered in two states.
- A business credit card, though it makes bookkeeping easier.
- An accountant on retainer. One conversation before your first tax year is enough.

---

## Open questions for your CPA

Bring this list; it's most of what matters:

1. Sole proprietor vs. single-member LLC given my state and expected revenue?
2. What are the actual annual costs of an LLC in my state?
3. Quarterly estimated payments — when do they start applying to me?
4. Are bags purchased for measurement a straight expense, or do they need different treatment?
5. Does my state require a DBA filing for this name, and at what level?
6. Any state-specific sales-tax exposure on affiliate commission income?
