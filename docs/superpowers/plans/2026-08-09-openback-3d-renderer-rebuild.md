# OpenBack 3D Renderer Rebuild Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace the unstable 3D presentation with a solid tabletop renderer whose terrain, camera, tactical overlays, and real 3D unit models preserve complete 2D gameplay parity.

**Architecture:** Keep simulation state outside rendering. A shared `ThreeDCameraState` supplies exact projection and pointer rays; stable world-coordinate terrain chunks provide fixed geometry and hysteretic LOD; an instanced model catalog renders faithful OpenBack pieces; the tactical overlay bridge consumes the same projection as the terrain.

**Tech Stack:** TypeScript, WebGL2, GLSL ES 3.00, Lit HUD overlays, typed arrays, instanced drawing, Vitest, browser screenshot and frame-recording playtests.

## Global Constraints

- Preserve gameplay, deterministic simulation, multiplayer turns, replays, fog visibility, and targeting rules exactly.
- Existing 2D artwork is the visual source of truth for every model.
- 3D initialization failure returns to 2D instead of leaving a black screen.
- Adaptive quality changes presentation cost only, never available information or gameplay timing.
- Every user-facing change adds an OpenBack release entry credited to **frootz jhklphy**.
- Preserve AGPL, corresponding-source, asset-license, copyright, and contributor notices.

## File Structure

- `src/client/render/gl/three-d/ThreeDCamera.ts`: camera pose, matrices, projection, rays, bounds, and clipping planes.
- `src/client/render/gl/three-d/ThreeDTerrainChunks.ts`: fixed chunk layout, visibility, LOD selection, dirty regions, and stitching.
- `src/client/render/gl/three-d/ThreeDTerrainMesh.ts`: shared grid/skirt buffers and chunk instance uploads.
- `src/client/render/gl/passes/ThreeDCompositePass.ts`: sky, solid base, water/terrain materials, and terrain drawing.
- `src/client/render/gl/three-d/ThreeDGeometry.ts`: reusable custom low-poly mesh builders.
- `src/client/render/gl/three-d/ThreeDModelRegistry.ts`: faithful unit definitions and LODs.
- `src/client/render/gl/three-d/ThreeDUnitPass.ts`: instanced unit parts, owner material, animation, and culling.
- `src/client/TransformHandler.ts` and `src/client/InputHandler.ts`: cursor-anchored movement and orbit gestures.
- `src/client/render/gl/Renderer.ts`: common projection for every 3D pass and fallback behavior.

---

### Task 1: Canonical 3D Camera Contract

**Files:**

- Create: `src/client/render/gl/three-d/ThreeDCamera.ts`
- Modify: `src/client/render/gl/three-d/ThreeDWorldMath.ts`
- Modify: `tests/client/TransformHandler3D.test.ts`
- Create: `tests/client/render/ThreeDCamera.test.ts`

**Interfaces:**

- Produces: `ThreeDCameraState.create(input): ThreeDCameraState`.
- Produces: `.project(world: Vec3): ScreenPoint | null`, `.screenRay(x, y): Ray`, `.intersectHeightField(x, y, sampler): Vec3 | null`, `.viewProjection`, `.frustum`, `.near`, and `.far`.

- [ ] **Step 1: Write failing camera symmetry, clipping, and projection tests**

```ts
it("keeps shallow forward and backward views above the board", () => {
  for (const yaw of [0, Math.PI]) {
    const camera = ThreeDCameraState.create(fixture({ yaw, pitch: MIN_PITCH }));
    expect(camera.position.y).toBeGreaterThan(MAX_WORLD_HEIGHT);
    expect(camera.up.y).toBeGreaterThan(0);
  }
});

it("round-trips a terrain point through screen projection", () => {
  const screen = camera.project({ x: 700, y: 18, z: 400 })!;
  expect(
    camera.intersectHeightField(screen.x, screen.y, () => 18),
  ).toMatchObject({ x: closeTo(700), z: closeTo(400) });
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/client/render/ThreeDCamera.test.ts tests/client/TransformHandler3D.test.ts`

Expected: no canonical camera object exists and current forward/backward math is asymmetric.

