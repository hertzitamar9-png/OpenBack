# Integrated 3D World Repair Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make 3D input, models, trains, ships, terrain, water, tides, lighting, rails, fallout, and modifier effects agree with the authoritative OpenBack world while preserving 2D gameplay.

**Architecture:** Create one shared camera/surface projection contract used by rendering and input. Keep simulation deterministic and drive special visuals from existing ticks and updates; use classic billboards for most units and isolated 3D geometry only for ships, bombs, and the tank terminal sequence.

**Tech Stack:** TypeScript, Vitest, WebGL2/GLSL, Vite, existing OpenBack deterministic simulation and renderer.

## Global Constraints

- Tanks remain flat during travel; only the terminal turret, fired bomb, and explosion sequence is 3D.
- Do not change 2D targeting, prices, train payouts, aircraft rules, or combat balance.
- Visual interpolation and particles never affect multiplayer simulation state.
- Every player-facing release commit updates `resources/changelog.md` and credits **frootz jhklphy**.
- Preserve AGPL, corresponding source, copyright, attribution, and asset notices.

---

### Task 1: Shared 3D camera and exact targeting

**Files:**

- Create: `src/client/render/gl/three-d/ThreeDWorldFrame.ts`
- Modify: `src/client/TransformHandler.ts`
- Modify: `src/client/render/gl/Renderer.ts`
- Modify: `src/client/ClientGameRunner.ts`
- Test: `tests/client/render/ThreeDWorldFrame.test.ts`
- Test: `tests/client/TransformHandlerThreeD.test.ts`

**Interfaces:**

- Produces `ThreeDWorldFrame.create(state)`, `projectWorld(...)`, `intersectTerrain(...)`, `surfaceHeight(...)`, and `billboardBasis()`.
- Renderer and input consume the same `ThreeDWorldFrameState` values.

- [ ] Write failing matrix-equality, ray round-trip, map-edge, mountain, and missed-ray tests.
- [ ] Run focused tests and confirm failures identify duplicated camera state and center fallback.
- [ ] Implement the immutable frame and wire renderer/input to the same constructor contract.
- [ ] Resolve one pointer world coordinate per action and reuse it for preview, validation, and intent.
- [ ] Run focused tests and commit the projection repair.

### Task 2: Stable classic billboards and hybrid model boundaries

**Files:**

- Modify: `src/client/render/gl/Renderer.ts`
- Modify: `src/client/render/gl/passes/UnitPass.ts`
- Modify: `src/client/render/gl/passes/StructurePass.ts`
- Modify: `src/client/render/gl/three-d/ThreeDModelRegistry.ts`
- Modify: `src/client/render/gl/shaders/unit/unit.vert.glsl`
- Test: `tests/client/render/ThreeDUnitParity.test.ts`
- Test: `tests/client/render/gl/ClassicModelPipeline.test.ts`

**Interfaces:**

- Consumes `ThreeDWorldFrame.billboardBasis()` and `surfaceHeight()`.
- Produces stable sprite anchors and model eligibility for ships, bombs, and terminal tank effects only.

- [ ] Write failing tests proving yaw/pitch do not move a billboard anchor and normal tanks remain sprites.
- [ ] Run focused tests and verify the regressions fail.
- [ ] Replace the ground homography anchor shortcut with world projection plus screen-facing basis.
- [ ] Restrict 3D tank geometry to terminal self-destruction effect state.
- [ ] Run focused tests and commit stable billboard rendering.

### Task 3: Ship completion, heading, model, and wake

**Files:**

- Modify: `src/core/execution/TransportShipExecution.ts`
- Modify: `src/core/execution/WarshipExecution.ts`
- Modify: `src/client/render/gl/passes/UnitPass.ts`
- Modify: `src/client/render/gl/three-d/ThreeDModelRegistry.ts`
- Create: `src/client/render/gl/three-d/ThreeDShipWakePass.ts`
- Test: `tests/core/executions/TransportShipCurrentArrival.test.ts`
- Test: `tests/client/render/ThreeDShipPresentation.test.ts`

**Interfaces:**

- Completion is checked before `shipStepsForRoute(...)` can return zero.
- Wake pass consumes authoritative current/last positions and owner color.

- [ ] Write a failing current-zero arrival test that expects immediate `AttackExecution`.
- [ ] Write failing heading and wake lifecycle presentation tests.
- [ ] Move completion handling ahead of current throttling without changing intermediate travel.
- [ ] Restore the 3D hull, route-segment heading, and bounded owner-colored wake ribbon.
- [ ] Run focused tests and commit ship behavior.

### Task 4: Fuel rewards, train spacing, and terrain-following rails

**Files:**

