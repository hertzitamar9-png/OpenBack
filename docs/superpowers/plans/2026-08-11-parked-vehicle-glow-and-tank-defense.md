# Parked Vehicle Glow and Tank Defense Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add parked Tank/Aircraft tile glows, preserve bomb immunity for Tanks, and slow moving Tanks by one-third inside hostile Defense Post coverage.

**Architecture:** Keep balance logic inside deterministic `TankExecution` using integer movement credits and the existing spatial unit grid. Derive parked glow visibility directly from synchronized `UnitState`, then render it through one lightweight instanced overlay pass shared by the existing 2D and 3D overlay pipelines.

**Tech Stack:** TypeScript, Vitest, WebGL2 instanced rendering, existing OpenBack deterministic simulation and renderer.

## Global Constraints

- Target release is OpenBack v0.34.122 and player-facing notes credit **frootz jhklphy**.
- Normal Tank movement remains 1.5 tiles per simulation tick; hostile Defense Post coverage changes it to exactly 1 tile per tick.
- Slowdown does not stack and never directly damages the Tank.
- Tank Mines remain the dedicated instant Tank counter.
- Nuclear blast radii, Tank damage, prices, pathfinding, and Defense Post range remain unchanged.
- Simulation logic must use deterministic integer arithmetic and existing synchronized state.
- Both 2D and 3D must consume the same parked-glow state.

---

### Task 1: Deterministic Defense Post slowdown

**Files:**

- Modify: `tests/core/executions/TankExecution.test.ts`
- Modify: `src/core/execution/TankExecution.ts`

**Interfaces:**

- Consumes: `Game.nearbyUnits(tile, range, UnitType.DefensePost)`, `Config.defensePostRange()`, `Player.isFriendly()`.
- Produces: private `isInsideHostileDefenseCoverage(tile: TileRef): boolean` used by `TankExecution.tick()`.

- [ ] **Step 1: Write failing movement tests**

Add helpers that build and launch a Tank, then assert exact movement after two active movement ticks. Cover one hostile completed post, two overlapping hostile posts, friendly/allied posts, an under-construction post, an out-of-range post, and speed restoration after the post is deleted.

```ts
test("hostile defense coverage slows a tank by one third without stacking", () => {
  const tank = buildAndLaunchTank();
  const post = defender.buildUnit(UnitType.DefensePost, game.ref(10, 5), {});
  const start = tank.tile();

  game.executeNextTick();
  game.executeNextTick();

  expect(game.manhattanDist(start, tank.tile())).toBe(2);
  expect(post.isActive()).toBe(true);
});
```

- [ ] **Step 2: Run the focused test and confirm RED**

Run: `npx vitest run tests/core/executions/TankExecution.test.ts`

Expected: the covered Tank still advances three tiles in two ticks.

- [ ] **Step 3: Implement the minimal deterministic coverage rule**

Add a single spatial query and change only the amount of movement credit earned per tick:

```ts
private isInsideHostileDefenseCoverage(tile: TileRef): boolean {
  return this.game
    .nearbyUnits(
      tile,
      this.game.config().defensePostRange(),
      UnitType.DefensePost,
    )
    .some(({ unit }) => !this.player.isFriendly(unit.owner()));
}

const movementCreditPerTick = this.isInsideHostileDefenseCoverage(
  this.tank.tile(),
)
  ? 2
  : 3;
this.movementCredit += movementCreditPerTick;
```

The unit grid already filters inactive and under-construction posts. A boolean `.some()` makes overlapping posts non-stacking.

- [ ] **Step 4: Run the focused test and confirm GREEN**

Run: `npx vitest run tests/core/executions/TankExecution.test.ts`

Expected: all Tank tests pass, including normal 1.5-tile speed and Tank Mine interception.

- [ ] **Step 5: Commit the independently testable simulation change**

```powershell
git add src/core/execution/TankExecution.ts tests/core/executions/TankExecution.test.ts
git commit -m "Slow tanks under hostile defense coverage"
```

---

### Task 2: Lock Tank bomb immunity with regression coverage

