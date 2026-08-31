/* The rebuild must never destroy a measurement.

   build-bags.mjs regenerates every bag record from sources. That is correct for
   derived fields and catastrophic for `measured_cm`, which is the only data in
   the repo that is genuinely ours. This test exists because the failure would be
   silent: a rebuild that wipes the asset looks exactly like a rebuild that works. */

import assert from 'node:assert/strict';
import { execFileSync } from 'node:child_process';
import { cpSync, mkdtempSync, readFileSync, rmSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { describe, test } from 'node:test';

const root = new URL('../../../', import.meta.url).pathname;

function rebuildIn(dir) {
  execFileSync(process.execPath, [join(dir, 'data/build-bags.mjs')], { stdio: 'pipe' });
}

describe('rebuilding the catalogue', () => {
  let dir;
  const setup = () => {
    dir = mkdtempSync(join(tmpdir(), 'lf-'));
    cpSync(join(root, 'data'), join(dir, 'data'), { recursive: true });
    return dir;
  };
  const teardown = () => rmSync(dir, { recursive: true, force: true });

  test('preserves a measurement a human entered', () => {
    const d = setup();
    try {
      const file = join(d, 'data/bags/monos-carryon.json');
      const rec = JSON.parse(readFileSync(file));
      rec.measured_cm = { v: [55.4, 39.8, 22.1], src: 'measured', at: '2026-09-02' };
      rec.measured_at = '2026-09-02';
      rec.measured_by = 'frank';
      rec.measurement_photo = '/img/measure/monos-carryon.jpg';
      writeFileSync(file, JSON.stringify(rec, null, 1));

      rebuildIn(d);

      const after = JSON.parse(readFileSync(file));
      assert.deepEqual(after.measured_cm.v, [55.4, 39.8, 22.1], 'the measurement was erased');
      assert.equal(after.measured_by, 'frank');
      assert.equal(after.measurement_photo, '/img/measure/monos-carryon.jpg');
      assert.equal(after.needs_measurement, false, 'a measured bag must leave the queue');
    } finally {
      teardown();
    }
  });

  test('still refreshes derived fields around the preserved ones', () => {
    const d = setup();
    try {
      const file = join(d, 'data/bags/monos-carryon.json');
      const rec = JSON.parse(readFileSync(file));
      rec.measured_cm = { v: [1, 1, 1], src: 'measured', at: '2026-09-02' };
      rec.brand = 'WRONG'; // derived — must be regenerated
      writeFileSync(file, JSON.stringify(rec, null, 1));

      rebuildIn(d);

      const after = JSON.parse(readFileSync(file));
      assert.equal(after.brand, 'Monos', 'derived fields must still rebuild');
      assert.deepEqual(after.measured_cm.v, [1, 1, 1], 'preserved fields must survive');
    } finally {
      teardown();
    }
  });

  test('refuses to rebuild over a record it cannot parse', () => {
    const d = setup();
    try {
      writeFileSync(join(d, 'data/bags/monos-carryon.json'), '{ not json');
      assert.throws(
        () => rebuildIn(d),
        /unreadable|Fix or move it/,
        'a corrupt record may hold a measurement — never clobber it on a guess'
      );
    } finally {
      teardown();
    }
  });

  test('a bag with no measurement stays queued', () => {
    const d = setup();
    try {
      rebuildIn(d);
      const after = JSON.parse(readFileSync(join(d, 'data/bags/monos-carryon.json')));
      assert.equal(after.measured_cm, null);
      assert.equal(after.needs_measurement, true);
    } finally {
      teardown();
    }
  });
});
