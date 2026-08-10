# OpenBack 3D Parity Adapter Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make optional 3D mode present the complete OpenBack battlefield with exact 2D gameplay/UI parity, stable terrain and models, readable labels, cyan animated water, and no missing Antarctica or black map regions.

**Architecture:** Keep simulation, build validation, tactical state, and screen UI unchanged. Add a single terrain-surface contract plus a 3D projection adapter that consumes the same map-space data as 2D, then refit terrain, models, and battlefield overlays to those shared services. Verify each bounded change with focused Vitest coverage before browser visual gates and the normal release checks.

**Tech Stack:** TypeScript 6, WebGL2/GLSL ES 3.00, Vite 8, Vitest 4, existing OpenBack GPU render passes.

## Global Constraints

- Do not change deterministic simulation, combat, economy, build validation, visibility, multiplayer turns, or replay state.
- Do not introduce 3D-specific leaderboard, alliance, chat, build-bar, modal, button, tooltip, or notification layouts.
- All maps use the same generic 2D-to-3D conversion; no Earth- or Antarctica-specific coordinate workaround is allowed.
- Runtime assets remain local and retain their existing verified license metadata.
- Opaque land, water, side walls, and underside must write depth and never expose transparent or black gaps.
- Every land height is raised by exactly 50 percent relative to the canonical terrain-byte curve.
- Fallout ground remains permanently visible as dark green, distinct from normal owned land.
- Ships travel bow-first and terrain lighting cannot create broad cross-map bands or chunk seams.
- User-facing delivery is OpenBack v0.34.107 and credits **frootz jhklphy**.
- Preserve AGPL, corresponding-source availability, copyright, asset-license notices, and contributor attribution.

## File Structure

- Create `src/client/render/gl/three-d/ThreeDSurfaceSampler.ts`: canonical CPU terrain-height, support-plane, normal, and altitude-mode calculations.
- Create `src/client/render/gl/three-d/ThreeDProjection.ts`: canonical 3D map-point projection and terrain-conforming path/ring generation.
- Modify `src/client/render/gl/three-d/ThreeDWorldMath.ts`: one relief curve shared by CPU users and mirrored exactly in GLSL.
- Modify `src/client/render/gl/three-d/ThreeDCamera.ts`: complete-map fit, frustum, and stable picking based on the surface sampler.
- Modify `src/client/TransformHandler.ts`: use the shared surface picker and generic complete-map fit without hiding shallow views.
- Modify `src/client/render/gl/three-d/ThreeDTerrainChunks.ts`: conservative complete-map chunk coverage including partial edges.
- Modify `src/client/render/gl/three-d/ThreeDTerrainMesh.ts`: complete water rectangle, outer walls, and underside geometry.
- Modify `src/client/render/gl/passes/ThreeDCompositePass.ts`: cyan animated ocean, terrain relief, correct draw order, and opaque coverage.
- Modify `src/client/render/gl/three-d/ThreeDModelRegistry.ts`: declarative surface anchoring metadata for every unit type.
- Modify `src/client/render/gl/three-d/ThreeDUnitPass.ts`: model, ghost, vehicle, ship, train, aircraft, and projectile anchoring through `ThreeDSurfaceSampler`.
- Modify `src/client/render/gl/Renderer.ts`: shared camera/projection setup and separation between battlefield overlays and unchanged screen UI.
- Modify battlefield-overlay passes and shaders under `src/client/render/gl/passes/` and `src/client/render/gl/shaders/`: consume canonical projection without changing authoritative state or 2D styling.
- Modify `resources/changelog.md`: verified v0.34.107 player-facing release note.
- Add or extend focused tests under `tests/client/render/` and `tests/client/TransformHandler3D.test.ts`.
- Create `tests/client/render/ThreeDParityMatrix.test.ts`: cross-system parity and UI-boundary regression coverage.

---

### Task 1: Canonical Terrain Surface Contract

