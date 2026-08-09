# Production 3D Assets and Visual Parity Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship real locally bundled 3D models for every unit and restore placement previews, stack counts, progress bars, trajectories, effects, modifiers, and role-specific animations in 3D mode.

**Architecture:** Keep deterministic game state unchanged. Convert licensed source assets to optimized GLB, load their mesh/node data only for 3D matches, and drive presentation through a state-to-animation adapter. Reuse the authoritative 2D overlay calculations through a terrain-aware 3D projection layer.

**Tech Stack:** TypeScript 6, Vite 8, WebGL2, GLB/glTF 2.0, Vitest, Meshopt-compatible assets, existing OpenBack renderer and simulation.

## Global Constraints

- Work directly on `main` because the user explicitly requested one branch only.
- Every user-facing commit updates `resources/changelog.md` and credits **frootz jhklphy**.
- Preserve deterministic gameplay, multiplayer synchronization, AGPL obligations, attribution, and asset-license notices.
- Never hotlink runtime assets; ship verified local files with checksums and license metadata.
- 2D mode must not load the 3D asset bundle.
- No unit may fall back to a generated cube when 3D mode is enabled.

---

### Task 1: Selector visual parity

**Files:**

- Modify: `src/client/CosmeticsInput.ts`
- Modify: `src/client/FlagInput.ts`
- Test: `tests/client/SelectorInputStyle.test.ts`

**Interfaces:**

- Produces: matching borderless `flag-input` and `cosmetics-input` resting styles with hover/focus elevation.

- [ ] **Step 1: Write failing style assertions**

```ts
expect(cosmeticsSource).not.toContain("border-blue");
expect(cosmeticsSource).toContain("border-0");
expect(flagSource).toContain("hover:-translate-y-0.5");
expect(cosmeticsSource).toContain("hover:-translate-y-0.5");
```

- [ ] **Step 2: Run `npx vitest run tests/client/SelectorInputStyle.test.ts` and confirm failure.**
- [ ] **Step 3: Apply identical borderless rest, hover lift, brightness, shadow, and `focus-visible` ring classes to both controls.**
- [ ] **Step 4: Rerun the focused test and confirm pass.**

### Task 2: Licensed asset manifest and validation

**Files:**

- Create: `resources/3d/manifest.json`
- Create: `resources/3d/THIRD_PARTY_ASSETS.md`
- Create: `src/client/render/gl/three-d/ThreeDAssetManifest.ts`
- Create: `tests/client/render/ThreeDAssetManifest.test.ts`
- Modify: `CREDITS.md`
- Modify: `vite.config.ts`

**Interfaces:**

- Produces: `threeDAsset(type: UnitType): ThreeDAssetDefinition`.
- `ThreeDAssetDefinition` contains `url`, `sha256`, `license`, `sourceUrl`, `creator`, `scale`, `rotation`, `anchors`, `nodes`, and `animations`.

- [ ] **Step 1: Write a failing test that iterates all `Object.values(UnitType)` and requires one local `.glb`, checksum, source, and redistribution license per type.**
- [ ] **Step 2: Run the test and confirm all missing entries are reported.**
- [ ] **Step 3: Download only approved CC0/CC-BY source packs, preserve their original license files, convert selected meshes to GLB, and calculate SHA-256 checksums.**
- [ ] **Step 4: Populate the manifest for all 22 unit types and expose validated typed accessors.**
- [ ] **Step 5: Rerun the manifest test and verify every referenced local file exists and its checksum matches.**

### Task 3: GLB mesh and animation loader

**Files:**

- Create: `src/client/render/gl/three-d/GltfBinary.ts`
- Create: `src/client/render/gl/three-d/ThreeDAssetLoader.ts`
- Test: `tests/client/render/GltfBinary.test.ts`
- Test: `tests/client/render/ThreeDAssetLoader.test.ts`

**Interfaces:**

- Produces: `loadThreeDAsset(definition): Promise<LoadedThreeDAsset>`.
- `LoadedThreeDAsset` exposes normalized primitives, materials, node hierarchy, animation channels, bounds, and named anchors.

- [ ] **Step 1: Add a tiny licensed fixture GLB and failing tests for header, JSON/BIN chunks, accessors, indices, normals, nodes, and animation channels.**
- [ ] **Step 2: Run both tests and confirm parser/loader APIs are missing.**
- [ ] **Step 3: Implement strict GLB 2.0 parsing with bounds checks and typed accessor conversion.**
- [ ] **Step 4: Implement asset caching, owner-material remapping, node validation, and same-model lower-LOD fallback.**
- [ ] **Step 5: Rerun tests and confirm corrupt fixtures produce exact asset-specific errors.**

### Task 4: Real-model render pools and animation state

**Files:**

- Create: `src/client/render/gl/three-d/ThreeDAnimationController.ts`
- Create: `src/client/render/gl/three-d/ThreeDModelPool.ts`
- Modify: `src/client/render/gl/three-d/ThreeDUnitPass.ts`
- Retire: procedural unit construction in `src/client/render/gl/three-d/ThreeDModelRegistry.ts`
- Test: `tests/client/render/ThreeDAnimationController.test.ts`
- Test: `tests/client/render/ThreeDModelPool.test.ts`

**Interfaces:**

- Consumes: `LoadedThreeDAsset`, `UnitState`, current tick, and render time.
- Produces: pooled draw batches with per-node transforms and effect anchors.

