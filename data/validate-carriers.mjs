/* CI gate for the carrier dataset.

   Two jobs. The dull one is shape: every record must survive toCarrier() so a
   malformed allowance fails here rather than at a gate.

   The important one is the PUBLICATION GATE. Every record currently carries
   `placeholder: true` because the values came out of a mockup, and every number
   quoted in the docs is derived from them. The single worst outcome for this
   project is publishing a confident verdict computed from data nobody verified —
   that is precisely the failure we criticise the category for. So: placeholders
   are allowed to exist, and are not allowed to ship. */
import { readFileSync, readdirSync } from 'node:fs';
import { toCarrier, EngineInputError } from '../src/engine/normalize.mjs';
import { resolve, MIN_CONFIDENCE } from '../src/engine/strictness.mjs';

const dir = new URL('carriers/', import.meta.url);
const files = readdirSync(dir).filter((f) => f.endsWith('.json') && f !== '_index.json');
const PUBLISHING = process.argv.includes('--publish');

let fail = 0;
const bad = (s) => { console.log(`  FAIL  ${s}`); fail++; };

const records = files.map((f) => ({ file: f, rec: JSON.parse(readFileSync(new URL(f, dir))) }));

for (const { file, rec } of records) {
  const id = rec.iata ?? file;

  if (!rec.iata || !rec.name) bad(`${file}: missing iata or name`);
  if (rec.iata && file !== `${rec.iata}.json`) bad(`${file}: filename does not match iata ${rec.iata}`);

  const score = rec.strictness?.score;
  if (typeof score !== 'number' || score < 1 || score > 10) bad(`${id}: strictness must be 1-10, got ${score}`);

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
  if (!cabin.length) bad(`${id}: no cabin allowance rows at all`);
  for (const a of cabin) {
    if (!Array.isArray(a.max_cm) || a.max_cm.length !== 3) bad(`${id}/${a.fare_class}: max_cm must be 3 numbers`);
    else if (a.max_cm.some((n) => !Number.isFinite(n) || n <= 0)) bad(`${id}/${a.fare_class}: implausible max_cm`);
    /* A zero-size row would silently pass a naive comparison. Absence is the
       signal for "no cabin bag", never a row of zeroes. */
    if (Array.isArray(a.max_cm) && a.max_cm.every((n) => n === 0)) {
      bad(`${id}/${a.fare_class}: zero-size allowance — omit the row instead`);
    }
  }

  /* Every fare must normalize, since that is what the engine actually calls. */
  for (const a of cabin) {
    try { toCarrier(rec, a.fare_class); }
    catch (e) {
      if (e instanceof EngineInputError) bad(`${id}/${a.fare_class}: ${e.message}`);
      else throw e;
    }
  }

  /* An override is an assertion against our own evidence, so it carries the
     same burden as any other claim in this repo: a reason, a name, a date. */
  const o = rec.strictness?.override;
  if (o?.score != null) {
    if (typeof o.score !== 'number' || o.score < 1 || o.score > 10) bad(`${id}: override score must be 1-10`);
    if (!o.reason) bad(`${id}: strictness override with no reason — an unexplained number is what this replaces`);
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
    if (!rec.source_url) bad(`${id}: no source_url — nobody read the carrier's page`);
    if (!rec.verified_at) bad(`${id}: never verified`);
  }
}

const placeholders = records.filter(({ rec }) => rec.placeholder).length;
const verified = records.length - placeholders;
console.log(`${records.length} carriers · ${verified} verified · ${placeholders} placeholder · target 50`);

if (fail) { console.log(`\n${fail} problem(s)`); process.exit(1); }
console.log(PUBLISHING
  ? '\ncarrier data is fit to publish'
  : '\nshape is valid. Run with --publish to check it is fit to ship (it is not, yet).');
