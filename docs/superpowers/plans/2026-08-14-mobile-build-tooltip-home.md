# Mobile Build, Tooltip, and Home Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make mobile building reliable, keep unit information inside the viewport, and replace the clipped homepage lobby carousel with a balanced three-card composition.

**Architecture:** Give the canvas input handler explicit ownership of pointer sequences that begin on the battlefield, and give build placement priority while a ghost is active. Keep desktop hover details in `UnitDisplay`, but render a dedicated fixed mobile detail card with viewport constraints. Reuse the existing lobby-card renderer inside a responsive mobile mosaic so game data and join behavior remain shared.

**Tech Stack:** TypeScript, Lit, Tailwind utility classes, CSS media queries, Vitest, Codex in-app browser automation.

## Global Constraints

- Preserve desktop mouse controls, touch drag and pinch zoom, long-press selection, and existing build validation.
- Keep the build bar compact; only the information panel changes size and placement.
- Show all three homepage matches without horizontal page scrolling.
- Add OpenBack v0.34.135 release notes crediting **frootz jhklphy**.
- Preserve AGPL, attribution, and asset-license notices.

---

### Task 1: Battlefield pointer ownership

**Files:**

- Modify: `tests/client/InputHandlerGestureZoom.test.ts`
- Modify: `src/client/InputHandler.ts`

**Interfaces:**

- Consumes: `UIState.ghostStructure`, canvas `pointerdown`, window `pointerup`.
- Produces: one `MouseUpEvent` for a valid mobile placement tap and no `TouchEvent` or `ContextMenuEvent`.

- [ ] **Step 1: Write failing tests**

Add a regression proving a touch pointer sequence beginning outside the canvas emits no battlefield event, and keep the existing active-ghost test asserting exactly one `MouseUpEvent`.

- [ ] **Step 2: Verify the tests fail**

Run `npx vitest run tests/client/InputHandlerGestureZoom.test.ts` and confirm the HUD-origin pointer-up case emits an unwanted battlefield action before the fix.

- [ ] **Step 3: Implement minimal ownership tracking**

Track whether the active primary pointer began on the canvas. Ignore a window `pointerup` that has no owned canvas pointer sequence. When `ghostStructure` is active, emit only `MouseUpEvent` and return before touch-menu routing.

- [ ] **Step 4: Verify focused tests pass**

Run `npx vitest run tests/client/InputHandlerGestureZoom.test.ts`.

### Task 2: Viewport-safe mobile unit information

**Files:**

- Modify: `tests/client/MobileGameHud.test.ts`
- Modify: `src/client/hud/layers/UnitDisplay.ts`
- Modify: `src/client/styles.css`

**Interfaces:**

- Consumes: `_hoveredUnit`, `uiState.ghostStructure`, unit translation, description, cost, and contextual hint.
- Produces: `.game-unit-tooltip` for desktop and `.game-unit-mobile-info` for touch-sized viewports.

- [ ] **Step 1: Write failing structural tests**

Assert that `UnitDisplay` exposes the two named information surfaces and that mobile CSS constrains the mobile card with viewport and safe-area sizing.

- [ ] **Step 2: Verify the tests fail**

Run `npx vitest run tests/client/MobileGameHud.test.ts` and confirm the new hooks are absent.

- [ ] **Step 3: Render shared information content in two responsive surfaces**

Extract the existing name, description, hint, and price markup into a private renderer. Keep the current anchored hover card desktop-only. Render the active or touched unit in a fixed mobile card immediately above the bottom HUD, bounded by `max-width: calc(100vw - 1rem)` and safe-area offsets.

- [ ] **Step 4: Verify focused tests pass**

Run `npx vitest run tests/client/MobileGameHud.test.ts`.

### Task 3: Responsive three-card homepage

**Files:**

- Create: `tests/client/MobileHomepageLayout.test.ts`
- Modify: `src/client/GameModeSelector.ts`
- Modify: `src/client/styles.css`

**Interfaces:**

- Consumes: the existing `special`, `ffa`, and `teams` lobby values and `renderLobbyCard`.
- Produces: `.mobile-lobby-mosaic`, `.mobile-lobby-feature`, and `.mobile-lobby-secondary` responsive layout hooks.

- [ ] **Step 1: Write the failing layout test**

Assert the mobile layout no longer contains `overflow-x-auto` or snap-carousel classes and contains all three mosaic hooks.

- [ ] **Step 2: Verify the test fails**

Run `npx vitest run tests/client/MobileHomepageLayout.test.ts` and confirm the carousel is still present.

- [ ] **Step 3: Replace only the mobile carousel**

Render the first available live match as the full-width feature and render the other two in a two-column row. At very narrow widths, use one column. Preserve the existing desktop grid and all click, timer, modifier, and lobby-count behavior.

- [ ] **Step 4: Tune page composition**

Use restrained section framing and spacing so the footer follows the lobby section without a large dead region. Do not add new promotional or informational panels.

- [ ] **Step 5: Verify the focused test passes**

Run `npx vitest run tests/client/MobileHomepageLayout.test.ts`.

### Task 4: Release and browser verification

**Files:**

- Modify: `resources/changelog.md`

**Interfaces:**

- Produces: OpenBack v0.34.135 release notes and verified mobile behavior.

- [ ] **Step 1: Add release notes**

Add v0.34.135 at the top describing reliable mobile placement, readable unit details, and the complete phone homepage; credit **frootz jhklphy**.

- [ ] **Step 2: Run code quality checks**

Run focused Vitest files, TypeScript/build checks, ESLint, Prettier verification, and the complete test suite required by the repository.

- [ ] **Step 3: Browser-playtest portrait and landscape**

At 393x852 and 852x393, verify all three home cards are visible, unit information stays inside the viewport, and a City can be placed on owned land without opening the radial menu. Capture screenshots for visual inspection.

- [ ] **Step 4: Commit and push**

Stage only intended files, commit the v0.34.135 change, push `main`, and confirm GitHub CI passes for the pushed commit.