- [ ] **Step 1: Write failing state tests for `constructing`, `idle`, `moving`, `attacking`, `reloading`, `damaged`, and `destroying`.**
- [ ] **Step 2: Add special failing tests for tank tracks/turret, plane runway/takeoff/bank/crash, train wheels/exhaust, ships/wakes, and missile orientation.**
- [ ] **Step 3: Implement deterministic state selection from `UnitState`; interpolate only visual transforms.**
- [ ] **Step 4: Replace procedural batches with static instancing plus pooled animated node instances and LOD hysteresis.**
- [ ] **Step 5: Verify all 22 types select real assets and no procedural cube fallback remains.**

### Task 5: Placement ghosts, stack counts, and progress overlays

**Files:**

- Create: `src/client/render/gl/three-d/ThreeDOverlayPass.ts`
- Modify: `src/client/render/gl/Renderer.ts`
- Modify: `src/client/render/gl/passes/BarPass.ts`
- Modify: `src/client/render/gl/passes/StructureLevelPass.ts`
- Modify: `src/client/controllers/BuildPreviewController.ts`
- Test: `tests/client/render/ThreeDOverlayPass.test.ts`

**Interfaces:**

- Produces: terrain-anchored ghosts and screen-facing counts/bars using the same values as 2D.

- [ ] **Step 1: Write failing tests requiring white valid ghosts, gray invalid ghosts, stack snap state, stack count, construction progress, reload readiness, and health/veterancy.**
- [ ] **Step 2: Confirm tests fail because the 2D matrix-only overlay path is used.**
- [ ] **Step 3: Move progress/count calculation into shared pure helpers used by both 2D and 3D passes.**
- [ ] **Step 4: Render the selected real model as the placement ghost and anchor counts/bars above its bounds.**
- [ ] **Step 5: Verify hover/placement state updates every pointer frame without stale gray/white state.**

### Task 6: Terrain-aware paths, radii, and trajectories

**Files:**

- Create: `src/client/render/gl/three-d/ThreeDProjection.ts`
- Create: `src/client/render/gl/three-d/ThreeDPathPass.ts`
- Modify: `src/client/render/gl/passes/RangeCirclePass.ts`
- Modify: `src/client/render/gl/passes/NukeTrajectoryPass.ts`
- Modify: `src/client/render/gl/passes/NukeTelegraphPass.ts`
- Modify: `src/client/render/gl/passes/TrailPass.ts`
- Test: `tests/client/render/ThreeDProjection.test.ts`

**Interfaces:**

- Produces: `projectTile`, `terrainPolyline`, `terrainDisc`, and `worldArc` from authoritative map coordinates.

- [ ] **Step 1: Write failing projection tests for finite discs, map-edge clipping, terrain height, arc endpoints, and unchanged tile-radius membership.**
- [ ] **Step 2: Implement shared terrain sampling and world-space tessellation with camera clipping.**
- [ ] **Step 3: Adapt range circles, ship/tank/plane paths, missile arcs, interception paths, and destinations.**
- [ ] **Step 4: Assert no trajectory vertex expands to map dimensions and damage-selected tiles match 2D exactly.**

### Task 7: Effects, cosmetics, fog, and disasters

**Files:**

- Create: `src/client/render/gl/three-d/ThreeDEffectBridge.ts`
- Modify: `src/client/render/gl/three-d/ThreeDFogPass.ts`
- Modify: `src/client/render/gl/three-d/ThreeDWorldEventPass.ts`
- Modify: `src/client/render/gl/passes/fx-pass/index.ts`
- Modify: `src/client/render/gl/Renderer.ts`
- Test: `tests/client/render/ThreeDEffectBridge.test.ts`

**Interfaces:**

- Consumes existing FX events/cosmetic selections and emits terrain-aware pooled particles/meshes.

- [ ] **Step 1: Build a failing parity matrix for wakes, smoke, fireballs, muzzle flashes, explosions, shockwaves, fallout, construction, destruction, and cosmetic effects.**
- [ ] **Step 2: Add failing modifier tests for fog, every natural disaster, living-world changes, radiation, and strategic objectives.**
- [ ] **Step 3: Implement anchor-driven 3D effects with identical timing, ownership visibility, and colors.**
- [ ] **Step 4: Apply fog to models, labels, paths, trajectories, and particles through one visibility predicate.**
- [ ] **Step 5: Verify every parity-matrix entry resolves to a 3D or intentional screen-facing renderer.**

### Task 8: Camera, performance, release, and deployment

**Files:**

- Modify: `src/client/TransformHandler.ts`
- Modify: `src/client/render/gl/three-d/ThreeDCamera.ts`
- Modify: `src/client/render/gl/three-d/ThreeDQuality.ts`
- Modify: `resources/changelog.md`
- Test: `tests/client/TransformHandler3D.test.ts`
- Test: `tests/client/render/ThreeDPerformanceBudget.test.ts`

**Interfaces:**

- Produces: stable closer zoom, model-aware near clearance, asset/effect budgets, and release notes.

- [ ] **Step 1: Write failing tests for the closer zoom limit, local bounds clearance, pan stability, map edges, and no underside exposure.**
- [ ] **Step 2: Implement model-aware camera clearance and retain fixed-plane close panning.**
- [ ] **Step 3: Add draw-call, geometry, texture, animation, and particle diagnostics with mobile/desktop budgets.**
- [ ] **Step 4: Add the OpenBack release note describing delivered player-visible behavior and crediting frootz jhklphy.**
- [ ] **Step 5: Run focused tests, full tests, lint, formatting, production build, generated-map check, browser playtests, and `git diff --check`.**
- [ ] **Step 6: Commit, push `main`, and wait for all GitHub CI jobs to complete successfully.**
