/* CI gate for the carrier dataset.

   Two jobs. The dull one is shape: every record must survive toCarrier() so a
   malformed allowance fails here rather than at a gate.

   The PUBLICATION GATE distinguishes mockup placeholders from researched
   allowances. A researched record is not a placeholder, but may still carry
   publication_ready: false while enforcement or policy conflicts need review.
   Neither category may ship until its outstanding review is complete. */
import { readdirSync, readFileSync } from 'node:fs';
import { EngineInputError, toCarrier } from '../src/engine/normalize.mjs';
import { resolve } from '../src/engine/strictness.mjs';

const dir = new URL('carriers/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== '_index.json');
const PUBLISHING = process.argv.includes('--publish');

let fail = 0;
const bad = (s) => {
  console.log(`  FAIL  ${s}`);
  fail++;
};

const records = files.map((f) => ({ file: f, rec: JSON.parse(readFileSync(new URL(f, dir))) }));

for (const { file, rec } of records) {
  const id = rec.iata ?? file;

  if (!rec.iata || !rec.name) bad(`${file}: missing iata or name`);
  if (rec.iata && file !== `${rec.iata}.json`)
    bad(`${file}: filename does not match iata ${rec.iata}`);

  const score = rec.strictness?.score;
  if (typeof score !== 'number' || score < 1 || score > 10)
    bad(`${id}: strictness must be 1-10, got ${score}`);

  /* Lifecycle. A ceased carrier is allowed in the dataset — the history is worth
     keeping and someone will still search for it — but it must say when, and why
     we believe it. */
  const status = rec.status ?? 'operating';
  if (!['operating', 'ceased', 'merged', 'suspended'].includes(status)) {
    bad(`${id}: unknown status "${status}"`);
  }
  if (status === 'ceased' && !rec.ceased_at) bad(`${id}: ceased with no date`);
  if (status === 'merged' && !rec.successor) bad(`${id}: merged with no successor`);
  if (status !== 'operating' && !rec.status_evidence?.url) {
    bad(`${id}: status "${status}" with no source — this removes a carrier from every result`);
  }

  const cabin = (rec.allowances ?? []).filter((a) => a.type === 'cabin');
  /* A carrier with no cabin rows is not necessarily wrong — it may be
     mid-research. But it must SAY so, because the engine's reading of silence
     changed: absence is now "unknown", and an unknown carrier is excluded from
     every result rather than reported as banning cabin bags. */
  if (!cabin.length && !rec.cabin_absence) {
    bad(
      `${id}: no cabin rows and no cabin_absence — say whether that is not_permitted, not_researched, not_published or out_of_scope`
    );
  }

  /* Every fare row that grants no cabin bag must state which of the four it is.
     "not_permitted" is a finding and shows as a refusal; the others are gaps
     and show as unanswerable. Conflating them is the bug this replaced. */
  /* Fares carry three axes now. A row may state cabin_class, fare_class/
     fare_brand and addon; the last gates the row behind a purchase. */
  const CLASSES = ['economy', 'premium_economy', 'business', 'first'];
  for (const a of rec.allowances ?? []) {
    if (a.cabin_class && !CLASSES.includes(a.cabin_class)) {
      bad(`${id}/${a.fare_class ?? a.addon}: unknown cabin_class "${a.cabin_class}"`);
    }
    /* An add-on row that nobody can reach is a silent hole: the allowance exists
       in the file and no booking will ever match it. */
    if (a.addon && !a.fare_class && !a.cabin_class) {
      bad(`${id}: add-on row "${a.addon}" has no fare_class or cabin_class — unreachable`);
    }
  }

  const ABSENCE = ['not_permitted', 'not_researched', 'not_published', 'out_of_scope'];
  for (const a of rec.allowances ?? []) {
    if (a.cabin_absence && !ABSENCE.includes(a.cabin_absence)) {
      bad(`${id}/${a.fare_class}: unknown cabin_absence "${a.cabin_absence}"`);
    }
  }
  if (rec.cabin_absence && !ABSENCE.includes(rec.cabin_absence)) {
    bad(`${id}: unknown cabin_absence "${rec.cabin_absence}"`);
  }
  for (const a of cabin) {
    if (!Array.isArray(a.max_cm) || a.max_cm.length !== 3)
      bad(`${id}/${a.fare_class}: max_cm must be 3 numbers`);
    else if (a.max_cm.some((n) => !Number.isFinite(n) || n <= 0))
      bad(`${id}/${a.fare_class}: implausible max_cm`);
    /* A zero-size row would silently pass a naive comparison. Absence is the
       signal for "no cabin bag", never a row of zeroes. */
    if (Array.isArray(a.max_cm) && a.max_cm.every((n) => n === 0)) {
      bad(`${id}/${a.fare_class}: zero-size allowance — omit the row instead`);
    }
  }

  /* Every fare must normalize, since that is what the engine actually calls. */
  for (const a of cabin) {
    try {
      toCarrier(rec, a.fare_class);
    } catch (e) {
      if (e instanceof EngineInputError) bad(`${id}/${a.fare_class}: ${e.message}`);
      else throw e;
    }
  }

  /* An override is an assertion against our own evidence, so it carries the
     same burden as any other claim in this repo: a reason, a name, a date. */
  const o = rec.strictness?.override;
  if (o?.score != null) {
    if (typeof o.score !== 'number' || o.score < 1 || o.score > 10)
      bad(`${id}: override score must be 1-10`);
    if (!o.reason)
      bad(
        `${id}: strictness override with no reason — an unexplained number is what this replaces`
      );
    if (!o.by) bad(`${id}: strictness override with no author`);
    if (!o.at) bad(`${id}: strictness override with no date — nobody can tell if it still holds`);
    const st = resolve(rec.strictness).override?.status;
    if (st?.stale) console.log(`  warn  ${id}: override is ${st.days ?? 'un'}dated — review it`);
  }

  /* Claims about how strictly a carrier enforces need citations. An unverified
     claim may sit in the file; it may not reach a reader.

     `unverified: false` is itself a claim — it asserts a human opened the source
     and read it. It was written once from a search-result summary, which is the
     exact failure this project exists to correct, so it now requires saying WHAT
     was checked. "I saw a summary" and "I read the source" are different facts
     and the schema should be able to tell them apart. */
  for (const ev of rec.strictness?.evidence ?? []) {
    if (ev.unverified === false && !ev.verified_against) {
      bad(`${id}: evidence claims verified but does not say what was actually read`);
    }
    if (ev.quote_verbatim && !ev.url) {
      bad(`${id}: verbatim quote with no source URL`);
    }
    /* A cited claim must be traceable to reading someone actually did. */
    if (ev.unverified === false && !rec.research_dossier) {
      bad(`${id}: verified evidence but no research_dossier — where was the reading recorded?`);
    }
    if (PUBLISHING && (ev.unverified || !ev.url)) {
      bad(`${id}: strictness evidence has no source — "${String(ev.claim).slice(0, 50)}…"`);
    }
  }

  if (PUBLISHING) {
    if (rec.placeholder) bad(`${id}: placeholder data cannot be published`);
    if (rec.publication_ready === false)
      bad(`${id}: researched allowances; publication review pending`);
    if (!rec.source_url) bad(`${id}: no source_url — nobody read the carrier's page`);
    if (!rec.verified_at) bad(`${id}: never verified`);
  }
}

/* How many fares we genuinely cannot answer. Worth printing every run: it is
   the honest denominator behind every coverage figure on the site. */
let unanswerable = 0,
  banned = 0;
for (const { rec } of records) {
  for (const a of rec.allowances ?? []) {
    if (a.cabin_absence === 'not_permitted') banned++;
    else if (a.cabin_absence) unanswerable++;
  }
}

const placeholders = records.filter(({ rec }) => rec.placeholder).length;
const researched = records.filter(
  ({ rec }) => rec.research_status === 'official_allowances_researched'
).length;
const pendingReview = records.filter(({ rec }) => rec.publication_ready === false).length;
console.log(
  `${records.length} carriers · ${researched} researched · ${placeholders} placeholder · ${pendingReview} pending publication review · target 50`
);
if (banned || unanswerable) {
  console.log(
    `  fares with no cabin bag: ${banned} not permitted (a finding) · ${unanswerable} unanswerable (a gap)`
  );
}

if (fail) {
  console.log(`\n${fail} problem(s)`);
  process.exit(1);
}
console.log(
  PUBLISHING
    ? '\ncarrier data is fit to publish'
    : '\nshape is valid. Run with --publish to check it is fit to ship (it is not, yet).'
);
