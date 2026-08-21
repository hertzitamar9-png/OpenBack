# OpenBack Mobile Experience Release Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Ship OpenBack v0.36.197 with dependable phone navigation, touch-native gameplay and vehicle placement, repeat building, audible original music and effects, touch-specific settings, safe-area HUD layout, and cross-device deployment pausing.

**Architecture:** Keep the deterministic simulation and protocol unchanged. Centralize physical touch interpretation in `InputHandler`, feed explicit coordinates and confirmations into the existing controllers, keep responsive UI in DOM/CSS, and coordinate deployment suspension through the existing `EventBus` pause/audio paths. Each subsystem receives a focused regression suite before browser integration.

**Tech Stack:** TypeScript 6, Lit 3, Tailwind/CSS, Vitest 4 + jsdom, Howler/Web Audio, raw WebGL renderer adapters, Vite 8, GitHub Actions.

**Spec:** `docs/superpowers/specs/2026-08-21-mobile-experience-release-design.md`

## Global Constraints

- Preserve simulation determinism, multiplayer protocol, unit pricing, cooldowns, limits, terrain rules, and desktop controls.
- Apply deployment pausing and the five-second resume countdown on desktop, tablet, and mobile.
- Keep `.codex-remote-attachments/` untracked and untouched.
- Add one top entry to `resources/changelog.md` for OpenBack v0.36.197 and credit **frootz jhklphy**.
- Do not add OpenFront promotional links or public setup/deployment instructions.
- Write failing regressions before each production change and verify every red-green cycle.
- Push only to `main` after full local and browser verification, then wait for GitHub CI.

---

## File Structure

- `src/client/InputHandler.ts`: owns touch gesture state and emits pan, preview, confirmation, zoom, and orbit actions.
- `src/client/controllers/BuildPreviewController.ts`: owns build ghost validation, repeat placement, cancellation, snapping, and vehicle destination confirmation.
- `src/client/hud/layers/UnitDisplay.ts`: owns selected-unit toggling and mobile description visibility.
- `src/client/components/MobileTopBar.ts`: owns persistent mobile Menu, Back, utility, and account controls.
- `src/client/Navigation.ts` and `src/client/Layout.ts`: expose stable sidebar state helpers without binding to replaced Lit children.
- `src/client/GameModeSelector.ts`: owns non-truncated lobby countdown presentation.
- `src/client/hud/layers/PlayerInfoOverlay.ts` and `src/client/styles/openback.css`: own balanced counter layout and safe-area HUD geometry.
- `src/client/InputCapabilities.ts`: provides touch-only/hybrid/desktop capability classification.
- `src/client/UserSettingModal.ts`: renders touch-specific settings text and tabs.
- `src/client/sound/SoundManager.ts` and `src/client/sound/Sounds.ts`: own audio unlock, soundtrack, visibility lifecycle, and update suspension.
- `scripts/generate-openback-music.mjs`: deterministically creates the original loop source.
- `resources/sounds/music/openback-command.ogg`: locally shipped original soundtrack.
- `src/client/openback/UpdateWatcher.ts`: owns deploy-state polling, pause lifecycle, completed state, and resume countdown.
- `src/client/Main.ts` and `src/client/hud/layers/GameRightSidebar.ts`: bridge update suspension into the active game event bus and authoritative pause intent.

---

### Task 1: Persistent Mobile Home Navigation and Complete Timers

**Files:**

- Modify: `src/client/GameModeSelector.ts`
- Modify: `src/client/components/MobileTopBar.ts`
- Modify: `src/client/components/NavAccountMenu.ts`
- Modify: `src/client/Navigation.ts`
- Modify: `src/client/Layout.ts`
- Modify: `src/client/styles/openback.css`
- Test: `tests/client/MobileTopBarUtilities.test.ts`
- Create: `tests/client/GameModeSelectorMobile.test.ts`

**Interfaces:**

- Produces: `setMobileSidebarOpen(open: boolean): void` and `toggleMobileSidebar(): void` in `Navigation.ts`.
- Produces: a mobile header containing `<nav-account-menu variant="mobile">`.
- Preserves: `appRouter.navigatePage()` and `data-page` navigation contracts.

- [ ] **Step 1: Write failing navigation and timer tests**