- [ ] **Step 3: Implement explicit view/projection matrices and finite guards**

Use a horizontal XZ battlefield with Y as height. Derive position from target, yaw, pitch, and distance. Clamp pitch to `[0.38, Math.PI / 2 - 0.035]`, distance to a positive finite range, near to `max(0.1, distance * 0.0005)`, and far to the distance from camera to the farthest padded map-bound corner plus maximum model/effect height.

- [ ] **Step 4: Implement exact screen rays and iterative height intersection**

Unproject near/far NDC points through the inverse view-projection matrix. Intersect sea level first, then perform four bounded heightfield refinements. Return null for parallel, behind-camera, or non-finite intersections.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/client/render/ThreeDCamera.test.ts tests/client/TransformHandler3D.test.ts`

Expected: projection, ray, symmetry, pole, near/far, and finite-state tests pass.

- [ ] **Step 6: Commit the camera contract**

```powershell
git add src/client/render/gl/three-d/ThreeDCamera.ts src/client/render/gl/three-d/ThreeDWorldMath.ts tests/client/render/ThreeDCamera.test.ts tests/client/TransformHandler3D.test.ts
git commit -m "Add canonical 3D camera projection"
```

### Task 2: Cursor-Anchored Pan, Orbit, and Zoom

**Files:**

- Modify: `src/client/TransformHandler.ts`
- Modify: `src/client/InputHandler.ts`
- Modify: `src/client/ClientGameRunner.ts`
- Test: `tests/client/InputHandlerGestureZoom.test.ts`
- Test: `tests/client/TransformHandler3D.test.ts`

**Interfaces:**

- Consumes: `ThreeDCameraState.screenRay` and `.intersectHeightField`.
- Produces: `beginThreeDPan(screenX, screenY)`, `updateThreeDPan(screenX, screenY)`, and `endThreeDPan()`.

- [ ] **Step 1: Write failing drag-anchor and right-click tests**

```ts
it.each(CAMERA_POSES)(
  "keeps the picked ground under the cursor at %j",
  (pose) => {
    handler.setThreeDCamera(pose);
    const picked = handler.screenToWorldCoordinates(300, 220);
    handler.beginThreeDPan(300, 220);
    handler.updateThreeDPan(360, 255);
    expect(handler.worldToScreenCoordinates(picked)).toEqualCloseTo({
      x: 360,
      y: 255,
    });
  },
);
```

Keep the existing short-right-click test and add threshold boundary cases at one pixel below and above the drag threshold.

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/client/InputHandlerGestureZoom.test.ts tests/client/TransformHandler3D.test.ts`

Expected: delta compensation drifts from the cursor at shallow pitch.

- [ ] **Step 3: Replace delta compensation with picked-point pan state**

Extend `DragEvent` with current screen coordinates. At pointer-down capture the anchor. Each move computes the new ground intersection and offsets the target by `anchor - current`; then recompute once to remove residual height error. Clear pan state on pointer-up, pointer-cancel, multi-touch, modal capture, and game teardown.

- [ ] **Step 4: Keep target-fixed zoom and safe orbit limits**

Wheel changes distance/scale without changing target. Right-drag changes yaw and pitch through the canonical camera clamps. Preserve short right-click menus and suppress only the completed drag gesture.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/client/InputHandlerGestureZoom.test.ts tests/client/TransformHandler3D.test.ts`

Expected: anchored panning passes across pose/zoom fixtures and context-menu tests remain green.

- [ ] **Step 6: Commit controls**

```powershell
git add src/client/TransformHandler.ts src/client/InputHandler.ts src/client/ClientGameRunner.ts tests/client/InputHandlerGestureZoom.test.ts tests/client/TransformHandler3D.test.ts
git commit -m "Make 3D camera movement cursor accurate"
```

### Task 3: Stable Terrain Chunk Layout and LOD

**Files:**

- Create: `src/client/render/gl/three-d/ThreeDTerrainChunks.ts`
- Create: `tests/client/render/ThreeDTerrainChunks.test.ts`
- Modify: `src/client/render/gl/three-d/ThreeDWorldMath.ts`

**Interfaces:**

- Produces: `TerrainChunkKey { x: number; y: number; lod: 0 | 1 | 2 | 3 }`.
- Produces: `ThreeDTerrainChunks.visible(camera, viewport): readonly TerrainChunkKey[]`.
- Produces: `.markDirty(tileBounds)` and `.consumeDirty()`.

- [ ] **Step 1: Write failing stability, Antarctica, and hysteresis tests**

```ts
it("does not change chunk origins during sub-chunk camera movement", () => {
  expect(keysFor(center(1000, 500))).toEqual(keysFor(center(1007, 506)));
});

