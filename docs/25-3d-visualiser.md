# 3D luggage size visualizer

**Status:** implementation specification

**Route:** `/bags/[slug]` today, `/check` next — see *Reuse on /check* below.

**Placement:** in the product header, replacing the large static silhouette in
the right column on desktop and appearing between the title and dimensions on
mobile.

The visualizer is a measuring instrument with the finish of a product viewer,
and it is intentionally more crafted than the minimum useful version needs to
be. It should be the moment on the page that makes someone pause and think,
“That is cool.” The polish is a product differentiator: familiar luggage data
is made tactile, memorable, and obviously cared for.

That reaction cannot come from spectacle pasted onto the page. It comes from a
precise reveal, excellent motion, convincing restrained materials, and controls
that feel obvious on first touch. The user should understand why the feature
exists immediately after admiring it.

## Outcome

The initial view is a stable three-quarter view on a warm off-white stage.
Three visible rules identify:

- **Height:** floor to the highest fixed point, including wheels and fixed handles
- **Width:** the widest left-to-right exterior point
- **Depth:** front to back at the deepest point

Values use the site's active unit. Users can drag to rotate, use arrow keys, or
choose Front, Side, and Top views. Measurements remain legible while the bag
moves. Construction changes the rendering: polycarbonate reads as a matte molded
shell, aluminum has a restrained metallic response, and backpacks and duffels
read as woven fabric.

When overall and packing dimensions both exist, a **Packing space** control
reveals the smaller internal volume inside the exterior shell. Wheels, handles,
feet, and the body remain visible as the difference. This explains why a bag
marketed as 20 inches can measure 22 inches at an airline sizer.

The visualizer does not decide whether a bag fits. The existing fit engine
remains authoritative. A later airline-cage mode may visualize an engine result,
but must never calculate its own verdict.

### The opening reveal

The entrance is a short, choreographed reveal rather than a model that merely
appears:

1. The static silhouette occupies the reserved stage in the initial HTML.
2. As soon as the first WebGL frame is ready, the silhouette begins resolving
   into the 3D model over approximately 400 ms with no flash or scale jump.
3. The bag rises a few pixels into place while its contact shadow settles just
   behind it, giving the object weight without making it bounce.
4. The bag turns 8–12° through a shallow three-quarter view, briefly exposing
   its depth and construction before returning to its resting presentation.
5. Height draws first, followed by width and depth. The rules and labels arrive
   in a deliberate sequence rather than appearing simultaneously.
6. A restrained light sweep travels across the material once, making the shell
   ribs, aluminum edges, or fabric weave legible according to bag type.

Target approximately 2–3 seconds for the full choreography. Tune the timing by
feel during implementation; the sequence may run slightly longer when it earns
the time. The model must accept pointer, touch, keyboard, or preset-view input as
soon as it is visible. Any interaction immediately and gracefully completes the
entrance at the user's chosen orientation. The reveal runs once per visit and
collapses to an immediate render under `prefers-reduced-motion`.

Fast readiness and reveal duration are separate requirements: the static stage
appears in the initial HTML, the first interactive frame should still arrive
within the performance budget, and the authored motion may continue afterward.

This is the “wow” moment. Do not replace it with a loading spinner, perpetual
turntable, dramatic camera flight, or decorative particle effect.

## Page composition

Replace the current 18 rem coverage card with a 25–29 rem visualizer card. Keep
the coverage summary and trip CTA directly beneath the stage in the same card.

```text
┌──────────────────────────────────┬─────────────────────────────┐
│ Bag type                         │       3D BAG MODEL          │
│ Brand + model                    │        ↗ width              │
│                                  │ height │     depth ↘        │
│ Outside dimensions              │        ▼                    │
│ Packing dimensions              │ [Front] [Side] [Top] [Reset]│
│ Empty weight                     ├─────────────────────────────┤
│ Provenance                       │ Clears 46/75 · Check trip → │
└──────────────────────────────────┴─────────────────────────────┘
```

Desktop uses a sticky visualizer only within the header; it stops before the
airline table. Mobile order is name, visualizer, dimension table, provenance,
then coverage and CTA.

- Desktop stage: aspect ratio `4 / 5`, height 28–34 rem
- Tablet: aspect ratio `4 / 3`, height 24–28 rem
- Mobile: aspect ratio `1 / 1`, minimum height 20 rem
- Reserve the stage size before hydration so layout shift is zero

Use the existing card vocabulary: `bg-surface`, `border-rule`, `rounded-card`,
and `shadow-panel`. The stage must not become a black product-viewer island.

