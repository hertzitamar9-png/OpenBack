# OpenBack Visible Systems and Renderer Stability Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Stabilize long-match rendering, replace native dialogs, complete persistent Tribe names, and ensure every player-visible feature has a working OpenBack implementation.

**Architecture:** Preserve the deterministic core and place safety boundaries at renderer passes, dialog presentation, and authenticated persistence routes. Reuse the existing frame data, ConfirmDialog, AuthServer persistence transaction, Tribe schemas, and GameServer custom-tribe protocol instead of creating parallel systems.

**Tech Stack:** TypeScript 6, WebGL2, Lit, Express 5, Zod 4, PostgreSQL/file persistence, Vitest 4, Playwright-compatible browser QA.

## Global Constraints

- Do not change bomb gameplay magnitudes: Hydrogen 80/100, Atom 12/30, MIRV warhead 12/18.
- 2D gameplay and multiplayer determinism remain authoritative.
- Every player-facing release updates `resources/changelog.md` and credits **frootz jhklphy**.
- No native browser-generated dialog may remain in a visible flow.
- No dormant payment/subscription feature becomes visible.
- Work stays on `main` because the user explicitly requires only `main`.

---

### Task 1: Bomb history and renderer safety contract

**Files:**

- Create: `tests/client/render/ProjectionSafety.test.ts`
- Create: `src/client/render/gl/utils/ProjectionSafety.ts`
- Modify: `src/client/render/gl/Renderer.ts`
- Modify: `src/client/render/gl/passes/NukeTelegraphPass.ts`
- Modify: `src/client/render/gl/passes/RangeCirclePass.ts`
- Modify: `resources/changelog.md`

**Interfaces:**

- Produces: `isFiniteClipGeometry(values: readonly number[]): boolean` and `clampWorldRadius(radius: number, mapWidth: number, mapHeight: number): number`.
- Preserves: authoritative `Config.nukeMagnitudes()` values.

- [ ] **Step 1: Write failing tests** asserting non-finite clip values are rejected, radii cannot exceed the map diagonal, and configured bomb magnitudes remain unchanged.
- [ ] **Step 2: Run** `npx vitest run tests/client/render/ProjectionSafety.test.ts` and confirm the missing safety module causes the expected failure.
- [ ] **Step 3: Implement** the pure safety helpers and apply them before telegraph/range instance upload and at renderer frame boundaries.
- [ ] **Step 4: Add frame-state restoration** for framebuffer, viewport, scissor, depth, and blend; isolate optional pass failures while keeping essential terrain/border/name passes alive.
- [ ] **Step 5: Run targeted tests** and confirm they pass.
- [ ] **Step 6: Add OpenBack v0.34.109 release notes** describing player-visible stability without claiming a gameplay radius change.
- [ ] **Step 7: Commit** the renderer release.

### Task 2: Destination telegraphs and context recovery

**Files:**

- Create: `tests/client/render/NukeTelegraphPersistence.test.ts`
- Modify: `src/client/render/frame/derive/NukeTelegraphs.ts`
- Modify: `src/client/render/gl/MapRenderer.ts`
- Modify: `src/client/render/gl/Renderer.ts`
- Modify: `src/client/view/GameView.ts`
- Modify: `resources/changelog.md`

**Interfaces:**

- Consumes: renderer safety contract from Task 1.
- Produces: telegraphs for every active in-flight bomb with a valid target and recoverable WebGL context lifecycle.

- [ ] **Step 1: Write failing tests** for repeated frame extraction, inactive-unit removal, map-edge targets, and context lost/restored state transitions.
- [ ] **Step 2: Run targeted tests** and verify the new recovery expectations fail.
- [ ] **Step 3: Keep authoritative bomb IDs synchronized** and preserve telegraphs across ordinary frame updates until impact/destruction.
- [ ] **Step 4: Add context lifecycle handling** that pauses drawing on loss and rebuilds resources plus latest frame data on restoration.
- [ ] **Step 5: Run targeted tests**, then a synthetic repeated-nuke renderer stress test.
- [ ] **Step 6: Add OpenBack v0.34.110 release notes and commit.**

### Task 3: Unified OpenBack dialogs

**Files:**

