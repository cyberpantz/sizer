/* A disclosure is a claim about US, held to the same standard as a claim
 * about a bag.
 *
 * THE BUG. Every page of the site said "As an Amazon Associate we earn from
 * qualifying purchases." There is no Associates account, no tag, no outbound
 * affiliate link and no revenue. It was written in advance from docs/07 —
 * put the disclosure in the layout so it cannot be forgotten later — which is
 * a sound instinct that produced a false statement on 63 pages.
 *
 * It is the exact inverse of what this project does everywhere else. We refuse
 * to print a dimension without saying where it came from, and then printed a
 * commercial relationship we did not have.
 *
 * BOTH DIRECTIONS ARE FAILURES, and they are not symmetric:
 *   - claiming a relationship we lack is a false statement to a reader
 *   - hiding one we have is what the FTC actually polices
 * So the disclosure is derived from the programme list, and the tests refuse
 * either mismatch. */
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { describe, test } from 'node:test';
import { disclosure, isMonetised, PROGRAMMES } from '../affiliate.mjs';

const footer = readFileSync('src/components/Footer.astro', 'utf8');

describe('the disclosure matches reality', () => {
  test('no programme is live without a tag to earn with', () => {
    /* A programme marked live but carrying no tag earns nothing, so the
       disclosure would be claiming revenue that cannot exist. */
    for (const p of PROGRAMMES) {
      if (!p.live) continue;
      assert.ok(p.tag, `${p.name} is marked live but has no tag — it cannot earn anything`);
    }
  });

  test('nothing is claimed while nothing is live', () => {
    if (isMonetised()) return; // covered by the next test
    assert.equal(
      disclosure(),
      null,
      'no programme is live, so the site must say nothing about earning money'
    );
  });

  test('every live programme is named in the text a reader sees', () => {
    /* The FTC direction: a relationship that exists has to be disclosed
       clearly. If a programme goes live and its sentence is missing, the page
       is hiding it. */
    const text = disclosure() ?? '';
    for (const p of PROGRAMMES.filter((x) => x.live)) {
      assert.ok(
        text.includes(p.disclosure),
        `${p.name} is live but its disclosure is not in the footer text`
      );
    }
  });

  test('the footer asserts nothing on its own', () => {
    /* The failure was a hard-coded sentence in the template. The footer must
       render what affiliate.mjs returns and never carry its own copy. */
    assert.doesNotMatch(
      footer.replace(/\/\*[\s\S]*?\*\//g, ''),
      /Amazon Associate|earn a commission|qualifying purchases/,
      'the footer hard-codes a disclosure again instead of deriving it'
    );
    assert.match(footer, /disclosure\(\)/, 'the footer no longer calls disclosure()');
  });

  test('an empty disclosure renders nothing, not an empty paragraph', () => {
    assert.match(
      footer,
      /\{text &&/,
      'the disclosure paragraph is not conditional, so it will render empty'
    );
  });

  test('nothing claims we measure bags while we have measured none', async () => {
    /* THE SAME PATTERN AS THE FALSE DISCLOSURE, one page over.
     *
     * Two links to the methodology page read "How we measure". We have
     * measured zero bags — docs/19 records that abandoning our own tape
     * measure was load-bearing, and the page they point at is itself titled
     * "How we work it out". The true phrasing already existed three times on
     * the site; the plausible one got written anyway.
     *
     * Guarded rather than just fixed, because "we measure" is the single
     * easiest claim on this site to write by reflex — it is what a luggage
     * site sounds like it should say. */
    const { readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const { coverageStats } = await import('../data.mjs');
    if ((await coverageStats()).bags_measured > 0) return; // we measure now — claim away

    const walk = (d) =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.astro') ? [join(d, e.name)] : []
      );
    const offenders = [];
    for (const f of walk('src')) {
      const src = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
      /* Present-tense first-person measuring, in prose a reader sees. The
         methodology page describes the `measured` rung as a definition and is
         allowed to name it. */
      for (const m of src.matchAll(/>[^<>{}]*\b[Ww]e measure\b[^<>{}]*</g)) {
        if (/rung|ladder|would|if we/i.test(m[0])) continue;
        offenders.push(`${f}: "${m[0].slice(1, -1).trim()}"`);
      }
    }
    assert.deepEqual(
      offenders,
      [],
      `claims we measure bags, and we have measured none:\n  ${offenders.join('\n  ')}`
    );
  });

  test('no page carries a money claim outside the footer', async () => {
    /* One place says this, or two copies drift — the same rule that put every
       verdict label in ui/verdict.mjs. */
    const { readdirSync } = await import('node:fs');
    const { join } = await import('node:path');
    const walk = (d) =>
      readdirSync(d, { withFileTypes: true }).flatMap((e) =>
        e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.astro') ? [join(d, e.name)] : []
      );
    const offenders = [];
    for (const f of walk('src')) {
      if (f.endsWith('Footer.astro')) continue;
      const src = readFileSync(f, 'utf8')
        .replace(/\/\*[\s\S]*?\*\//g, '')
        .replace(/\{\/\*[\s\S]*?\*\/\}/g, '');
      if (/As an Amazon Associate|qualifying purchases/.test(src)) offenders.push(f);
    }
    assert.deepEqual(
      offenders,
      [],
      `a second disclosure lives outside the footer:\n  ${offenders.join('\n  ')}`
    );
  });
});