Add tests that render `MobileTopBar`, dispatch `showPage` twice, click the rerendered hamburger, and assert the sidebar/backdrop receive `open`. Assert the account component exists. Render a compact lobby card with `timeDisplay = "1min 15s"` and assert the timer element has `whitespace-nowrap` and no `truncate` class.

```ts
expect(topBar.querySelector('nav-account-menu[variant="mobile"]')).toBeTruthy();
expect(timer.classList).toContain("whitespace-nowrap");
expect(timer.classList).not.toContain("truncate");
```

- [ ] **Step 2: Verify the tests fail against v0.36.196**

Run: `npx vitest run tests/client/MobileTopBarUtilities.test.ts tests/client/GameModeSelectorMobile.test.ts`

Expected: account trigger missing, rerendered menu inactive, or timer still truncated.

- [ ] **Step 3: Implement stable navigation and timer sizing**

Move sidebar state mutation into exported `Navigation.ts` helpers that query current elements on every call. Bind the Lit hamburger directly to `toggleMobileSidebar`, raise the persistent header above `.page-content`, add the existing mobile account trigger, and remove stale child-node listener setup from `Layout.ts`. Use a grid top row where modifiers shrink and the timer remains `white-space: nowrap`.

- [ ] **Step 4: Run focused tests and format**

Run: `npx vitest run tests/client/MobileTopBarUtilities.test.ts tests/client/GameModeSelectorMobile.test.ts tests/client/HeaderWordmarkNavigation.test.ts`

Run: `npx prettier --write src/client/GameModeSelector.ts src/client/components/MobileTopBar.ts src/client/components/NavAccountMenu.ts src/client/Navigation.ts src/client/Layout.ts src/client/styles/openback.css tests/client/MobileTopBarUtilities.test.ts tests/client/GameModeSelectorMobile.test.ts`

- [ ] **Step 5: Commit Task 1**

```powershell
git add -- src/client/GameModeSelector.ts src/client/components/MobileTopBar.ts src/client/components/NavAccountMenu.ts src/client/Navigation.ts src/client/Layout.ts src/client/styles/openback.css tests/client/MobileTopBarUtilities.test.ts tests/client/GameModeSelectorMobile.test.ts
git commit -m "Fix persistent mobile navigation and lobby timers"
```

### Task 2: Safe-Area HUD and Symmetrical Unit Counters

**Files:**

- Modify: `index.html`
- Modify: `src/client/hud/layers/PlayerInfoOverlay.ts`
- Modify: `src/client/styles/openback.css`
- Test: `tests/client/MobileGameHud.test.ts`
- Create: `tests/client/PlayerInfoOverlayLayout.test.ts`

**Interfaces:**

- Produces: `.game-safe-area` and `.player-info-unit-grid` responsive hooks.
- Preserves: the 16-item build grid and current landscape single-row unit display.

- [ ] **Step 1: Write failing safe-area and balanced-grid tests**

Assert the bottom HUD has inline safe-area padding with a nonzero fallback and portrait counter CSS defines six equal columns. Render disabled configurations with an odd count and assert an inert `.player-info-unit-spacer` is added.

```ts
expect(styles).toContain("max(0.25rem, env(safe-area-inset-left))");
expect(styles).toMatch(/player-info-unit-grid[^}]*repeat\(6,/s);
expect(overlay.querySelectorAll(".player-info-unit-spacer")).toHaveLength(1);
```

- [ ] **Step 2: Verify the layout tests fail**

Run: `npx vitest run tests/client/MobileGameHud.test.ts tests/client/PlayerInfoOverlayLayout.test.ts`

Expected: no side safe-area padding and flex wrapping produces no balancing spacer.

- [ ] **Step 3: Implement safe-area geometry**

Add left/right/bottom padding inside `#game-bottom-hud`, keep `box-sizing: border-box`, and convert portrait counters to a six-column grid. Build the visible counter list before rendering and append one inert placeholder only when needed to retain equal row geometry. Keep landscape at twelve compact columns when width permits.

- [ ] **Step 4: Verify focused HUD tests**

Run: `npx vitest run tests/client/MobileGameHud.test.ts tests/client/PlayerInfoOverlayLayout.test.ts`

- [ ] **Step 5: Commit Task 2**

