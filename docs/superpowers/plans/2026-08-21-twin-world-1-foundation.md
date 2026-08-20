# Twin World Stage 1: Experience Foundation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Introduce a normalized top-level `experienceMode` configuration and migrate every existing 3D behavior to it without exposing the Twin World switch yet.

**Architecture:** Wire schemas accept new `experienceMode` and legacy `worldMechanics.threeDMode`. `Config` normalizes both into one required `ExperienceMode`, and new serializers stop writing the legacy field. Existing renderer, pathfinding, and train behavior read the normalized accessor.

**Tech Stack:** TypeScript 6, Zod 4, Vitest, deterministic OpenBack simulation.

**Spec:** `docs/superpowers/specs/2026-08-21-twin-world-experiences-design.md`

## Global Constraints

- Wire values are exactly `"2d"` and `"3d"`.
- Legacy `threeDMode: true` normalizes to `3d`; all other legacy configurations normalize to `2d`.
- New configurations never serialize `worldMechanics.threeDMode`.
- Existing replays remain readable and deterministic.
- Aircraft landing and train-spacing semantics do not change.
- No player-visible selector is enabled during this stage.

---

### Task 1: Define and normalize ExperienceMode

**Files:**

- Modify: `src/core/Schemas.ts`
- Modify: `src/core/configuration/Config.ts`
- Create: `tests/core/ExperienceModeConfig.test.ts`

**Interfaces:**

- Produces: `ExperienceModeSchema`, `ExperienceMode`, `Config.experienceMode(): ExperienceMode`, and `normalizeExperienceMode(config): ExperienceMode`.

- [ ] **Step 1: Write failing normalization tests**

```ts
it.each([
  [{ experienceMode: "2d" }, "2d"],
  [{ experienceMode: "3d" }, "3d"],
  [{ worldMechanics: { threeDMode: true } }, "3d"],
  [{ worldMechanics: { threeDMode: false } }, "2d"],
  [{}, "2d"],
])("normalizes %# to %s", (input, expected) => {
  expect(normalizeExperienceMode(input)).toBe(expected);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/core/ExperienceModeConfig.test.ts`

Expected: FAIL because the schema and normalizer do not exist.

- [ ] **Step 3: Implement the schema and accessor**

```ts
export const ExperienceModeSchema = z.enum(["2d", "3d"]);
export type ExperienceMode = z.infer<typeof ExperienceModeSchema>;

export function normalizeExperienceMode(config: {
  experienceMode?: ExperienceMode;
  worldMechanics?: { threeDMode?: boolean };
}): ExperienceMode {
  return (
    config.experienceMode ??
    (config.worldMechanics?.threeDMode === true ? "3d" : "2d")
  );
}
```

Add `experienceMode` as an optional wire field to retain old-record parsing. `Config.experienceMode()` returns the normalized value. Keep the legacy field parse-only.

- [ ] **Step 4: Verify GREEN**

Run: `npx vitest run tests/core/ExperienceModeConfig.test.ts`

Expected: all explicit and legacy normalization cases pass.

- [ ] **Step 5: Commit**

```powershell
git add src/core/Schemas.ts src/core/configuration/Config.ts tests/core/ExperienceModeConfig.test.ts
git commit -m "Add Twin World experience configuration"
```

---

### Task 2: Stop new configuration writers from emitting threeDMode

**Files:**

- Modify: `src/client/SinglePlayerModal.ts`
- Modify: `src/client/HostLobbyModal.ts`
- Modify: `src/server/MapPlaylist.ts`
- Create: `tests/client/ExperienceModeSetupConfig.test.ts`
- Modify: `tests/server/MapPlaylist.test.ts`

**Interfaces:**

- Consumes: `ExperienceMode` from Task 1.
- Produces: `SinglePlayerModal.experienceMode` and `HostLobbyModal.experienceMode` inputs; generated configs write only top-level `experienceMode`.

- [ ] **Step 1: Write failing serialization tests**

```ts
expect(createdConfig.experienceMode).toBe("3d");
expect(createdConfig.worldMechanics).not.toHaveProperty("threeDMode");
expect(JSON.stringify(createdConfig)).not.toContain("threeDMode");
```