**Files:**

- Create: `src/client/render/gl/three-d/ThreeDSurfaceSampler.ts`
- Modify: `src/client/render/gl/three-d/ThreeDWorldMath.ts`
- Test: `tests/client/render/ThreeDSurfaceSampler.test.ts`
- Test: `tests/client/render/ThreeDTerrainMesh.test.ts`

**Interfaces:**

- Consumes: `terrainByteAt(x: number, z: number): number`, map width, and map height.
- Produces: `ThreeDSurfaceSampler.heightAt(x, z)`, `supportAt(points)`, `normalAt(x, z)`, and `altitudeFor(mode, x, z, explicitAltitude)`.

- [ ] **Step 1: Write failing relief and surface tests**

```ts
const sampler = new ThreeDSurfaceSampler(64, 32, (_x, _z) => 0x80 | 15);
expect(sampler.heightAt(10.5, 8.5)).toBeCloseTo(
  threeDHeightForTerrainByte(0x80 | 15),
  5,
);
expect(
  sampler.supportAt([
    { x: 9, z: 8 },
    { x: 11, z: 8 },
  ]).height,
).toBeFinite();
expect(sampler.altitudeFor("water", 10, 8, 0)).toBe(THREE_D_WATER_HEIGHT);
expect(sampler.altitudeFor("flight", 10, 8, 12)).toBeGreaterThan(12);
```

- [ ] **Step 2: Run the focused tests and verify failure**

Run: `npx vitest run tests/client/render/ThreeDSurfaceSampler.test.ts tests/client/render/ThreeDTerrainMesh.test.ts`

Expected: FAIL because `ThreeDSurfaceSampler` and the new constants do not exist.

- [ ] **Step 3: Implement the canonical surface sampler**

```ts
export type ThreeDAltitudeMode = "ground" | "water" | "flight" | "trajectory";

export class ThreeDSurfaceSampler {
  constructor(
    readonly width: number,
    readonly height: number,
    private readonly terrainByteAt: (x: number, z: number) => number,
  ) {}

  heightAt(x: number, z: number): number;
  normalAt(x: number, z: number): Readonly<{ x: number; y: number; z: number }>;
  supportAt(points: readonly { x: number; z: number }[]): Readonly<{
    height: number;
    normal: { x: number; y: number; z: number };
  }>;
  altitudeFor(
    mode: ThreeDAltitudeMode,
    x: number,
    z: number,
    explicitAltitude: number,
  ): number;
}
```

Use clamped bilinear samples for `heightAt`, centered finite differences for `normalAt`, and a sorted median for footprint support. Export `THREE_D_WATER_HEIGHT` and raise the current land curve by exactly `1.5` while preserving water depth ordering.

- [ ] **Step 4: Run focused tests and formatting**

Run: `npx vitest run tests/client/render/ThreeDSurfaceSampler.test.ts tests/client/render/ThreeDTerrainMesh.test.ts`

Expected: PASS.

Run: `npx prettier --write src/client/render/gl/three-d/ThreeDSurfaceSampler.ts src/client/render/gl/three-d/ThreeDWorldMath.ts tests/client/render/ThreeDSurfaceSampler.test.ts tests/client/render/ThreeDTerrainMesh.test.ts`

- [ ] **Step 5: Commit the surface contract**

```powershell
git add src/client/render/gl/three-d/ThreeDSurfaceSampler.ts src/client/render/gl/three-d/ThreeDWorldMath.ts tests/client/render/ThreeDSurfaceSampler.test.ts tests/client/render/ThreeDTerrainMesh.test.ts
git commit -m "Add canonical 3D terrain surface sampling"
```

### Task 2: Complete Map Coverage, Camera Fit, and Antarctica

**Files:**