```powershell
git add -- index.html src/client/hud/layers/PlayerInfoOverlay.ts src/client/styles/openback.css tests/client/MobileGameHud.test.ts tests/client/PlayerInfoOverlayLayout.test.ts
git commit -m "Fit the mobile HUD to safe areas"
```

### Task 3: Explicit Touch Gesture State Machine

**Files:**

- Modify: `src/client/InputHandler.ts`
- Test: `tests/InputHandler.test.ts`
- Test: `tests/client/InputHandlerGestureZoom.test.ts`
- Create: `tests/client/InputHandlerMobilePlacement.test.ts`

**Interfaces:**

- Produces: `TouchGestureMode = "idle" | "pan" | "preview" | "multitouch" | "cancelled"`.
- Produces: touch preview movement through `MouseMoveEvent(x, y)` without `DragEvent` while a ghost is selected.
- Produces: simultaneous `RotateCameraEvent` and `ZoomEvent` for two-finger 3D gestures.

- [ ] **Step 1: Write failing gesture tests**

Cover: selected ghost follows pointer movement without map drag; 18px touch slop still counts as a tap; stationary nuclear hold clears selection; nuclear drag cancels hold and updates preview; two-finger 3D midpoint motion rotates while distance change zooms; lifting one finger suppresses all actions until the final lift.

```ts
expect(ctx.mouseMoves.at(-1)).toMatchObject({ x: 140, y: 180 });
expect(ctx.drags).toHaveLength(0);
expect(ctx.rotations).toHaveLength(1);
expect(ctx.zooms).toHaveLength(1);
```

- [ ] **Step 2: Verify each new gesture test fails for the intended reason**

Run: `npx vitest run tests/client/InputHandlerMobilePlacement.test.ts tests/client/InputHandlerGestureZoom.test.ts`

Expected: touch movement emits `DragEvent`, long hold enters selection-box behavior, and two-finger midpoint motion emits no rotation.

- [ ] **Step 3: Implement the state machine**

Track the active touch mode, last two-finger center, whether multitouch consumed the sequence, and whether a stationary hold cancelled a nuke. Use Euclidean mobile touch slop. When a ghost is active, emit `MouseMoveEvent` and do not pan. On the second pointer, cancel hold, snapshot center/distance, and emit orbit/zoom deltas only in the correct experience mode. Clear every gesture state on cancel, blur, modal takeover, and final release.

- [ ] **Step 4: Verify all input regressions**

Run: `npx vitest run tests/InputHandler.test.ts tests/client/InputHandlerGestureZoom.test.ts tests/client/InputHandlerMobilePlacement.test.ts`

- [ ] **Step 5: Commit Task 3**

```powershell
git add -- src/client/InputHandler.ts tests/InputHandler.test.ts tests/client/InputHandlerGestureZoom.test.ts tests/client/InputHandlerMobilePlacement.test.ts
git commit -m "Make touch placement and 3D gestures deterministic"
```

### Task 4: Vehicle Placement, Cancel-Then-Attack, Repeat Building, and Description Cleanup

**Files:**

- Modify: `src/client/controllers/BuildPreviewController.ts`
- Modify: `src/client/hud/layers/UnitDisplay.ts`
- Test: `tests/client/controllers/BuildPreviewController.test.ts`
- Test: `tests/client/MobileBuildIntentSafety.test.ts`
- Create: `tests/client/VehicleTouchPlacement.test.ts`
- Create: `tests/client/UnitDisplaySelection.test.ts`

**Interfaces:**

- Consumes: touch-exclusive `MouseUpEvent(..., isBuildPlacement=true)` and preview coordinates from Task 3.
- Produces: `shouldPreserveGhostAfterBuild(unitType): true` for every buildable unit.
- Produces: immediate full preview cleanup when the selected item is toggled off.

- [ ] **Step 1: Write failing placement tests**

Replace old one-shot expectations with preservation for every `BuildMenus.types` entry. Assert invalid enemy placement removes the ghost and emits no attack/boat intent. Simulate completed Runway/Military Base snaps and assert one Plane/Tank build intent, then valid destination deployment. Assert a second press on the selected UnitDisplay item clears `ghostStructure` and removes `.game-unit-mobile-info` on the next Lit update.

