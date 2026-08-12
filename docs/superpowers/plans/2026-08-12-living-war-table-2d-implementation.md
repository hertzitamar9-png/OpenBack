# Living War Table 2D Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace OpenBack's complete 2D battlefield presentation with the approved Living War Table terrain, miniatures, effects, and HUD while leaving gameplay unchanged and repairing only Antarctica's missing 3D southern closure.

**Architecture:** Extend the existing WebGL renderer and Lit HUD through focused rendering-only modules. Canonical frame data remains authoritative; the new modules derive stable visual state and never write to simulation. The 3D repair is a separate terrain-boundary mesh contract with no dependency on the 2D style system.

**Tech Stack:** TypeScript 6, WebGL2/GLSL ES 3.00, Lit 3, Tailwind CSS 4, Sharp atlas generation, Vitest 4, Vite 8.

## Global Constraints

- The Living War Table redesign applies only to 2D mode.
- The only permitted 3D change is Antarctica's filled southern top surface and terrain-matched edge/underside closure.
- Do not change simulation, economy, prices, damage, ranges, timings, AI, matchmaking, map masks, spawn rules, navigation, controls, or deterministic multiplayer state.
- Existing frame data and simulation events remain the only renderer inputs.
- Existing 2D bomb placement and in-flight target behavior remains unchanged.
- Territory color remains the primary ownership signal.
- Required AGPL source availability, copyright, asset notices, contributor attribution, and OpenFront attribution remain accurate.
- Every shipped user-facing phase updates the top of `resources/changelog.md`, uses the next OpenBack version, describes player-visible behavior, and credits **frootz jhklphy**.
- Work only on `main`; never stage `.codex-remote-attachments/`.

## File structure

### New rendering files

- `src/client/render/gl/war-table/WarTableStyle.ts` — typed visual constants, zoom LOD, motion, and quality contracts.
- `src/client/render/gl/war-table/WarTableTerrain.ts` — terrain material classification and stable relief parameters.
- `src/client/render/gl/war-table/WarTableMiniatureRegistry.ts` — exhaustive unit/structure atlas registry and fallback rules.
- `src/client/render/gl/war-table/WarTableAnimationState.ts` — rendering-only build, reload, movement, and destruction animation timing.
- `src/client/render/gl/war-table/WarTableQuality.ts` — sustained-load quality tiers with hysteresis and mobile caps.
- `src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl` — terrain materials, coastline depth, stable world-space detail, and water.
- `src/client/render/gl/shaders/structure/war-table-structure.vert.glsl` — miniature scale, grounding, build assembly, and stable LOD.
- `src/client/render/gl/shaders/structure/war-table-structure.frag.glsl` — silhouette, material, and owner-color composition.
- `src/client/render/gl/shaders/unit/war-table-unit.vert.glsl` — heading-aware miniature placement and movement state.
- `src/client/render/gl/shaders/unit/war-table-unit.frag.glsl` — miniature material and owner-color composition.
- `src/client/render/gl/shaders/fx/war-table-particle.vert.glsl` — bounded pooled tabletop particles.
- `src/client/render/gl/shaders/fx/war-table-particle.frag.glsl` — smoke, fire, dust, spray, and debris materials.
- `src/client/hud/war-table/WarTableHud.ts` — shared HUD class and state tokens.
- `src/client/hud/war-table/war-table-hud.css` — responsive command-console styling.
- `scripts/generate-war-table-atlases.mjs` — reproducible atlas generator from source SVG/PNG assets.

### New generated/source assets

- `resources/atlases/war-table-structures.png` — City, Port, Factory, Defense Post, SAM, Missile Silo, Runway, MANPAD, Military Base, and Tank Mine cells.
- `resources/atlases/war-table-units.png` — Transport, Trade Ship, Warship, bombs, SAM missile, shell, train variants, Aircraft, and Tank cells.
- `resources/sprites/war-table/structures/*.svg` — top-down structure miniature sources.
- `resources/sprites/war-table/units/*.svg` — top-down mobile miniature sources.

### Modified integration files

- `src/client/render/gl/Renderer.ts` — instantiate and update only the new 2D presentation contracts.
- `src/client/render/gl/passes/TerrainPass.ts` — bind war-table terrain inputs and time/zoom uniforms.
- `src/client/render/gl/passes/StructurePass.ts` — use exhaustive miniature registry and construction state.
- `src/client/render/gl/passes/UnitPass.ts` — use heading-aware miniature registry and movement/reload state.
- `src/client/render/gl/passes/fx-pass/FxSpritePass.ts` — pooled tabletop effects and per-type destruction behavior.
- `src/client/render/gl/passes/fx-pass/index.ts` — route canonical events into effect families.
- `src/client/render/gl/passes/ThreeDCompositePass.ts` — draw only the new southern closure mesh.
- `src/client/render/gl/three-d/ThreeDTerrainMesh.ts` — generate land-mask-following southern closure geometry.
- `src/client/hud/layers/BuildMenu.ts` — command-console build menu.
- `src/client/hud/layers/ControlPanel.ts` — unified resources and troop controls.
- `src/client/hud/layers/Leaderboard.ts` — compact command-table leaderboard presentation.
- `src/client/hud/layers/UnitDisplay.ts` — matching unit strip, counts, states, and mobile wrapping.
- `src/client/styles.css` — import shared HUD styling and expose approved font tokens.
- `resources/changelog.md` — next OpenBack release notes.

