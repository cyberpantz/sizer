/* Pulling data out of a page is done in four scripts. It was written four times
   with a regex that assumed no spaces around `=`, and generating the block
   instead of hand-writing it broke all four at once. One reader now. */
import { readFileSync } from 'node:fs';

const root = new URL('../', import.meta.url);

function literal(html, name) {
  const m = html.match(new RegExp(`const ${name}\\s*=\\s*(\\[[\\s\\S]*?\\n\\s*\\];)`));
  if (!m) throw new Error(`no ${name} literal found in the page`);
  // biome-ignore lint/security/noGlobalEval: the mockups embed generated JS literals in HTML; parsing them back out is the whole job of this file, and the input is our own build output
  return eval(m[1]);
}

export function readMockup(page = 'mockup/index.html') {
  const html = readFileSync(new URL(page, root), 'utf8');
  return { html, AIR: literal(html, 'AIR'), BAGS: literal(html, 'BAGS') };
}