- Modify: `src/client/render/gl/three-d/ThreeDCamera.ts`
- Modify: `src/client/TransformHandler.ts`
- Modify: `src/client/render/gl/three-d/ThreeDTerrainChunks.ts`
- Modify: `src/client/render/gl/three-d/ThreeDTerrainMesh.ts`
- Test: `tests/client/render/ThreeDCamera.test.ts`
- Test: `tests/client/render/ThreeDTerrainChunks.test.ts`
- Test: `tests/client/TransformHandler3D.test.ts`

**Interfaces:**

- Consumes: `ThreeDSurfaceSampler`, complete map dimensions, viewport dimensions, camera yaw/pitch, and presentation margin.
- Produces: `threeDFitZoom(input): number`, conservative chunk coverage, and a camera whose near/far planes contain the complete solid board.

- [ ] **Step 1: Add failing complete-map and shallow-angle tests**

```ts
it.each([
  { width: 4096, height: 2049, viewportWidth: 1920, viewportHeight: 1080 },
  { width: 731, height: 413, viewportWidth: 390, viewportHeight: 844 },
])("fits every map corner at overview", (shape) => {
  const camera = fittedCamera(shape);
  for (const corner of mapCorners(shape.width, shape.height)) {
    const screen = camera.project(corner);
    expect(screen).not.toBeNull();
    expect(screen!.x).toBeGreaterThanOrEqual(0);
    expect(screen!.x).toBeLessThanOrEqual(shape.viewportWidth);
    expect(screen!.y).toBeGreaterThanOrEqual(0);
    expect(screen!.y).toBeLessThanOrEqual(shape.viewportHeight);
  }
});
```

Add a partial-edge test proving `worldBottom === 2049` remains visible at both `THREE_D_MIN_TILT` and near-top-down pitch.

- [ ] **Step 2: Run the camera/chunk tests and verify failure**

Run: `npx vitest run tests/client/render/ThreeDCamera.test.ts tests/client/render/ThreeDTerrainChunks.test.ts tests/client/TransformHandler3D.test.ts`

Expected: FAIL on overview containment or shallow-angle edge coverage.

- [ ] **Step 3: Implement aspect-safe map fit and conservative coverage**

```ts
export interface ThreeDMapFitInput {
  mapWidth: number;
  mapHeight: number;
  viewportWidth: number;
  viewportHeight: number;
  pitch: number;
  yaw: number;
  maxHeight: number;
  margin: number;
}

export function threeDFitZoom(input: ThreeDMapFitInput): number;
```

Calculate fit against both horizontal and vertical FOV after rotating the map bounds by yaw. Include maximum relief and the `margin` in the projected bounds. Keep the existing useful pitch range; do not raise `THREE_D_MIN_TILT` to hide geometry.

Change chunk selection to clamp an expanded frustum rectangle to `[0, mapWidth] x [0, mapHeight]`, then enumerate every intersecting stable 128-tile chunk including partial last chunks. The complete-map overview must enumerate the complete chunk grid.

- [ ] **Step 4: Add explicit water/base mesh coverage assertions**

```ts
const surface = buildCompleteMapSurface(731, 413, THREE_D_WATER_HEIGHT, -40);
expect(surface.waterBounds).toEqual({
  left: 0,
  top: 0,
  right: 731,
  bottom: 413,
});
expect(surface.outerWalls).toHaveLength(4);
expect(surface.indices.length).toBeGreaterThan(0);
```

Implement `buildCompleteMapSurface` in `ThreeDTerrainMesh.ts`; water covers the full rectangle, while walls and underside begin below it.

- [ ] **Step 5: Run focused tests and commit**

Run: `npx vitest run tests/client/render/ThreeDCamera.test.ts tests/client/render/ThreeDTerrainChunks.test.ts tests/client/render/ThreeDTerrainMesh.test.ts tests/client/TransformHandler3D.test.ts`

Expected: PASS.

