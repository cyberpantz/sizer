import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { test } from 'node:test';
import vm from 'node:vm';

// Parsing alone missed stale catalogue IDs and a formatter used before setup.
// Run the actual inline script, including its first draw, against a minimal DOM.
function loadCheck() {
  const html = readFileSync(new URL('../../../mockup/check.html', import.meta.url), 'utf8');
  const script = [...html.matchAll(/<script(?![^>]*src=)[^>]*>([\s\S]*?)<\/script>/g)]
    .map((m) => m[1])
    .join('\n');
  const elements = new Map();
  const element = (id) => {
    if (!elements.has(id)) elements.set(id, { innerHTML: '', textContent: '' });
    return elements.get(id);
  };
  const context = vm.createContext({
    document: { getElementById: element, querySelectorAll: () => [] },
    navigator: { language: 'en-US', languages: ['en-US'] },
    localStorage: { getItem: () => null, setItem: () => {} },
  });
  vm.runInContext(script, context);
  return { context, element };
}

test('check mockup fills all panels on first load from current catalogue IDs', () => {
  const { element } = loadCheck();
  assert.match(element('bagbox').innerHTML, /Add another bag/);
  assert.match(element('legbox').innerHTML, /ITH → JFK/);
  assert.match(element('legbox').innerHTML, /Ryanair/);
  assert.ok(element('riskwhy').textContent.length > 0);
  assert.match(element('answer').innerHTML, /The biggest bag/);
  assert.doesNotMatch(element('answer').innerHTML, /undefined|NaN|\$null/);
});

test('check mockup redraws after adding bags, flights, changing risk and units', () => {
  const { context, element } = loadCheck();
  element('addbag').onclick();
  assert.equal(vm.runInContext('S.bags.length', context), 2);
  assert.equal((element('bagbox').innerHTML.match(/data-rmbag=/g) ?? []).length, 2);
  element('addleg').onclick();
  assert.equal(vm.runInContext('S.legs.length', context), 4);
  for (const risk of ['strict', 'balanced', 'chance']) {
    vm.runInContext(`S.risk = '${risk}'; draw();`, context);
    assert.doesNotMatch(element('answer').innerHTML, /undefined|NaN/);
  }
  vm.runInContext("U.set('cm')", context);
  assert.match(element('bagbox').innerHTML, /cm/);
  vm.runInContext("U.set('in')", context);
  assert.match(element('bagbox').innerHTML, /in/);
});
