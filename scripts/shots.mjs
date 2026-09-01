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

/* The bag page needs an airline chosen before the visualiser has anything to
   draw. Lufthansa economy puts the Away just over the line — "Probably fine" —
   so the bag sits proud of the frame by a visible sliver rather than rattling
   around inside it or missing it entirely. A clean pass photographs as an empty
   box; a hopeless one photographs as a mistake. */
   I first wrote this as `?airline=LH&fare=economy` on the URL. The bag page
   does not read either parameter — I invented them — and the shot would have
   been a silently empty visualiser, which is the worst kind of wrong because
   the script still succeeds. It has to be selected on the page. */
const pickAirline = (label) => async (p) => {
  await p.selectOption('select', { label });
  /* Wait for the panel to actually name the airline rather than sleeping a
     fixed amount: the island re-renders asynchronously and a timeout that is
     long enough on a fast machine is not on a slow one. */
  await p.waitForFunction(
    (n) => document.body.innerText.includes(n),
    label,
    { timeout: 10000 }
  );
  await p.waitForTimeout(500); // the 3D view eases into position
};

/** Bounding box of the first match, in page coordinates, with asymmetric
 *  padding — a visualiser needs room for the caption underneath it and the
 *  panel header above, and those are different amounts. */
const boxOf = (page, selector, { padTop = 0, padBottom = 0 } = {}) =>
  page.evaluate(
    ([sel, top, bottom]) => {
      const el = document.querySelector(sel);
      if (!el) return null;
      const r = el.getBoundingClientRect();
      if (r.height < 40) return null; // canvas that never sized: see the note below
      return { y: Math.max(0, r.top + scrollY - top), height: r.height + top + bottom };
    },
    [selector, padTop, padBottom]
  );

/* RUN THIS AGAINST `dist`, NOT `astro dev`.
 *
 * Not a style preference. Driving the dev server live, the console filled with
 * `504 (Outdated Optimize Dep)` — Vite re-optimising dependencies mid-session,
 * which kills the already-loaded module graph. The visible symptom is that the
 * bag page's 3D visualiser never sizes past its default 300×150 and paints
 * nothing, and the airline picker appears to freeze one selection behind.
 *
 * I spent a while treating that as a bug in the component. It is not: a clean
 * reload fixes it and a production build never does it at all. Worth writing
 * down because the failure looks exactly like a broken product and photographs
 * like one too — an empty white box where the best screen on the site should be.
 */
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
    url: `/bags/away-carryon/${VIZ}`,
    /* The visualiser, cropped square-ish. Measured, not guessed: the canvas
       sits around y 265 at a 1440 viewport with the panel's caption below it. */
    box: (p) => boxOf(p, 'canvas', { padTop: 120, padBottom: 190 }),
    ratio: 4 / 3,
    cover: true,
  },
  {
    name: 'sizer-landing',
    url: '/',
    /* Down to the three entry points and no further — the fold is the pitch. */
    clip: { y: 0, height: 1040 },
  },
  {
    /* THE 3D SIZER FRAME — the prettiest thing on the site, and the one screen
       that cannot be explained in text. Needs an airline chosen, or the panel
       renders an empty state instead of the comparison. */
    name: 'sizer-visualizer',
    url: `/bags/away-carryon/${VIZ}`,
    box: (p) => boxOf(p, 'canvas', { padTop: 150, padBottom: 220 }),
  },
  {
    /* THE COMPARATOR — your bag against the airline's opening, same subtraction
       as the verdict above it. */
    name: 'sizer-comparator',
    url: `/bags/away-carryon/${VIZ}`,
    box: (p) =>
      p.evaluate(() => {
        const h = [...document.querySelectorAll('*')].find(
          (e) => e.children.length === 0 && /^Compare sizes$/i.test(e.textContent.trim())
        );
        if (!h) return null;
        const card = h.closest('[class*="rounded-card"]') ?? h.parentElement;
        const r = card.getBoundingClientRect();
        return { y: r.top + scrollY, height: r.height };
      }),
    pad: 28,
  },
  {
    /* THE FARE THAT GRANTS NOTHING. Ryanair Basic renders a dedicated empty
       state — "Not 'too big' — nothing is allowed in the overhead locker at any
       size" — which is the most opinionated screen on the site and says more
       about the product than another table would. */
    name: 'sizer-no-cabin-bag',
    url: '/bags/away-carryon/?airline=FR',
    before: async (p) => {
      await p.selectOption('select', { label: 'Ryanair' }).catch(() => {});
      await p.waitForTimeout(900);
    },
    box: (p) => boxOf(p, '[class*="rounded-card"]:has(canvas), canvas', { padTop: 150, padBottom: 200 }),
  },
  {
    /* Both legs visible and disagreeing. ANCHORED, because the answer card sits
       around y 3190 on a populated trip — my first draft clipped from y 90 and
       would have photographed an empty form with total confidence. */
    name: 'sizer-check-verdict',
    url: `/check/${TRIP}`,
    box: (p) =>
      p.evaluate(() => {
        const row = [...document.querySelectorAll('*')].find(
          (e) =>
            e.children.length <= 6 &&
            /American/.test(e.textContent) &&
            /(Fits|Tight|Over|Risky|Probably fine)/.test(e.textContent) &&
            e.textContent.length < 220
        );
        const card = row?.closest('[class*="border-l-"]');
        if (!card) return null;
        const r = card.getBoundingClientRect();
        return { y: r.top + scrollY, height: Math.min(r.height, 1100) };
      }),
    pad: 24,
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
    /* A canvas stuck at its default 300×150 means the island never hydrated —
       almost always the dev server's `504 Outdated Optimize Dep`. boxOf returns
       null for it rather than handing back a box around an empty white square,
       which is what a portfolio screenshot of a broken page looks like. */
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
    /* The cover has to land on 4:3 exactly or the card auto-crops it, so it
       takes its width from the height rather than the page. Centred, because
       the visualiser is centred in its panel. */
    if (shot.ratio) {
      clip.width = Math.round(clip.height * shot.ratio);
      clip.x = Math.max(0, Math.round((WIDTH - clip.width) / 2));
      if (clip.x + clip.width > WIDTH) {
        clip.width = WIDTH;
        clip.x = 0;
        clip.height = Math.round(WIDTH / shot.ratio);
      }
    }
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
