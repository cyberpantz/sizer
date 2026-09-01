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
import { ALL_BAND_CHIP_CLASSES, BAND_CHIP, fitsWithinLimit } from '../../ui/verdict.mjs';
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

const PRESETS: Record<Exclude<ViewPreset, 'default'>, { yaw: number; pitch: number }> = {
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
  let activePreset: Exclude<ViewPreset, 'default'> = 'front';
  let targetYaw = PRESETS.front.yaw;
  let targetPitch = PRESETS.front.pitch;
  let yaw = targetYaw;
  let pitch = targetPitch;

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
    fits: fitsWithinLimit(result.band),
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
  (bagScene.envelope.material as THREE.LineBasicMaterial).color.setHex(bandHex(result.band));
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
    });
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

  function fitCamera() {
    width = stage.clientWidth;
    height = stage.clientHeight;
    renderer.setSize(width, height, false);

    content.updateMatrixWorld(true);
    /* AIM AT WHAT IS ACTUALLY THERE, rather than trusting that it was moved to
       the origin. content.position centres the model in its OWN frame, but the
       box measured here is a world box: it changes as the rig rotates, and any
       asymmetry — a sizer deck, a binding marker, the invisible envelope before
       visibleBox() excluded it — leaves the drawn centre somewhere other than
       (0, 0, 0), while the frustum stays symmetric about it. That is a residual
       vertical drift you cannot fix by padding. Centre the camera on the box. */
    const bounds = visibleBox(content);
    const size = bounds.getSize(new THREE.Vector3());
    const focus = bounds.getCenter(new THREE.Vector3());

    /* THE SLIDE ALLOWANCE IS ONLY NEEDED WHERE THE SLIDE IS VISIBLE.
     *
     * The bag travels along Z. Under an ORTHOGRAPHIC camera looking down -Z,
     * motion along Z changes nothing on screen at all — so in the front view
     * this allowance bought nothing, and cost a great deal: it widened halfW,
     * which flipped the aspect branch below, which sized the frustum off
     * halfW / aspect and made it ~35% taller than the model needed. That is
     * the dead band under the bag. The allowance is real in side and top,
     * where Z maps to screen X.
     *
     * Sized per view, so fitCamera() now has to run when the view changes. */
    const travel = activePreset === 'front' ? 0 : (fitAnim?.travelCm ?? 0);
    /* Headroom for the overlay furniture. The width leader sits 8% of the
       height ABOVE the bag and carries a label chip, so a pad that only
       cleared the geometry clipped it off the top of the stage. */
    const pad = 1.16;
    const halfW = Math.max(size.x, size.z) * 0.5 * pad + travel * 0.25;
    const halfH = Math.max(size.y, size.z) * 0.5 * pad;

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

    const dist = Math.max(size.x, size.y, size.z) * 2.4;
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
            <span data-cm="${session.dimensions.depthCm}">${fmtCm(session.dimensions.depthCm)}</span> cm
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

  function updateVerdictCopy() {
    if (!verdictEl) return;
    if (result.not_flying) {
      verdictEl.textContent = `${session.carrierName} no longer operates — limits may not apply.`;
      return;
    }
    if (result.no_cabin_bag) {
      verdictEl.textContent = `No cabin bag on ${session.carrierName} ${session.fare} — size does not matter.`;
      return;
    }
    if (result.unknown) {
      verdictEl.textContent = `We have not researched ${session.carrierName} ${session.fare} yet.`;
      return;
    }
    if (result.basis === 'linear') {
      verdictEl.textContent = `${session.carrierName} also limits total dimensions — see the comparison above.`;
      return;
    }
    if (result.delta_cm > 0) {
      verdictEl.textContent = `${units.len(Math.abs(result.delta_cm))} ${units.lenLabel()} too ${result.dimension} on ${session.carrierName} ${session.fare}.`;
      return;
    }
    verdictEl.textContent = `Fits ${session.carrierName} ${session.fare} with ${units.len(Math.abs(result.delta_cm))} ${units.lenLabel()} to spare.`;
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
    const bandColor = result.band ? hex(bandHex(result.band)) : null;
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
    const preset = name === 'default' ? 'front' : name;
    activePreset = preset;
    fitCamera();
    targetYaw = PRESETS[preset].yaw;
    targetPitch = PRESETS[preset].pitch;
    for (const btn of root.querySelectorAll('[data-view]')) {
      (btn as HTMLButtonElement).setAttribute('aria-pressed', String(btn.getAttribute('data-view') === preset));
    }
    if (statusEl) statusEl.textContent = `${preset.charAt(0).toUpperCase()}${preset.slice(1)} view`;
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

    if (visible && fitAnim) {
      fitAnim.update(bagRig, performance.now() - animStart);
    }

    const viewMoving =
      Math.abs(yaw - targetYaw) > 0.001 || Math.abs(pitch - targetPitch) > 0.001;

    if (viewMoving) {
      yaw += (targetYaw - yaw) * 0.2;
      pitch += (targetPitch - pitch) * 0.2;
      applyView();
      settled = false;
    } else if (!settled) {
      /* fitCamera() measures a WORLD box, and setView() calls it before the rig
         has actually turned — so the framing it computes belongs to the OLD
         orientation. Re-fit once, on the frame the rotation comes to rest, or
         side and top stay framed for the front view. */
      settled = true;
      fitCamera();
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
  const caption = root.querySelector('[data-stage-caption]') as HTMLElement | null;
  if (caption && !canDrawSizer) {
    caption.innerHTML =
      '<strong class="text-ink">Blue tint</strong> — your bag. No gate sizer applies for this fare.';
  }
  if (bindingAxis && overflowCm > 0) {
    root.dataset.bindingAxis = bindingAxis;
    const overlayWrap = root.querySelector('[data-measure-overlay-wrap]') as HTMLElement | null;
    if (overlayWrap) overlayWrap.style.opacity = '1';
  }
  setView('front');
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
