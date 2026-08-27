# Mobile Input, Adaptive HUD, and Private Analytics Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OpenBack mobile input deterministic and exact, make every phone HUD fit its usable viewport, and extend the owner-only analytics dashboard with private account, flag, country, clan, cosmetic, and engagement details.

**Architecture:** Introduce a pure touch-gesture arbiter, then make `InputHandler` the only producer of tap/hold/drag/multitouch intents and pass exact release screen coordinates through the existing `TransformHandler` once. Keep simulation targets exact in `ClientGameRunner`, centralize placement teardown in `BuildPreviewController`, and drive responsive HUD composition from capacity helpers plus CSS safe-area rules. Extend durable accounts with country-code-only offline GeoIP output and derive analytics from persisted accounts and authoritative match records.

**Tech Stack:** TypeScript, Lit, Vite, Vitest, WebGL overlays, Express, PostgreSQL JSONB, `geoip-country@5.0.202608252355`, CSS container/media queries, Browser plugin.

**Spec:** `docs/superpowers/specs/2026-08-27-mobile-input-hud-analytics-design.md`

## Global Constraints

- Preserve desktop input, deterministic simulation, multiplayer turns, 2D/3D quality, and public privacy boundaries.
- One physical touch sequence emits exactly one gesture result.
- Water never resolves to a replacement transport destination.
- Persist only a two-letter approximate country code, never an IP address or precise location.
- Only presence is player-visible; email, country, and engagement remain owner-only.
- Layout uses usable viewport, safe areas, and container capacity, never device-specific exceptions.
- Add the top OpenBack release entry and credit **frootz jhklphy**.
- Preserve AGPL, corresponding-source, copyright, assets, and contributor notices.
- Work on `main`; never stage `.codex-remote-attachments/` or `.codex/number = 7.py`.

## File responsibility map

- `src/client/input/MobileGestureArbiter.ts`: pure touch-session state machine.
- `src/client/input/PointerTarget.ts`: exact release-point-to-tile resolution through `TransformHandler`.
- `src/client/InputHandler.ts`: DOM pointer ownership and game-event emission.
- `src/client/ClientGameRunner.ts`: exact attack/transport targets.
- `src/client/controllers/BuildPreviewController.ts`: authoritative placement cleanup.
- `src/client/hud/layout/HudCapacity.ts`: pure responsive HUD decisions.
- `src/client/hud/layers/ControlPanel.ts`: bottom HUD structure.
- `src/client/hud/layers/PlayerInfoOverlay.ts`: selected-player counters.
- `src/client/styles/openback.css`: safe-area and responsive presentation.
- `src/server/auth/ApproximateCountry.ts`: trusted-address offline country lookup.
- `src/server/auth/AuthServer.ts`: persistence and owner analytics.
- `src/core/ApiSchemas.ts`: private analytics wire contract.
- `src/client/OwnerAnalyticsModal.ts`: private monitoring UI.

---

### Task 1: Pure mobile gesture arbiter

**Files:**

- Create: `src/client/input/MobileGestureArbiter.ts`
- Create: `tests/client/input/MobileGestureArbiter.test.ts`

**Interfaces:**

- Consumes pointer IDs, CSS-pixel positions, timestamps, and active-pointer count.
- Produces `MobileGestureDecision`, `MobileGestureSnapshot`, and `MobileGestureArbiter`.

- [ ] **Step 1: Write failing transition tests**

```ts
test("a quick release is exactly one tap", () => {
  const g = new MobileGestureArbiter({ holdMs: 650, slopPx: 18 });
  g.pointerDown(1, 100, 120, 0);
  expect(g.pointerUp(1, 103, 124, 120)).toEqual({
    kind: "tap",
    x: 103,
    y: 124,
  });
});

test("a completed hold consumes its release", () => {
  const g = new MobileGestureArbiter({ holdMs: 650, slopPx: 18 });
  g.pointerDown(1, 100, 120, 0);
  expect(g.holdDeadline(650)).toEqual({ kind: "hold", x: 100, y: 120 });
  expect(g.pointerUp(1, 100, 120, 700)).toEqual({ kind: "consumed" });
});

test("drag and multitouch consume every release", () => {
  const g = new MobileGestureArbiter({ holdMs: 650, slopPx: 18 });
  g.pointerDown(1, 100, 120, 0);
  expect(g.pointerMove(1, 125, 120, 100)?.kind).toBe("drag-start");
  expect(g.pointerUp(1, 125, 120, 150)).toEqual({ kind: "consumed" });
  g.pointerDown(2, 50, 50, 200);
  expect(g.pointerDown(3, 90, 50, 210)).toEqual({ kind: "multitouch" });
  expect(g.pointerUp(2, 50, 50, 230)).toEqual({ kind: "consumed" });
  expect(g.pointerUp(3, 90, 50, 240)).toEqual({ kind: "consumed" });
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/input/MobileGestureArbiter.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 3: Implement the pure state machine**

```ts
export type MobileGestureMode =
  | "idle"
  | "pending"
  | "hold"
  | "drag"
  | "multitouch"
  | "consumed"
  | "cancelled";