---

### Task 1: Lock the Living War Table contracts and exhaustive coverage

**Files:**

- Create: `src/client/render/gl/war-table/WarTableStyle.ts`
- Create: `src/client/render/gl/war-table/WarTableMiniatureRegistry.ts`
- Test: `tests/client/render/WarTableStyle.test.ts`
- Test: `tests/client/render/WarTableMiniatureRegistry.test.ts`

**Interfaces:**

- Produces: `warTableLod(zoom: number): WarTableLod`
- Produces: `warTableMotion(reducedMotion: boolean): WarTableMotion`
- Produces: `miniatureForUnit(type: UnitTypeName): WarTableMiniature`
- Produces: `miniatureForStructure(type: UnitTypeName): WarTableMiniature`
- Consumes: canonical unit constants from `src/client/render/types`.

- [ ] **Step 1: Write failing style-contract tests**

```ts
import { describe, expect, it } from "vitest";
import {
  warTableLod,
  warTableMotion,
} from "../../../src/client/render/gl/war-table/WarTableStyle";

describe("WarTableStyle", () => {
  it("uses stable ordered LOD thresholds", () => {
    expect(warTableLod(0.25).detail).toBe("silhouette");
    expect(warTableLod(0.75).detail).toBe("material");
    expect(warTableLod(1.5).detail).toBe("mechanical");
  });

  it("keeps tactical warnings while reducing decorative motion", () => {
    expect(warTableMotion(true)).toEqual({
      decorativeScale: 0,
      warningScale: 1,
    });
  });
});
```

- [ ] **Step 2: Run the test and verify the missing-module failure**

Run: `npx vitest run tests/client/render/WarTableStyle.test.ts`

Expected: FAIL because `WarTableStyle` does not exist.

- [ ] **Step 3: Implement typed visual contracts**

```ts
export type WarTableDetail = "silhouette" | "material" | "mechanical";
export interface WarTableLod {
  detail: WarTableDetail;
  detailScale: number;
}
export interface WarTableMotion {
  decorativeScale: number;
  warningScale: 1;
}

export function warTableLod(zoom: number): WarTableLod {
  if (zoom < 0.5) return { detail: "silhouette", detailScale: 0 };
  if (zoom < 1.1) return { detail: "material", detailScale: 0.55 };
  return { detail: "mechanical", detailScale: 1 };
}

export const warTableMotion = (reducedMotion: boolean): WarTableMotion => ({
  decorativeScale: reducedMotion ? 0 : 1,
  warningScale: 1,
});
```

- [ ] **Step 4: Write exhaustive registry tests**

Build one array from every `UT_*` type rendered by `StructurePass` and `UnitPass`, then assert every entry resolves to a nonempty atlas cell, owner mask, silhouette scale, ground offset, and family. Assert an unknown test value returns the explicit fallback rather than `undefined`.

```ts
for (const type of [...STRUCTURE_TYPES, ...MOBILE_TYPES]) {
  const miniature = miniatureFor(type);
  expect(miniature.atlasColumn).toBeGreaterThanOrEqual(0);
  expect(miniature.ownerMask).toMatch(/^(none|panel|body|trim)$/);
  expect(miniature.scale).toBeGreaterThan(0);
}
expect(miniatureFor("Unknown" as UnitTypeName).id).toBe("fallback");
```

- [ ] **Step 5: Implement the registry and pass focused tests**

Define `WarTableMiniature` with `id`, `family`, `atlasColumn`, `ownerMask`, `scale`, `groundOffset`, `headingAware`, `buildStyle`, `reloadStyle`, and `destroyStyle`. Export the canonical structure and mobile arrays so atlas generation and tests share one order.

Run: `npx vitest run tests/client/render/WarTableStyle.test.ts tests/client/render/WarTableMiniatureRegistry.test.ts`

Expected: PASS.

- [ ] **Step 6: Commit the contracts**

```powershell
git add src/client/render/gl/war-table tests/client/render/WarTableStyle.test.ts tests/client/render/WarTableMiniatureRegistry.test.ts
git commit -m "Add Living War Table visual contracts"
```

### Task 2: Build reproducible miniature source art and atlases

**Files:**

- Create: `resources/sprites/war-table/structures/*.svg`
- Create: `resources/sprites/war-table/units/*.svg`
- Create: `scripts/generate-war-table-atlases.mjs`
- Create: `resources/atlases/war-table-structures.png`
- Create: `resources/atlases/war-table-units.png`
- Test: `tests/client/render/WarTableAtlas.test.ts`

**Interfaces:**