```ts
for (const type of BuildMenus.types) {
  expect(shouldPreserveGhostAfterBuild(type)).toBe(true);
}
expect(intents.filter((i) => i instanceof BuildUnitIntentEvent)).toHaveLength(
  1,
);
```

- [ ] **Step 2: Verify vehicle and repeat-placement tests fail**

Run: `npx vitest run tests/client/controllers/BuildPreviewController.test.ts tests/client/MobileBuildIntentSafety.test.ts tests/client/VehicleTouchPlacement.test.ts tests/client/UnitDisplaySelection.test.ts`

Expected: ordinary builds clear selection, vehicle touch source placement fails or uses stale coordinates, and description state remains visible after toggling off.

- [ ] **Step 3: Implement placement ownership and repetition**

Preserve the selected ghost after successful build and upgrade, increment validation generation, clear pending confirmation, and immediately re-query current affordability. Keep invalid-target cancellation exclusive to the placement event. Ensure Plane and Tank snap queries use the latest touch coordinates and the established source radius. In UnitDisplay, make deselection request an update and render description only while `uiState.ghostStructure === unitType`.

- [ ] **Step 4: Verify placement suites**

Run: `npx vitest run tests/client/controllers/BuildPreviewController.test.ts tests/client/MobileBuildIntentSafety.test.ts tests/client/VehicleTouchPlacement.test.ts tests/client/UnitDisplaySelection.test.ts`

- [ ] **Step 5: Commit Task 4**

```powershell
git add -- src/client/controllers/BuildPreviewController.ts src/client/hud/layers/UnitDisplay.ts tests/client/controllers/BuildPreviewController.test.ts tests/client/MobileBuildIntentSafety.test.ts tests/client/VehicleTouchPlacement.test.ts tests/client/UnitDisplaySelection.test.ts
git commit -m "Fix touch vehicles and repeat placement"
```

### Task 5: Touch-Specific Settings

**Files:**

- Create: `src/client/InputCapabilities.ts`
- Modify: `src/client/UserSettingModal.ts`
- Modify: `resources/lang/en.openback.json`
- Create: `tests/client/InputCapabilities.test.ts`
- Create: `tests/client/UserSettingMobile.test.ts`

**Interfaces:**

- Produces: `detectInputCapabilities(matchMedia?: typeof window.matchMedia): { touchPrimary: boolean; hover: boolean; keyboardLikely: boolean }`.
- Produces: mobile translation keys for tap menu and mobile control guidance.

- [ ] **Step 1: Write failing capability and settings tests**

Use controlled `matchMedia` fakes for touch-only, hybrid, and desktop. Assert touch-only settings omit the keybind tab, say “Tap to Open Menu,” and show the approved gesture guide. Assert hybrid and desktop retain keybinds.

- [ ] **Step 2: Verify settings tests fail**

Run: `npx vitest run tests/client/InputCapabilities.test.ts tests/client/UserSettingMobile.test.ts`

Expected: helper missing and settings always render desktop left-click/keybind copy.

- [ ] **Step 3: Implement capability-aware settings**

Add the focused helper, choose tabs and labels from its result, and add concise touch control translations. Do not use user-agent detection. Keep every control at least 44px and preserve desktop strings.

- [ ] **Step 4: Verify settings suites**

Run: `npx vitest run tests/client/InputCapabilities.test.ts tests/client/UserSettingMobile.test.ts`

- [ ] **Step 5: Commit Task 5**

```powershell
git add -- src/client/InputCapabilities.ts src/client/UserSettingModal.ts resources/lang/en.openback.json tests/client/InputCapabilities.test.ts tests/client/UserSettingMobile.test.ts
git commit -m "Adapt settings to touch controls"
```

### Task 6: Original Soundtrack, Audible Defaults, and Mobile Audio Unlock

**Files:**

- Create: `scripts/generate-openback-music.mjs`
- Create: `resources/sounds/music/openback-command.ogg`
- Modify: `src/client/sound/Sounds.ts`
- Modify: `src/client/sound/SoundManager.ts`
- Modify: `src/core/game/UserSettings.ts`
- Test: `tests/client/sound/SoundManager.test.ts`
- Create: `tests/client/UserSettingsAudio.test.ts`

**Interfaces:**

