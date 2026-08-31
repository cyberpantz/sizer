import fs from 'node:fs';

const docs = fs.readdirSync('.').filter((f) => /^\d\d-.*\.md$/.test(f));
let bad = 0;
const OURS = ['100', '58', '24', '12']; // 24/12 are historical placeholder-era figures
const COMPETITOR_COVERAGE = ['190', '180', '172', '146', '9'];

const flag = (f, l, why) => {
  bad++;
  console.log(`  ${f}:${l}  ${why}`);
};
for (const f of docs) {
  fs.readFileSync(f, 'utf8')
    .split('\n')
    .forEach((line, i) => {
      const n = i + 1;
      // /airline/* used as a competitive surface
      if (
        /\/airline\/\[slug\]|\/airline\/ryanair/.test(line) &&
        !/reference|not promoted|not in the sitemap|transparency|unpromoted/i.test(line)
      )
        flag(f, n, '/airline/* outside a reference context → use /luggage-for/*');
      // carrier count drift
      //   OURS: figures that describe our own dataset, current or historical
      //   COMPETITOR_COVERAGE: how many airlines someone else tracks
      /* Two digits only, so it could never match the number it was checking for.
         The allow-list containing '100' was dead code from the day it was
         written — a guard that cannot fire is worse than no guard, because it
         reads as coverage. */
      const m = line.match(/(?<![\d%.])(\d{1,3}) (?:carriers|airlines)\b/);
      if (
        m &&
        /* Numbers that are legitimately not our launch set. Listed explicitly
           rather than inferred from nearby words: context matching failed
           because "146 airlines" and "Pack Hacker" sit on different lines, and
           a guard that depends on prose adjacency will keep breaking. */
        !OURS.includes(m[1]) &&
        !COMPETITOR_COVERAGE.includes(m[1]) &&
        !/mock|placeholder|prototype|researched so far/i.test(line) &&
        !/moved .* from|clears?|scored|of the \d+ (?:carriers|airlines)/i.test(line)
      )
        flag(f, n, `carrier count "${m[1]}" — launch target is 100`);
      // unit toggle
      if (/unit/i.test(line) && /(both shown, always|never a toggle|metric by default)/i.test(line))
        flag(f, n, 'units: inches for US locale, cm elsewhere, always-visible toggle');
      // dead typeface
      if (/Barlow/.test(line) && !/gone|removed|replaced/i.test(line))
        flag(f, n, 'Barlow — typeface is Figtree');
      // undefined tokens
      for (const t of ['--signal-mute', '--signal-dim', '--paper-surface', '--ink-type'])
        if (line.includes(t)) flag(f, n, `undefined token ${t}`);
    });
}
console.log(
  bad ? `\n${bad} drift issue(s)` : '\nno drift — docs agree with the canonical decisions'
);
process.exit(bad ? 1 : 0);
