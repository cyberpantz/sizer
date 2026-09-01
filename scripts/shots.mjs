/* PORTFOLIO SCREENSHOTS, AT THE SIZE frankyoung.dev ACTUALLY USES.
 *
 * Run on your Mac, not in CI:
 *
 *     npm run build && npx serve dist -l 4321     # or: npm run preview
 *     npx playwright install chromium             # first time only
 *     node scripts/shots.mjs
 *
 * Output lands in shots/ as .webp, ready to drop into the case study.
 *
 * WHY THIS IS A SCRIPT AND NOT SOMETHING I RAN FOR YOU. Two walls. The sandbox
 * I work in has no libXdamage, so Chromium will not launch there at all; and
 * the browser pane I can drive only returns viewport-sized images, around
 * 800px wide, when your existing assets are 1716–2640px. A 2× capture has to
 * happen somewhere with a real browser, which is your machine.
 *
 * THE SPEC IS TAKEN FROM /work/the-crumb, not invented:
 *
 *   deviceScaleFactor 2   assets there run 1716–2640px wide for a ~623px slot
 *   no browser chrome     they are flat page captures, no window frame
 *   no border             a 1px hairline is added in CSS by the portfolio
 *   no rounded corners    and no shadow
 *   variable ratio        1.47 to 2.19 — cropped to content, not to a grid
 *   webp                  quality 90 is indistinguishable here and ~1/3 the size
 *
 * Each shot below therefore has its own clip, chosen so the frame ends where
 * the interesting thing ends. `full: true` would give you a mile of footer.
 */
import { chromium } from 'playwright';
import { mkdirSync, writeFileSync } from 'node:fs';

const BASE = process.env.BASE ?? 'http://localhost:4321';

/* WRITES STRAIGHT INTO THE PORTFOLIO, because that is where they have to end
   up and a copy step is a chance to forget. Override with OUT= if the repo
   lives somewhere else. */
const OUT =
  process.env.OUT ?? '../portfolio/frank-portfolio/src/assets/projects';

/* PNG, NOT WEBP. My first version wrote webp, which was wrong: the portfolio
   imports PNGs through astro:assets and emits its own responsive AVIF/WebP.
   Handing it a webp means it re-encodes an already-lossy file. Read off the
   existing assets, not assumed. */
const WIDTH = 1280; // × deviceScaleFactor 2 = 2560px, inside the 2322–2956 range there

/* THE ITINERARY IS CHOSEN, NOT ARBITRARY.
 *
 * away-aluminum is the only bag in the catalogue that swings the full width of
 * the scale on two airlines a real person might actually connect through: it
 * CLEARS American on a basic fare and is REFUSED by Air China. One screenshot,
 * both answers, same suitcase — which is the argument the whole site is making
 * and is otherwise quite hard to say in a picture.
 *
 * Everything else defaults to an empty form, which photographs like a tax
 * return. */
const TRIP = '?legs=AA.basic,CA.economy&bags=away-aluminum';

const SHOTS = [
  {
    /* THE CARD COVER, AND IT IS 4:3 ON PURPOSE.
     *
     * projectsV2.ts is explicit about this: covers are pre-cropped to 4:3
     * rather than left to object-cover, because these screens are shot at
     * 1.6–2.3 and a centred auto-crop "throws away 17–42% of the width — on
     * the wide ones that removed a headline and half a card."
     *
     * So this is a composed window, not a resized version of the landing shot.
     * 800×600 at dsf 2 lands exactly on the 1600×1200 the other covers use.
     */
    name: 'sizer-cover',
    url: `/check/${TRIP}`,
    clip: { y: 150, width: 800, height: 600 },
    cover: true,
  },
  {
    name: 'sizer-landing',
    url: '/',
    /* Down to the three entry points and no further — the fold is the pitch. */
    clip: { y: 0, height: 1040 },
  },
  {
    name: 'sizer-check-verdict',
    url: `/check/${TRIP}`,
    /* The answer panel, with both legs visible and disagreeing. */
    clip: { y: 90, height: 900 },
  },
  {
    name: 'sizer-check-envelope',
    url: `/check/${TRIP}`,
    /* The trip envelope — the one thing a per-airline lookup cannot do.
       NOT anchored on "The biggest…", which is the obvious choice and the wrong
       one: the page intro also says "the biggest bag that survives all of
       them", it appears FIRST in the DOM, and the shot would silently frame the
       hero instead of the panel. "Set by" is rendered only inside this panel.
       Resolved by walking up to the panel box rather than guessing an offset,
       because its height moves with the number of legs. */
    box: (p) =>
      p.evaluate(() => {
        const p2 = [...document.querySelectorAll('p')].find((n) =>
          n.textContent.trim().startsWith('Set by')
        );
        if (!p2) return null;
        const panel = p2.closest('section, [class*="rounded-card"]') ?? p2.parentElement;
        const r = panel.getBoundingClientRect();
        return { y: r.top + scrollY, height: r.height };
      }),
    pad: 24,
  },
  {
    name: 'sizer-bag-provenance',
    url: '/bags/away-carryon/',
    /* Dimensions, the source line, and the wheel/handle delta expanded. This is
       the sourcing argument, and it is the least copyable part of the site. */
    clip: { y: 90, height: 880 },
    before: async (p) => {
      /* The provenance panel is a <details>. Open it, or the screenshot shows a
         collapsed summary and the whole point is hidden. */
      await p.evaluate(() =>
        document.querySelectorAll('details').forEach((d) => d.setAttribute('open', ''))
      );
    },
  },
  {
    name: 'sizer-bag-airlines',
    url: '/bags/away-carryon/',
    anchor: 'text=/Every airline we track/i',
    height: 900,
  },
  {
    name: 'sizer-catalogue',
    url: '/bags/',
    clip: { y: 0, height: 1000 },
  },
  {
    name: 'sizer-methodology',
    url: '/methodology/',
    anchor: 'text=/Which number we use/i',
    height: 860,
  },
];

