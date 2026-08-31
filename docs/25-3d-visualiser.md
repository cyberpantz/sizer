# The 3D size visualiser

**Where it lives:** the bag detail page, `/bags/[slug]`, directly under the
dimension block.

**What it is:** a rotatable, measured volume — the bag drawn at true proportion
with its three axes labelled, and the wheel-and-handle gap shown as a shell
around the packing body.

---

## What it is FOR, which decides everything else

The comparator on `/check` already answers *"does it fit?"*. This must not be a
second, prettier version of that, or it is decoration — and this site has
already thrown away one control for restating something the page said
elsewhere (`docs/24`, the coverage facet).

Three questions it answers that nothing on the site currently does:

1. **Which dimension is which.** A reader looking at `55.9 × 35.6 × 22.9` does
   not know which number is the height. Nobody does. Airlines print their
   limits in a different order again. A labelled solid removes the ambiguity in
   one glance, and that ambiguity is the single commonest way a person
   mis-checks their own bag.

2. **Where the wheels and handle live.** This is the site's central argument —
   the packing body is not what an airline measures — and today it is a
   sentence: *"Wheels, handle and feet add 4.4 cm over the packing figure."* As
   a **nested shell**, it stops being a claim and becomes a shape. 29 of 57
   bags carry both figures, so the data exists.

3. **What 40 cm of depth actually looks like.** Numbers do not convey volume.
   A solid at true proportion does.

If a build of this does not make (2) obvious, it has missed the point and
should not ship.

---

## The build decision: CSS 3D, not Three.js

**Recommendation: CSS 3D transforms. No 3D library.**

The subject is a rectangular prism. That is six `<div>`s and a
`transform: rotateX() rotateY()`. Three.js would render the same six faces for
roughly 150 kB gzipped on a page that currently ships almost nothing.

The argument is not only bundle size:

| | CSS 3D | Three.js |
|---|---|---|
| Bundle | 0 kB | ~150 kB gzip |
| Dimension labels | **real DOM text** | canvas glyphs |
| Units toggle | works via existing `data-cm` hooks | needs re-render plumbing |
| Screen reader | reads the labels | opaque canvas |
| Text selection / zoom | native | none |
| No WebGL / old device | works | needs a fallback |
| Lighting, reflections, soft shadows | approximate | real |

The label point is decisive. Every figure on this site carries a `data-cm`
hook so the Metric/Imperial toggle can rewrite it in place
(`src/components/UnitToggle.astro`). In CSS 3D the measurement labels are DOM
elements and that works for free. In a canvas they are pixels, and the toggle
silently stops reaching them — which is precisely the class of bug that had
weight stuck in kilograms for the whole of today.

**Reach for Three.js only if** we later want true soft shadows, a genuine
material response, or non-box geometry (a duffel's slump, a backpack's taper).
We have 1 duffel and 2 backpacks out of 57. Not yet.

---

## Visual language

**It should read as a drawing, not a photograph.** `docs/23` already ruled out
product photography on the grounds that a glossy render is the manufacturer's
framing, and this site's whole argument is that the manufacturer's presentation
is not what the airline measures. A photoreal polycarbonate shell would import
exactly that framing back in.

The reference is an **architect's model or an exploded technical drawing**:
matte, warm, honest about being a diagram.

```
Overall shell   var(--color-surface-2) at ~18% opacity, edges var(--color-rule-strong)
Packing body    solid var(--color-surface), edges var(--color-rule)
Face shading    top 100% · front 94% · side 88% brightness — a fixed key light
                from upper-left. No specular, no gradient ramps.
Contact shadow  a single soft ellipse, var(--color-ink) at 8%, blurred
Axis labels     font-mono, text-[0.8125rem], text-muted, on the rules
Axis rules      1px var(--color-rule-strong), with the same arrow caps the
                /check comparator already uses — the two drawings must look
                like they come from the same hand
```

**Colour discipline holds.** Blue is the only interactive colour
(`docs/02`), so the drag handle and any control are blue and **the geometry
never is**. If the bag is shown against an airline limit, the limit's cage may
carry the verdict's status colour — that is status, which is permitted, and it
is the same green/lime/amber/orange/red ladder as the badge.

**Type detail, cheaply.** The existing `BagSilhouette` already maps type →
shape. Reuse it: four small wheel pucks on a spinner, two on a roller, none on
a backpack or duffel. Rounded corner radius from `soft` — a hard shell is
crisp, a softside gets a wider radius. This costs almost nothing and stops all
57 bags looking like the same grey box.

---

## Interaction

- **Drag to rotate.** Pointer events, so mouse/touch/pen are one code path.
  Constrain to yaw −45°…+45° and pitch −20°…+30°. A box that can spin to a
  useless angle is a toy; a box that stays legible is an instrument.