## Visual direction

The scene should resemble a carefully lit physical scale model photographed in
the same room as the rest of the site.

- Background: `--color-surface-2`, no visible horizon
- Ground: transparent except for a soft contact shadow
- Lighting: large upper-left key, weak front-right fill, very subtle rim
- Ambient occlusion: restrained around wheels, handles, seams, and ground contact
- Camera: orthographic; perspective must not distort measured proportions
- Default view: yaw `-28°`, pitch `14°`, bag upright

Do not use an HDR showroom, glossy floor, dramatic spotlight, depth-of-field,
lens flare, particles, or reflections of an imaginary room.

### Craft details that earn the reaction

The model should reward a second look with a small number of precise details:

- Wheels rotate a few degrees with the model's invitation turn, then stop
- The telescoping-handle socket and wheel mounts create believable contact
  shadows rather than appearing painted onto a box
- Hard-shell ribs catch the key light softly as the bag turns
- Fabric highlights widen and disappear instead of sliding like plastic
- Dimension arrowheads meet their extension lines exactly at projected bounds
- Labels glide to collision-free positions without lagging behind the model
- Front, Side, and Top views settle with the same confident easing and never
  overshoot

None of these details adds a new fact. Together they make the measured facts
feel physical and make the site feel unusually finished.

### Palette and materials

The model stays neutral because blue means interaction and the verdict palette
means status elsewhere on the site.

| Element | Treatment |
| --- | --- |
| Hard shell | warm graphite/stone, medium roughness, broad highlights |
| Soft luggage | warm charcoal woven surface, high roughness |
| Aluminum | desaturated silver, restrained metalness, never mirror-like |
| Wheels and handle | dark graphite |
| Seams and ribs | one value darker than the body, no black outlines |
| Measurement rules | `--color-ink-2` at 70% |
| Labels | surface chip, ink text, mono value |
| Interactive state | `--color-blue` |
| Packing body | blue at 8–12% opacity with blue wire edges |

### Material quality bar

Material quality is a release gate. A correct model with weak shading does not
ship. The renderer must follow these rules:

**Geometry creates most of the realism.** Every exposed hard edge needs a small,
consistent bevel that can catch the key light. Zipper tracks, piping, shell ribs,
corner guards, wheel housings, and handle sockets must have real silhouette or
surface depth. Do not fake major construction with dark lines painted onto a
rounded box. Avoid perfectly sharp edges, paper-thin panels, intersecting parts,
floating wheels, and handles with no visible mount.

**Use physically plausible PBR values.** Non-metal luggage uses metalness `0`.
Only the aluminum preset uses substantial metalness, and it must retain enough
roughness to avoid chrome. Keep base colors away from pure black and pure white.
Do not use clearcoat to manufacture a generic “premium” sheen. Specular response
must belong to the material: broad and quiet on polycarbonate, tight but muted on
aluminum, and diffuse on fabric and rubber.

**Texture must survive close inspection.** Procedural normal maps should be
low-amplitude, seamless, correctly scaled to the model, and invisible when the
camera is still unless light moves across them. Fabric weave cannot resemble
carbon fiber, denim wallpaper, or TV noise. Molded shell grain cannot resemble
orange peel. If a texture calls attention to itself, remove it and rely on
geometry and roughness.

**Lighting is one controlled studio rig.** Use a large soft key, weaker fill,
subtle rim, and soft contact shadow for every preset. Materials may change;
lighting direction and exposure may not jump between bags. No point-light hot
spots, crushed black cavities, glowing rims, or ambient light strong enough to
flatten the form. Tune the neutral gray bag first, then verify every preset
without per-bag exposure hacks.

**Rendering must be technically clean.** Use the renderer's current color-space
workflow, physically based lighting, a restrained filmic tone map, antialiasing,
and shadow settings that avoid acne, detached shadows, and visibly pixelated
edges. Normals must be smooth where the construction is molded and split where
panels actually crease. There must be no z-fighting, texture swimming, banding,
or one-frame lighting pop during the reveal.

Do not download anonymous “free PBR” texture packs or mix assets from unrelated
sources. A small internally consistent material system will look more expensive
than six detailed materials made under different lighting assumptions.

#### Material review board

Before polishing all bag types, produce one fixed review sheet containing the
same hard-shell, aluminum, fabric, and rubber swatches under the production
camera and lighting rig. Show each at the default angle and at one grazing-light
angle, on both desktop and a representative mobile viewport. Approve that sheet
before propagating the materials across geometry.