**Files:**

- Modify: `tests/core/executions/NukeExecution.test.ts`
- Verify: `src/core/execution/NukeExecution.ts`

**Interfaces:**

- Consumes: the existing unit-deletion exclusion for `UnitType.Tank`.
- Produces: regression proof covering Atom Bomb, Hydrogen Bomb, and MIRV warhead blast processing.

- [ ] **Step 1: Expand the existing bomb-immunity test matrix**

Convert the current Atom Bomb-only assertion to `test.each` for all blast types that enter nuclear unit-deletion logic. Keep an eligible nearby Plane as the positive control.

```ts
test.each([UnitType.AtomBomb, UnitType.HydrogenBomb, UnitType.MIRVWarhead])(
  "%s blasts destroy planes but not tanks",
  (bombType) => {
    // Build Plane and Tank on the blast tile, detonate, then assert:
    expect(plane.isActive()).toBe(false);
    expect(tank.isActive()).toBe(true);
  },
);
```

- [ ] **Step 2: Run the focused test**

Run: `npx vitest run tests/core/executions/NukeExecution.test.ts`

Expected: PASS. If any bomb type fails, repair only the shared unit-deletion exclusion in `NukeExecution.ts` and rerun until green.

- [ ] **Step 3: Commit the regression contract**

```powershell
git add tests/core/executions/NukeExecution.test.ts src/core/execution/NukeExecution.ts
git commit -m "Protect tank bomb immunity with regression tests"
```

---

### Task 3: Derive parked vehicle glow state

**Files:**

- Create: `src/client/render/gl/passes/ParkedVehicleGlowPass.ts`
- Create: `tests/client/render/gl/ParkedVehicleGlowPass.test.ts`

**Interfaces:**

- Consumes: `UnitState.isActive`, `UnitState.unitType`, `UnitState.loaded`, `UnitState.underConstruction`, `UT_TANK`, and `UT_PLANE`.
- Produces: `isParkedVehicleGlow(unit: UnitState): boolean` and `ParkedVehicleGlowPass.update(units)`.

- [ ] **Step 1: Write failing state-derivation tests**

```ts
expect(isParkedVehicleGlow(unit({ unitType: UT_TANK, loaded: true }))).toBe(
  true,
);
expect(isParkedVehicleGlow(unit({ unitType: UT_TANK, loaded: false }))).toBe(
  false,
);
expect(
  isParkedVehicleGlow(
    unit({ unitType: UT_PLANE, loaded: false, underConstruction: true }),
  ),
).toBe(true);
expect(isParkedVehicleGlow(unit({ unitType: UT_PLANE, loaded: true }))).toBe(
  true,
);
expect(isParkedVehicleGlow(unit({ unitType: UT_PLANE, loaded: false }))).toBe(
  false,
);
expect(isParkedVehicleGlow(unit({ isActive: false, loaded: true }))).toBe(
  false,
);
```

- [ ] **Step 2: Run the new test and confirm RED**