Cover Solo 2D, Solo 3D, Host 2D, Host 3D, and ranked playlist defaults.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/ExperienceModeSetupConfig.test.ts tests/server/MapPlaylist.test.ts`

Expected: failures show new configs still writing `worldMechanics.threeDMode`.

- [ ] **Step 3: Implement experience inputs behind the existing UI**

Add a public setter accepted before `open()`:

```ts
public setExperienceMode(mode: ExperienceMode): void {
  this.experienceMode = mode;
}
```

During this hidden foundation stage, the old checkbox may still call this setter for local developer compatibility, but config creation writes `experienceMode` only. Map playlists explicitly write `experienceMode: "2d"`.

- [ ] **Step 4: Verify GREEN**

Run the focused command from Step 2.

Expected: every new config contains one experience field and no legacy field.

- [ ] **Step 5: Commit**

```powershell
git add src/client/SinglePlayerModal.ts src/client/HostLobbyModal.ts src/server/MapPlaylist.ts tests/client/ExperienceModeSetupConfig.test.ts tests/server
git commit -m "Write experience mode in new games"
```

---

### Task 3: Migrate runtime 3D consumers

**Files:**

- Modify: `src/client/render/gl/Renderer.ts`
- Modify: `src/client/TransformHandler.ts`
- Modify: `src/client/InputHandler.ts`
- Modify: `src/client/ClientGameRunner.ts`
- Modify: `src/core/execution/TrainExecution.ts`
- Modify: `src/core/pathfinding/PathFinder.Air.ts`
- Modify: `src/client/view/GameView.ts`
- Modify: `tests/client/TransformHandler3D.test.ts`
- Modify: `tests/client/render/ThreeDTrainParity.test.ts`
- Modify: `tests/core/AirPathFinderTerrain.test.ts`

**Interfaces:**

- Consumes: `Config.experienceMode()`.
- Produces: all runtime checks use `experienceMode === "3d"`; no runtime consumer reads `worldMechanics().threeDMode`.

- [ ] **Step 1: Add a failing source/runtime audit**

```ts
expect(readRuntimeSources()).not.toMatch(/worldMechanics\(\)\.threeDMode/);
expect(isAircraftLandingTooHigh(game3d, mountain)).toBe(true);
expect(isAircraftLandingTooHigh(game2d, mountain)).toBe(false);
expect(trainVisualSpacing("3d")).toBe(3);
expect(trainVisualSpacing("2d")).toBe(2);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/TransformHandler3D.test.ts tests/client/render/ThreeDTrainParity.test.ts tests/core/AirPathFinderTerrain.test.ts`

Expected: consumers still require the legacy world-mechanics field.

- [ ] **Step 3: Replace runtime checks**

Change helpers to accept `ExperienceMode` where they currently accept a Boolean. Renderer activation becomes:

```ts
const is3d = config.experienceMode() === "3d";
```

Keep render cleanup, terrain landing thresholds, and spacing constants unchanged.

- [ ] **Step 4: Verify GREEN and audit**

Run the focused command from Step 2, then:

```powershell
rg -n "worldMechanics\(\)\.threeDMode|worldMechanics\?\.threeDMode" src
```

Expected: tests pass and only the legacy normalizer/schema mentions `threeDMode`.

- [ ] **Step 5: Commit**

```powershell
git add src tests
git commit -m "Run 3D behavior from experience mode"
```

---

### Task 4: Prove replay and protocol compatibility

**Files:**

- Create: `tests/core/ExperienceModeCompatibility.test.ts`
- Modify: replay/config fixtures under `tests/replay/` and `tests/core/fixtures/`
- Modify: `src/core/Schemas.ts` only if fixture validation exposes a missing compatibility rule.

**Interfaces:**

- Consumes: normalization from Task 1 and migrated runtime from Task 3.
- Produces: compatibility evidence for old 2D records, old 3D records, new 2D records, and new 3D records.

- [ ] **Step 1: Add four fixture tests**

```ts
expect(load(old2d).experienceMode()).toBe("2d");
expect(load(old3d).experienceMode()).toBe("3d");
expect(load(new2d).experienceMode()).toBe("2d");
expect(load(new3d).experienceMode()).toBe("3d");
expect(serialize(new3d)).not.toContain("threeDMode");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/core/ExperienceModeCompatibility.test.ts`

Expected: at least the new format or old 3D fixture fails before compatibility is complete.

- [ ] **Step 3: Complete compatibility without dual writes**

Adjust only parsing/normalization. Do not write both fields, mutate archived records, or add divergent simulation code.

- [ ] **Step 4: Verify stage**

Run:

```powershell
npx vitest run tests/core/ExperienceModeConfig.test.ts tests/core/ExperienceModeCompatibility.test.ts tests/client/ExperienceModeSetupConfig.test.ts tests/client/TransformHandler3D.test.ts tests/client/render/ThreeDTrainParity.test.ts tests/core/AirPathFinderTerrain.test.ts
npm run build-prod
npm run lint
npx prettier --check .
```

Expected: all focused tests and quality gates pass.

- [ ] **Step 5: Commit stage completion**

```powershell
git add src tests
git commit -m "Complete Twin World compatibility foundation"
```