Review the finished presets side by side at 100% browser scale. Reject the build
if any reviewer describes a material as plastic toy, wet, chrome, clay, velvet,
noise, game asset, or generic 3D icon. Also reject it if the bag looks convincing
only while moving; the resting frame is the primary product image and must hold
up on its own.

Use six controlled procedural presets:

| Preset | Geometry cues | Render cues |
| --- | --- | --- |
| `hard_shell` | rounded body, shallow ribs, zipper seam | roughness .58, metalness 0 |
| `aluminum` | crisp corners, grooves, corner guards | roughness .42, metalness .72 |
| `soft_side` | softer corners, front panel, piping | roughness .9, subtle weave |
| `backpack` | tapered top, soft front, suggested rear straps | roughness .94 |
| `duffel` | rounded barrel, top handles, soft base | roughness .94 |
| `underseat` | compact body, short handle, recorded wheels | follows hard/soft record |

Release one uses procedural geometry and tiny generated normal maps. It does not
need one GLB asset per SKU. This keeps every model data-driven and avoids an
inconsistent 60-model production queue. Product-specific models are deferred
until they can be produced consistently.

## Geometry and measurement truth

The canonical scene coordinates are `Y = height`, `X = width`, and `Z = depth`.
Bag records use upright `[height, width, depth]`. The adapter must name axes;
raw indexes must not spread through renderer code.

```ts
type BagDimensions = {
  heightCm: number;
  widthCm: number;
  depthCm: number;
};
```

Build every model inside the exact exterior bounding box. Decorative geometry
may sit inside it but never extend beyond it. Wheels and fixed handles therefore
cannot make the rendered object larger than the dimensions it claims to show.

The visualizer consumes the same normalized `bag.external_cm` selected by
`rankedDimensions()` and used by the fit engine. It must never choose a raw
dimension field by name.

Data confidence affects measurement rules, not the apparent physical size:

- maker overall or our measurement: solid rules
- review measurement: dashed extension rules
- maker unspecified: dashed rules plus existing “shown, not recommended” copy
- packing-only or reseller dimensions: no interactive visualizer

`wheels` controls visible wheel count. A telescoping handle is always retracted.
If packing dimensions and `wheel_handle_delta_cm` exist, use the recorded
axis-by-axis gap. Never divide a total gap evenly among axes. Center the packing
body in width and depth and rest it above the wheels. An illustrative 80/20 split
may place the height gap below/above the body, but must never be described as a
measured wheel-versus-handle split.

When only `expands_cm` exists, show an amber “Expander: +N” badge by the depth
rule. Do not render an expanded volume without a sourced three-axis
`expanded_external_cm`.

## Measurement overlay

Render lines and labels as HTML/SVG over the WebGL canvas, never as canvas text.
This keeps text crisp, accessible, and compatible with the unit toggle.

Each axis has two extension lines, a dimension line with inward arrowheads, and
a chip with the axis name and value. Use IBM Plex Mono for values and small
uppercase Figtree for axis names. Labels may move to avoid collisions. Fade an
occluded rule to 35% rather than drawing through the model like an X-ray.

The server emits metric values using existing `data-cm`/`data-dims` hooks. The
unit controller changes labels without rebuilding the scene. Geometry keeps its
source precision; only visible values use the shared formatter.

## Interaction

### Pointer and touch

- Horizontal drag: yaw `-70°…70°`
- Vertical drag: pitch `-18°…28°`
- Gentle inertia that settles within 650 ms
- No roll, pan, zoom, or endless spin
- Vertical touch movement under 12 px remains page scroll; capture only after
  horizontal intent is clear
- Use pointer capture once rotation begins
- Run one subtle 5° invitation turn after intersection; once only, stopped by
  interaction, and disabled by reduced-motion

Direct manipulation must feel attached to the pointer: no perceptible startup
lag, no elastic delay, and no motion continuing after the user deliberately
stops it. Inertia applies only to a clear release gesture. Slow placement should
hold its exact angle.

An orthographic fit-to-stage camera preserves the visual meaning of scale. Zoom
would make the bag appear larger without changing its measurements and is not
useful here.

### Controls and keyboard

Four text buttons sit below the stage: **Front**, **Side**, **Top**, and
**Reset**. Selected state uses blue wash rather than a solid blue fill. Dragging
away from a preset clears its selected state.