- Consumes: `WAR_TABLE_STRUCTURE_ORDER` and `WAR_TABLE_UNIT_ORDER` from Task 1.
- Produces: two single-row RGBA atlases with 96×96 cells and a three-band material convention: silhouette, material, owner mask.

- [ ] **Step 1: Write failing atlas dimension and alpha tests**

Use Sharp metadata and raw pixel data. Assert exact atlas width, 96-pixel height, a nonempty alpha bounding box in every cell, and transparent four-pixel gutters between cells.

```ts
const meta = await sharp(
  "resources/atlases/war-table-structures.png",
).metadata();
expect(meta.height).toBe(96);
expect(meta.width).toBe(WAR_TABLE_STRUCTURE_ORDER.length * 96);
```

- [ ] **Step 2: Run the atlas test and verify it fails**

Run: `npx vitest run tests/client/render/WarTableAtlas.test.ts`

Expected: FAIL because the atlases do not exist.

- [ ] **Step 3: Create the complete top-down source set**

Create one source SVG per registry entry using the same 96×96 view box. Each must include:

```svg
<g id="shadow" fill="#111820">...</g>
<g id="material" fill="#82909a">...</g>
<g id="owner" fill="#b48246">...</g>
<g id="outline" fill="none" stroke="#081017" stroke-width="4">...</g>
```

Use strong, distinct top-down silhouettes: radial blocks for cities, dock-and-water cutout for ports, twin stacks for factories, shield geometry for defense posts, long deck for runways, tracked body and turret for tanks, swept wings for aircraft, hull/bow shapes for ships, and engine/car separation for trains.

- [ ] **Step 4: Implement deterministic atlas generation**

The generator imports the registry order, rasterizes each SVG with Sharp at density 384, trims it, fits it inside 84×84, centers it into a 96×96 transparent cell, and joins cells without rewriting source files. It writes both atlases and fails on missing or empty source art.

- [ ] **Step 5: Generate and verify both atlases**

Run: `node scripts/generate-war-table-atlases.mjs`

Run: `npx vitest run tests/client/render/WarTableAtlas.test.ts`

Expected: PASS with every cell nonempty and correctly ordered.

- [ ] **Step 6: Visually inspect atlas sheets**

Open both PNG files at original resolution. Confirm no clipping, inconsistent direction, missing owner panel, blurred rasterization, or unreadable silhouette.

- [ ] **Step 7: Commit source art, generator, generated atlases, and tests**

```powershell
git add resources/sprites/war-table resources/atlases/war-table-*.png scripts/generate-war-table-atlases.mjs tests/client/render/WarTableAtlas.test.ts
git commit -m "Create Living War Table miniatures"
```

### Task 3: Implement the 2D terrain and water surface

**Files:**

- Create: `src/client/render/gl/war-table/WarTableTerrain.ts`
- Create: `src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl`
- Modify: `src/client/render/gl/passes/TerrainPass.ts`
- Modify: `src/client/render/gl/Renderer.ts`
- Test: `tests/client/render/WarTableTerrain.test.ts`
- Test: `tests/client/render/gl/WarTableTerrainShader.test.ts`

**Interfaces:**

- Produces: `classifyWarTableTerrain(byte: number): WarTableTerrainMaterial`
- Produces: `TerrainPass.draw(cameraMatrix, zoom, timeSeconds, quality)`.
- Consumes: existing terrain bytes, color overrides, camera matrix, zoom, and elapsed time.

- [ ] **Step 1: Write failing terrain classification tests**

Assert water depth, sand, plains, highland, mountain, and impassable bytes map to stable material indices without using ownership data.

```ts
expect(classifyWarTableTerrain(0).kind).toBe("water");
expect(classifyWarTableTerrain(128 | 0).kind).toBe("sand");
expect(classifyWarTableTerrain(128 | 31).kind).toBe("mountain");
```

- [ ] **Step 2: Implement material classification and run tests**

Keep `terrainByte & 128` as land and `terrainByte & 31` as magnitude. Return material, relief strength, grain strength, and shore strength; do not mutate bytes.

Run: `npx vitest run tests/client/render/WarTableTerrain.test.ts`

Expected: PASS.

- [ ] **Step 3: Write shader-source contract tests**

Assert the shader uses `vMapUV * uMapSize` for world-space material noise, takes `uZoom`, `uTime`, and `uQuality`, and contains no screen-coordinate noise. Assert territory color is not sampled in the terrain shader.

- [ ] **Step 4: Implement the war-table terrain shader**

Use only deterministic functions of map coordinates and terrain texture for material detail. Add:

- a restrained directional relief term capped at 12% luminance;
- a one-to-three-tile shore-depth transition;
- two low-amplitude world-space wave bands for water;
- stable LOD that fades material detail between thresholds;
- existing user terrain colors as the base palette.

Do not displace vertices or interaction coordinates.

- [ ] **Step 5: Integrate time, zoom, and quality uniforms into `TerrainPass`**

Preserve `setTerrainColors`, `applyTerrainDelta`, `texture`, and disposal behavior. Change only the draw signature and uniform bindings, then update the 2D call site in `Renderer.ts`. The 3D branch must not use the new shader.