- Produces: `backgroundMusicUrls: readonly string[]`.
- Produces: `SoundManager.suspendForUpdate()` and `SoundManager.resumeAfterUpdate()` via the update event bridge in Task 7.
- Preserves: saved zero volume; changes only unset defaults to music `0.32` and effects `0.60`.

- [ ] **Step 1: Write failing audio lifecycle tests**

Mock `Howler.ctx.resume`, Howl music/effect instances, visibility changes, and saved settings. Assert one unlock, one looped music instance, pause/resume without duplication, current effects stop on update, unset defaults are audible, and explicitly saved zero remains zero.

- [ ] **Step 2: Verify audio tests fail**

Run: `npx vitest run tests/client/sound/SoundManager.test.ts tests/client/UserSettingsAudio.test.ts`

Expected: no music instances, no unlock hook, zero defaults, and no update suspension.

- [ ] **Step 3: Generate the original soundtrack asset**

Create a deterministic Node script that writes a 48-second stereo WAV from layered low-volume tactical synth voices, then invokes local ffmpeg to encode a loop-safe 96kbps OGG. The script must use fixed notes/seeds and write only `resources/sounds/music/openback-command.ogg`. Run it once and inspect duration/size with `ffprobe` or ffmpeg metadata.

Run: `node scripts/generate-openback-music.mjs`

Expected: one OGG under 1 MB, duration 48 seconds, no clipping above -1 dBFS.

- [ ] **Step 4: Implement audio lifecycle**

Register the local track, construct it with `loop: true`, and install a once-only pointer/keyboard unlock before gameplay. Start music only after unlock and nonzero volume. Pause on hidden document/update suspension, stop active effects during updates, and resume one instance when permitted. Change only fallback defaults in `UserSettings`.

- [ ] **Step 5: Verify audio suites and asset loading**

Run: `npx vitest run tests/client/sound/SoundManager.test.ts tests/client/UserSettingsAudio.test.ts`

Run: `node -e "const fs=require('fs'); const p='resources/sounds/music/openback-command.ogg'; if(!fs.statSync(p).size) process.exit(1)"`

- [ ] **Step 6: Commit Task 6**

```powershell
git add -- scripts/generate-openback-music.mjs resources/sounds/music/openback-command.ogg src/client/sound/Sounds.ts src/client/sound/SoundManager.ts src/core/game/UserSettings.ts tests/client/sound/SoundManager.test.ts tests/client/UserSettingsAudio.test.ts
git commit -m "Add original OpenBack audio for mobile"
```

### Task 7: Cross-Device Update Pause and Five-Second Resume

**Files:**

- Modify: `src/client/openback/UpdateWatcher.ts`
- Modify: `src/client/Main.ts`
- Modify: `src/client/hud/layers/GameRightSidebar.ts`
- Modify: `src/client/sound/SoundManager.ts`
- Modify: `tests/UpdateWatcher.test.ts`
- Create: `tests/client/UpdatePauseBridge.test.ts`

**Interfaces:**

- Produces: `UpdateSuspensionEvent(suspended: boolean)` on the existing `EventBus`.
- Produces: `startUpdateWatcher(eventBus?: EventBus): void`.
- Consumes: Task 6 audio suspension methods.

- [ ] **Step 1: Rewrite update-watcher regressions for real readiness**

Assert update start emits suspension once, unreachable status remains suspended, ready state renders `Resuming in` plus `5`, ticks to `1`, and emits resume only after zero. Assert a menu reloads after the countdown, active matches defer reload until exit, and the fixed 60-second auto-resume behavior is removed.

```ts
expect(screen().note).toBe("Resuming in");
expect(screen().eta).toBe("5");
expect(suspensions).toEqual([true, false]);
```

- [ ] **Step 2: Write bridge tests for manual pause ownership**

Render `GameRightSidebar` with single-player/private/public configs. Assert update suspension pauses an unpaused authorized match, does not double-toggle an already paused match, resumes only updater-owned pause, and never sends unauthorized pause in listed/ranked games. Assert SoundManager suspends on every device class.

- [ ] **Step 3: Verify update tests fail**

Run: `npx vitest run tests/UpdateWatcher.test.ts tests/client/UpdatePauseBridge.test.ts tests/client/sound/SoundManager.test.ts`