- Modify: `src/core/game/TrainStation.ts`
- Modify: `src/client/view/GameView.ts`
- Modify: `src/client/render/gl/passes/UnitPass.ts`
- Modify: `src/client/render/gl/passes/RailroadPass.ts`
- Modify: `src/client/render/gl/passes/ThreeDCompositePass.ts`
- Test: `tests/core/game/TrainStation.test.ts`
- Test: `tests/client/render/ThreeDRailPresentation.test.ts`

**Interfaces:**

- Fuel stops retain `trainGold(...) / 2n` and emit `BonusEvent` at the station tile.
- Rail presentation consumes authoritative railroad paths and `ThreeDWorldFrame.surfaceHeight()`.

- [ ] Add a failing test asserting fuel payout amount, event player, event tile, and event gold.
- [ ] Add failing rail continuity and carriage-distance tests.
- [ ] Ensure bonus events reach both HUD pulse and world floating-gold presentation.
- [ ] Build joined twin-rail/sleeper geometry from densely sampled terrain-following paths.
- [ ] Restore classic normal train artwork and path-distance carriage spacing.
- [ ] Run focused tests and commit train and rail repairs.

### Task 5: OpenBack terrain, raised water, sky, and deterministic tide presentation

**Files:**

- Modify: `src/client/render/gl/shaders/terrain/war-table-terrain.frag.glsl`
- Modify: `src/client/render/gl/passes/ThreeDCompositePass.ts`
- Modify: `src/client/render/gl/three-d/ThreeDTerrainMesh.ts`
- Modify: `src/core/world/ThreeDWorldCycle.ts`
- Modify: `src/core/execution/WorldMechanicsExecution.ts`
- Test: `tests/client/render/ThreeDWaterCycle.test.ts`
- Test: `tests/client/render/ThreeDMaterialParity.test.ts`
- Test: `tests/core/world/ThreeDWorldCycle.test.ts`
- Test: `tests/core/executions/WorldMechanicsExecution.test.ts`

**Interfaces:**

- `threeDWorldCycle(tick)` remains the deterministic source for daylight, tide, waves, and currents.
- Rendering consumes interpolated phase but simulation consumes integer ticks.

- [ ] Write failing shader/source tests for distinct 2D palette, raised multi-wave geometry, foam, stars, dusk, and shared lighting.
- [ ] Write failing deterministic coast flood/restore tests covering ownership and replay-safe order.
- [ ] Implement the OpenBack 2D biome palette and shoreline details without touching tile state.
- [ ] Implement bounded Gerstner displacement, normals, crest foam, shore break, and retreat.
- [ ] Add continuous sky/day/night lighting and connect terrain, water, and special models.
- [ ] Preserve incremental deterministic tide flooding/restoration and test a complete cycle.
- [ ] Run focused tests and commit world presentation.

### Task 6: Bombs, terminal tank sequence, fallout, and modifiers

**Files:**

- Modify: `src/client/render/gl/three-d/ThreeDModelRegistry.ts`
- Modify: `src/client/render/gl/passes/fx-pass/index.ts`
- Modify: `src/client/render/gl/three-d/ThreeDWorldEventPass.ts`
- Modify: `src/client/render/gl/passes/ThreeDCompositePass.ts`
- Modify: `src/client/WebGLFrameBuilder.ts`
- Test: `tests/client/render/ThreeDSpecialEffects.test.ts`
- Test: `tests/client/render/ThreeDWorldEventPass.test.ts`

**Interfaces:**

- Special-effect progress derives from authoritative tick/event timestamps.
- Shared fallout colors feed both 2D and 3D shader paths.

- [ ] Write failing tests for 3D bomb eligibility, normal flat tank state, terminal turret/bomb sequence, dark-green fallout, and terrain-conforming modifiers.
- [ ] Implement terrain-anchored 3D bombs and bounded explosion geometry.
- [ ] Implement transient terminal tank turret, muzzle flash, round bomb arc, return, and explosion presentation.
- [ ] Share fallout palette constants and surface sampling across render modes.
- [ ] Make fog/disaster/world-event geometry conform to terrain and fixed budgets.
- [ ] Run focused tests and commit special-effect parity.

### Task 7: Browser visual playtest and release

**Files:**

- Modify: `resources/changelog.md`
- Update tests discovered during visual QA only when they reproduce a real defect.

**Interfaces:**

- Produces the next OpenBack patch release and exact-commit CI evidence.

- [ ] Add the top release entry describing only player-visible results and credit **frootz jhklphy**.
- [ ] Run focused suites, full `npm test`, lint, Prettier, production build, and `git diff --check` independently.
- [ ] Play desktop and mobile 2D/3D matches and capture input, train, ship, tide, day/night, bomb, tank, fallout, and modifier states.
- [ ] Inspect browser errors and long-match frame stability; convert discovered bugs into failing tests before fixing.
- [ ] Stage only intended files, commit, push `main`, and await all GitHub CI jobs for the exact commit.