- [ ] **Step 6: Run focused tests and build**

Run: `npx vitest run tests/client/render/WarTableTerrain.test.ts tests/client/render/gl/WarTableTerrainShader.test.ts tests/core/game/GameMap.liveTerrain.test.ts`

Run: `npm run build-dev`

Expected: all pass.

- [ ] **Step 7: Browser-check three map scales**

Check one compact map, World, and Shattered Expanse at overview, normal play, and close zoom. Verify territory borders and ownership remain clearer than terrain texture; water never swims during pan.

- [ ] **Step 8: Commit terrain rendering**

```powershell
git add src/client/render/gl/war-table/WarTableTerrain.ts src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl src/client/render/gl/passes/TerrainPass.ts src/client/render/gl/Renderer.ts tests/client/render/WarTableTerrain.test.ts tests/client/render/gl/WarTableTerrainShader.test.ts
git commit -m "Render the Living War Table terrain"
```

### Task 4: Render structures as grounded 2D miniatures

**Files:**

- Create: `src/client/render/gl/shaders/structure/war-table-structure.vert.glsl`
- Create: `src/client/render/gl/shaders/structure/war-table-structure.frag.glsl`
- Create: `src/client/render/gl/war-table/WarTableAnimationState.ts`
- Modify: `src/client/render/gl/passes/StructurePass.ts`
- Test: `tests/client/render/gl/WarTableStructurePass.test.ts`

**Interfaces:**

- Consumes: structure registry, `UnitState`, zoom, tick, owner palette, under-construction and deletion flags.
- Produces: `updateStructures(units, tick)` and existing `draw(cameraMatrix, zoom)` behavior with new instance fields.
- Produces: `buildAnimation(unit, tick): { assembly: number; settle: number }`.

- [ ] **Step 1: Write failing instance-layout tests**

Assert every structure emits finite position, registry column, owner ID, assembly progress, deletion progress, scale, and ground offset. Assert a completed city at distant zoom retains a nonzero silhouette.

- [ ] **Step 2: Implement pure animation-state functions**

Derive animation only from canonical ticks and state. Construction maps current build progress into foundation/body/detail phases; deletion maps marked state into a bounded collapse value. Reduced motion retains state changes but removes oscillation.

- [ ] **Step 3: Replace the structure shader and atlas bindings**

The vertex shader anchors the contact shadow at the canonical tile and applies vertical assembly only inside the sprite quad. The fragment shader composites dark silhouette, material detail, owner mask, and outline without circular backgrounds.

- [ ] **Step 4: Preserve previews, stacking, counts, levels, and bars**

Keep `GhostPreviewData`, `StructureLevelPass`, `BarPass`, pointer hit regions, and build rules unchanged. Verify previews use the same miniature and switch between valid/invalid tint without becoming opaque.

- [ ] **Step 5: Run structure tests and build**

Run: `npx vitest run tests/client/render/gl/WarTableStructurePass.test.ts tests/client/render/gl/ParkedVehicleGlowPass.test.ts tests/perf/StructureIconsLayerLookupPerf.ts`

Run: `npm run build-dev`

Expected: PASS.

- [ ] **Step 6: Browser-check all structure states**

Place and stack every structure at valid and invalid positions. Check construction, completion, count, level, readiness, radius hover, selection, and deletion at three zoom levels.

- [ ] **Step 7: Commit structure miniatures**

```powershell
git add src/client/render/gl/shaders/structure src/client/render/gl/war-table/WarTableAnimationState.ts src/client/render/gl/passes/StructurePass.ts tests/client/render/gl/WarTableStructurePass.test.ts
git commit -m "Render structures as war-table miniatures"
```

### Task 5: Render mobile units, trains, ships, tanks, and aircraft as miniatures

**Files:**

- Create: `src/client/render/gl/shaders/unit/war-table-unit.vert.glsl`
- Create: `src/client/render/gl/shaders/unit/war-table-unit.frag.glsl`
- Modify: `src/client/render/gl/passes/UnitPass.ts`
- Modify: `src/client/render/gl/war-table/WarTableAnimationState.ts`
- Test: `tests/client/render/gl/WarTableUnitPass.test.ts`
- Test: `tests/client/render/gl/UnitHeading.test.ts`

**Interfaces:**

- Consumes: mobile registry, `UnitState`, current/previous position, heading, train state, tick, palette.
- Produces: finite heading-aware instance data and `movementAnimation(unit, tick)`.

- [ ] **Step 1: Write failing mobile-instance tests**

Cover every unit registry entry. Assert ships and aircraft use heading, trains distinguish engine/car/loaded car, tanks preserve turret/body identity, missiles keep established size, and every position/rotation is finite.

- [ ] **Step 2: Implement heading-aware miniature instances**

Use the existing heading smoothing and route direction. Rotate the sprite around its center; do not rotate labels, progress bars, target markers, or interaction geometry.

- [ ] **Step 3: Add family-specific movement state**

