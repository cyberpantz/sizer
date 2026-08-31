/* Astro drops the whitespace before an element or expression that begins a new
   line, so wrapped copy silently loses word spacing:

     The same bag, three different
     <span>sets of dimensions.</span>     ->  "…three differentsets of dimensions."

   Two shipped on the landing page. It is invisible in the source, invisible in
   review, and only shows up when someone looks at the rendered page — which is
   exactly the kind of bug worth a cheap automated check.

   A following line that already starts its own content with a space is fine;
   that is the deliberate fix, e.g. <span> · N more</span>.

   ⚠️ KNOWN GAP: this only checks TEXT followed by an element or expression. The
   mirror case — an element followed by text on the next line, e.g.
   `</strong>\n size` — is not checked, because I could not confirm whether Astro
   collapses that the same way without running the compiler, and a guard that
   flags cases it has not verified trains people to ignore it. Confirm against
   the compiler and widen it, or leave it narrow and honest. */
import { readFileSync, readdirSync } from 'node:fs';
import { join } from 'node:path';

const walk = (d) =>
  readdirSync(d, { withFileTypes: true }).flatMap((e) =>
    e.isDirectory() ? walk(join(d, e.name)) : e.name.endsWith('.astro') ? [join(d, e.name)] : []
  );

let fail = 0;
for (const file of walk('src')) {
  const src = readFileSync(file, 'utf8');
  /* Skip frontmatter — object literals there look like JSX to a naive scan. */
  const body = src.slice(src.indexOf('---', 4) + 3);
  const offset = src.slice(0, src.indexOf('---', 4) + 3).split('\n').length;
  const lines = body.split('\n');

  for (let i = 1; i < lines.length; i++) {
    const prev = lines[i - 1].trimEnd();
    const cur = lines[i].trim();
    if (!/[A-Za-z0-9,.;:)’']$/.test(prev)) continue; // previous line ends mid-sentence?
    if (prev.endsWith('>')) continue; //           …or with a tag, which is fine
    if (!/^[<{]/.test(cur)) continue; //           next line opens an element/expression
    if (/^<\/|^\{\s*['"] ['"]\s*\}/.test(cur)) continue; // closing tag, or an explicit {' '}
    /* An expression whose own output begins with a space is already correct:
       {cond && ` · last updated ${x}`} renders its own separator. Flagging it
       would push authors to add a redundant {' '} and, worse, teach them the
       guard cries wolf — at which point they stop reading it. */
    if (/^\{[^}]*?[`'"]\s/.test(cur)) continue;

    /* Already fixed if the expression's own content starts with a space. */
    if (/^<[^>]*>\s|^<>\s|^\{[^}]*&&\s*\(\s*$/.test(cur)) {
      const inner = lines[i + 1]?.trim() ?? '';
      if (/^<[^>]*>\s|^<>\s/.test(inner)) continue;
    }
    console.log(`  ${file}:${offset + i}  …${prev.slice(-40)}\n      ⏎  ${cur.slice(0, 40)}`);
    fail++;
  }
}
console.log(fail ? `\n${fail} place(s) will lose a space when rendered` : 'no lost spaces in wrapped copy');
process.exit(fail ? 1 : 0);