export type MobileGestureDecision =
  | { kind: "pending" | "consumed" | "cancelled" | "multitouch" }
  | { kind: "tap" | "hold" | "drag-start" | "drag"; x: number; y: number };
export interface MobileGestureSnapshot {
  mode: MobileGestureMode;
  activePointers: number;
  primaryPointerId: number | null;
}

export class MobileGestureArbiter {
  private mode: MobileGestureMode = "idle";
  private primary: { id: number; x: number; y: number; at: number } | null =
    null;
  private pointers = new Set<number>();
  constructor(private readonly options: { holdMs: number; slopPx: number }) {}

  pointerDown(
    id: number,
    x: number,
    y: number,
    at: number,
  ): MobileGestureDecision {
    this.pointers.add(id);
    if (this.pointers.size > 1) {
      this.mode = "multitouch";
      return { kind: "multitouch" };
    }
    this.primary = { id, x, y, at };
    this.mode = "pending";
    return { kind: "pending" };
  }

  pointerMove(
    id: number,
    x: number,
    y: number,
    _at: number,
  ): MobileGestureDecision | null {
    if (!this.primary || id !== this.primary.id || this.mode === "multitouch")
      return null;
    const moved = Math.hypot(x - this.primary.x, y - this.primary.y);
    if (this.mode === "pending" && moved >= this.options.slopPx) {
      this.mode = "drag";
      return { kind: "drag-start", x, y };
    }
    return this.mode === "drag" ? { kind: "drag", x, y } : null;
  }

  holdDeadline(at: number): MobileGestureDecision | null {
    if (
      !this.primary ||
      this.mode !== "pending" ||
      at - this.primary.at < this.options.holdMs
    )
      return null;
    this.mode = "hold";
    return { kind: "hold", x: this.primary.x, y: this.primary.y };
  }

  consume(): void {
    if (this.mode !== "idle") this.mode = "consumed";
  }
  pointerUp(
    id: number,
    x: number,
    y: number,
    _at: number,
  ): MobileGestureDecision {
    const previous = this.mode;
    this.pointers.delete(id);
    if (this.pointers.size > 0) return { kind: "consumed" };
    this.reset();
    return previous === "pending"
      ? { kind: "tap", x, y }
      : { kind: "consumed" };
  }
  cancel(): MobileGestureDecision {
    this.reset();
    return { kind: "cancelled" };
  }
  snapshot(): MobileGestureSnapshot {
    return {
      mode: this.mode,
      activePointers: this.pointers.size,
      primaryPointerId: this.primary?.id ?? null,
    };
  }
  private reset(): void {
    this.mode = "idle";
    this.primary = null;
    this.pointers.clear();
  }
}
```

- [ ] **Step 4: Verify GREEN**

Run: `npx vitest run tests/client/input/MobileGestureArbiter.test.ts`

Expected: PASS for tap, hold, drag, multitouch, consume, and cancellation.

- [ ] **Step 5: Commit**

```powershell
git add -- src/client/input/MobileGestureArbiter.ts tests/client/input/MobileGestureArbiter.test.ts
git commit -m "Add deterministic mobile gesture arbiter"
```

---

### Task 2: Integrate mutually exclusive gestures

**Files:**

- Modify: `src/client/InputHandler.ts:257-285,815-1088,1153-1240`
- Modify: `src/client/hud/layers/PlayerInfoOverlay.ts`
- Modify: `src/client/hud/layers/MainRadialMenu.ts`
- Create: `tests/client/InputHandlerTouchIntent.test.ts`
- Modify: `tests/client/InputHandlerMobilePlacement.test.ts`
- Modify: `tests/client/InputHandlerGestureZoom.test.ts`

**Interfaces:**

- Consumes `MobileGestureArbiter`.
- Produces exactly one `TouchEvent`, `ContextMenuEvent`, `DragEvent`, or multitouch stream per sequence.

- [ ] **Step 1: Write failing integration tests**

```ts
test("long press opens context once and release never attacks", async () => {
  pointer(canvas, "pointerdown", 1, 120, 90);
  await vi.advanceTimersByTimeAsync(650);
  pointer(window, "pointerup", 1, 122, 91);
  expect(events(ContextMenuEvent)).toHaveLength(1);
  expect(events(TouchEvent)).toHaveLength(0);
  expect(events(MouseUpEvent)).toHaveLength(0);
});