Expected: watcher only paints an overlay, removes it at 60 seconds, and emits no simulation/audio suspension.

- [ ] **Step 4: Implement update coordination**

Accept the shared event bus in `startUpdateWatcher`, emit `UpdateSuspensionEvent(true)` once when an in-game update starts, and wait for a non-updating successful feed response. Add a one-second five-step resume clock. GameRightSidebar records `pausedByUpdate` and uses the normal pause intent only where authorized. SoundManager stops active effects/music while suspended and resumes according to saved volume. Do not reload an active match; retain `reloadAfterMatch`.

- [ ] **Step 5: Verify update suites**

Run: `npx vitest run tests/UpdateWatcher.test.ts tests/client/UpdatePauseBridge.test.ts tests/client/sound/SoundManager.test.ts`

- [ ] **Step 6: Commit Task 7**

```powershell
git add -- src/client/openback/UpdateWatcher.ts src/client/Main.ts src/client/hud/layers/GameRightSidebar.ts src/client/sound/SoundManager.ts tests/UpdateWatcher.test.ts tests/client/UpdatePauseBridge.test.ts
git commit -m "Pause active games safely during updates"
```

### Task 8: Release Notes, Full Verification, Browser Playtest, and Publish

**Files:**

- Modify: `resources/changelog.md`
- Modify: plan checkboxes in `docs/superpowers/plans/2026-08-21-mobile-experience-release.md`

**Interfaces:**

- Consumes every earlier task.
- Produces OpenBack v0.36.197 on `main` with verified CI.

- [ ] **Step 1: Add the player-facing release entry**

At the top of `resources/changelog.md`, add `OpenBack v0.36.197 - Mobile Command` describing complete timers/navigation, safe-area HUD, touch placement and vehicles, repeat building, audio/settings, and update pause/countdown. Credit **frootz jhklphy** and omit implementation-only details.

- [ ] **Step 2: Run focused integration tests**

Run:

```powershell
npx vitest run tests/client/MobileTopBarUtilities.test.ts tests/client/GameModeSelectorMobile.test.ts tests/client/MobileGameHud.test.ts tests/client/PlayerInfoOverlayLayout.test.ts tests/client/InputHandlerMobilePlacement.test.ts tests/client/InputHandlerGestureZoom.test.ts tests/client/VehicleTouchPlacement.test.ts tests/client/UnitDisplaySelection.test.ts tests/client/UserSettingMobile.test.ts tests/client/sound/SoundManager.test.ts tests/UpdateWatcher.test.ts tests/client/UpdatePauseBridge.test.ts
```

Expected: all focused tests pass with no unhandled rejection.

- [ ] **Step 3: Run repository verification**

Run:

```powershell
npm run build-prod
npm run lint:github
npx prettier --check .
npm run test:coverage
git diff --check
```

Expected: TypeScript/Vite build succeeds, zero lint errors/warnings, formatting clean, full suite passes, and no whitespace errors.

- [ ] **Step 4: Perform real browser Home and settings QA**

Use the in-app browser at 390×844 and 844×390. Verify no page scroll, full countdown chips, visible account access, working Menu/Back on every page, touch-specific settings copy, balanced counters, and zero safe-area clipping. Inspect console errors after each route transition.

- [ ] **Step 5: Perform real gameplay QA**

Start Classic 2D and Immersive 3D Solo matches. Exercise city cancel-then-attack, repeat placement, Plane on Runway plus launch, Tank on Military Base plus deployment, bomb drag/tap/hold cancellation, one-finger preview movement, two-finger 3D orbit/pinch, unit description deselection, audio unlock/visibility, and update pause/resume countdown. Confirm no duplicate intents in logs.

- [ ] **Step 6: Commit the release**

```powershell
git add -- resources/changelog.md docs/superpowers/plans/2026-08-21-mobile-experience-release.md
git commit -m "Release OpenBack v0.36.197 mobile command"
```

- [ ] **Step 7: Push and verify GitHub CI**

```powershell
git push origin main
gh run list --repo hertzitamar9-png/OpenBack --commit HEAD --limit 5
```

Wait for Build, Test, Lint, Prettier, and Generated Maps jobs to complete successfully before reporting completion.