Return bounded values for ship wake phase, train wheel/smoke phase, aircraft exhaust phase, and tank tread phase. Values derive from tick and movement state, not wall-clock simulation changes.

- [ ] **Step 4: Replace atlas/shaders while preserving layer order**

Keep ground/sea units below structures and missiles above structures. Preserve shell trail duplication, nuke smoothing, SAM behavior, trail inputs, and all existing unit visibility filters.

- [ ] **Step 5: Run focused unit tests and build**

Run: `npx vitest run tests/client/render/gl/WarTableUnitPass.test.ts tests/client/render/gl/UnitHeading.test.ts tests/client/render/gl/UnitPassSmoothing.test.ts`

Run: `npm run build-dev`

- [ ] **Step 6: Browser-check every mobile family**

Verify curved ship routes, player-colored wakes, train consists, aircraft paths, parked/launch states, tanks, missiles, bombs, SAM interception, and MIRV warheads at three zoom levels.

- [ ] **Step 7: Commit mobile miniatures**

```powershell
git add src/client/render/gl/shaders/unit src/client/render/gl/passes/UnitPass.ts src/client/render/gl/war-table/WarTableAnimationState.ts tests/client/render/gl/WarTableUnitPass.test.ts tests/client/render/gl/UnitHeading.test.ts
git commit -m "Render mobile war-table miniatures"
```

### Task 6: Add bounded build, reload, movement, impact, and destruction effects

**Files:**

- Create: `src/client/render/gl/shaders/fx/war-table-particle.vert.glsl`
- Create: `src/client/render/gl/shaders/fx/war-table-particle.frag.glsl`
- Modify: `src/client/render/gl/passes/fx-pass/FxSpritePass.ts`
- Modify: `src/client/render/gl/passes/fx-pass/index.ts`
- Modify: `src/client/render/gl/war-table/WarTableAnimationState.ts`
- Test: `tests/client/render/gl/WarTableEffects.test.ts`

**Interfaces:**

- Consumes: canonical `DeadUnitFx`, construction/reload state, tick age, reached-target, unit family, reduced motion, quality tier.
- Produces: `WarTableEffectPool` with `spawn`, `update`, `draw`, `clear`, and `activeCount`.

- [ ] **Step 1: Write failing effect-lifecycle tests**

Use a fake clock. Assert tank destruction expires, aircraft smoke remains below the per-event cap, train smoke reuses slots, tactical nuke warnings are never dropped, reduced motion emits no decorative debris, and `clear()` releases all active instances.

- [ ] **Step 2: Implement a fixed-capacity effect pool**

Preallocate typed arrays. Use fixed maxima per family and replace the oldest decorative effect when full. Required warning effects bypass decorative pools and remain in their existing passes.

- [ ] **Step 3: Map each family to a distinct lifecycle**

Implement structure assembly dust, mechanical reload pulse, ship wake spray, train exhaust, aircraft exhaust, tank tread dust, impact sparks, tank self-destruction, aircraft crash fire/smoke, building collapse, and ship sinking. Keep current canonical durations where they exist.

- [ ] **Step 4: Add bounded shaders and projection safety**

Clamp particle size and lifetime before upload. Reject non-finite position, radius, age, and color. Keep all particles map-aligned and avoid `gl_FragCoord`-based world placement.

- [ ] **Step 5: Run effect tests and renderer safety tests**

Run: `npx vitest run tests/client/render/gl/WarTableEffects.test.ts tests/client/render/ProjectionSafety.test.ts`

Expected: PASS, with no active instance surviving its lifecycle.

- [ ] **Step 6: Stress-test repeated effects in browser**

Run a large bot match, trigger repeated bombs and dense construction/destruction, and monitor that frame rendering, borders, names, HUD, and targets remain visible after the previous freeze window.

- [ ] **Step 7: Commit effects**

```powershell
git add src/client/render/gl/shaders/fx src/client/render/gl/passes/fx-pass src/client/render/gl/war-table/WarTableAnimationState.ts tests/client/render/gl/WarTableEffects.test.ts
git commit -m "Add Living War Table battlefield effects"
```

### Task 7: Unify paths, ranges, labels, warnings, and tactical overlays

**Files:**

- Modify: `src/client/render/gl/passes/name-pass/index.ts`
- Modify: `src/client/render/gl/passes/TrailPass.ts`
- Modify: `src/client/render/gl/passes/RangeCirclePass.ts`
- Modify: `src/client/render/gl/passes/NukeTelegraphPass.ts`
- Modify: `src/client/render/gl/passes/NukeTrajectoryPass.ts`
- Modify: `src/client/render/gl/passes/BarPass.ts`
- Modify: `src/client/render/gl/passes/StructureLevelPass.ts`
- Test: `tests/client/render/gl/WarTableOverlayBounds.test.ts`
- Test: `tests/client/render/frame/derive/nuke-telegraphs.test.ts`

**Interfaces:**

- Consumes: existing canonical overlay data without modifying radii, colors, timings, or ownership relations.
- Produces: bounded, thin Living War Table styling at every zoom.

