# Mobile Game HUD Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Make OpenBack's in-game HUD fill phone screens correctly and remain fully usable in both portrait and landscape orientations without reducing gameplay or rendering quality.

**Architecture:** Keep one Lit/Tailwind HUD and add explicit responsive contracts for narrow portrait and short landscape viewports. Safe-area insets belong inside edge-to-edge surfaces, while the lower HUD changes only its grid arrangement and spacing; simulation and canvas rendering stay untouched.

**Tech Stack:** TypeScript, Lit, Tailwind utility classes, global responsive CSS, Vitest, Vite, browser viewport testing.

## Global Constraints

- Preserve every currently visible game control and all gameplay behavior.
- Do not reduce canvas or asset quality.
- Avoid horizontal page overflow at phone portrait and landscape sizes.
- Keep the top player information surface full-width on phones.
- Keep all 16 build controls immediately available in landscape.
- Add OpenBack release notes credited to **frootz jhklphy**.

---

### Task 1: Responsive HUD contract

**Files:**

- Create: `tests/client/MobileGameHud.test.ts`
- Modify: `src/client/hud/layers/PlayerInfoOverlay.ts`
- Modify: `index.html`
- Modify: `src/client/styles.css`

**Interfaces:**

- Consumes: existing `player-info-overlay`, `#game-bottom-hud`, and `.game-hud-primary` elements.
- Produces: stable CSS hooks and edge-to-edge safe-area-aware responsive layout.

- [ ] **Step 1: Write the failing source-contract test**

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("mobile game HUD", () => {
  const playerInfo = readFileSync(
    "src/client/hud/layers/PlayerInfoOverlay.ts",
    "utf8",
  );
  const index = readFileSync("index.html", "utf8");
  const styles = readFileSync("src/client/styles.css", "utf8");

  it("keeps the phone player panel edge-to-edge", () => {
    expect(playerInfo).toContain("player-info-surface");
    expect(playerInfo).not.toContain("max-w-[96vw]");
  });

  it("provides stable responsive HUD hooks", () => {
    expect(index).toContain('id="game-bottom-hud"');
    expect(index).toContain("game-hud-primary");
    expect(styles).toContain("orientation: landscape");
  });
});
```

- [ ] **Step 2: Run the focused test and verify it fails**

Run: `npx vitest run tests/client/MobileGameHud.test.ts`

Expected: FAIL because the responsive hooks and landscape contract do not exist.

- [ ] **Step 3: Implement the minimal responsive layout**

Add named HUD hooks, remove the phone-only `96vw` cap, center the desktop surface, place safe-area padding inside the full-width surface, and add short-landscape rules that create a shallow control strip without hiding controls.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npx vitest run tests/client/MobileGameHud.test.ts`

Expected: PASS.

### Task 2: Portrait and landscape build/control density

**Files:**

- Modify: `src/client/hud/layers/ControlPanel.ts`
- Modify: `src/client/hud/layers/UnitDisplay.ts`
- Modify: `src/client/styles.css`
- Test: `tests/client/MobileGameHud.test.ts`

**Interfaces:**

- Consumes: `.game-control-panel`, `.game-unit-grid`, and `.game-unit-item` hooks.
- Produces: two-row portrait build controls and single-row short-landscape build controls with readable touch targets.

- [ ] **Step 1: Extend the failing test**

Assert the component sources expose the named hooks and CSS includes a short-landscape 16-column grid plus internally contained event columns.

- [ ] **Step 2: Run the focused test and verify the new assertions fail**

Run: `npx vitest run tests/client/MobileGameHud.test.ts`

Expected: FAIL on missing control and build-grid hooks.

- [ ] **Step 3: Add responsive hooks and CSS**

Keep the existing eight-by-two phone layout, switch to sixteen columns only when landscape width and height allow it, reduce unused padding, preserve labels, and contain notification/event surfaces so they do not expand the page.

- [ ] **Step 4: Run the focused test and verify it passes**

Run: `npx vitest run tests/client/MobileGameHud.test.ts`

Expected: PASS.

### Task 3: Release and visual verification

**Files:**

- Modify: `resources/changelog.md`

**Interfaces:**

- Consumes: completed responsive HUD.
- Produces: OpenBack v0.34.134 player-facing release and verified deployed-ready commit.

- [ ] **Step 1: Add the changelog entry**

Document the full-width phone player bar, portrait/landscape usability, and touch/layout improvements; credit **frootz jhklphy**.

- [ ] **Step 2: Run proportional static verification**

Run the focused Vitest test, TypeScript/Vite build, ESLint, and Prettier check.

- [ ] **Step 3: Browser-test both orientations**

Verify at 393x852 portrait and 852x393 landscape: no horizontal overflow, top surface reaches both viewport edges, controls stay visible, and build items remain usable. Capture screenshots and inspect console errors.

- [ ] **Step 4: Commit and push**

Stage only intended files, commit the release, push `main`, and verify GitHub CI before claiming completion.