```powershell
git add src/client/render/gl/three-d/ThreeDCamera.ts src/client/TransformHandler.ts src/client/render/gl/three-d/ThreeDTerrainChunks.ts src/client/render/gl/three-d/ThreeDTerrainMesh.ts tests/client/render/ThreeDCamera.test.ts tests/client/render/ThreeDTerrainChunks.test.ts tests/client/render/ThreeDTerrainMesh.test.ts tests/client/TransformHandler3D.test.ts
git commit -m "Render complete 3D map bounds"
```

### Task 3: Cyan Ocean and Stable Terrain Materials

**Files:**

- Modify: `src/client/render/gl/passes/ThreeDCompositePass.ts`
- Modify: `src/client/render/gl/three-d/ThreeDQuality.ts`
- Test: `tests/client/render/ThreeDTerrainMesh.test.ts`
- Test: `tests/client/render/ThreeDQuality.test.ts`

**Interfaces:**

- Consumes: `buildCompleteMapSurface`, canonical relief constants, time, camera, and quality settings.
- Produces: opaque complete-map water, restrained world-anchored waves, land chunks, and outer board geometry in a stable draw order.

- [ ] **Step 1: Add failing shader-contract tests**

```ts
expect(compositeSource).toContain("uWaveDetail");
expect(compositeSource).toContain("worldWave");
expect(compositeSource).toContain("vec3(0.075,0.48,0.68)");
expect(compositeSource.indexOf("drawWater")).toBeLessThan(
  compositeSource.indexOf("drawTerrain"),
);
```

Also assert that the shader relief formula mirrors `threeDHeightForTerrainByte`'s `1.5` multiplier, detects tile-state fallout bit 13, and applies a dark-green fallout material after ownership color.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npx vitest run tests/client/render/ThreeDTerrainMesh.test.ts tests/client/render/ThreeDQuality.test.ts`

Expected: FAIL because the water program and wave-quality setting are absent.

- [ ] **Step 3: Split water from terrain and implement waves**

Create a dedicated opaque water program inside `ThreeDCompositePass` using full-map geometry. Its fragment shader computes two low-amplitude world-coordinate wave bands:

```glsl
float worldWave(vec2 p, float time) {
  float broad = sin(dot(p, vec2(0.031, 0.017)) + time * 0.55);
  float cross = sin(dot(p, vec2(-0.021, 0.039)) - time * 0.42);
  return broad * 0.55 + cross * 0.45;
}
```

Mix deep cyan `vec3(0.025, 0.20, 0.34)` with highlight cyan `vec3(0.075, 0.48, 0.68)`. Keep vertex height fixed at `THREE_D_WATER_HEIGHT`; wave motion changes shading only. Add `waveDetail` to quality settings so mobile reduces the second band rather than removing water.

Decode fallout with `(tileState & (1u << 13u)) != 0u` and override ordinary ownership material with a dark-green range centered near `vec3(0.055, 0.19, 0.075)`. Compute normals and lighting from canonical world-coordinate samples so adjacent chunks cannot create broad shading bands.

Draw order inside `ThreeDCompositePass.draw` becomes surround, water, terrain chunks, then outer walls/underside with depth writes enabled.

- [ ] **Step 4: Run focused tests and commit**

Run: `npx vitest run tests/client/render/ThreeDTerrainMesh.test.ts tests/client/render/ThreeDQuality.test.ts`

Expected: PASS.

```powershell
git add src/client/render/gl/passes/ThreeDCompositePass.ts src/client/render/gl/three-d/ThreeDQuality.ts tests/client/render/ThreeDTerrainMesh.test.ts tests/client/render/ThreeDQuality.test.ts
git commit -m "Add complete cyan 3D ocean"
```

### Task 4: Canonical 3D Projection for Labels and Tactical Geometry

**Files:**