- **Inertia, lightly damped.** Enough to feel physical, settling in well under
  a second. No spin-forever.
- **Idle hint.** A slow 6° yaw drift on first view only, so a reader learns it
  is draggable without a tooltip. Stops permanently on first interaction.
- **Keyboard.** Arrow keys rotate in 15° steps; the container is `tabindex=0`
  with a visible focus ring. This is not optional — a drag-only control is
  unusable for a chunk of readers.
- **Reset.** Double-click, or a small blue text button, returns to the default
  three-quarter view.
- **`prefers-reduced-motion`.** No idle drift, no inertia, instant snapping
  between angles. The control still works.

**One deliberate omission: no zoom.** Scale is the whole point. Letting someone
pinch a 55 cm bag to fill the screen destroys the only thing the drawing is
for. Zoom would be actively harmful here.

---

## The packing-gap shell

The feature that justifies the whole thing.

When `claimed_packing_cm` exists (29 of 57 bags), render **two nested
volumes**: the packing body solid, the overall dimensions as a translucent
shell around it. A small caption names the difference in the reader's units,
using the same `data-cm` hook everything else uses:

> The shell is the **4.4 cm** the wheels and handle add. That is the number an
> airline measures against.

For the other 28 bags, render the single volume and say so plainly — the same
rule as everywhere else on this site: *absence is stated, never disguised.*

---

## Accessibility

A 3D control is opaque to assistive technology unless it is built not to be.

- The measurements **must** exist as real text in the DOM regardless of the
  drawing — they are the content, the geometry is an illustration of it.
- `role="img"` on the scene with an `aria-label` giving the three dimensions
  and, where known, the packing gap.
- The rotation control is separately focusable and labelled
  (*"Rotate the bag. Arrow keys to turn."*).
- Never the sole carrier of any fact. If the visualiser fails to initialise,
  the page must lose nothing but the picture — the existing `BagSilhouette` is
  the static fallback.

---

## Performance

- **Detail page only.** Never on a card, never 57 instances.
- **Lazy.** Initialise on `IntersectionObserver`, not on load.
- The static silhouette renders server-side and is replaced on hydrate, so
  there is no layout shift and no empty box before JavaScript.
- Target: no dependency, under ~4 kB of component JS.

---

## Data it needs

Everything is already in the record:

| Need | Field | Coverage |
|---|---|---|
| Overall dimensions | `external_cm` / `claimed_cm` via `rankedDimensions()` | 57 of 57 |
| Packing body | `claimed_packing_cm` | 29 |
| Precomputed gap | `wheel_handle_delta_cm` | 25 |
| Wheel count | `wheels` | all |
| Shell softness | `soft` | all |
| Type → silhouette | `type` | all |

**It must use `rankedDimensions()`**, not `external_cm` directly. That was
today's bug: picking a field by name rather than by source rank meant 19 bags
were drawn from a review measurement while the manufacturer's own figure sat
unused one field away.

---

## Failure modes to design against

1. **Becoming a product viewer.** If it drifts toward "look at this nice
   suitcase", it has become the manufacturer's marketing and lost its reason to
   exist. It is a measuring instrument.
2. **Labels that stop converting.** The moment a measurement is painted into a
   canvas or baked into a string, the units toggle cannot reach it. Guarded by
   the existing `unit-toggle.test.mjs` rules: no unit inside a string, every
   figure carries a hook.
3. **Implying precision we do not have.** A crisp solid says "this is exact".
   For a bag on an unlabelled maker figure, or a review measurement, the
   provenance line below must stay visible and honest. Consider a subtly
   softer edge treatment for non-`maker_overall` figures — the drawing should
   not look more certain than the number behind it.
4. **Mobile drag stealing page scroll.** Constrain to horizontal drag on touch,
   or require a deliberate press-and-hold. A reader who cannot scroll past the
   widget will leave.

---

## Phasing

**Phase 1 — the instrument.** Single volume, three labelled axes, drag +
keyboard rotate, static fallback, full a11y. This is the whole value of point
(1) above and ships in a day.

**Phase 2 — the shell.** The nested packing body and the gap caption. This is
the part that makes the site's argument physical, and it is the reason to build
any of it.

**Phase 3 — the airline cage.** An optional wireframe box at a chosen airline's
limit, tinted with the verdict colour, so the reader sees exactly which face is
over. This is where it stops being an illustration and becomes an answer —
but it needs an airline picker on the bag page, which does not exist yet.

Phase 3 is the one that would genuinely differentiate. Worth noting the
competitor's Bag Finder shows a single unlabelled dimension string and no
drawing at all.