it("keeps the complete Antarctic edge available", () => {
  expect(visibleAtSouthEdge.some((c) => c.worldBottom >= mapHeight)).toBe(true);
});

it("holds the previous LOD inside the hysteresis band", () => {
  expect(selector.choose(errorNearThreshold, 2)).toBe(2);
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/client/render/ThreeDTerrainChunks.test.ts`

Expected: current terrain uses one camera-centered mesh and has no chunks or hysteresis.

- [ ] **Step 3: Implement fixed 128-tile chunk coordinates**

Chunk world bounds are derived solely from integer map coordinates. Expand frustum tests by `THREE_D_MAX_TERRAIN_HEIGHT` and a one-chunk safety ring. Include partial edge chunks instead of truncating map width or height.

- [ ] **Step 4: Implement LOD selection with hysteresis and neighbor balancing**

Use LOD steps `[1, 2, 4, 8]`. Choose by projected tile size, retain the previous LOD within a 20% threshold band, and iteratively constrain adjacent chunks to at most one LOD level difference.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/client/render/ThreeDTerrainChunks.test.ts`

Expected: stable keys, edge coverage, culling, LOD hysteresis, and neighbor balance pass.

- [ ] **Step 6: Commit chunk layout**

```powershell
git add src/client/render/gl/three-d/ThreeDTerrainChunks.ts src/client/render/gl/three-d/ThreeDWorldMath.ts tests/client/render/ThreeDTerrainChunks.test.ts
git commit -m "Anchor 3D terrain chunks to the world"
```

### Task 4: Chunked Terrain Mesh, Solid Base, and Materials

**Files:**

- Create: `src/client/render/gl/three-d/ThreeDTerrainMesh.ts`
- Modify: `src/client/render/gl/passes/ThreeDCompositePass.ts`
- Modify: `src/client/render/gl/Renderer.ts`
- Create: `tests/client/render/ThreeDTerrainMesh.test.ts`

**Interfaces:**

- Consumes: visible `TerrainChunkKey[]`, terrain/tile/trail textures, and canonical camera matrices.
- Produces: fixed shared grid buffers, stitched/skirt indices, solid base/side draw calls, and dirty chunk uploads.

- [ ] **Step 1: Write failing seam, solid-edge, and draw-selection tests**

```ts
it("shares identical edge heights between adjacent LOD chunks", () => {
  expect(rightEdge(leftChunk)).toEqual(leftEdge(rightChunk));
});

it("builds side walls for partial outer-map chunks", () => {
  expect(meshForSouthEdge.sideIndexCount).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/client/render/ThreeDTerrainMesh.test.ts`

Expected: current pass has only one moving surface and no base geometry.

- [ ] **Step 3: Implement shared LOD grids and fixed-world shader sampling**

Each submitted chunk supplies integer origin, valid extent, LOD step, and neighbor LOD mask. The vertex shader samples the exact terrain coordinate and a fixed normal neighborhood; it never derives sample radius from camera distance or movement.

- [ ] **Step 4: Add stitched edges, skirts, base, and map side walls**

Use stitched indices when the neighbor is one level coarser and a short downward skirt as numerical protection. Draw a solid dark base below minimum water height and vertical walls around the map rectangle. Enable back-face culling only after verifying winding for every camera yaw.

- [ ] **Step 5: Rebuild stable terrain materials**

Preserve owner tint while deriving green lowlands, exposed rock, snow, volcanic terrain, shore, and water from stable height/terrain bytes. Increase base relief uniformly and apply only a continuous distance readability multiplier to rendered height; the CPU projection uses the same function.

- [ ] **Step 6: Run focused tests and build**

Run: `npx vitest run tests/client/render/ThreeDTerrainMesh.test.ts tests/client/TransformHandler3D.test.ts && npm run build-dev`

Expected: mesh tests and build pass without shader compilation errors.

- [ ] **Step 7: Commit terrain rendering**

```powershell
git add src/client/render/gl/three-d/ThreeDTerrainMesh.ts src/client/render/gl/passes/ThreeDCompositePass.ts src/client/render/gl/Renderer.ts tests/client/render/ThreeDTerrainMesh.test.ts
git commit -m "Render solid stable 3D terrain chunks"
```

### Task 5: One Projection for Tactical Overlays

**Files:**

- Modify: `src/client/render/gl/Renderer.ts`
- Modify: `src/client/render/gl/passes/NukeTelegraphPass.ts`
- Modify: `src/client/render/gl/passes/SpawnOverlayPass.ts`
- Modify: `src/client/render/gl/three-d/ThreeDFogPass.ts`
- Modify: `src/client/render/gl/three-d/ThreeDWorldEventPass.ts`
- Modify: relevant name/bar/path shader inputs.
- Create: `tests/client/render/ThreeDOverlayProjection.test.ts`

**Interfaces:**

- Consumes: `ThreeDCameraState.project` and `viewProjection`.
- Removes: approximate `makeThreeDBillboardCamera` and `makeThreeDLabelCamera` matrices.

- [ ] **Step 1: Write failing parity tests for representative anchors**

```ts
it.each(["name", "flag", "shipPath", "range", "spawn", "nuke"])(
  "projects %s through the canonical camera",
  (kind) =>
    expect(projectOverlay(kind, WORLD_POINT)).toEqualCloseTo(
      camera.project(WORLD_POINT),
    ),
);
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/client/render/ThreeDOverlayProjection.test.ts`

Expected: label/billboard approximations disagree with perspective projection.

- [ ] **Step 3: Route every 3D world pass through the canonical matrix**

Pass the same view-projection matrix and terrain-height function to units, effects, trajectories, ranges, fog, world events, spawn overlays, names, flags, bars, and world text. For screen-facing elements, project one world anchor and render the established 2D glyph layout in screen space.

- [ ] **Step 4: Restore 2D typography and spacing**

Remove 3D-only per-character blocks and oversized outlines. Keep flags, names, verified marks, and troop counts in the same horizontal order, baseline spacing, distance visibility, and scale thresholds as 2D.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/client/render/ThreeDOverlayProjection.test.ts tests/client/render`

Expected: all tactical anchors share one projection and legacy render tests pass.

- [ ] **Step 6: Commit overlay parity**

```powershell
git add src/client/render/gl/Renderer.ts src/client/render/gl/passes src/client/render/gl/three-d tests/client/render/ThreeDOverlayProjection.test.ts
git commit -m "Align 3D tactical overlays with 2D"
```

### Task 6: Custom Low-Poly Geometry Library

**Files:**

- Create: `src/client/render/gl/three-d/ThreeDGeometry.ts`
- Create: `tests/client/render/ThreeDGeometry.test.ts`
- Modify: `src/client/render/gl/three-d/ThreeDUnitPass.ts`

**Interfaces:**

- Produces: `ThreeDMeshData { positions; normals; indices; bounds }`.
- Produces builders: `box`, `beveledBox`, `cylinder`, `cone`, `wedge`, `wing`, `hull`, `trackedChassis`, `roof`, `barrel`, and `extrudedSilhouette`.

- [ ] **Step 1: Write failing geometry integrity tests**

```ts
it.each(GEOMETRY_BUILDERS)(
  "%s produces finite indexed triangles and normals",
  (_, build) => {
    const mesh = build();
    expect(mesh.indices.length % 3).toBe(0);
    expect([...mesh.positions, ...mesh.normals].every(Number.isFinite)).toBe(
      true,
    );
    expect(mesh.bounds.min.y).toBeLessThanOrEqual(mesh.bounds.max.y);
  },
);
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/client/render/ThreeDGeometry.test.ts`

Expected: custom geometry module does not exist.

- [ ] **Step 3: Implement reusable mesh builders with correct normals/winding**

Each builder returns typed arrays and an AABB. `extrudedSilhouette` accepts a hand-authored convex 2D outline plus depth; triangulate its front/back faces and join edges. Keep all geometry centered at local origin with Y up.

- [ ] **Step 4: Replace primitive VAO creation with geometry registry batching**

Create one VAO per geometry/material family, retain owner tint as instance data, and preserve existing animation-part transforms. Cache and dispose buffers explicitly.

- [ ] **Step 5: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/client/render/ThreeDGeometry.test.ts tests/client/render/ThreeDModelRegistry.test.ts`

Expected: geometry and existing model transform tests pass.

- [ ] **Step 6: Commit geometry library**

```powershell
git add src/client/render/gl/three-d/ThreeDGeometry.ts src/client/render/gl/three-d/ThreeDUnitPass.ts tests/client/render/ThreeDGeometry.test.ts
git commit -m "Add faithful low poly unit geometry"
```

### Task 7: Faithful Complete 3D Model Catalog

**Files:**

- Modify: `src/client/render/gl/three-d/ThreeDModelRegistry.ts`
- Modify: `src/client/render/gl/three-d/ThreeDUnitPass.ts`
- Modify: `tests/client/render/ThreeDModelRegistry.test.ts`
- Create: `tests/client/render/ThreeDModelSnapshots.test.ts`

**Interfaces:**

- Produces: close and distant `ThreeDModelDefinition` for every `UnitType`.
- Each definition declares geometry, transform, material, owner-color role, animation channel, footprint, altitude, and orientation axis.

- [ ] **Step 1: Write failing completeness and distinct-silhouette tests**

```ts
for (const type of ALL_UNIT_TYPES) {
  it(`${type} has close and distant faithful models`, () => {
    const model = threeDModel(type);
    expect(model.lods.map((l) => l.maxScreenSize)).toEqualSortedDescending();
    expect(model.parts.length).toBeGreaterThan(1);
    expect(model.signature).not.toBe(GENERIC_BOX_SIGNATURE);
  });
}
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/client/render/ThreeDModelRegistry.test.ts tests/client/render/ThreeDModelSnapshots.test.ts`

Expected: existing generic primitive definitions have no LODs and several cube-like signatures.

- [ ] **Step 3: Rebuild economic and defensive structures**

Create distinct city towers/roofs, factory hall/chimneys, port pier/crane, defense emplacement/turret, silo doors/missile, SAM vehicle/launcher tubes, runway markings/lights, MANPAD operator/launcher silhouette, military base buildings/radar, and tank-mine geometry faithful to their 2D icons.

- [ ] **Step 4: Rebuild moving vehicles and weapons**

Create tracked tank chassis with road wheels, turret and barrel; aircraft fuselage, nose, cockpit, swept wings, tailplane, and fins; transport/trade/warship hulls and superstructures; camouflaged locomotive/carriages and missile-nose engine; atom, hydrogen, MIRV, warhead, and SAM missile bodies/fins.

- [ ] **Step 5: Add close/distant LOD and animation sockets**

Keep defining silhouettes in distant LODs while removing small detail. Declare sockets for turret rotation, wheels/tracks, aircraft banking, ship hover, train movement, missile orientation, launch, interception, crash, and destruction effects.

- [ ] **Step 6: Run model tests and generated snapshot renders**

Run: `npx vitest run tests/client/render/ThreeDModelRegistry.test.ts tests/client/render/ThreeDModelSnapshots.test.ts`

Expected: complete unique catalog and deterministic rendered model snapshots pass.

- [ ] **Step 7: Commit the model catalog**

```powershell
git add src/client/render/gl/three-d/ThreeDModelRegistry.ts src/client/render/gl/three-d/ThreeDUnitPass.ts tests/client/render/ThreeDModelRegistry.test.ts tests/client/render/ThreeDModelSnapshots.test.ts
git commit -m "Rebuild every OpenBack unit as a real 3D model"
```

### Task 8: Render-State Isolation, Context Recovery, and Adaptive Quality

**Files:**

- Modify: `src/client/render/gl/Renderer.ts`
- Modify: `src/client/render/gl/MapRenderer.ts`
- Modify: `src/client/ClientGameRunner.ts`
- Create: `src/client/render/gl/three-d/ThreeDQuality.ts`
- Create: `tests/client/render/ThreeDQuality.test.ts`
- Test: relevant renderer context-loss tests.

**Interfaces:**

- Produces: `ThreeDQualityController.sample(frameMs): ThreeDQualityTier` with hysteresis.
- Produces: context restoration hooks for chunks, instances, textures, and camera.

- [ ] **Step 1: Write failing state-leak, quality, and restore tests**

```ts
it("does not change quality for one slow frame", () => {
  const quality = new ThreeDQualityController("high");
  quality.sample(80);
  expect(quality.tier).toBe("high");
});

it("recreates terrain and unit buffers after context restore", () => {
  loseAndRestoreContext(renderer);
  expect(renderer.debugSceneCounts()).toEqual(beforeLossCounts);
});
```

- [ ] **Step 2: Run focused tests and confirm RED**

Run: `npx vitest run tests/client/render/ThreeDQuality.test.ts tests/client/render`

Expected: no quality controller and incomplete new-resource restoration.

- [ ] **Step 3: Guard WebGL state per pass**

Set and restore framebuffer, viewport, depth test/function/write, blending/function, culling/front face, active textures, VAO, and program explicitly at pass boundaries. Clear depth once before opaque world drawing, not between terrain and units.

- [ ] **Step 4: Add measured adaptive tiers**

Use a two-second moving frame-time window and five-second recovery hysteresis. Tiers adjust distant model LOD, effect particle count, shadow detail, and maximum terrain LOD only. Labels, paths, ranges, fog visibility, and simulation updates never change.

- [ ] **Step 5: Restore all 3D resources after context loss**

Recreate chunk grids, terrain/base buffers, unit geometry/instances, shader programs, palette/state textures, camera state, and dirty markers. If restoration fails, dispose the 3D view and restart presentation in 2D while the match continues.

- [ ] **Step 6: Run focused tests and confirm GREEN**

Run: `npx vitest run tests/client/render/ThreeDQuality.test.ts tests/client/render && npm run build-dev`

Expected: quality hysteresis, state isolation, restore, fallback, and build pass.

- [ ] **Step 7: Commit robustness and quality scaling**

```powershell
git add src/client/render/gl src/client/ClientGameRunner.ts tests/client/render
git commit -m "Stabilize and scale the 3D renderer"
```

### Task 9: Visual Playtest, Release Notes, and Complete Verification

**Files:**

- Modify: `resources/changelog.md`
- Add: deterministic screenshot fixtures only if the existing test convention stores them in-repo.

- [ ] **Step 1: Add the next OpenBack release entry**

Describe the stable terrain, cursor-anchored camera, full-map coverage, clean tactical labels, faithful 3D model catalog, and adaptive rendering. Credit **frootz jhklphy**.

- [ ] **Step 2: Run continuous desktop camera recordings**

Record pan, orbit, and zoom on Earth at top-down, default, minimum forward pitch, and minimum backward pitch. Review frame-by-frame for terrain swimming, LOD popping, z-fighting, black frames, label jitter, transparent ground, and exposed underside.

- [ ] **Step 3: Run map and unit visual matrix**

Capture minimum/normal/maximum zoom on Earth, Giant Earth, Shattered Expanse, and one compact map; include Antarctica and all map corners. Capture every buildable and moving unit, dense ships, trains, aircraft, tanks, missiles, spawn markers, paths, radii, fog, and natural disasters.

- [ ] **Step 4: Run mobile visual/performance matrix**

Verify portrait and landscape controls, one- and two-finger gestures, safe HUD layout, context-menu behavior, stable terrain, and adaptive tiers without missing tactical information.

- [ ] **Step 5: Run complete repository gates**

Run:

```powershell
npm run gen-maps
npm run format:check
npm run lint
npm run build-dev
npm test
git diff --check
```

Expected: every command exits zero, generated maps are unchanged unless intended, and no test is skipped to obtain green status.

- [ ] **Step 6: Commit release documentation**

```powershell
git add resources/changelog.md
git commit -m "Release the rebuilt OpenBack 3D world"
```