- [ ] **Step 1: Write overlay-bounds tests**

For minimum/maximum zoom, assert every generated vertex and size is finite, paths stay within their map-space bounding box plus stroke margin, screen-space labels remain within configured size caps, and Atom/Hydrogen radii remain 12/30 and 80/100.

- [ ] **Step 2: Centralize overlay visual tokens**

Add path width, dashed interval, label outline, bar height, target alpha, and selection pulse values to `WarTableStyle.ts`. Do not add alternative data derivation.

- [ ] **Step 3: Apply styling without changing behavior**

Replace presentation constants only. Preserve OpenFront-derived placement curves, in-flight green/yellow/red targets, progress values, counts, levels, heading, and hit behavior.

- [ ] **Step 4: Run overlay and nuclear regression tests**

Run: `npx vitest run tests/client/render/gl/WarTableOverlayBounds.test.ts tests/client/render/frame/derive/nuke-telegraphs.test.ts tests/client/render/ProjectionSafety.test.ts`

- [ ] **Step 5: Browser-check overlays at all zooms**

Check names, flags, verified badge, troop count, routes, trails, ranges, construction bars, stacked counts, parked readiness, bomb placement, launched bomb destination, alliance indicators, and territory focus.

- [ ] **Step 6: Commit overlay presentation**

```powershell
git add src/client/render/gl/passes src/client/render/gl/war-table/WarTableStyle.ts tests/client/render/gl/WarTableOverlayBounds.test.ts tests/client/render/frame/derive/nuke-telegraphs.test.ts
git commit -m "Unify Living War Table tactical overlays"
```

### Task 8: Build the responsive command-console HUD

**Files:**

- Create: `src/client/hud/war-table/WarTableHud.ts`
- Create: `src/client/hud/war-table/war-table-hud.css`
- Modify: `src/client/styles.css`
- Modify: `src/client/hud/layers/BuildMenu.ts`
- Modify: `src/client/hud/layers/ControlPanel.ts`
- Modify: `src/client/hud/layers/Leaderboard.ts`
- Modify: `src/client/hud/layers/UnitDisplay.ts`
- Test: `tests/client/hud/WarTableHud.test.ts`

**Interfaces:**

- Produces: `warTableHudClass(surface, state): string`
- Produces: CSS variables `--ob-command-bg`, `--ob-command-border`, `--ob-command-text`, `--ob-command-muted`, `--ob-command-cyan`, `--ob-command-green`, `--ob-command-amber`, and `--ob-command-red`.
- Consumes: existing component properties and events unchanged.

- [ ] **Step 1: Write failing HUD state and responsive tests**

Render each component in jsdom. Assert selected, unavailable, building, affordable, warning, ally, enemy, and local-player states have semantic classes. Assert every build item retains name, icon, price, count, shortcut, and accessible label.

- [ ] **Step 2: Implement shared HUD tokens and classes**

Use opaque navy command surfaces, one-pixel steel borders, compact six/eight/twelve-pixel spacing, tabular numbers, restrained cyan focus, green success, amber warning, and red destructive states. Keep focus-visible outlines.

- [ ] **Step 3: Restyle the build surfaces without behavior changes**

Update templates to use shared classes. Keep current click, hover, keyboard, price, count, loading, disabled, and selection logic. Desktop must fit all entries without horizontal scrolling at supported widths; mobile wraps into a readable grid.

- [ ] **Step 4: Restyle resources and leaderboard**

Preserve data columns, row actions, friend/profile actions, sorting, local-player visibility, and compact mode. Remove redundant translucent boxes and align labels/numbers on one grid.

- [ ] **Step 5: Run HUD tests and build**

Run: `npx vitest run tests/client/hud/WarTableHud.test.ts`

Run: `npm run build-dev`

- [ ] **Step 6: Browser-check desktop and phone widths**

Check 1920×1080, 1366×768, 736×900, 390×844, and 360×800. Verify no overlap, clipping, missing unit, tiny essential text, accidental backdrop dismissal, or horizontal page scroll.

- [ ] **Step 7: Commit the command-console HUD**

```powershell
git add src/client/hud/war-table src/client/styles.css src/client/hud/layers/BuildMenu.ts src/client/hud/layers/ControlPanel.ts src/client/hud/layers/Leaderboard.ts src/client/hud/layers/UnitDisplay.ts tests/client/hud/WarTableHud.test.ts
git commit -m "Create the Living War Table command HUD"
```

### Task 9: Add adaptive 2D quality without visual instability

**Files:**

- Create: `src/client/render/gl/war-table/WarTableQuality.ts`
- Modify: `src/client/render/gl/Renderer.ts`
- Modify: `src/client/render/gl/passes/TerrainPass.ts`
- Modify: `src/client/render/gl/passes/StructurePass.ts`
- Modify: `src/client/render/gl/passes/UnitPass.ts`
- Modify: `src/client/render/gl/passes/fx-pass/FxSpritePass.ts`
- Test: `tests/client/render/WarTableQuality.test.ts`

