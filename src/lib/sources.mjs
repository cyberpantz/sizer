/* The source register, read from the files that actually hold it.

   resources/SOURCES.md is written and maintained by hand; the review sources
   are structured in data/reviews/sources.json. The public page renders BOTH
   rather than restating either, so the page cannot drift from the register the
   way a hand-copied table would. */
import { readFileSync } from 'node:fs';

const root = new URL('../../', import.meta.url);

export async function loadSources() {
  const reviews = JSON.parse(readFileSync(new URL('data/reviews/sources.json', root))).sources;
  return Object.entries(reviews).map(([id, s]) => ({
    id,
    publication: s.publication,
    title: s.title,
    url: s.url,
    updated: s.updated,
    retrieved: s.retrieved,
    tier: s.tier,
    kind: s.kind ?? 'publication',
    /* The honest column. `publishes.dimensions` tells us whether this source
       contributed the number that matters, or only opinion. */
    publishes_dimensions: s.publishes?.dimensions ?? false,
    beat: s.beat ?? null,
    caution: s.caution ?? null,
  }));
}

/** Carriers whose own page someone has actually opened. */
export async function loadCarrierSources() {
  const { readdirSync } = await import('node:fs');
  const dir = new URL('data/carriers/', root);
  return readdirSync(dir)
    .filter((f) => f.endsWith('.json') && !f.startsWith('_'))
    .map((f) => JSON.parse(readFileSync(new URL(f, dir))))
    .filter((c) => c.source_url)
    .map((c) => ({
      iata: c.iata,
      name: c.name,
      url: c.source_url,
      verified_at: c.verified_at ?? null,
      verified_by: c.verified_by ?? null,
      dossier: c.research_dossier ?? null,
    }))
    .sort((a, b) => a.name.localeCompare(b.name));
}
