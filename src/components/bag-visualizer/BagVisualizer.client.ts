import * as THREE from 'three';
import { createBagGeometry } from './createBagGeometry';
import { createBindingMarkers } from './createBindingMarkers';
import { createMaterials } from './createMaterials';
import { allowanceDimensions, createGateSizer } from './createGateSizer';
import { createFitAnimation } from './fitAnimation';
import { buildLimitsPanel, fmtCm } from './fitLimits';
import { bindingPhysicalAxis, bandHex, evaluateFit } from './fitVisual';
import { projectMeasurements } from './projectMeasurements';
import { deriveVisualProfile } from './visualProfile';
import { createUnits } from '../../ui/units.mjs';
import {
  ALL_BAND_CHIP_CLASSES,
  UNANSWERED_HEX,
  BAND_CHIP,
  fitsWithinLimit,
  resultLabel,
  sizeVerdict,
} from '../../ui/verdict.mjs';
import type { BagVisualizerProps, ViewPreset } from './types';

const units = createUnits();

/* Box3.setFromObject() traverses EVERY child, visible or not. bagScene.envelope
 * is a wireframe at the bag's nominal dimensions and is switched off by
 * default — so it silently joined every layout and framing measurement and
 * padded the scene with margin nobody could see. Same family as the hidden
 * filter pill and the data-kg loop with no emitters: something present in the
 * structure but absent from the picture, quietly changing the answer. */
function visibleBox(object: THREE.Object3D): THREE.Box3 {
  const box = new THREE.Box3();
  const scratch = new THREE.Box3();
  object.updateMatrixWorld(true);
  /* traverseVisible skips a whole subtree whose root is hidden, which is what
     we want. But expandByObject() would then traverse that mesh's OWN children
     again without the visibility filter, quietly undoing it — so union the
     geometry's bounding box directly instead. */
  object.traverseVisible((child) => {
    const mesh = child as THREE.Mesh;
    const geom = mesh.geometry;
    if (!geom) return;
    if (!geom.boundingBox) geom.computeBoundingBox();
    if (!geom.boundingBox) return;
    scratch.copy(geom.boundingBox).applyMatrix4(mesh.matrixWorld);
    box.union(scratch);
  });
  return box;
}

/* THE OPENING VIEW IS THREE-QUARTER, AND THAT IS WHY THE ANIMATION EXISTS.
 *
 * The bag slides into the sizer along Z. The camera is ORTHOGRAPHIC and looks
 * straight down -Z, so from a dead-on front view that motion produces NO
 * change on screen whatsoever — no parallax, no scale, nothing. The animation
 * has been running perfectly and has been invisible from the view the page
 * opens in. Only the 3.4-degree tilt gave any hint that something moved.
 *
 * `front` stays dead-on: it is a drafting elevation, it is what the button
 * promises, and squaring up to a face is exactly what you want when reading a
 * height off it. What was missing is that the OPENING view should never have
 * been the same thing. docs/25 called for "the default three-quarter view" and
 * the presets only ever had the three orthogonal ones.
 *
 * So `default` is its own angle — enough yaw to give the depth axis a screen
 * direction to move along, enough pitch to read the top as a surface rather
 * than an edge. It is not reachable from the buttons; it is where you start. */
const PRESETS: Record<Exclude<ViewPreset, 'default'> | 'default', { yaw: number; pitch: number }> =
  {
    default: { yaw: -0.42, pitch: 0.24 },
    front: { yaw: 0, pitch: 0 },
    side: { yaw: Math.PI / 2, pitch: 0 },
    top: { yaw: 0, pitch: Math.PI / 2 - 0.02 },
  };

export type FitSession = BagVisualizerProps & {
  bag: Record<string, unknown>;
  carrierRecord: Record<string, unknown>;
  fare: string;
  carrierName: string;
};

type InitOptions = {
  root: HTMLElement;
  canvas: HTMLCanvasElement;
  overlay: SVGSVGElement;
  session: FitSession;
};