The focusable stage announces: “Interactive 3D size model. Use arrow keys to
rotate. Press 1 for front, 2 for side, 3 for top, and 0 to reset.”

- Left/right: yaw 10°
- Up/down: pitch 10°
- `1`, `2`, `3`, `0`: presets
- Home: reset
- Standard blue focus ring around the stage, never the canvas

### Packing-space reveal

When packing dimensions exist, show a segmented control: **Outside size** and
**Packing space**. Outside is default. Packing mode crossfades the exterior to
16% opacity and reveals the inner body without moving parts.

Caption:

> The translucent shell includes the wheels, fixed handles and body around the
> packing space. Airlines measure the outside shell.

Without packing dimensions, omit the control and state that separate packing
dimensions are not published. Never fabricate an inner volume.

## Rendering architecture

Use **Three.js directly** in one lazy client component. The earlier CSS-3D
proposal cannot deliver curved forms, material response, wheel geometry,
ambient occlusion, or reliable lighting. Do not add React Three Fiber; Astro and
Preact do not need a second abstraction for this procedural scene.

```text
src/components/bag-visualizer/
  BagVisualizer.astro       server shell, fallback, DOM labels, accessible copy
  BagVisualizer.client.ts   renderer lifecycle and input
  createBagGeometry.ts      procedural geometry inside normalized bounds
  createMaterials.ts        restrained material presets
  projectMeasurements.ts    3D bounds to SVG/DOM label coordinates
  visualProfile.ts          record to render-only profile
```

```ts
type BagVisualizerProps = {
  slug: string;
  name: string;
  dimensions: BagDimensions;
  packingDimensions?: BagDimensions;
  dimensionSource: string;
  type: 'hardside spinner' | 'softside spinner' | '2-wheel roller' |
        'underseat' | 'backpack' | 'duffel';
  wheels: 0 | 2 | 4;
  soft: boolean;
  expandsCm?: number;
  visualProfile?: BagVisualProfile;
};

type BagVisualProfile = {
  material: 'hard_shell' | 'aluminum' | 'soft_side' | 'backpack' | 'duffel';
  cornerRadius?: 'small' | 'medium' | 'large';
  ribbing?: 'none' | 'horizontal' | 'vertical';
  frontPocket?: boolean;
  wheelStyle?: 'single' | 'double';
};
```

`visualProfile.ts` derives a safe preset from existing `type`, `soft`, and
`wheels`. Add optional record overrides only when classification is visibly
wrong. These fields contain no measurements and cannot affect fit results.

### Loading and performance

- Server-render the card, values, controls, and `BagSilhouette` fallback
- Hydrate within 300 px of the viewport
- Dynamically import Three.js with the client
- Crossfade fallback only after the first complete frame
- Pause outside the viewport and while `document.hidden`
- Render on demand after motion settles; no permanent 60 fps loop
- Cap device pixel ratio at 1.75
- Dispose renderer, geometry, materials, and textures on Astro navigation

| Budget | Target |
| --- | --- |
| Initial page JavaScript | no increase; visualizer is lazy |
| Lazy chunk | ≤ 180 kB gzip including Three.js |
| Generated textures | ≤ 20 kB |
| First frame after intersection | ≤ 500 ms on mid-range mobile |
| Interaction | median ≥ 45 fps; no long task over 100 ms |
| Layout shift | 0 |

If Three.js misses the bundle budget, import only used modules or evaluate a
smaller renderer. Do not sacrifice the DOM overlay or accessibility to save
weight.

## Progressive enhancement and accessibility

- Static `BagSilhouette` and all dimensions exist in initial HTML
- WebGL failure silently leaves the useful fallback
- Canvas is `aria-hidden="true"`; it carries no unique information
- Text description names shape, dimensions, wheel count, and packing gap
- Labels are real DOM text; controls are native 44 px buttons
- Presets and packing mode use `aria-pressed`
- Rotation is not announced continuously; presets update one polite status line
- High-contrast mode uses solid system-color rules
- Reduced-motion removes invitation motion, inertia, and crossfades
- Save-Data, no WebGL, or context failure keeps the SVG fallback

The fallback is a supported mode, not an apology.

## Analytics

Do not install an analytics SDK or add visualizer-interaction events for this
release. The project deliberately avoids treating engagement time and interface
activity as success metrics; see `docs/18-analytics.md`. Existing trip-check and
outbound-click measurement is sufficient to judge downstream value.

Use browser performance marks during development for intersection-to-first-frame
and reveal completion. These are implementation diagnostics and do not need to
leave the visitor's browser. WebGL fallback reasons may be logged locally in
development, but must fail silently in production.

