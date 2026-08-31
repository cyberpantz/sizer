# Review data

Third-party reviews, as data. Four files, one rule: **their claims never enter our bag records.**

| File | What it is |
|---|---|
| `sources.json` | The publications. What each actually prints, their stated method, their self-contradictions. |
| `mentions.json` | One row per bag per publication — award, their printed specs, their words verbatim. |
| `derive.mjs` | Computes conflicts and corroboration. Nothing in it is authored. |
| `../../resources/reviews/*.md` | The human-readable summaries these were extracted from. Kept — they hold the reasoning. |

## Why mentions are separate from bags

A bag record answers *what is this bag*. A mention answers *what did someone say about it, on what date, in what article*. Merging them loses the source, and once it's lost we're doing exactly what we criticise the category for: publishing a number with no provenance.

So `claimed` is always theirs. `data/bags/*.json` holds ours, with `measured_at` and a photo. When they disagree, both survive and the bag page shows it.

## Verbatim means verbatim

`caveat_verbatim: true` marks a quote reproduced word for word. Those are quoted with attribution and a link, never paraphrased into our voice — a paraphrase would launder their editorial judgment into ours.

## What the derivation is for

Both conflicts in the current set were found by hand first, which is the argument for the script: hand-reading four articles caught two, and the next four articles won't get the same attention.

The corroboration count is the check on *"shortlisted bags should show up regularly in best-of lists."* Current answer across four major roundups and 50 bags: **5 are corroborated, 45 appear in exactly one list.** That criterion is far harder to satisfy than it sounds, and it's worth knowing before it becomes a filter.

## Adding a source

1. Summarise the article into `resources/reviews/` first — the reading is where the judgment happens.
2. Add the publication to `sources.json`, including what it *doesn't* publish. The absences have been as informative as the data.
3. Add rows to `mentions.json`. Slugs must match `data/bags/` exactly, or the join silently drops the bag.
4. `node data/reviews/derive.mjs` and read the new conflicts.

## Known gap

Bag slugs here are provisional — `data/bags/` doesn't exist yet, so nothing validates them. Reconcile when the catalogue lands, and add a CI check that every `mentions.bag` resolves.