export function initFitVisualizer(opts: InitOptions): () => void {
  const { root, canvas, overlay, session } = opts;
  const stage = root.querySelector('[data-stage]') as HTMLElement;
  const verdictEl = root.querySelector('[data-viz-verdict]') as HTMLElement | null;
  const statusEl = root.querySelector('[data-viz-status]') as HTMLElement | null;

  const { bag, carrier, result } = evaluateFit(session.bag, session.carrierRecord, session.fare);
  const allowance = allowanceDimensions(carrier.allowance?.max_cm ?? null);
  const bindingAxis = bindingPhysicalAxis(
    [session.dimensions.heightCm, session.dimensions.widthCm, session.dimensions.depthCm],
    result.dimension
  );
  const overflowCm = Math.max(0, result.delta_cm ?? 0);

  let width = stage.clientWidth;
  let height = stage.clientHeight;
  let disposed = false;
  let renderId = 0;
  let visible = true;
  let animStart = performance.now();
  let settled = true;
  let activePreset: ViewPreset = 'default';
  let targetYaw = PRESETS.default.yaw;
  let targetPitch = PRESETS.default.pitch;
  let yaw = targetYaw;
  let pitch = targetPitch;
  /* A TWEEN, NOT A DECAY. The old move was `yaw += (target - yaw) * 0.2` —
     exponential, so it covers most of the distance in the first few frames and
     then crawls. That reads as a snap followed by a settle, which is a UI
     transition; a solid object turning has a beginning, a middle and an end.
     Fixed duration, eased both ends, so the eye can follow it round. */
  let turnFrom = { yaw, pitch };
  let turnTo = { yaw, pitch };
  let turnStart = 0;
  const TURN_MS = 620;

  const scene = new THREE.Scene();
  scene.background = new THREE.Color(0xf5f2ed);

  const camera = new THREE.OrthographicCamera(-1, 1, 1, -1, 0.1, 2000);
  const renderer = new THREE.WebGLRenderer({
    canvas,
    antialias: true,
    alpha: true,
    powerPreference: 'high-performance',
  });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 1.75));
  renderer.setClearColor(0xf5f2ed, 1);
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;

  const rig = new THREE.Group();
  scene.add(rig);

  const content = new THREE.Group();
  rig.add(content);

  const bagRig = new THREE.Group();
  const profile = deriveVisualProfile(session);
  const materials = createMaterials(profile.material, {
    bodyOpacity: 0.78,
    fitVisual: true,
    fits: sizeVerdict(result),
  });
  const bagScene = createBagGeometry(session, profile, materials);
  bagScene.envelope.visible = false;
  /* THE MEASURED BOX WEARS THE VERDICT.
   *
   * This was a fixed slate blue. The envelope is the bag's exterior dimensions
   * drawn as a box — it IS the thing being judged — so tinting it anything
   * else made the Outline view the one place that told you nothing about the
   * answer. Blue was also the wrong choice twice over: docs/02 reserves blue
   * for interactive, and this is not interactive.
   *
   * Grey when the engine declined to answer, which is not a mild green. */
  (bagScene.envelope.material as THREE.LineBasicMaterial).color.setHex(
    sizeVerdict(result) === null ? UNANSWERED_HEX : bandHex(result.band)
  );
  (bagScene.envelope.material as THREE.LineBasicMaterial).opacity = 1;
  bagRig.add(bagScene.root);
  content.add(bagRig);

  let sizer: THREE.Group | null = null;
  let bindingMarkers: THREE.Group | null = null;
  let fitAnim: ReturnType<typeof createFitAnimation> | null = null;
  const canDrawSizer =
    allowance && !result.unknown && result.basis !== 'linear' && !result.no_cabin_bag;
  if (canDrawSizer) {
    sizer = createGateSizer(allowance);
    content.add(sizer);
    if (bindingAxis && overflowCm > 0) {
      bindingMarkers = createBindingMarkers({
        bindingAxis,
        bagDims: session.dimensions,
        limitDims: allowance,
        color: bandHex(result.band),
      });
      content.add(bindingMarkers);
    }
    fitAnim = createFitAnimation({
      bagDepthCm: session.dimensions.depthCm,
      sizerDepthCm: allowance.depthCm,
      /* Only an over-limit bag refuses to settle. sizeVerdict() rather than the
         band, so "no cabin bag" — a fact about the fare — never shakes a bag
         that was never measured. */
      rejects: sizeVerdict(result) === false,
    });
  }

  /* THE FRAME ANSWERS EITHER WAY — green when it fits, red when it does not.
   *
   * The first version only reddened on failure, so a bag that sailed through
   * got a frame that never reacted at all: the reader watched it slide in and
   * nothing happened. Silence is a poor way to say yes, and it left the reader
   * unsure whether the drawing had finished thinking.
   *
   * `null` — an unanswered leg — still arms nothing. We have no finding to
   * announce, and a frame that goes green because we did not check would be
   * the worst thing on this page. */
  const fits = sizeVerdict(result);
  /* prefers-reduced-motion gets the finding without the flash: the frame sits
     permanently red rather than pulsing. The information is not the animation,
     and a reader who has asked for less movement has not asked for less
     information. */
  const reducedMotion =
    typeof window !== 'undefined' &&
    window.matchMedia?.('(prefers-reduced-motion: reduce)').matches === true;
  const alarmMaterial =
    fits !== null && sizer
      ? ((sizer.userData.frameMaterial as THREE.MeshStandardMaterial) ?? null)
      : null;
  const FRAME_BASE = new THREE.Color(0x74808d);
  const FRAME_ALARM = new THREE.Color(bandHex(fits ? 'clears' : 'wont'));
  /* Asymmetric, as everywhere else: a refusal is worth more of the frame than
     an approval. Telling someone their bag is fine when it is not costs them a
     gate fee and their bag; a green slightly too quiet costs nobody anything. */
  const alarmStrength = fits ? 0.75 : 1;
  if (alarmMaterial && reducedMotion) {
    alarmMaterial.color.copy(FRAME_BASE).lerp(FRAME_ALARM, alarmStrength);
  }

  content.updateMatrixWorld(true);
  const bagBox = visibleBox(bagScene.exterior);
  bagRig.position.y = -bagBox.min.y;

  /* The bag's real bounds, expressed in bagRig's own frame — captured after the
     lift above and before any rotation, so it stays valid as the rig turns.
     projectMeasurements() must use THIS and not re-derive a box from `dims`:
     the nominal box puts the bag's base at the origin, the geometry does not,
     and the lift above would then be applied to the guide a second time. That
     is what drew a height leader several times the height of the bag. */
  content.updateMatrixWorld(true);
  const measureBox = visibleBox(bagScene.exterior);
  bagRig.worldToLocal(measureBox.min);
  bagRig.worldToLocal(measureBox.max);

  content.updateMatrixWorld(true);
  const layoutBox = new THREE.Box3();
  if (sizer) layoutBox.union(visibleBox(sizer));
  layoutBox.union(visibleBox(bagRig));
  if (bindingMarkers) layoutBox.union(visibleBox(bindingMarkers));
  /* CENTRE ALL THREE AXES, INCLUDING Y.
   *
   * Y was pinned to 0 — which reads as "leave the bag standing on the ground"
   * and is the natural thing to write, but the camera is an ORTHOGRAPHIC one
   * with a frustum symmetric about the origin (top = +halfH, bottom = -halfH)
   * looking at (0, 0, 0). So "the ground" is the middle of the frame, not the
   * bottom of it.
   *
   * The model therefore sat entirely in the upper half of the viewport with the
   * lower half empty, and — because halfH is derived from the model's full
   * height rather than half of it — the TOP was clipped at the same time. Both
   * complaints, one line: the dead space under the bag and the cage running off
   * the top of the card.
   *
   * layoutBox already spans the sizer, the bag and the binding markers, so its
   * centre is the thing the camera should be pointed at. */
  content.position.set(
    -(layoutBox.min.x + layoutBox.max.x) / 2,
    -(layoutBox.min.y + layoutBox.max.y) / 2,
    -(layoutBox.min.z + layoutBox.max.z) / 2
  );

  const key = new THREE.DirectionalLight(0xfff8f0, 1.1);
  key.position.set(-50, 90, 40);
  scene.add(key);
  const fill = new THREE.DirectionalLight(0xffffff, 0.35);
  fill.position.set(40, 30, 30);
  scene.add(fill);
  scene.add(new THREE.AmbientLight(0xffffff, 0.32));

  /** The model's bounds with the rig UNROTATED — the one measurement that does
   *  not change as the view turns. */
  function localBounds(): THREE.Box3 {
    const y = rig.rotation.y;
    const x = rig.rotation.x;
    rig.rotation.set(0, 0, 0);
    rig.updateMatrixWorld(true);
    const box = visibleBox(content);
    rig.rotation.set(x, y, 0);
    rig.updateMatrixWorld(true);
    return box;
  }

  /* ONE FRUSTUM FOR EVERY VIEW — this is what makes it read as a rotation.
   *
   * fitCamera used to run on each view change and re-fit to whatever the model
   * measured in that orientation. Front frames the width, side frames the
   * depth, so the bag was drawn at a different SCALE in each: turning it made
   * it grow and shrink. Under an orthographic camera there is no perspective
   * convergence to say "this is turning", so a scale change is the only signal
   * the eye gets — and it reads as zoom, not rotation. Frank: "it just kinda
   * looks like it is growing and collapsing."
   *
   * Orthographic stays. It is the honest projection for comparing a bag to a
   * box, and swapping to perspective would make near edges read as larger than
   * far ones in a drawing whose whole job is that they do not.
   *
   * So the frustum is sized ONCE, for the worst case across every preset, and
   * never touched again. Exact rather than a bounding sphere: we only ever show
   * four orientations, so rotate the local box into each and take the largest
   * extent any of them needs. Nothing clips, and nothing moves. */
  function fitCamera() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    renderer.setSize(width, height, false);

    const local = localBounds();
    const size = local.getSize(new THREE.Vector3());
    const focus = local.getCenter(new THREE.Vector3());

    /* The slide runs along Z and needs room wherever Z has a screen direction,
       which is every view except the dead-on front elevation. Folded into the
       shared frustum rather than applied per view, for the same reason as
       everything else here: a term that varies by view is a scale change. */
    const travel = (fitAnim?.travelCm ?? 0) * 0.6;
    const half = new THREE.Vector3(size.x, size.y, size.z + travel).multiplyScalar(0.5);

    let needW = 0;
    let needH = 0;
    for (const p of Object.values(PRESETS)) {
      /* Extent of the box after this rotation, per screen axis. */
      const cy = Math.abs(Math.cos(p.yaw));
      const sy = Math.abs(Math.sin(p.yaw));
      const cx = Math.abs(Math.cos(p.pitch));
      const sx = Math.abs(Math.sin(p.pitch));
      const w = half.x * cy + half.z * sy;
      const dAfterYaw = half.x * sy + half.z * cy;
      const h = half.y * cx + dAfterYaw * sx;
      needW = Math.max(needW, w);
      needH = Math.max(needH, h);
    }

    /* Headroom for the overlay furniture: the width leader sits above the bag
       and carries a label chip. */
    const pad = 1.16;
    const halfW = needW * pad;
    const halfH = needH * pad;

    const aspect = width / height;
    if (aspect >= halfW / halfH) {
      camera.top = halfH;
      camera.bottom = -halfH;
      camera.right = halfH * aspect;
      camera.left = -halfH * aspect;
    } else {
      camera.left = -halfW;
      camera.right = halfW;
      camera.top = halfW / aspect;
      camera.bottom = -halfW / aspect;
    }

    /* Far enough back that nothing clips at any angle, measured from the
       rotation-invariant diagonal. */
    const dist = half.length() * 4;
    camera.position.set(focus.x, focus.y, focus.z + dist);
    camera.lookAt(focus);
    camera.updateProjectionMatrix();
  }

  function applyView() {
    rig.rotation.order = 'YXZ';
    rig.rotation.y = yaw;
    rig.rotation.x = pitch;
  }

  function updateLimitsPanel() {
    const panel = root.querySelector('[data-limits-compare]');
    if (!panel) return;

    const fareSelect = root.querySelector('[data-fare-select]') as HTMLSelectElement | null;
    const fareLabel =
      fareSelect?.selectedOptions[0]?.textContent?.trim() ?? session.fare.replace(/_/g, ' ');

    const data = buildLimitsPanel({
      bagDims: session.dimensions,
      carrier,
      result,
      fareLabel,
    });

    const heading = panel.querySelector('[data-limits-heading]') as HTMLElement | null;
    const rowsEl = panel.querySelector('[data-limits-rows]') as HTMLElement | null;
    const linearRow = panel.querySelector('[data-limits-linear]') as HTMLElement | null;
    const linearBag = panel.querySelector('[data-linear-bag]') as HTMLElement | null;
    const linearLimit = panel.querySelector('[data-linear-limit]') as HTMLElement | null;
    const weightRow = panel.querySelector('[data-limits-weight]') as HTMLElement | null;
    const weightVal = panel.querySelector('[data-limits-weight-val]') as HTMLElement | null;
    const weightShared = panel.querySelector('[data-limits-weight-shared]') as HTMLElement | null;
    const note = panel.querySelector('[data-limits-note]') as HTMLElement | null;

    if (heading) heading.textContent = data.limitHeading;

    if (rowsEl) {
      if (data.mode === 'compare' || data.mode === 'linear') {
        rowsEl.innerHTML = data.rows
          .map((row) => {
            const limit =
              row.limitCm == null
                ? '—'
                : `<span data-cm="${row.limitCm}" data-cm-vs="${row.bagCm}">${fmtCm(row.limitCm)} cm</span>`;
            /* data-cm-vs names the figure this one is being READ AGAINST, so
               the refresh below can render the pair at a precision that keeps
               them apart. Without it a bag 0.2 cm over showed 21.7 in against
               21.7 in while the verdict underneath said "too long". */
            const bag =
              row.limitCm == null
                ? `<span data-cm="${row.bagCm}">${fmtCm(row.bagCm)} cm</span>`
                : `<span data-cm="${row.bagCm}" data-cm-vs="${row.limitCm}">${fmtCm(row.bagCm)} cm</span>`;
            const binding = row.binding ? ' bg-amber-wash text-amber' : '';
            return `<div class="grid grid-cols-[4.75rem_1fr_1fr] gap-x-2 px-3 py-2.5 text-[0.8125rem]${binding}">
              <span class="font-semibold text-muted">${row.label}</span>
              <span class="font-mono font-semibold text-ink">${bag}</span>
              <span class="font-mono font-semibold text-ink">${limit}</span>
            </div>`;
          })
          .join('');
      } else {
        rowsEl.innerHTML = `<div class="px-3 py-2.5 text-[0.8125rem] text-ink-2">
          <span class="font-mono font-semibold text-ink">
            <span data-cm="${session.dimensions.heightCm}">${fmtCm(session.dimensions.heightCm)}</span> ×
            <span data-cm="${session.dimensions.widthCm}">${fmtCm(session.dimensions.widthCm)}</span> ×
            <span data-cm="${session.dimensions.depthCm}">${fmtCm(session.dimensions.depthCm)}</span>
          </span>
          <span class="text-muted"> · your bag</span>
        </div>`;
      }
    }

    if (linearRow && linearBag && linearLimit) {
      if (data.mode === 'linear' && data.linearBagSum != null && data.linearMax != null) {
        linearRow.removeAttribute('hidden');
        linearBag.innerHTML = `<span data-cm="${data.linearBagSum}">${fmtCm(data.linearBagSum)} cm</span>`;
        linearLimit.innerHTML = `<span data-cm="${data.linearMax}">${fmtCm(data.linearMax)} cm max</span>`;
      } else {
        linearRow.setAttribute('hidden', '');
      }
    }

    if (weightRow && weightVal && weightShared) {
      if (data.weightLimitKg != null) {
        weightRow.removeAttribute('hidden');
        weightVal.innerHTML = `<span data-kg="${data.weightLimitKg}">${data.weightLimitKg} kg</span>`;
        if (data.weightShared) weightShared.removeAttribute('hidden');
        else weightShared.setAttribute('hidden', '');
      } else {
        weightRow.setAttribute('hidden', '');
      }
    }

    if (note) {
      if (data.note) {
        note.textContent = data.note;
        note.removeAttribute('hidden');
      } else {
        note.setAttribute('hidden', '');
      }
    }

    for (const el of panel.querySelectorAll('[data-cm]')) {
      const value = +(el as HTMLElement).dataset.cm!;
      const against = (el as HTMLElement).dataset.cmVs;
      const shown =
        against == null ? units.len(value) : units.lenPair(value, +against)[0];
      el.textContent = `${shown} ${units.lenLabel()}`;
    }
    for (const el of panel.querySelectorAll('[data-kg]')) {
      el.textContent = `${units.mass(+el.dataset.kg!)} ${units.massLabel()}`;
    }
  }

  /* THE ALERT MARK, USED ONLY WHERE THERE IS SOMETHING TO ALERT ABOUT.
   *
   * Lucide's triangle-alert, inline, on the 24 grid the rest of the interface
   * uses. It is NOT on the empty-state icon — that one stays grey. Two red
   * marks in one view is one too many, and the drawing's job there is to be
   * calm and legible while this line does the shouting.
   *
   * shrink-0 and mt-px because a flexed icon beside wrapping text otherwise
   * squashes and drifts off the first line's baseline. */
  const ALERT = `<svg class="mt-px h-4 w-4 shrink-0" viewBox="0 0 24 24" fill="none"
    stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"
    aria-hidden="true"><path d="m21.73 18-8-14a2 2 0 0 0-3.48 0l-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.73-3Z"/><path d="M12 9v4"/><path d="M12 17h.01"/></svg>`;

  /** Bad news for the traveller wears the alert; everything else does not. */
  function sayVerdict(text: string, alarming = false) {
    if (!verdictEl) return;
    verdictEl.classList.toggle('text-red', alarming);
    verdictEl.classList.toggle('text-ink', !alarming);
    verdictEl.classList.toggle('flex', true);
    verdictEl.classList.toggle('items-start', true);
    verdictEl.classList.toggle('gap-2', true);
    const escaped = text.replace(/&/g, '&amp;').replace(/</g, '&lt;');
    verdictEl.innerHTML = alarming ? `${ALERT}<span>${escaped}</span>` : `<span>${escaped}</span>`;
  }

  function updateVerdictCopy() {
    if (!verdictEl) return;
    if (result.not_flying) {
      /* Not alarming: a ceased airline is not a threat to the reader's bag,
         it is a fact about our data being out of date. */
      sayVerdict(`${session.carrierName} no longer operates — limits may not apply.`);
      return;
    }
    if (result.no_cabin_bag) {
      sayVerdict(
        `No cabin bag on ${session.carrierName} ${session.fare} — size does not matter.`,
        true
      );
      return;
    }
    if (result.unknown) {
      /* Our gap, not their problem. Alarming the reader about what we have not
         done spends attention we will want later for something real. */
      sayVerdict(`We have not researched ${session.carrierName} ${session.fare} yet.`);
      return;
    }
    if (result.basis === 'linear') {
      sayVerdict(`${session.carrierName} also limits total dimensions — see the comparison above.`);
      return;
    }
    if (result.delta_cm > 0) {
      sayVerdict(
        `${units.lenText(Math.abs(result.delta_cm))} too ${result.dimension} on ${session.carrierName} ${session.fare}.`,
        true
      );
      return;
    }
    sayVerdict(
      `Fits ${session.carrierName} ${session.fare} with ${units.lenText(Math.abs(result.delta_cm))} to spare.`
    );
  }

  function updateOverlay() {
    const lines = overlay.querySelector('[data-measure-lines]') as SVGGElement;
    const labels = root.querySelector('[data-measure-labels]') as HTMLElement;
    if (!lines || !labels) return;

    const projected = projectMeasurements(session.dimensions, camera, width, height, bagRig, measureBox);
    /* THE VERDICT COLOURS THE WHOLE DRAWING, not only the failures.
     *
     * The band tint used to appear ONLY when a bag was over — everything else
     * drew in ink, so "Fits" and "Tight" looked identical to "we have not
     * answered". /check has carried the full five-step language for months:
     * green clears, lime tight, amber probably fine, orange risky, red over.
     * A reader moving between the two pages was being shown two different
     * systems for the same fact.
     *
     * A verdict is worth stating in its own colour when it is GOOD, too — and
     * `line` (Tight) is exactly the case that needs its own: legal, inside the
     * limit, with no margin at all. */
    const hex = (n: number) => `#${n.toString(16).padStart(6, '0')}`;
    const bandColor = sizeVerdict(result) === null ? null : hex(bandHex(result.band));
    const bindingHex = bandColor;

    lines.innerHTML = projected
      .map((m) => {
        const isBinding = bindingAxis != null && m.axis === bindingAxis;
        const opacity = isBinding ? 1 : m.occluded ? 0.35 : 0.75;
        /* The binding axis is the loud one; the other two carry the same
           verdict quietly. An unanswerable leg stays in ink — grey is not a
           mild version of a verdict, it is the absence of one. */
        const stroke = isBinding ? bindingHex : (bandColor ?? 'currentColor');
        const sw = isBinding ? 2.25 : 1;
        return `<g data-axis="${m.axis}" opacity="${opacity}">
          <line x1="${m.ext1.x1}" y1="${m.ext1.y1}" x2="${m.ext1.x2}" y2="${m.ext1.y2}" stroke="${stroke}" stroke-width="${sw}"/>
          <line x1="${m.ext2.x1}" y1="${m.ext2.y1}" x2="${m.ext2.x2}" y2="${m.ext2.y2}" stroke="${stroke}" stroke-width="${sw}"/>
          <line x1="${m.line.x1}" y1="${m.line.y1}" x2="${m.line.x2}" y2="${m.line.y2}" stroke="${stroke}" stroke-width="${sw}" marker-start="url(#viz-arrow)" marker-end="url(#viz-arrow)"/>
        </g>`;
      })
      .join('');

    for (const m of projected) {
      const chip = labels.querySelector(`[data-axis-label="${m.axis}"]`) as HTMLElement | null;
      if (chip) {
        /* CLAMPED TO THE STAGE. The chips are positioned from a projected point
           and translated -50%/-50%, so a leader near an edge put half a label
           outside the box — which is what clipped "WIDTH" off the top, since
           the width guide sits above the bag by design. Nudging the label in is
           the right trade: the leader line still lands on the true point, and a
           label you can read beats a label in the exactly correct place. */
        const half = { w: chip.offsetWidth / 2, h: chip.offsetHeight / 2 };
        const m8 = 6;
        const cx = Math.min(Math.max(m.label.x, half.w + m8), width - half.w - m8);
        const cy = Math.min(Math.max(m.label.y, half.h + m8), height - half.h - m8);
        chip.style.left = `${cx}px`;
        chip.style.top = `${cy}px`;
        /* THE CHIP CARRIES THE VERDICT, ACROSS ALL FIVE BANDS.
         *
         * This was hard-coded red and gated on overflowCm > 0, so the axis
         * label had exactly two states: ink, or red. A bag that was TIGHT on
         * its depth — legal, inside the published limit, no margin — got the
         * same red as a bag 5 cm over, and a bag that cleared comfortably got
         * no colour at all. The one number a reader looks at hardest was the
         * one place the ladder did not reach.
         *
         * The BINDING axis is the one the verdict is about, so it is the one
         * that gets tinted; the other two stay quiet rather than painting the
         * whole overlay. Binding is now "the axis that decides", not "the axis
         * that failed" — a bag can be decided by an axis it passes on. */
        const isBinding = bindingAxis != null && m.axis === bindingAxis;
        chip.classList.remove(...ALL_BAND_CHIP_CLASSES);
        if (isBinding && result.band) chip.classList.add(...BAND_CHIP[result.band]);
      }
    }
  }

  function setView(name: ViewPreset) {
    activePreset = name;
    turnFrom = { yaw, pitch };
    turnTo = { yaw: PRESETS[name].yaw, pitch: PRESETS[name].pitch };
    /* No arc on the very first paint — the opening view should already be
       there, not swing into place while the reader is still reading the badge. */
    turnStart = performance.now() - (turnStart === 0 ? TURN_MS : 0);
    targetYaw = turnTo.yaw;
    targetPitch = turnTo.pitch;
    /* No button is pressed in the opening view, because none of them describes
       it — claiming "Front" while showing a three-quarter angle would make the
       control lie about what you are looking at. */
    for (const btn of root.querySelectorAll('[data-view]')) {
      (btn as HTMLButtonElement).setAttribute('aria-pressed', String(btn.getAttribute('data-view') === name));
    }
    if (statusEl && name !== 'default') {
      statusEl.textContent = `${name.charAt(0).toUpperCase()}${name.slice(1)} view`;
    }
    scheduleRender();
  }

  function scheduleRender() {
    if (renderId || disposed) return;
    renderId = requestAnimationFrame(render);
  }

  function render() {
    renderId = 0;
    if (disposed) return;

    if (stage.clientWidth === 0 || stage.clientHeight === 0) {
      if (visible) scheduleRender();
      return;
    }

    if (renderer.domElement.width === 0 || renderer.domElement.height === 0) {
      fitCamera();
    }

    if (visible && fitAnim && !reducedMotion) {
      const { seated } = fitAnim.update(bagRig, performance.now() - animStart);
      /* THE FRAME REDDENS WHEN THE BAG IS IN IT.
       *
       * A gate sizer answers on arrival, not during the approach — it is a
       * slot, not a continuous gauge. Colouring the frame while the bag is
       * still travelling would be pre-judging, and the drawing would state its
       * claim before the measurement it rests on had been taken.
       *
       * Green when it fits, red when it does not, and NOTHING when the engine
       * declined to answer — a frame that went green because nobody checked
       * would be the worst thing on this page. */
      if (alarmMaterial) {
        alarmMaterial.color.copy(FRAME_BASE).lerp(FRAME_ALARM, seated * alarmStrength);
      }
    }

    const elapsed = performance.now() - turnStart;
    const viewMoving = elapsed < TURN_MS;

    if (viewMoving) {
      const t = elapsed / TURN_MS;
      const e = t < 0.5 ? 4 * t * t * t : 1 - (-2 * t + 2) ** 3 / 2;
      yaw = turnFrom.yaw + (turnTo.yaw - turnFrom.yaw) * e;

      /* THE ARC IS WHAT MAKES IT READ AS A SOLID.
       *
       * front and side are both flat elevations at pitch 0. Interpolating
       * straight between them keeps the model edge-on the whole way, and under
       * an ORTHOGRAPHIC camera — which has no perspective convergence to give
       * depth away — an edge-on box turning looks like a rectangle changing
       * width. Nothing tells the eye there is a third dimension.
       *
       * So the path lifts through a three-quarter view and comes back down:
       * for the length of the move the reader sees the TOP face, which is the
       * one cue orthographic still gives you. It lands exactly on the target,
       * because the bump is a sine that is zero at both ends. */
      const arc = Math.sin(t * Math.PI) * 0.26;
      pitch = turnFrom.pitch + (turnTo.pitch - turnFrom.pitch) * e + arc;
      applyView();
      settled = false;
    } else if (!settled) {
      settled = true;
      yaw = targetYaw;
      pitch = targetPitch;
      applyView();
    }

    if (!visible) return;

    renderer.render(scene, camera);
    updateOverlay();

    scheduleRender();
  }

  function onKeyDown(e: KeyboardEvent) {
    if (e.key === '1') setView('front');
    else if (e.key === '2') setView('side');
    else if (e.key === '3') setView('top');
  }

  const focusTarget = root.querySelector('[data-viz-focus]') as HTMLElement;
  focusTarget?.addEventListener('keydown', onKeyDown);

  for (const btn of root.querySelectorAll('[data-view]')) {
    btn.addEventListener('click', () => setView(btn.getAttribute('data-view') as ViewPreset));
  }

  const outlineBtn = root.querySelector('[data-outline-toggle]') as HTMLButtonElement | null;
  outlineBtn?.setAttribute('aria-pressed', 'false');
  const onOutlineToggle = () => {
    const on = !bagScene.envelope.visible;
    bagScene.envelope.visible = on;
    outlineBtn?.setAttribute('aria-pressed', String(on));
    scheduleRender();
  };
  outlineBtn?.addEventListener('click', onOutlineToggle);

  const ro = new ResizeObserver(() => {
    fitCamera();
    scheduleRender();
  });
  ro.observe(stage);

  const io = new IntersectionObserver(
    (entries) => {
      const wasVisible = visible;
      visible = entries[0]?.isIntersecting ?? false;
      if (visible && !wasVisible && fitAnim) animStart = performance.now();
      if (visible) scheduleRender();
    },
    { rootMargin: '200px' }
  );
  /* OBSERVE THE STAGE, NOT THE ROOT.
   *
   * The root is `display: contents` now, so the picker could sit in one column
   * and the canvas in another. An element with `display: contents` GENERATES NO
   * BOX: it has no layout, its bounding rect is 0 x 0 at the origin, and an
   * IntersectionObserver watching it reports isIntersecting: false forever.
   *
   * `visible` therefore latched false, and render() returns before both
   * renderer.render() and scheduleRender() — so the loop drew one frame and
   * stopped. The view buttons still fired, still set their targets, still
   * updated aria-pressed; the rig simply never got another frame to turn in.
   * A control that is perfectly wired and does nothing.
   *
   * The stage is the thing whose visibility we actually care about, it has a
   * real box, and ResizeObserver above already watches it. */
  io.observe(stage);

  fitCamera();
  applyView();
  updateLimitsPanel();
  updateVerdictCopy();
  /* No drawing, no caption describing one. The stated finding IS the content
     now, and a legend for an absent picture is furniture. */
  const caption = root.querySelector('[data-stage-caption]') as HTMLElement | null;
  caption?.toggleAttribute('hidden', !canDrawSizer);
  /* SET, NEVER ACCUMULATE — the same rule as the stage reset above. Both of
     these were written once and never cleared, so an over-limit fare left the
     overlay pinned open and `data-binding-axis` on the root for whatever fare
     the reader picked next. */
  const overlayWrap = root.querySelector('[data-measure-overlay-wrap]') as HTMLElement | null;
  if (bindingAxis && overflowCm > 0) {
    root.dataset.bindingAxis = bindingAxis;
    if (overlayWrap) overlayWrap.style.opacity = '1';
  } else {
    delete root.dataset.bindingAxis;
    /* Back to the stylesheet's hover behaviour rather than a pinned value. */
    overlayWrap?.style.removeProperty('opacity');
  }
  /* THE BADGE, ABOVE THE DRAWING IT LABELS.
   *
   * resultLabel() is the same function the shelf and the check page use, so
   * the four cases that are NOT a band — Ceased, No cabin bag, Unknown, No
   * answer — come out worded identically here. A second copy of that ladder
   * would be a second chance to disagree with itself.
   *
   * `no_cabin_bag` and `unknown` deliberately do not borrow a band colour.
   * "This fare includes no cabin bag at any size" is a finding about the FARE,
   * not a measurement of the bag, and "we have not researched this" is not a
   * mild version of anything. Both wear the neutral chip. */
  const badge = root.querySelector('[data-viz-badge-chip]') as HTMLElement | null;
  const badgeNote = root.querySelector('[data-viz-badge-note]') as HTMLElement | null;
  if (badge) {
    badge.textContent = resultLabel(result);
    badge.classList.remove(...ALL_BAND_CHIP_CLASSES);
    /* RED FOR A FINDING THAT COSTS THE TRAVELLER; GREY FOR OUR OWN IGNORANCE.
     *
     * I first made no_cabin_bag neutral to stop red meaning two things — the
     * ladder's red is "your bag is too big", and this is not that. But calm
     * grey is wrong for the worst news the site delivers: your fare includes
     * nothing to put in the locker, and you will be paying at the gate.
     *
     * The resolution is a division of labour. THE COLOUR carries urgency; THE
     * WORDS carry the claim. "No cabin bag" cannot be misread as a size
     * verdict, so red is free to do the one job colour is good at.
     *
     * `unknown` and `not_flying` stay grey, and that line is the principle: we
     * do not raise an alarm about our own gap. Painting "nobody has researched
     * this airline" red would be crying wolf with the reader's attention, and
     * spend the credibility that makes the real red worth heeding. */
    if (result.no_cabin_bag) badge.classList.add(...BAND_CHIP.wont);
    else if (result.unknown || result.not_flying)
      badge.classList.add('border-rule', 'bg-surface-2', 'text-ink-2');
    else if (result.band) badge.classList.add(...BAND_CHIP[result.band]);
    else badge.classList.add('border-rule', 'bg-surface-2', 'text-ink-2');
  }
  if (badgeNote) {
    badgeNote.textContent = `${session.carrierName} · ${
      root.querySelector('[data-fare-select]')?.selectedOptions?.[0]?.textContent?.trim() ??
      session.fare.replace(/_/g, ' ')
    }`;
  }

  /* THE APPARATUS IS PUT AWAY WHEN IT HAS NOTHING TO SAY.
   *
   * canDrawSizer is already false for all three: a fare granting no cabin bag,
   * an unresearched carrier, and a carrier publishing only a linear sum. What
   * was still rendering was the BAG — alone, rotatable, dimension-labelled, in
   * a frame built to answer a question this fare does not ask. A reader sees a
   * suitcase being measured and concludes we measured it.
   *
   * The finding is worth more than the picture here, and it is the finding a
   * competitor cannot state at all. */
  /* RESET FIRST, THEN APPLY. Every mount puts the stage into a KNOWN state
   * rather than only into the state it needs.
   *
   * The bug: the no-compare branch below hides the canvas, the view controls
   * and the measurement overlay, and shows the finding panel. Nothing put them
   * back. So picking Air France Basic (no cabin bag) and then switching the
   * fare to Economy remounted with canDrawSizer true, skipped the branch
   * entirely, and inherited the previous fare's DOM: the badge said "Fits" over
   * a panel still reading "Air France includes no cabin bag on this fare".
   *
   * A one-way mutation is only safe while there is one way through. There are
   * two, and a fare picker means either can follow either. Setting the state
   * unconditionally is idempotent and cannot drift; an `else` branch would have
   * worked today and rotted the next time a third case appeared. */
  const stageParts = {
    panel: root.querySelector('[data-no-compare]') as HTMLElement | null,
    controls: root.querySelector('[data-view-controls]') as HTMLElement | null,
    overlay: root.querySelector('[data-measure-overlay-wrap]') as HTMLElement | null,
  };
  stageParts.panel?.setAttribute('hidden', '');
  stageParts.controls?.removeAttribute('hidden');
  stageParts.overlay?.removeAttribute('hidden');
  canvas.style.removeProperty('display');
  for (const el of root.querySelectorAll('[data-icon]')) el.setAttribute('hidden', '');

  if (!canDrawSizer) {
    const panel = root.querySelector('[data-no-compare]') as HTMLElement | null;
    const title = root.querySelector('[data-no-compare-title]') as HTMLElement | null;
    const body = root.querySelector('[data-no-compare-body]') as HTMLElement | null;
    const note = root.querySelector('[data-no-compare-note]') as HTMLElement | null;
    /* Exactly one icon, chosen by the same branch that chooses the words, so
       the picture and the sentence cannot drift apart. */
    const showIcon = (which: 'no_cabin_bag' | 'linear' | 'unknown') => {
      for (const el of root.querySelectorAll('[data-icon]')) {
        el.toggleAttribute('hidden', el.getAttribute('data-icon') !== which);
      }
    };
    if (panel && title && body) {
      if (result.no_cabin_bag) {
        showIcon('no_cabin_bag');
        title.textContent = `${session.carrierName} includes no cabin bag on this fare.`;
        body.textContent =
          'Not "too big" — nothing is allowed in the overhead locker at any size, so your ' +
          'bag\u2019s dimensions do not come into it. A handbag gets the same answer.';
        if (note) {
          note.textContent = carrier.allowances?.personal?.max_cm
            ? `You do get an under-seat personal item: ${carrier.allowances.personal.max_cm.join(' \u00d7 ')} cm.`
            : '';
        }
      } else if (result.basis === 'linear' || carrier.allowance?.linear_max_cm) {
        showIcon('linear');
        title.textContent = `${session.carrierName} publishes a total, not a box.`;
        body.textContent =
          'Their rule is the three sides added together, so there is no frame to draw. ' +
          'The comparison beside this says whether your bag is under it.';
        if (note) note.textContent = '';
      } else {
        showIcon('unknown');
        title.textContent = `We have not researched ${session.carrierName} ${session.fare} yet.`;
        body.textContent =
          'Rather than draw a limit we cannot cite, we are saying so. Nothing here is a ' +
          'measurement of your bag against this airline.';
        if (note) note.textContent = '';
      }
      panel.removeAttribute('hidden');
    }
    /* Nothing to rotate through, so the view controls would be furniture. */
    root.querySelector('[data-view-controls]')?.setAttribute('hidden', '');
    canvas.style.display = 'none';
    root.querySelector('[data-measure-overlay-wrap]')?.setAttribute('hidden', '');
  }

  setView('default');
  canvas.style.opacity = '1';
  root.dataset.ready = 'true';
  if (fitAnim) animStart = performance.now();
  scheduleRender();

  return () => {
    disposed = true;
    ro.disconnect();
    io.disconnect();
    focusTarget?.removeEventListener('keydown', onKeyDown);
    outlineBtn?.removeEventListener('click', onOutlineToggle);
    cancelAnimationFrame(renderId);
    bagScene.dispose();
    materials.dispose();
    sizer?.traverse((obj) => {
      if (obj instanceof THREE.Mesh) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
    });
    bindingMarkers?.traverse((obj) => {
      if (obj instanceof THREE.Line) {
        obj.geometry.dispose();
        if (obj.material instanceof THREE.Material) obj.material.dispose();
      }
    });
    renderer.dispose();
  };
}

export async function mountFitVisualizer(root: HTMLElement, session: FitSession) {
  try {
    const canvas = root.querySelector('canvas') as HTMLCanvasElement;
    const overlay = root.querySelector('[data-measure-overlay]') as SVGSVGElement;
    if (!canvas || !overlay) return null;

    const test = document.createElement('canvas');
    const gl = test.getContext('webgl2') ?? test.getContext('webgl');
    if (!gl) {
      root.dataset.fallback = 'no-webgl';
      return null;
    }

    return initFitVisualizer({ root, canvas, overlay, session });
  } catch (err) {
    if (import.meta.env.DEV) console.warn('Fit visualizer failed', err);
    root.dataset.fallback = 'error';
    return null;
  }
}