- Create: `src/client/render/gl/three-d/ThreeDProjection.ts`
- Modify: `src/client/render/gl/Renderer.ts`
- Modify: `src/client/render/gl/passes/name-pass/TextProgram.ts`
- Modify: `src/client/render/gl/passes/name-pass/IconProgram.ts`
- Modify: `src/client/render/gl/passes/name-pass/StatusIconProgram.ts`
- Modify: `src/client/render/gl/shaders/name/name.vert.glsl`
- Modify: `src/client/render/gl/shaders/name/icon.vert.glsl`
- Modify: `src/client/render/gl/shaders/name/status-icon.vert.glsl`
- Modify: affected tactical shaders under `src/client/render/gl/shaders/`
- Test: `tests/client/render/ThreeDGeometry.test.ts`
- Test: `tests/client/render/ThreeDLabelShaders.test.ts`
- Test: `tests/client/render/ThreeDOverlayProjection.test.ts`

**Interfaces:**

- Consumes: `ThreeDCameraState`, `ThreeDSurfaceSampler`, authoritative map-space anchors, paths, and radii.
- Produces: `projectAnchor`, `terrainPath`, and `terrainRing`; label passes receive the exact camera `mat4` plus viewport pixel scale.

- [ ] **Step 1: Write failing projection and label tests**

```ts
const projection = new ThreeDProjection(camera, sampler);
expect(projection.projectAnchor({ x: 40, z: 20, offset: 0.2 })).toEqual(
  camera.project({ x: 40, y: sampler.heightAt(40, 20) + 0.2, z: 20 }),
);
expect(projection.terrainRing({ x: 40, z: 20 }, 12, 64)).toHaveLength(65);
expect(nameShader).toContain("uniform mat4 uThreeDViewProjection");
expect(nameShader).not.toContain("uCamera * vec3(wx, wy, 1.0)");
```

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npx vitest run tests/client/render/ThreeDGeometry.test.ts tests/client/render/ThreeDLabelShaders.test.ts tests/client/render/ThreeDOverlayProjection.test.ts`

Expected: FAIL because `ThreeDProjection` and the canonical label matrix are absent.

- [ ] **Step 3: Implement `ThreeDProjection`**

```ts
export class ThreeDProjection {
  constructor(
    readonly camera: ThreeDCameraState,
    readonly surface: ThreeDSurfaceSampler,
  ) {}

  projectAnchor(anchor: {
    x: number;
    z: number;
    offset?: number;
  }): ScreenPoint | null;
  terrainPath(
    points: readonly { x: number; z: number }[],
    offset?: number,
  ): Float32Array;
  terrainRing(
    center: { x: number; z: number },
    radius: number,
    segments: number,
    offset?: number,
  ): Float32Array;
}
```

`terrainPath` returns `[x, height, z]` triples and samples every point. `terrainRing` closes the ring by repeating the first vertex. Both add a small shared overlay offset to prevent z-fighting.

- [ ] **Step 4: Refit labels without changing 2D typography**

Add a 3D projection mode to the existing name subprograms. Project only `(wx, surfaceHeight, wy)` through the `mat4`; convert the result to NDC; then add glyph/icon/status offsets in pixels using viewport dimensions and clip `w`. Keep current font atlas, layout, colors, verified mark, culling threshold, hover behavior, flag positioning, troop spacing, and draw order unchanged.

Remove `makeThreeDGroundCamera` from label rendering. `Renderer` creates one `ThreeDCameraState` and one `ThreeDProjection` per frame and passes the same camera to terrain, models, labels, and battlefield overlays.

- [ ] **Step 5: Refit local tactical overlays**

Replace the current flat homography path for crosshair, range, SAM radius, selection, move indicator, nuke routes, and effect rings. Point markers use `projectAnchor`; paths and rings upload `terrainPath` or `terrainRing` geometry. Keep each pass's existing authoritative data, color, timing, visibility, and 2D draw method.

- [ ] **Step 6: Run focused tests and commit**

Run: `npx vitest run tests/client/render/ThreeDGeometry.test.ts tests/client/render/ThreeDLabelShaders.test.ts tests/client/render/ThreeDOverlayProjection.test.ts`

Expected: PASS.

```powershell
git add src/client/render/gl/three-d/ThreeDProjection.ts src/client/render/gl/Renderer.ts src/client/render/gl/passes/name-pass src/client/render/gl/shaders/name src/client/render/gl/passes src/client/render/gl/shaders tests/client/render/ThreeDGeometry.test.ts tests/client/render/ThreeDLabelShaders.test.ts tests/client/render/ThreeDOverlayProjection.test.ts
git commit -m "Share tactical projection with 3D"
```

### Task 5: Shared Placement and Reliable Unit Anchoring

**Files:**

- Modify: `src/client/render/gl/three-d/ThreeDModelRegistry.ts`
- Modify: `src/client/render/gl/three-d/ThreeDUnitPass.ts`
- Modify: `src/client/render/types/Renderer.ts`
- Modify: `src/client/render/gl/Renderer.ts`
- Test: `tests/client/render/ThreeDModelRegistry.test.ts`
- Test: `tests/client/render/ThreeDUnitParity.test.ts`
- Test: `tests/client/render/ThreeDParityMatrix.test.ts`

**Interfaces:**

- Consumes: the complete unchanged `GhostPreviewData`, `UnitState`, `ThreeDSurfaceSampler`, and per-model anchor metadata.
- Produces: `ThreeDAnchorDefinition` for every `UnitType` and a single placement function used by completed models and ghosts.

- [ ] **Step 1: Add failing registry and placement tests**

```ts
for (const type of Object.values(UnitType)) {
  const model = threeDModel(type);
  expect(model.anchor).toBeDefined();
  expect(model.anchor.supportPoints.length).toBeGreaterThan(0);
}