mkdirSync(OUT, { recursive: true });

const browser = await chromium.launch();
const page = await browser.newPage({
  viewport: { width: WIDTH, height: 1100 },
  deviceScaleFactor: 2,
  /* Light, to sit on the portfolio's warm off-white without a dark block. */
  colorScheme: 'light',
});

/* Kill anything that photographs as noise: focus rings from programmatic
   navigation, and the caret in the airport field. Motion is disabled so a
   half-finished transition cannot land in a frame. */
await page.addStyleTag({
  content: `*,*::before,*::after{animation:none!important;transition:none!important}
            *:focus,*:focus-visible{outline:none!important}
            input{caret-color:transparent!important}`,
}).catch(() => {});

for (const shot of SHOTS) {
  await page.goto(BASE + shot.url, { waitUntil: 'networkidle' });

  /* /check computes in the browser and paints in two passes. Waiting on a
     verdict chip rather than a timeout means this is not flaky at 3am. */
  if (shot.url.includes('/check/')) {
    await page.waitForSelector('text=/Fits|Tight|Over|Risky|Probably fine/', { timeout: 15000 });
  }
  await page.waitForTimeout(400); // webfonts settle; text reflows without this
  if (shot.before) await shot.before(page);

  /* A cover is a composed window, so it carries its own width and must not be
     stretched to the full page width like the spread shots are. */
  let clip = shot.clip && { x: 0, width: shot.clip.width ?? WIDTH, ...shot.clip };

  if (shot.anchor) {
    const box = await page.locator(shot.anchor).first().boundingBox();
    if (!box) throw new Error(`${shot.name}: anchor not found — ${shot.anchor}`);
    clip = { x: 0, width: WIDTH, y: Math.max(0, box.y - 40), height: shot.height };
  }

  if (shot.box) {
    const b = await shot.box(page);
    /* THROW RATHER THAN FALL BACK. A resolver that silently returns the whole
       page produces a plausible-looking image of the wrong thing, and you would
       not notice until it was on the portfolio. */
    if (!b) throw new Error(`${shot.name}: could not locate the panel — did the copy change?`);
    const pad = shot.pad ?? 0;
    clip = {
      x: 0,
      width: WIDTH,
      y: Math.max(0, b.y - pad),
      height: Math.round(b.height + pad * 2),
    };
  }

  /* A clip taller than the page yields a short image with a white band at the
     bottom, which reads as a rendering bug rather than a crop. */
  const pageHeight = await page.evaluate(() => document.documentElement.scrollHeight);
  if (clip.y + clip.height > pageHeight) clip.height = pageHeight - clip.y;

  const file = `${OUT}/${shot.name}.png`;
  await page.screenshot({ path: file, clip, type: 'png' });

  const w = clip.width * 2;
  const h = Math.round(clip.height) * 2;
  const ratio = (clip.width / clip.height).toFixed(3);
  /* The cover is the one shot with a hard requirement, so it is checked rather
     than trusted — a cover that is not 4:3 gets auto-cropped by the card and
     loses the part that made it worth choosing. */
  const flag = shot.cover
    ? Math.abs(clip.width / clip.height - 4 / 3) < 0.01
      ? '  4:3 ✓'
      : '  ⚠ NOT 4:3 — the card will crop this'
    : '';
  console.log(`  ${shot.name}.png  ${w}×${h}  ratio ${ratio}${flag}`);
}

await browser.close();

/* THE SNIPPET, GENERATED. projectsV2.ts wants an `import` per shot plus a
   `shots` array, and hand-typing eight import lines against eight filenames is
   exactly the sort of thing that ends with one typo and a build error. Captions
   are sentence case here because CaseStudy.astro uppercases them in CSS —
   writing them in caps would double up. */
const snippet = `${SHOTS.filter((s) => !s.cover)
  .map((s) => {
    const ident = s.name.replace(/-([a-z])/g, (_, c) => c.toUpperCase());
    return `import ${ident} from '../assets/projects/${s.name}.png';`;
  })
  .join('\n')}
import sizerCover from '../assets/projects/sizer-cover.png';
`;
writeFileSync('shots-imports.txt', snippet);
console.log(`\n${SHOTS.length} PNGs written to ${OUT}/`);
console.log('Import lines for projectsV2.ts are in shots-imports.txt.');
console.log('Captions and alt text are in docs/case-study.md.');