- Create: `tests/client/OpenBackDialog.test.ts`
- Modify: `src/client/InGameModal.ts`
- Modify: `src/client/Cosmetics.ts`
- Modify: `src/client/components/RewardsPanel.ts`
- Modify: `src/client/components/CustomCurrencyCard.ts`
- Modify: `resources/changelog.md`

**Interfaces:**

- Produces: `showOpenBackAlert({ kind, title, message }): Promise<void>` and existing explicit confirmation behavior.

- [ ] **Step 1: Write failing tests** proving visible flows do not call `window.alert` and backdrop clicks do not dismiss dialogs.
- [ ] **Step 2: Run targeted tests** and confirm native calls fail them.
- [ ] **Step 3: Extend the existing modal service** with success, warning, error, and information variants.
- [ ] **Step 4: Replace all five remaining native alert call sites** and update panels immediately from successful responses.
- [ ] **Step 5: Run targeted tests and `rg -n "\\balert\\(" src/client`.** The search must return no visible-flow native alert calls.
- [ ] **Step 6: Add OpenBack v0.34.111 release notes and commit.**

### Task 4: Persistent Tribe domain and routes

**Files:**

- Create: `src/server/auth/TribeStore.ts`
- Create: `tests/server/TribeStore.test.ts`
- Create: `tests/server/AuthServerTribes.test.ts`
- Modify: `src/server/auth/AuthServer.ts`
- Modify: `src/core/ApiSchemas.ts`
- Modify: `src/client/components/TribesPanel.ts`
- Modify: `src/server/ServerEnv.ts`
- Modify: `resources/changelog.md`

**Interfaces:**

- Produces authenticated `GET/POST /users/@me/tribe_names`, `POST /users/@me/tribe_names/:id/boosts`, public `GET /public/tribe/:name`, `GET /leaderboard/tribes`, and internal `POST /custom_tribes`.
- Persists records through the existing AuthServer transaction so PostgreSQL and dev-file persistence remain consistent.

- [ ] **Step 1: Write failing domain tests** for normalization, uniqueness, inappropriate names, currency, boosts, statistics, status, ranking, and weighted multiplayer selection.
- [ ] **Step 2: Run the domain suite** and confirm the missing store fails.
- [ ] **Step 3: Implement the pure Tribe domain** with stable IDs and deterministic selection injection.
- [ ] **Step 4: Write failing route tests** for authentication, validation, insufficient currency, mutation responses, public detail, leaderboard paging, and internal API-key protection.
- [ ] **Step 5: Implement the routes and persistent fields** inside the existing account store transaction.
- [ ] **Step 6: Update the client panel** to use mutation responses immediately without reloading.
- [ ] **Step 7: Run Tribe, GameServer, persistence, and API schema suites.**
- [ ] **Step 8: Add OpenBack v0.34.112 release notes and commit.**

### Task 5: Visible-feature completion gate and player QA

**Files:**

- Create: `tests/client/VisibleFeatureContract.test.ts`
- Create: `tests/playtest/visible-features.md`
- Modify: visible components only when the audit finds a broken exposed action
- Modify: `resources/changelog.md`

**Interfaces:**

- Consumes: completed renderer, dialog, and Tribe releases.
- Produces: an executable inventory of visible actions and a browser evidence checklist.

- [ ] **Step 1: Write the failing contract test** scanning visible components for native dialogs, known external-only endpoints, and controls without actions.
- [ ] **Step 2: Run it and record each concrete failure.**
- [ ] **Step 3: Implement or remove only the exposed failures**, adding a focused failing test before each change.
- [ ] **Step 4: Run desktop and mobile browser playtests** across Home, Profile, Friends, Clans, Ranked, Store, Leaderboards, Tribes, Tutorials, Blog, legal pages, and gameplay HUD.
- [ ] **Step 5: Run a long 2D/3D nuke-and-effects stress scenario** and capture screenshots showing terrain, borders, names, HUD, and destination circles still present.
- [ ] **Step 6: Run** `npm run build-dev`, `npm run lint`, targeted tests, `npm test`, and `git diff --check`.
- [ ] **Step 7: Add the final player-facing release note if audit fixes were required, commit, push `main`, and wait for GitHub CI.**