**Interfaces:**

- Produces: `WarTableQualityController.sample(frameMs, nowMs): WarTableQuality`
- Produces: quality with `terrainDetail`, `secondaryAnimationRate`, `particleScale`, `shadowSamples`, and `mobile`.

- [ ] **Step 1: Write failing hysteresis tests**

Use fixed samples to assert quality does not drop on one slow frame, drops after sustained load, waits at least five seconds before another transition, and recovers only after a longer stable window.

```ts
for (let i = 0; i < 120; i++) controller.sample(24, i * 16);
expect(controller.current().particleScale).toBeLessThan(1);
controller.sample(8, 2000);
expect(controller.current().particleScale).toBeLessThan(1);
```

- [ ] **Step 2: Implement stable quality tiers**

Use rolling percentile frame time, 1.5-second degradation evidence, eight-second recovery evidence, and five-second transition cooldown. Detect mobile once at initialization; never branch simulation.

- [ ] **Step 3: Connect only decorative costs**

Quality may change material grain, secondary animation frequency, decorative particles, and shadow samples. It must not remove miniatures, terrain classifications, borders, warnings, paths, names, counts, bars, targets, or effects that communicate gameplay.

- [ ] **Step 4: Run quality and memory tests**

Run: `npx vitest run tests/client/render/WarTableQuality.test.ts tests/client/render/gl/Dpr.test.ts`

Run: `npm run perf:client-mem`

Expected: tests pass and memory remains bounded across the benchmark window.

- [ ] **Step 5: Browser stress-test a giant match**

Run the largest available bot match for at least ten minutes, pan and zoom continuously, and trigger dense effects. Record FPS, frame-time spikes, WebGL warnings, heap trend, and whether borders/HUD ever disappear.

- [ ] **Step 6: Commit adaptive quality**

```powershell
git add src/client/render/gl/war-table/WarTableQuality.ts src/client/render/gl/Renderer.ts src/client/render/gl/passes tests/client/render/WarTableQuality.test.ts
git commit -m "Stabilize Living War Table performance"
```

### Task 10: Repair Antarctica's 3D southern terrain closure in isolation

**Files:**

- Modify: `src/client/render/gl/three-d/ThreeDTerrainMesh.ts`
- Modify: `src/client/render/gl/passes/ThreeDCompositePass.ts`
- Test: `tests/client/render/ThreeDTerrainMesh.test.ts`
- Test: `tests/client/render/ThreeDAntarcticaClosure.test.ts`

**Interfaces:**

- Produces: `buildSouthernLandClosure(terrain: Uint8Array, width: number, height: number): ThreeDTerrainMeshData`
- Consumes: immutable terrain bytes and existing 3D terrain-height sampling in the skirt shader.
- Does not consume or import any `war-table` 2D module.

- [ ] **Step 1: Write failing synthetic Antarctica tests**

Create a small terrain mask with an irregular southern land band and holes. Assert the closure follows the southernmost contiguous land boundary per column, emits finite triangles, contains no open consecutive boundary segment, and emits no curtain under ocean-only columns.

```ts
const terrain = syntheticTerrain(12, 8, [
  [2, 6],
  [3, 6],
  [4, 5],
  [5, 6],
]);
const mesh = buildSouthernLandClosure(terrain, 12, 8);
expect(mesh.indices.length % 3).toBe(0);
expect([...mesh.positions, ...mesh.indices].every(Number.isFinite)).toBe(true);
expect(southernColumns(mesh)).toEqual([2, 3, 4, 5]);
```

- [ ] **Step 2: Implement terrain-mask-following closure geometry**

For each column, find the southernmost land tile using `(byte & 128) !== 0`. Build top-selector and bottom-selector vertices along contiguous runs, split runs at ocean gaps, and triangulate each adjacent pair with consistent winding. Store map-space x/z plus top/bottom selector so the existing terrain shader resolves the actual top height.

- [ ] **Step 3: Add the closure as a separate draw inside `ThreeDCompositePass`**

Create one immutable VBO/IBO at renderer construction, use the existing terrain texture and terrain-height function, draw after terrain and before the solid board base, and dispose it with the pass. Do not change camera limits, matrices, terrain shaders, relief constants, water, units, labels, overlays, or input.

- [ ] **Step 4: Add a no-unrelated-3D-change contract test**

Assert `ThreeDCompositePass.ts` changes only instantiate, draw, and dispose the southern closure program/buffers; assert `ThreeDCamera.ts`, `ThreeDUnitPass.ts`, `ThreeDWorldEventPass.ts`, and 3D shader snapshots remain unchanged in this task's diff.

- [ ] **Step 5: Run all focused 3D tests**

Run: `npx vitest run tests/client/render/ThreeDTerrainMesh.test.ts tests/client/render/ThreeDAntarcticaClosure.test.ts tests/client/render/ThreeDCamera.test.ts tests/client/render/ThreeDGeometry.test.ts tests/client/render/ThreeDOverlayProjection.test.ts tests/client/render/ThreeDUnitParity.test.ts`