test("tap uses release coordinates", () => {
  pointer(canvas, "pointerdown", 2, 80, 70);
  pointer(window, "pointerup", 2, 84, 73);
  expect(events(TouchEvent)).toEqual([new TouchEvent(84, 73)]);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/InputHandlerTouchIntent.test.ts tests/client/InputHandlerMobilePlacement.test.ts tests/client/InputHandlerGestureZoom.test.ts`

Expected: hold-drift/release or exact-coordinate assertions fail under parallel touch flags.

- [ ] **Step 3: Replace touch-only flags with the arbiter**

Add:

```ts
private readonly touchGesture = new MobileGestureArbiter({ holdMs: 650, slopPx: 18 });
private touchHoldTimer: ReturnType<typeof setTimeout> | null = null;
```

Touch down calls `pointerDown` and schedules `holdDeadline`; hold emits `ContextMenuEvent`. Move emits `DragEvent` only after `drag-start` and still emits `MouseMoveEvent` for active previews. Up emits `TouchEvent` only for `tap`. Menu open, cancel, second pointer, HUD takeover, and nuclear cancel call `consume()` or `cancel()` first.

- [ ] **Step 4: Make self behavior explicit**

```ts
// PlayerInfoOverlay TouchEvent handling
if (owner.isPlayer() && owner === this.game.myPlayer()) return;
```

Self tap does nothing; self hold continues through `ContextMenuEvent` and opens the existing self action/info menu.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npx vitest run tests/client/InputHandlerTouchIntent.test.ts tests/client/InputHandlerMobilePlacement.test.ts tests/client/InputHandlerGestureZoom.test.ts tests/client/RadialMenuTouchActivation.test.ts`

```powershell
git add -- src/client/InputHandler.ts src/client/hud/layers/PlayerInfoOverlay.ts src/client/hud/layers/MainRadialMenu.ts tests/client/InputHandlerTouchIntent.test.ts tests/client/InputHandlerMobilePlacement.test.ts tests/client/InputHandlerGestureZoom.test.ts tests/client/RadialMenuTouchActivation.test.ts
git commit -m "Make mobile tap and hold mutually exclusive"
```

---

### Task 3: Exact visible release targets and transport destinations

**Files:**

- Create: `src/client/input/PointerTarget.ts`
- Create: `tests/client/input/PointerTarget.test.ts`
- Modify: `src/client/InputHandler.ts`
- Modify: `src/client/ClientGameRunner.ts:1180-1230,1331-1355,1493-1515`
- Create: `tests/client/MobileTransportTargeting.test.ts`
- Modify: `tests/client/MobileBuildIntentSafety.test.ts`

**Interfaces:**

- Produces `targetTileAtScreenPoint(game, transform, point): TileRef | null`.
- Carries the exact selected land tile into `sendBoatAttackIntent(tile)`.

- [ ] **Step 1: Write failing exact-target tests**

```ts
test("resolves the release point through TransformHandler exactly once", () => {
  const transform = {
    screenToWorldCoordinates: vi.fn(() => ({ x: 17, y: 9 })),
  };
  expect(targetTileAtScreenPoint(game, transform, { x: 210, y: 130 })).toBe(
    expectedTile,
  );
  expect(transform.screenToWorldCoordinates).toHaveBeenCalledOnce();
  expect(transform.screenToWorldCoordinates).toHaveBeenCalledWith(210, 130);
});
test("rejects a projected point outside the map", () => {
  const transform = { screenToWorldCoordinates: () => ({ x: -1, y: 9 }) };
  expect(targetTileAtScreenPoint(game, transform, { x: 0, y: 20 })).toBeNull();
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/input/PointerTarget.test.ts`

Expected: FAIL because the target resolver does not exist.

- [ ] **Step 3: Implement one projection path using existing transforms**

```ts
export function targetTileAtScreenPoint(
  game: Pick<GameView, "isValidCoord" | "ref">,
  transform: Pick<TransformHandler, "screenToWorldCoordinates">,
  point: { x: number; y: number },
): TileRef | null {
  const world = transform.screenToWorldCoordinates(point.x, point.y);
  return game.isValidCoord(world.x, world.y)
    ? game.ref(world.x, world.y)
    : null;
}
```

`InputHandler` snapshots release `clientX/clientY`. `ClientGameRunner`, build placement, and contextual actions resolve that point through `TransformHandler` exactly once. Do not multiply by DPR or backing-canvas dimensions, and do not reuse a mouse-hover coordinate.

- [ ] **Step 4: Write failing nearby-island and water tests**

```ts
test("nearby island preserves the exact selected tile", async () => {
  runner.handleTouchTap(nearIslandPoint);
  await flushPromises();
  expect(sentBoatTargets()).toEqual([nearIslandTile]);
  expect(sentBoatTargets()).not.toContain(farIslandTile);
});
test("water emits neither transport nor attack", async () => {
  runner.handleTouchTap(waterPoint);
  await flushPromises();
  expect(sentBoatTargets()).toEqual([]);
  expect(sentAttackTargets()).toEqual([]);
});
```

- [ ] **Step 5: Verify RED**

Run: `npx vitest run tests/client/MobileTransportTargeting.test.ts tests/client/MobileBuildIntentSafety.test.ts`

Expected: fixture reproduces stale or fallback targeting.

- [ ] **Step 6: Route exact land targets**

```ts
if (!this.gameView.isLand(tile)) return;
const actions = await this.myPlayer.actions(tile, [UnitType.TransportShip]);
if (actions.canAttack) {
  this.eventBus.emit(
    new SendAttackIntentEvent(this.gameView.owner(tile).id(), troops),
  );
} else if (this.canAutoBoat(actions.buildableUnits, tile)) {
  this.sendBoatAttackIntent(tile);
}
```

Keep `sendBoatAttackIntent` defensive against non-land. Remove mobile destination replacement and do not require a Port.

- [ ] **Step 7: Verify GREEN and commit**

Run: `npx vitest run tests/client/input/PointerTarget.test.ts tests/client/MobileTransportTargeting.test.ts tests/client/MobileBuildIntentSafety.test.ts`

```powershell
git add -- src/client/input/PointerTarget.ts src/client/InputHandler.ts src/client/ClientGameRunner.ts tests/client/input/PointerTarget.test.ts tests/client/MobileTransportTargeting.test.ts tests/client/MobileBuildIntentSafety.test.ts
git commit -m "Use exact mobile transport targets"
```

---

### Task 4: One placement-clear lifecycle

**Files:**

- Modify: `src/client/controllers/BuildPreviewController.ts:180-320,680-780,920-945`
- Modify: `src/client/UIState.ts`
- Modify: `src/client/hud/layers/ControlPanel.ts`
- Modify: `tests/client/controllers/BuildPreviewController.test.ts`
- Modify: `tests/client/MobileBuildIntentSafety.test.ts`

**Interfaces:**

- Produces public `clearActivePlacement(): void` and `UIState.activePlacementRevision`.

- [ ] **Step 1: Write failing teardown tests**

```ts
test.each(["water", "enemy", "outside", "menu", "cancel"])(
  "%s clears every placement surface",
  async (cause) => {
    selectCity(controller);
    await showValidatedGhost(controller);
    cancelPlacement(controller, cause);
    expect(controller.uiState.ghostStructure).toBeNull();
    expect(renderer.lastGhostPreview).toBeNull();
    expect(renderer.lastNukeTrajectory).toBeNull();
    expect(renderer.lastHoverRange).toBeNull();
  },
);
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/controllers/BuildPreviewController.test.ts tests/client/MobileBuildIntentSafety.test.ts`

Expected: at least one cancellation path retains preview or description state.

- [ ] **Step 3: Implement one clear method**

```ts
public clearActivePlacement(): void {
  this.ghostQueryGeneration++;
  this.validatedTileRef = undefined;
  this.pendingConfirm = null;
  this.ghostQueryInFlight = false;
  this.ghostUnit = null;
  this.lastGhostData = null;
  this.nukeTrajectoryStatic = null;
  this.view.updateGhostPreview(null);
  this.view.updateNukeTrajectory(null);
  this.view.updateHoverRange(null);
  this.uiState.ghostStructure = null;
  this.uiState.activePlacementRevision++;
}
```

Route invalid water/enemy/outside taps, menu takeover, cancel/back, failed final validation, and button-toggle-off through this method.

- [ ] **Step 4: Preserve only successful repeat placement**

```ts
if (shouldPreserveGhostAfterBuild(unitType)) {
  this.pendingConfirm = null;
  this.validatedTileRef = undefined;
  this.lastGhostQueryAt = 0;
} else {
  this.clearActivePlacement();
}
```

Invalid placement always clears regardless of type. `ControlPanel` observes the revision and removes description in the same update.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npx vitest run tests/client/controllers/BuildPreviewController.test.ts tests/client/MobileBuildIntentSafety.test.ts tests/client/MobileGameHud.test.ts`

```powershell
git add -- src/client/controllers/BuildPreviewController.ts src/client/UIState.ts src/client/hud/layers/ControlPanel.ts tests/client/controllers/BuildPreviewController.test.ts tests/client/MobileBuildIntentSafety.test.ts tests/client/MobileGameHud.test.ts
git commit -m "Clear every mobile placement surface together"
```

---

### Task 5: Adaptive bottom HUD

**Files:**

- Create: `src/client/hud/layout/HudCapacity.ts`
- Create: `tests/client/HudCapacity.test.ts`
- Modify: `src/client/hud/layers/ControlPanel.ts:350-670`
- Modify: `src/client/hud/layers/BuildMenu.ts`
- Modify: `src/client/styles/openback.css:160-330,430-535`
- Modify: `index.html:404-432`
- Modify: `tests/client/MobileGameHud.test.ts`

**Interfaces:**

- Produces `bottomHudLayout(input): BottomHudLayout` with columns, rows, label mode, and usable width.

- [ ] **Step 1: Write failing viewport-matrix tests**

```ts
test.each([
  [
    { width: 320, height: 568, units: 16 },
    { columns: 4, rows: 4 },
  ],
  [
    { width: 360, height: 800, units: 16 },
    { columns: 6, rows: 3 },
  ],
  [
    { width: 393, height: 852, units: 16 },
    { columns: 8, rows: 2 },
  ],
  [
    { width: 430, height: 932, units: 16 },
    { columns: 8, rows: 2 },
  ],
  [
    { width: 568, height: 320, units: 16 },
    { columns: 16, rows: 1 },
  ],
  [
    { width: 852, height: 393, units: 16 },
    { columns: 16, rows: 1 },
  ],
])("selects a non-clipping grid", (input, expected) => {
  expect(
    bottomHudLayout({ ...input, safeLeft: 12, safeRight: 12 }),
  ).toMatchObject(expected);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/HudCapacity.test.ts`

Expected: FAIL because the helper does not exist.

- [ ] **Step 3: Implement capacity calculation**

```ts
export type HudLabelMode = "full" | "compact" | "icon";
export interface BottomHudLayout {
  columns: number;
  rows: number;
  labelMode: HudLabelMode;
  usableWidth: number;
}

export function bottomHudLayout(input: {
  width: number;
  height: number;
  safeLeft: number;
  safeRight: number;
  units: number;
}): BottomHudLayout {
  const usableWidth = Math.max(
    0,
    input.width - input.safeLeft - input.safeRight,
  );
  if (input.width > input.height) {
    const perItem = usableWidth / input.units;
    return {
      columns: input.units,
      rows: 1,
      labelMode: perItem >= 64 ? "full" : perItem >= 42 ? "compact" : "icon",
      usableWidth,
    };
  }
  const columns = usableWidth >= 360 ? 8 : usableWidth >= 324 ? 6 : 4;
  return {
    columns,
    rows: Math.ceil(input.units / columns),
    labelMode: columns >= 8 ? "compact" : "full",
    usableWidth,
  };
}
```

- [ ] **Step 4: Bind layout through `ResizeObserver` and CSS variables**

Set `--game-unit-columns`, `--game-unit-rows`, and `data-label-mode` on the panel. Render full, compact, and icon labels in the same button, retaining `aria-label` and title.

```css
.game-safe-area {
  box-sizing: border-box;
  padding-left: max(0.5rem, env(safe-area-inset-left));
  padding-right: max(0.5rem, env(safe-area-inset-right));
  padding-bottom: env(safe-area-inset-bottom);
  container: game-hud / inline-size;
}
.game-unit-grid {
  display: grid;
  grid-template-columns: repeat(var(--game-unit-columns), minmax(0, 1fr));
  width: 100%;
  overflow: clip;
}
@media (orientation: landscape) and (max-height: 600px) {
  .game-unit-grid {
    grid-auto-flow: column;
    grid-template-rows: 1fr;
  }
  .game-unit-item {
    min-width: 0;
  }
}
```

Remove the fixed `repeat(16)` phone override that ignores curved-screen usable width.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npx vitest run tests/client/HudCapacity.test.ts tests/client/MobileGameHud.test.ts`

```powershell
git add -- src/client/hud/layout/HudCapacity.ts src/client/hud/layers/ControlPanel.ts src/client/hud/layers/BuildMenu.ts src/client/styles/openback.css index.html tests/client/HudCapacity.test.ts tests/client/MobileGameHud.test.ts
git commit -m "Make the mobile build HUD adapt to usable space"
```

---

### Task 6: Balanced selected-player counters and permanent global controls

**Files:**

- Modify: `src/client/hud/layout/HudCapacity.ts`
- Modify: `src/client/hud/layers/PlayerInfoOverlay.ts:76-90,350-490,550-590`
- Modify: `src/client/styles/openback.css:115-140,255-290,450-500`
- Modify: `tests/client/PlayerInfoOverlayLayout.test.ts`
- Modify: `tests/client/MobileGameHud.test.ts`

**Interfaces:**

- Produces `playerInfoCounterLayout(unitCount, availableWidth, reservedControlWidth)`.

- [ ] **Step 1: Write failing capacity tests**

```ts
test("uses one spaced row when everything fits", () => {
  expect(playerInfoCounterLayout(12, 980, 300)).toMatchObject({
    columns: 12,
    rows: 1,
  });
});
test("uses balanced rows before covering controls", () => {
  const layout = playerInfoCounterLayout(12, 568, 250);
  expect(layout).toMatchObject({ columns: 6, rows: 2 });
  expect(layout.items.slice(0, 6).filter((item) => item !== null)).toHaveLength(
    6,
  );
  expect(layout.items.slice(6).filter((item) => item !== null)).toHaveLength(6);
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/PlayerInfoOverlayLayout.test.ts tests/client/MobileGameHud.test.ts`

Expected: the current fixed 12-column landscape rule violates reserved-control capacity.

- [ ] **Step 3: Implement balanced capacity**

```ts
export function playerInfoCounterLayout(
  unitCount: number,
  availableWidth: number,
  reservedControlWidth: number,
) {
  const rows =
    Math.max(0, availableWidth - reservedControlWidth) >= unitCount * 38
      ? 1
      : 2;
  const columns = Math.ceil(unitCount / rows);
  const items: Array<number | null> = Array.from(
    { length: unitCount },
    (_, i) => i,
  );
  while (items.length < columns * rows) items.push(null);
  return { columns, rows, items };
}
```

Use enabled-unit indices in `PlayerInfoOverlay`. Measure the existing global-control cluster with `ResizeObserver` and expose `--game-global-controls-width`.

- [ ] **Step 4: Reserve the control edge in CSS**

```css
.player-info-surface {
  max-width: min(
    var(--player-info-max-width, 720px),
    calc(100dvw - var(--game-global-controls-width, 0px) - 0.5rem)
  );
}
@media (orientation: landscape) and (max-height: 600px) {
  .player-info-unit-grid {
    grid-template-columns: repeat(var(--player-unit-columns), minmax(0, 1fr));
    grid-template-rows: repeat(var(--player-unit-rows), 1.35rem);
  }
}
```

Never hide pause, speed, settings, leaderboard, fullscreen, wallet, or exit while the selected-player overlay is open.

- [ ] **Step 5: Verify GREEN and commit**

Run: `npx vitest run tests/client/PlayerInfoOverlayLayout.test.ts tests/client/MobileGameHud.test.ts tests/client/PlayerUnitGrid.test.ts`

```powershell
git add -- src/client/hud/layout/HudCapacity.ts src/client/hud/layers/PlayerInfoOverlay.ts src/client/styles/openback.css tests/client/PlayerInfoOverlayLayout.test.ts tests/client/MobileGameHud.test.ts tests/client/PlayerUnitGrid.test.ts
git commit -m "Balance mobile player info without hiding controls"
```

---

### Task 7: Persist only approximate country codes

**Files:**

- Modify: `package.json`
- Modify: `package-lock.json`
- Create: `src/types/geoip-country.d.ts`
- Create: `src/server/auth/ApproximateCountry.ts`
- Create: `tests/server/ApproximateCountry.test.ts`
- Modify: `src/server/auth/AuthServer.ts:75-110,250-270,540-565,680-700`
- Modify: `tests/server/AuthAccountFlow.test.ts`
- Modify: `CREDITS.md`

**Interfaces:**

- Produces `normalizeIpAddress`, `countryCodeForAddress`, and `observeApproximateCountry(req.ip)`.
- Persists `approximateCountry`, `countryFirstSeenAt`, and `countryLastSeenAt`; never the source address.

- [ ] **Step 1: Add the exact offline dependency and declaration**

Run: `npm install --save-exact geoip-country@5.0.202608252355`

```ts
declare module "geoip-country" {
  export interface CountryLookup {
    country: string;
    range: [number, number];
  }
  export function lookup(ip: string): CountryLookup | null;
}
```

- [ ] **Step 2: Write failing privacy and lookup tests**

```ts
test("normalizes Express IPv4-mapped addresses", () => {
  expect(normalizeIpAddress("::ffff:8.8.8.8")).toBe("8.8.8.8");
});
test.each(["127.0.0.1", "::1", "10.0.0.4", "172.18.0.2", "192.168.1.5"])(
  "does not geolocate private address %s",
  (ip) => expect(countryCodeForAddress(ip)).toBeUndefined(),
);
test("returns only a country code", () => {
  expect(countryCodeForAddress("8.8.8.8")).toMatch(/^[A-Z]{2}$/);
});
```

- [ ] **Step 3: Verify RED**

Run: `npx vitest run tests/server/ApproximateCountry.test.ts`

Expected: FAIL because the module does not exist.

- [ ] **Step 4: Implement trusted extraction and offline lookup**

```ts
import { isIP } from "node:net";
import { lookup } from "geoip-country";

export function normalizeIpAddress(address: string): string | undefined {
  const candidate = address.trim().replace(/^::ffff:/, "");
  return isIP(candidate) ? candidate : undefined;
}

export function countryCodeForAddress(address: string): string | undefined {
  if (isPrivateOrReserved(address)) return undefined;
  const code = lookup(address)?.country?.toUpperCase();
  return code && /^[A-Z]{2}$/.test(code) ? code : undefined;
}
```

`isPrivateOrReserved` rejects loopback, link-local, RFC1918, carrier-grade NAT, documentation, multicast, unspecified, and private IPv6 ranges. `observeApproximateCountry` accepts only Express `req.ip`; `Master.ts` and `Worker.ts` already configure the trusted proxy depth. It never reads `X-Forwarded-For` directly, and no branch logs the address.

- [ ] **Step 5: Persist country observations during authenticated activity**

```ts
const country = observeApproximateCountry(req.ip);
if (country) {
  const now = new Date().toISOString();
  user.approximateCountry = country;
  user.countryFirstSeenAt ??= now;
  user.countryLastSeenAt = now;
}
touchPlayerSeen(user);
```

Assert the durable JSON contains the ISO code but not the test IP. Existing accounts remain `Unknown` until their next authenticated connection.

- [ ] **Step 6: Add attribution, verify GREEN, and commit**

Add Apache-2.0 runtime and MaxMind GeoLite2 data attribution to `CREDITS.md` without removing existing notices.

Run: `npx vitest run tests/server/ApproximateCountry.test.ts tests/server/AuthAccountFlow.test.ts`

```powershell
git add -- package.json package-lock.json src/types/geoip-country.d.ts src/server/auth/ApproximateCountry.ts src/server/auth/AuthServer.ts tests/server/ApproximateCountry.test.ts tests/server/AuthAccountFlow.test.ts CREDITS.md
git commit -m "Record private country-level account activity"
```

---

### Task 8: Rich owner-only analytics

**Files:**

- Modify: `src/core/ApiSchemas.ts:690-745`
- Modify: `src/server/auth/AuthServer.ts:3470-3640`
- Modify: `src/client/OwnerAnalyticsModal.ts`
- Modify: `resources/lang/en.json`
- Modify: `tests/server/AuthAccountFlow.test.ts`
- Create: `tests/client/OwnerAnalyticsModal.test.ts`

**Interfaces:**

- Extends only `OwnerAnalyticsPlayerSchema`; public profile/friend/clan schemas do not gain private fields.

- [ ] **Step 1: Write failing owner/private tests**

```ts
test("owner analytics contains private player context", async () => {
  const response = await ownerAnalytics(ownerJwt);
  expect(response.players[0]).toMatchObject({
    email: expect.stringContaining("@"),
    publicId: expect.any(String),
    username: expect.any(String),
    approximateCountry: expect.stringMatching(/^[A-Z]{2}$|^Unknown$/),
    clans: expect.any(Array),
    gamesPlayed: expect.any(Number),
    playSeconds: expect.any(Number),
    modeBreakdown: expect.any(Array),
    typeBreakdown: expect.any(Array),
    experienceBreakdown: expect.any(Array),
  });
});
test("public profile omits private monitoring fields", async () => {
  const body = JSON.stringify(await publicProfile(targetPublicId));
  expect(body).not.toContain(targetEmail);
  expect(body).not.toContain("approximateCountry");
  expect(body).not.toContain("playSeconds");
});
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/server/AuthAccountFlow.test.ts tests/client/OwnerAnalyticsModal.test.ts`

Expected: FAIL because rich fields and expandable details are absent.

- [ ] **Step 3: Extend the private schema**

```ts
email: z.string().email(),
selectedFlag: z.string().nullable(),
approximateCountry: z.string().regex(/^[A-Z]{2}$/).nullable(),
selectedCosmetic: z.string().nullable(),
clans: z.array(z.object({ tag: z.string(), name: z.string() })),
hasProfilePicture: z.boolean(),
losses: z.number().int().nonnegative(),
incompleteGames: z.number().int().nonnegative(),
averageGameSeconds: z.number().int().nonnegative(),
firstGameAt: z.iso.datetime().nullable(),
lastGameAt: z.iso.datetime().nullable(),
modeBreakdown: OwnerAnalyticsBreakdownSchema.array(),
typeBreakdown: OwnerAnalyticsBreakdownSchema.array(),
experienceBreakdown: OwnerAnalyticsBreakdownSchema.array(),
mapBreakdown: OwnerAnalyticsBreakdownSchema.array(),
```

- [ ] **Step 4: Derive authoritative details server-side**

Use one pure `breakdownFor(games, keyFor)` helper for mode/type/experience/map, derive clans from membership, and return email only after verified owner authorization. Keep `Cache-Control: no-store` and owner exclusion from aggregates.

- [ ] **Step 5: Render responsive expandable details**

Add selected-flag and approximate-country columns. Row click toggles a detail card:

```ts
@state() private expandedPlayerId: string | null = null;
private togglePlayer(publicId: string): void {
  this.expandedPlayerId = this.expandedPlayerId === publicId ? null : publicId;
}
```

The card shows account email, public ID, selected flag, approximate country, clan, cosmetic, profile-picture presence, first/last game, average duration, and four breakdowns. Selected flag and approximate country remain separate labels.

- [ ] **Step 6: Verify GREEN and commit**

Run: `npx vitest run tests/server/AuthAccountFlow.test.ts tests/client/OwnerAnalyticsModal.test.ts tests/ApiSchemas.test.ts`

```powershell
git add -- src/core/ApiSchemas.ts src/server/auth/AuthServer.ts src/client/OwnerAnalyticsModal.ts resources/lang/en.json tests/server/AuthAccountFlow.test.ts tests/client/OwnerAnalyticsModal.test.ts tests/ApiSchemas.test.ts
git commit -m "Expand the private player analytics dashboard"
```

---

### Task 9: Browser playtest, release, production, and CI

**Files:**

- Modify: `resources/changelog.md`
- Modify only when a QA regression test proves a defect: Task 1-8 implementation/test files.

**Interfaces:**

- Produces OpenBack v0.36.248 on `main`, production evidence, and green GitHub CI.

- [ ] **Step 1: Add the release entry**

```md
## OpenBack v0.36.248 - Precise Mobile Command

- Rebuilt mobile touch handling so taps, holds, drags, and two-finger gestures are mutually exclusive. Closing an alliance or player menu can no longer trigger an accidental attack.
- Transport ships now use the exact land tile touched by the player. Water taps are rejected and nearby islands can no longer redirect ships across the world.
- Every build cancellation now clears the selected unit, description, transparent models, range and trajectory overlays, and pending placement state together while supported successful builds remain ready for repeat placement.
- Made portrait and landscape HUDs adapt to usable screen space and safe areas across phone sizes. Build units stay reachable, player counters balance automatically, and global controls remain visible while inspecting another country.
- Expanded the private owner analytics dashboard with account identity, selected flag, approximate country, clans, cosmetics, detailed playtime, maps, modes, and 2D/3D usage without storing IP addresses or exposing private fields to players.

Created by **frootz jhklphy**.
```

- [ ] **Step 2: Run automated gates**

```powershell
npx vitest run tests/client/input/MobileGestureArbiter.test.ts tests/client/InputHandlerTouchIntent.test.ts tests/client/input/PointerTarget.test.ts tests/client/MobileTransportTargeting.test.ts tests/client/controllers/BuildPreviewController.test.ts tests/client/HudCapacity.test.ts tests/client/PlayerInfoOverlayLayout.test.ts tests/server/ApproximateCountry.test.ts tests/server/AuthAccountFlow.test.ts tests/client/OwnerAnalyticsModal.test.ts
npm test
npm run test:coverage
npm run build-prod
npm run lint:github
npx prettier --check .
git diff --check
```

Expected: all exit 0; only established intentional skips and the existing Vite chunk warning remain.

- [ ] **Step 3: Start local production-like testing**

Run: `npm run dev`

Flow: open game → start mobile match → exercise tap/hold/drag/build/ship → inspect responsive HUD → open owner analytics → verify privacy.

- [ ] **Step 4: Playtest portrait sizes**

At 320×568, 360×800, 393×852, and 430×932:

- zero horizontal overflow;
- all build units reachable inside safe areas;
- invalid placement clears ghost and description;
- tap attacks once, hold opens menu without release attack;
- self tap does nothing, self hold opens menu;
- nearby island uses exact destination;
- water creates no ship or attack.

- [ ] **Step 5: Playtest landscape sizes**

At 568×320, 667×375, 740×360, and 852×393:

- build bar is one row with full/compact/icon label fallback;
- global controls remain visible while player info is open;
- unit counters use one balanced row when capacity allows and two otherwise;
- center playfield stays usable.

- [ ] **Step 6: Playtest analytics**

- Owner: wait across two five-second refreshes, search and expand a player, and inspect separate selected-flag/approximate-country fields.
- Mobile owner: no horizontal overflow.
- Non-owner: direct endpoint returns 403.
- Public profile/friend/clan payloads contain no email, country, or private playtime.

- [ ] **Step 7: Repair findings test-first**

For every QA finding, add one failing regression to its owning test file, verify RED, make the minimal fix, verify GREEN, and repeat the affected browser step. Do not batch unrelated fixes.

- [ ] **Step 8: Commit, push, and verify production**

```powershell
git add -- resources/changelog.md
git commit -m "Release OpenBack v0.36.248"
git push origin main
```

Wait until production `BOOTSTRAP_CONFIG.gitCommit` matches. Repeat one portrait smoke test, one landscape smoke test, public privacy check, and owner dashboard load.

- [ ] **Step 9: Await CI**

```powershell
gh run list --branch main --limit 5
$head = git rev-parse HEAD
$run = gh run list --branch main --limit 10 --json databaseId,name,headSha | ConvertFrom-Json | Where-Object { $_.name -eq "🧪 CI" -and $_.headSha -eq $head } | Select-Object -First 1
if (-not $run) { throw "No CI run found for $head" }
gh run watch $run.databaseId --interval 5 --exit-status
git status --short
```

Expected: Build, Test/Coverage, Lint, Prettier, and Generated Maps pass; only pre-existing untracked attachment/script paths remain.