## Failure states

| Condition | Behavior |
| --- | --- |
| No eligible exterior dimensions | Do not render the card |
| No packing dimensions | Exterior only with explicit absence copy |
| No material metadata | Derive neutral preset from type and softness |
| Unknown wheels | Use neutral feet; make no wheel-count claim |
| WebGL unavailable/lost | Keep or reinstate SVG fallback |
| Labels overlap | Snap labels to reserved card edges |
| Narrow mobile | Default front view; place depth rule below model |
| Reduced motion | Direct manipulation without inertia or idle motion |

## Reuse on /check

**Frank: "this 3D visualizer should be able to be reused without much work."**
It can, and the constraint that makes it possible is worth stating as a rule.

> **Geometry in, drawing out. The component never reads the page it is on.**

Everything it needs arrives as a prop. The temptation is to have it fetch the
bag, look up the carrier and resolve the fare — after which it works only where
all three happen to exist.

| Prop | `/bags/[slug]` | `/check` |
|---|---|---|
| `bag` | the record | the record |
| `limit` | from the page's own airline picker | the binding leg's allowance |
| `verdict` | the band | the band |
| `role` | *(not applicable)* | `cabin` or `personal` |

### The blocker was never in the component

The first draft of this spec put the airline cage LAST, blocked on the bag page
needing an airline picker that did not exist. `/check` already knows the
airline — that is the entire point of the page. Sequencing a feature behind the
one surface that lacks its input is how a reusable thing gets built as a
single-page thing.

### What /check adds that the bag page cannot ask

The engine now returns both allowances (`docs/27`), so `/check` can pass a
`role` and the same component answers a question the bag page has no way to
pose:

- a bag marked **carry-on** is caged against `allowances.cabin`
- a bag marked **personal item** is caged against `allowances.personal`

Singapore, EVA, Starlux, Scoot and airBaltic publish a personal item **10 cm
deep**. Drawing a laptop bag against a ten-centimetre slot is the most
persuasive thing this project can put on a screen, and it is unreachable
without the role.

### Three cases with no cage, and none of them draw a box

The component refuses rather than approximates. Each is a finding, and each is
worth saying in words instead:

| Case | Scale | What the reader is told |
|---|---|---|
| `personal_absence: not_published` | 13 carriers | *"Delta publishes no size — it has to fit under the seat in front of you."* |
| Linear-only limit | Singapore, Uzbekistan, Air Astana, Ural | A sum is not a box. There is nothing to build a cage from. |
| `no_cabin_bag` | 5 fares | *"No allowance at any size."* The fare is the answer, not the drawing. |

Inventing a box for any of these would undo the work that made those absences
legible in the first place.

### One instance per answer, not one per leg

A trip has up to eight legs. Eight WebGL contexts is not a page, it is a
device-heater — and browsers cap contexts anyway, so the later ones would fail
silently. `/check` draws **the binding leg only**, which is the leg the verdict
already names. The others stay in the comparison table.

---

## What was learned building it

Recorded because each cost real time and none could fail on its own: the output
is a picture, and pictures have no assertions. All five are now guarded in
`src/components/bag-visualizer/__tests__/geometry-honesty.test.mjs`.

1. **The drawing may not contradict the number.** The handle was drawn *above*
   the stated height, so a bag that cleared its limit rendered poking out of the
   sizer. `external_cm` already includes wheels and handles; adding height
   double-counts the gap the rest of the codebase exists to be careful about.
2. **The cage must BE the allowance.** Posts centred on the limit plane make the
   opening smaller and the silhouette larger, both by a tube radius — about
   0.6 cm, twice `EPS_CM`.
3. **Fix the container before the camera.** `aspect-[4/5] w-full` derived the
   stage height from the card width, and the canvas filled it. Three rounds of
   camera tuning improved the framing without ever fixing it.
4. **`display: contents` generates no box.** Splitting the component across two
   columns silently killed its `IntersectionObserver`, and with it the render
   loop. The view buttons stayed perfectly wired to nothing.
5. **One colour ladder.** The visualizer grew its own, merged `clears` with
   `line` — erasing Tight — and hard-coded hexes copied from the palette.
   `BAND_COPY` now carries the CSS variable and the number side by side.

---

## Delivery

### Implementation handoff

This specification is ready to implement against the current repository. The
implementer should make these integration choices explicitly rather than
re-deriving them:

