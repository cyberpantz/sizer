# 3D luggage size visualizer

**Status:** implementation specification

**Route:** `/bags/[slug]`

**Placement:** in the product header, replacing the large static silhouette in
the right column on desktop and appearing between the title and dimensions on
mobile.

The visualizer is a measuring instrument with the finish of a product viewer.
It shows the bag at its real proportions, makes height, width, and depth
unambiguous, and explains which exterior parts count toward an airline limit.
It should invite interaction without turning the page into a luggage ad.

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

Emit each at most once per page view:

- `bag_visualizer_loaded`
- `bag_visualizer_rotated`
- `bag_visualizer_view_selected` with `front | side | top | reset`
- `bag_visualizer_packing_revealed`
- `bag_visualizer_fallback` with `reduced_data | no_webgl | context_error`

Rotation time is not a success metric. Useful downstream signals are trip-check
starts and product clicks after interaction.

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

## Delivery

### Phase 1 — measured model

- Astro shell and static fallback
- Orthographic procedural models for all six bag types
- Hard-shell and fabric materials
- Pointer, touch, keyboard, and preset views
- Three projected measurement axes
- Unit-toggle integration
- Performance instrumentation and WebGL fallback

### Phase 2 — construction polish

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

## Non-goals

- Exact product replicas, logos, or inferred product colors
- Opening lids, zippers, or compartments
- Packing simulations or user-uploaded scans
- AR room placement
- Free zoom, pan, or endless spin
- A second fit engine
- Photoreal marketing renders

Those add spectacle without improving understanding of the measured exterior.