expect(placeThreeDUnit(runwayState, runwayModel, sampler)).toEqual(
  placeThreeDGhost(runwayGhost, runwayModel, sampler),
);
```

Add cases for a building on a slope, tank moving across relief, ship over deep water, parked and airborne aircraft, train support points, and missile trajectory altitude.

For all three ship types, assert that a positive-X movement vector produces a bow pointing positive X after the declared asset-forward correction; repeat for positive Z so sideways motion cannot regress.

- [ ] **Step 2: Run focused tests and verify failure**

Run: `npx vitest run tests/client/render/ThreeDModelRegistry.test.ts tests/client/render/ThreeDUnitParity.test.ts tests/client/render/ThreeDParityMatrix.test.ts`

Expected: FAIL because model anchoring metadata and shared placement functions are absent.

- [ ] **Step 3: Add declarative anchoring metadata**

```ts
export interface ThreeDAnchorDefinition {
  mode: "building" | "ground" | "water" | "flight" | "trajectory" | "rail";
  supportPoints: readonly { x: number; z: number }[];
  baseOffset: number;
  maxTiltRadians: number;
  foundationDepth?: number;
}
```

Every model definition receives an anchor. Buildings use multiple footprint support points and remain upright. Tanks and other vehicles use capped local-normal alignment. Ships use water mode. Planes switch between ground and flight from authoritative movement state. Trains sample bogie/support points. Projectiles use trajectory mode.

- [ ] **Step 4: Make completed units and ghosts share placement**

```ts
export function placeThreeDRenderable(
  position: { x: number; z: number; altitude?: number },
  anchor: ThreeDAnchorDefinition,
  surface: ThreeDSurfaceSampler,
): Readonly<{ x: number; y: number; z: number; pitch: number; roll: number }>;
```

Use this function for every completed unit and `GhostPreviewData`. Do not reconstruct `canBuild`, `canUpgrade`, snapping, radius origin, rail overlap, or affordability in the 3D pass. Under-construction alpha and animation remain presentation-only.

- [ ] **Step 5: Restore complete placement visualization**

Ensure `Renderer.updateGhostPreview` forwards the same object to the 3D model ghost, range, crosshair, railroad, selection, and world-text cost passes. Add parity assertions for valid/invalid color, snapped `tileX/tileY`, `radiusTileX/radiusTileY`, cost visibility, and upgrade target.

- [ ] **Step 6: Run focused tests and commit**

Run: `npx vitest run tests/client/render/ThreeDModelRegistry.test.ts tests/client/render/ThreeDUnitParity.test.ts tests/client/render/ThreeDParityMatrix.test.ts`

Expected: PASS.

```powershell
git add src/client/render/gl/three-d/ThreeDModelRegistry.ts src/client/render/gl/three-d/ThreeDUnitPass.ts src/client/render/types/Renderer.ts src/client/render/gl/Renderer.ts tests/client/render/ThreeDModelRegistry.test.ts tests/client/render/ThreeDUnitParity.test.ts tests/client/render/ThreeDParityMatrix.test.ts
git commit -m "Anchor 3D units to the shared surface"
```

### Task 6: Preserve Exact 2D HUD and Modal Behavior

**Files:**

- Modify: `src/client/render/gl/Renderer.ts`
- Modify only if evidence shows a 3D condition: affected files under `src/client/hud/`
- Test: `tests/client/render/ThreeDParityMatrix.test.ts`
- Test: relevant existing HUD component tests discovered by `rg --files tests/client | rg 'Leaderboard|Alliance|Diplomacy|BuildMenu'`

**Interfaces:**

- Consumes: existing Lit/DOM HUD and modal components.
- Produces: identical component output and event behavior whether `threeDMode` is true or false.

- [ ] **Step 1: Add failing UI-boundary regression tests**

```ts
expect(renderAllianceRequest({ threeDMode: false })).toEqual(
  renderAllianceRequest({ threeDMode: true }),
);
expect(renderLeaderboard({ threeDMode: false })).toEqual(
  renderLeaderboard({ threeDMode: true }),
);
```

The fixtures use the same locale, player state, and events. Add equivalent assertions for build menu and notifications.

- [ ] **Step 2: Run the UI tests and identify any divergence**

Run the focused Vitest files returned by the search plus `tests/client/render/ThreeDParityMatrix.test.ts`.

Expected: FAIL only where 3D rendering currently changes normal UI behavior; if no component differs, the new boundary test passes and guards against future drift.

- [ ] **Step 3: Remove confirmed 3D UI branches**

Keep the 3D conditional inside battlefield rendering and input projection only. Normal UI receives no 3D camera matrix, scale, translation, alternative text, or button. The alliance popup shown by the user must therefore use the same localized actions and layout as 2D.

- [ ] **Step 4: Run UI tests and commit**

Run the same focused files.

Expected: PASS with identical 2D/3D component output.

```powershell
git add src/client/render/gl/Renderer.ts src/client/hud tests/client/render/ThreeDParityMatrix.test.ts tests/client
git commit -m "Keep 3D mode out of screen UI"
```

### Task 7: Browser Visual Matrix, Release Notes, and CI Gate

**Files:**

- Modify: `resources/changelog.md`
- Modify as required by visual evidence: files changed in Tasks 1 through 6 only
- Evidence: `.artifacts/3d-parity/` local screenshots and recordings; do not commit generated evidence unless repository policy already tracks it.

**Interfaces:**

- Consumes: completed parity adapter and a local single-player game.
- Produces: verified OpenBack v0.34.107 and a green GitHub CI run.

- [ ] **Step 1: Run focused renderer tests**

Run:

```powershell
npx vitest run tests/client/TransformHandler3D.test.ts tests/client/render/ThreeDCamera.test.ts tests/client/render/ThreeDGeometry.test.ts tests/client/render/ThreeDLabelShaders.test.ts tests/client/render/ThreeDModelRegistry.test.ts tests/client/render/ThreeDOverlayProjection.test.ts tests/client/render/ThreeDParityMatrix.test.ts tests/client/render/ThreeDQuality.test.ts tests/client/render/ThreeDSurfaceSampler.test.ts tests/client/render/ThreeDTerrainChunks.test.ts tests/client/render/ThreeDTerrainMesh.test.ts tests/client/render/ThreeDUnitParity.test.ts
```

Expected: PASS.

- [ ] **Step 2: Build and start the local game for visual inspection**

Run `npm run build-dev`, then run `npm run dev` and open the local URL in the in-app browser.

Expected: TypeScript and Vite build succeed; game reaches the home screen without new console errors.

- [ ] **Step 3: Capture the required desktop visual matrix**

Use a 1920x1080 viewport. Start 3D games on World, an irregular non-World map, and a Frootz map. Capture overview, default, shallow-forward, shallow-backward, and close zoom. For each, verify:

- complete map rectangle and Antarctica;
- no black or transparent terrain gaps;
- cyan animated water visible overhead and close;
- stable terrain during continuous pan/orbit/zoom;
- readable 2D-style names, flags, verified marks, and troop counts;
- exact normal leaderboard and alliance UI;
- valid, invalid, snapped, stacking, range, upgrade, and targeting previews;
- correctly anchored buildings, vehicles, ships, aircraft, trains, and projectiles;
- ships moving bow-first in multiple directions;
- dark-green fallout remaining distinguishable from ordinary green territory;
- continuous terrain lighting without broad dark lines or chunk-edge bands;
- local bomb, fallout, fog, disaster, selection, and trajectory visuals.

Any failure becomes a focused failing automated test before its code fix.

- [ ] **Step 4: Capture the mobile visual matrix**

Repeat the overview, close zoom, placement, and alliance checks at 390x844. Verify no missing map edge, unreadable label scaling, clipped HUD, or disabled interaction. Confirm adaptive quality changes wave/model detail only.

- [ ] **Step 5: Add the v0.34.107 changelog entry**

Add this entry at the top of `resources/changelog.md`, adjusting claims downward if any visual gate remains unverified:

```md
## OpenBack v0.34.107 - Complete 3D Battlefield Parity