- Install `three` as a production dependency with `pnpm add three`. Do not add
  React Three Fiber, an animation framework, or a general-purpose gesture
  library for this feature.
- Integrate the shell in `src/pages/bags/[slug].astro`, replacing the current
  `lg:grid-cols-[minmax(0,1fr)_18rem]` right-column silhouette/coverage region
  while retaining its coverage facts and trip CTA.
- Pass normalized `bag.external_cm` to `dimensions`. It is already the result
  selected by the normalization layer. Use `record.claimed_packing_cm?.v` only
  for `packingDimensions`, `bag.dim_source` for `dimensionSource`, and the
  existing `record.type`, `record.wheels`, `record.soft`, and `bag.expands_cm`
  values for presentation.
- The current catalogue contains `hardside spinner`, `softside spinner`,
  `2-wheel roller`, `backpack`, and `duffel`. Keep `underseat` support in the
  renderer as a future-compatible preset; it must not require a schema change.
- Put each visible axis value in a real DOM element with `data-cm`. The existing
  `UnitToggle.astro` updates those elements directly, so the visualizer does not
  need a second unit store or a custom unit event.
- Keep visual-only profile overrides in code for the first release. Do not add
  fields to bag data until repeated exceptions demonstrate that the catalogue
  needs them.

The first releasable pull request includes the measured model **and** the
construction polish/opening reveal. A technically functional gray box is a
development milestone, not the shipped differentiator. Airline cage mode is a
separate later release.

Before review, run `pnpm check`, then inspect at least one example of each
catalogue type at desktop and mobile widths. Also inspect one bag with packing
dimensions, one without them, one review-sourced record, reduced motion,
keyboard-only use, and forced WebGL failure. Record the lazy chunk size and the
measured first-frame time in the pull request description.

### Phase 1 — measured model

- Astro shell and static fallback
- Orthographic procedural models for the five current bag types, with the
  future-compatible `underseat` preset
- Hard-shell and fabric materials
- Pointer, touch, keyboard, and preset views
- Three projected measurement axes
- Unit-toggle integration
- Performance instrumentation and WebGL fallback

### Phase 2 — construction polish

- Full opening choreography, including its interrupt and reduced-motion paths
- Aluminum material
- Wheels, handles, seams, ribs, and front-pocket details
- Contact shadow and restrained ambient occlusion
- Packing-space reveal from real `claimed_packing_cm`
- Expansion badge

### Phase 3 — airline cage

- Entry from the trip checker or a saved itinerary
- Wireframe airline envelope around the bag
- Binding face in the engine verdict color
- Engine-provided overage labels
- No duplicate fare, route, or fit calculation in rendering code

## Acceptance criteria

1. Every eligible model has the exact proportions of normalized exterior
   dimensions used by the fit engine.
2. Height, width, and depth remain correct in every preset view and switch units
   through the global toggle.
3. Mouse, touch, pen, and keyboard work; mobile scrolling remains reliable.
4. Hard side, soft side, backpack, and duffel look distinct without inventing
   SKU-specific facts.
5. Packing mode appears only with sourced packing dimensions, and expansion is
   never inferred from a single increment.
6. Initial HTML contains dimensions and a useful fallback.
7. Reduced-motion, high-contrast, Save-Data, no-WebGL, and context-loss paths work.
8. Lazy chunk, first-frame, and frame-time budgets are measured repeatably.
9. No visualizer calculation can alter a verdict, source rank, or coverage count.
10. It passes axe, keyboard-only, iOS Safari, Android Chrome, and desktop
    Safari/Chrome/Firefox review.

### Visual review

- Warm paper, white cards, restrained shadows, Figtree and IBM Plex Mono
- Blue only for interaction; verdict colors only for a future airline cage
- Model reads as luggage without a logo
- Materials do not look wet, toy-like, or game-like
- Axis labels remain clearer than decorative details
- Packing shell explains the wheel-and-handle gap within three seconds
- Nothing auto-rotates after the first user interaction
- The first reveal feels authored and premium even before the user drags
- Rotation feels like moving a physical object, not swiping a carousel
- At least one construction detail catches the eye without competing with the
  measurements
- A reviewer can describe both why it is cool and why it is useful in one
  sentence

## Non-goals

- Exact product replicas, logos, or inferred product colors
- Opening lids, zippers, or compartments
- Packing simulations or user-uploaded scans
- AR room placement
- Free zoom, pan, or endless spin
- A second fit engine
- Photoreal marketing renders

Those add spectacle without improving understanding of the measured exterior.