Run: `npx vitest run tests/client/render/gl/ParkedVehicleGlowPass.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure predicate first**

```ts
export function isParkedVehicleGlow(unit: UnitState): boolean {
  if (!unit.isActive) return false;
  if (unit.unitType === UT_TANK) return unit.loaded === true;
  if (unit.unitType === UT_PLANE) {
    return unit.loaded === true || unit.underConstruction;
  }
  return false;
}
```

- [ ] **Step 4: Run the predicate tests and confirm GREEN**

Run: `npx vitest run tests/client/render/gl/ParkedVehicleGlowPass.test.ts`

Expected: all parked/loading/launch/removal cases pass.

---

### Task 4: Render the shared 2D/3D owner-colored glow

**Files:**

- Create: `src/client/render/gl/shaders/parked-vehicle-glow/parked-vehicle-glow.vert.glsl`
- Create: `src/client/render/gl/shaders/parked-vehicle-glow/parked-vehicle-glow.frag.glsl`
- Complete: `src/client/render/gl/passes/ParkedVehicleGlowPass.ts`
- Modify: `src/client/render/gl/Renderer.ts`

**Interfaces:**

- Consumes: the predicate from Task 3, renderer camera matrices, map width, player palette colors, and synchronized `UnitState.pos`.
- Produces: one instanced radial-glow draw pass with `update(units)`, `draw(camera, frameTick)`, and `dispose()`.

- [ ] **Step 1: Add minimal instanced shader pair**

The vertex shader expands a centered world-space quad around each parked tile and passes owner color plus radial UV. The fragment shader renders a soft center-to-edge alpha falloff multiplied by a bounded pulse derived from `frameTick`.

```glsl
float distanceFromCenter = length(vUv - vec2(0.5)) * 2.0;
float falloff = 1.0 - smoothstep(0.25, 1.0, distanceFromCenter);
float pulse = 0.72 + 0.18 * sin(uTick * 0.12);
outColor = vec4(vOwnerColor * pulse, falloff * 0.55 * pulse);
```

- [ ] **Step 2: Pack only parked/loading vehicles**

In `ParkedVehicleGlowPass.update`, skip every state for which `isParkedVehicleGlow` is false. Store world x/y and the owner palette RGB in a reusable typed array, then upload once per simulation update.

- [ ] **Step 3: Integrate one pass into both renderer modes**

Construct the pass beside the other overlay passes, call `update(units)` from `Renderer.updateUnits`, draw it before structures in `renderOverlays`, and dispose it with the renderer. Because both 2D and 3D call `renderOverlays`, do not add a second 3D-specific state path.

- [ ] **Step 4: Verify test, type, and build integration**

Run:

```powershell
npx vitest run tests/client/render/gl/ParkedVehicleGlowPass.test.ts
npx tsc --noEmit
npm run build-dev
```

Expected: predicate tests, TypeScript, shader imports, and development build pass.

- [ ] **Step 5: Commit renderer delivery**

```powershell
git add src/client/render/gl/passes/ParkedVehicleGlowPass.ts src/client/render/gl/shaders/parked-vehicle-glow tests/client/render/gl/ParkedVehicleGlowPass.test.ts src/client/render/gl/Renderer.ts
git commit -m "Show parked tank and aircraft glows"
```

---

### Task 5: Release notes and complete validation

**Files:**

- Modify: `resources/changelog.md`

**Interfaces:**

- Consumes: completed simulation and renderer changes.
- Produces: OpenBack v0.34.122 player-facing release entry credited to **frootz jhklphy**.

- [ ] **Step 1: Add the changelog entry at the top**

Describe only player-visible behavior: parked vehicle glows, Tank Mine counter clarity, Tank bomb immunity, and the one-third Defense Post slowdown. Do not include internal implementation details.

- [ ] **Step 2: Run focused regression tests**

```powershell
npx vitest run tests/core/executions/TankExecution.test.ts tests/core/executions/NukeExecution.test.ts tests/client/render/gl/ParkedVehicleGlowPass.test.ts
```

- [ ] **Step 3: Run repository quality gates**

```powershell
npx tsc --noEmit
npx prettier --check src/core/execution/TankExecution.ts tests/core/executions/TankExecution.test.ts tests/core/executions/NukeExecution.test.ts src/client/render/gl/passes/ParkedVehicleGlowPass.ts src/client/render/gl/shaders/parked-vehicle-glow tests/client/render/gl/ParkedVehicleGlowPass.test.ts src/client/render/gl/Renderer.ts resources/changelog.md
npm run lint
npm run build-dev
git diff --check
```

Expected: every command exits zero. Repair only failures caused by this release.

- [ ] **Step 4: Commit the release entry**

```powershell
git add resources/changelog.md
git commit -m "Release OpenBack v0.34.122"
```

- [ ] **Step 5: Push main and wait for GitHub CI**

```powershell
git push origin main
gh run list --branch main --limit 1
gh run watch <run-id> --exit-status
```

Expected: the pushed commit is the main branch head and its GitHub Actions run completes successfully.