- Restored complete 3D map coverage, including Antarctica and partial map edges, with stable camera fitting and no hidden black terrain gaps.
- Reconnected 3D placement previews, snapping, ranges, trajectories, labels, and battlefield effects to the same authoritative systems used by 2D.
- Added a brighter cyan ocean with restrained animated waves and improved terrain relief while keeping every unit correctly anchored to land, water, rails, runways, or flight paths.
- Kept the leaderboard, alliance requests, menus, and HUD identical to their normal 2D presentation.

Created by **frootz jhklphy**.
```

- [ ] **Step 6: Run repository checks**

Run:

```powershell
npm run build-dev
npm run lint
npm test
git diff --check
```

Expected: every command exits `0`.

- [ ] **Step 7: Commit the verified release**

```powershell
git add resources/changelog.md src/client tests/client
git diff --cached --check
git commit -m "Release complete 3D battlefield parity"
```

- [ ] **Step 8: Push main and verify GitHub CI**

Run `git push origin main`, inspect the workflow run for the pushed commit, and wait until every required job succeeds. If CI fails, reproduce the exact failure locally, add or refine the focused regression test, fix it, commit, push, and wait for the replacement run.

Expected: the pushed `main` commit matches local HEAD and GitHub CI is fully green.

## Self-Review

- Spec coverage: terrain, Antarctica, camera fit, water, waves, relief, labels, placement, snapping, overlays, model anchoring, UI boundaries, desktop/mobile visual tests, changelog, and CI each have an owning task.
- Placeholder scan: the plan contains no deferred implementation placeholders; each behavior has an exact interface, test, command, or visual acceptance condition.
- Type consistency: `ThreeDSurfaceSampler` feeds `ThreeDProjection`, camera picking, unit placement, and placement ghosts; `ThreeDProjection` consumes `ThreeDCameraState` and returns the same `ScreenPoint` type used by the camera.