Expected: PASS.

- [ ] **Step 6: Visually inspect World-map Antarctica at extreme views**

Use maximum valid zoom-out, zoom-in, forward pitch, backward pitch, left/right map edges, and direct southern close-up. Verify land has a filled top, attached wall, and opaque underside with no black gap. Compare non-Antarctica 3D screenshots before/after for pixel-equivalent composition except the intended closure.

- [ ] **Step 7: Commit the isolated 3D repair**

```powershell
git add src/client/render/gl/three-d/ThreeDTerrainMesh.ts src/client/render/gl/passes/ThreeDCompositePass.ts tests/client/render/ThreeDTerrainMesh.test.ts tests/client/render/ThreeDAntarcticaClosure.test.ts
git commit -m "Close Antarctica terrain in 3D"
```

### Task 11: Complete cross-map visual QA and regression hardening

**Files:**

- Create: `tests/client/render/WarTableCoverage.test.ts`
- Create: `tests/client/render/WarTableProjectionSafety.test.ts`
- Modify: implementation files only when a reproduced defect requires a focused fix.

**Interfaces:**

- Consumes: all contracts from Tasks 1–10.
- Produces: release-gate evidence for every unit, structure, map class, overlay, modifier, viewport class, and context restoration.

- [ ] **Step 1: Add exhaustive registry-to-renderer coverage tests**

Enumerate every canonical `UnitType`, structure type, `WorldEventType`, and map terrain class. Assert each visible type reaches one miniature/effect/render path and none resolves to an empty atlas cell.

- [ ] **Step 2: Add projection and context-restoration tests**

Feed minimum, maximum, and invalid positions/radii through visual upload helpers. Assert invalid input is rejected and context restoration recreates terrain texture, atlases, instance buffers, effect pools, and current frame state.

- [ ] **Step 3: Run full static and focused validation**

Run: `npm run format`

Run: `npm run lint`

Run: `npm run build-prod`

Run: `npx vitest run tests/client/render tests/client/hud/WarTableHud.test.ts`

Expected: all pass.

- [ ] **Step 4: Run the complete test suites**

Run: `npm test`

Expected: both client/core and server suites pass with no unhandled rejection or worker crash.

- [ ] **Step 5: Perform the complete browser matrix**

Test compact, standard, World, Shattered Expanse, and the largest Frootz map. For each, inspect 2D overview/normal/close zoom, Solo and multiplayer, placement and stacking, every unit family, nukes, disasters, fog, objectives, death/win, desktop, phone, and reduced motion. Separately test only Antarctica closure in 3D.

- [ ] **Step 6: Run long-match performance validation**

Run: `npm run perf:client`

Run: `npm run perf:client-mem`

Run: `npm run perf:client-tick`

Keep benchmark results with the release evidence. Reproduce and fix any sustained memory growth, missing frame layer, screen-sized geometry, or late-match freeze before proceeding.

- [ ] **Step 7: Commit regression coverage and fixes**

```powershell
git add tests/client/render tests/client/hud src/client/render src/client/hud
git commit -m "Harden Living War Table rendering"
```

### Task 12: Release, push, and verify CI

**Files:**

- Modify: `resources/changelog.md`
- Modify: version metadata only if the existing release process requires it.

**Interfaces:**

- Consumes: completed Tasks 1–11 and current latest published OpenFront release/version line.
- Produces: the next valid OpenBack version and verified `main` release commit.

- [ ] **Step 1: Verify upstream version numbering before writing notes**

Check the latest published OpenFront release. If the OpenFront version line changed, shift the complete OpenBack series according to `AGENTS.md`; otherwise increment v0.34.125 to v0.34.126.

- [ ] **Step 2: Add the top changelog entry**

Describe only shipped player-visible results: Living War Table 2D terrain, miniatures, animations/effects, command HUD, adaptive performance, and real Antarctica closure. State explicitly that gameplay and multiplayer results are unchanged. End with:

```md
Created by **frootz jhklphy**.
```

- [ ] **Step 3: Run final clean-tree validation**

Run: `git diff --check`

Run: `npm run lint`

Run: `npm run build-prod`

Run: `npm test`

Expected: all pass; `git status --short` contains only intended tracked work plus untouched `.codex-remote-attachments/`.

- [ ] **Step 4: Commit the release**

```powershell
git add resources/changelog.md src/client resources/atlases resources/sprites scripts tests
git commit -m "Release OpenBack Living War Table"
```

- [ ] **Step 5: Push only `main`**

Run: `git push origin main`

Expected: `main -> main` succeeds.

- [ ] **Step 6: Await and verify GitHub CI**

Use GitHub CLI to locate the run for the pushed commit, wait for completion, and inspect failing logs rather than claiming success from local tests. The release is complete only when every required CI job succeeds.

- [ ] **Step 7: Report evidence**

Report the release version, commit SHA, local validation, browser scenarios, performance results, CI run URL/status, and the exact 3D scope boundary.
