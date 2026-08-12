# OpenFront v0.33.4 Merge and OpenBack Presentation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the exact OpenFront v0.33.4 release into OpenBack, restore upstream-accurate Hydrogen Bomb targeting, and establish a safe OpenBack Tactical presentation layer without changing gameplay.

**Architecture:** Preserve the upstream tag as a real merge parent and resolve each conflict by retaining upstream fixes plus OpenBack extensions. Lock simulation and render invariants with tests before changing target rendering. Apply product identity through shared CSS/theme tokens and existing UI components, leaving deterministic core data and protocols untouched.

**Tech Stack:** TypeScript, Lit, WebGL2/GLSL, CSS/Tailwind, Vitest, Vite, Go map generator, GitHub Actions.

## Global Constraints

- Merge `v0.33.4`, not unreleased `upstream/main`.
- Preserve all OpenBack custom units, 3D mode, maps, modifiers, disasters, social/account systems, and branding.
- Hydrogen Bomb stays at inner radius 80, outer radius 100, and explosion artwork radius 160.
- Visual work cannot alter simulation, hitboxes, coordinates, input semantics, protocols, or deterministic turns.
- Do not restore optional OpenFront marketing, Google login, subscriptions, paid access, Steam, Discord, Reddit, or Wiki links.
- Preserve AGPL, corresponding source, copyright, asset notices, and contributor attribution.
- Release as OpenBack v0.34.124 and credit **frootz jhklphy**.
- Leave `.codex-remote-attachments/` untouched.

---

### Task 1: Merge the Published Upstream Tag

**Files:**

- Modify: files changed by `v0.33.0..v0.33.4`
- Test: upstream tests added or changed by those commits

**Interfaces:**

- Consumes: Git tag `v0.33.4` and current `main`
- Produces: a two-parent merge working tree containing all released upstream behavior and OpenBack extensions

- [ ] **Step 1: Record the clean baseline and merge ancestry**

Run:

```powershell
git status --short
git rev-parse main
git rev-parse v0.33.4
git merge-base main v0.33.4
```

Expected: only `.codex-remote-attachments/` is untracked; both refs resolve.

- [ ] **Step 2: Merge without committing**

Run:

```powershell
git merge --no-ff --no-commit v0.33.4
```

Expected: either a staged clean merge or explicit conflicts; no files are discarded.

- [ ] **Step 3: Resolve conflicts by intent**

For each conflict, compare all three stages:

```powershell
git show :1:path/to/file
git show :2:path/to/file
git show :3:path/to/file
```

Retain upstream v0.33.4 fixes and merge them into the OpenBack superset. In particular:

- `resources/lang/en.json`: keep OpenBack strings and add new upstream keys.
- `BuildPreviewController`, `ConstructionExecution`, `NukeExecution`, `InputHandler`, `RadialMenuElements`: retain OpenBack unit/input extensions plus stacked U-left-click and same-tick nuke protection.
- renderer/name/status files: retain OpenBack 3D adapters and custom overlays plus upstream structure-effect and status fixes.
- schemas/records/server: retain OpenBack fields plus archive/replay fixes.
- map output: accept upstream Las Vegas source correction, then regenerate all maps later.

- [ ] **Step 4: Run upstream-focused tests**

Run:

```powershell
npx vitest run tests/AnonNames.test.ts tests/DoomsdayClockExecution.test.ts tests/InputHandler.test.ts tests/client/LocalServer.test.ts tests/client/PlayerStatsSummary.test.ts tests/client/PlayerStatsTable.test.ts tests/client/graphics/RadialMenuElements.test.ts tests/client/render/frame/derive/nuke-telegraphs.test.ts tests/core/executions/NukeExecution.test.ts tests/core/executions/UpgradeStructureExecution.test.ts tests/server/ArchivePlayerRecord.test.ts tests/ToWireGameStartInfo.test.ts
```

Expected: all selected tests pass after conflict resolution.

---

### Task 2: Lock Hydrogen Bomb Gameplay and Artwork Magnitudes

**Files:**

- Create or Modify: `tests/NukeMagnitudeParity.test.ts`
- Modify only if required: `src/core/configuration/Config.ts`
- Modify only if required: `src/client/render/gl/passes/fx-pass/FxSpritePass.ts`

**Interfaces:**

- Consumes: `Config.nukeMagnitudes(UnitType.HydrogenBomb)` and `NUKE_EXPLOSION_RADII`
- Produces: regression proof for `{ inner: 80, outer: 100 }` and artwork radius `160`

- [ ] **Step 1: Write the invariant test**

Add assertions that Hydrogen Bomb is 80/100, Atom Bomb remains 12/30, MIRV warhead remains 12/18, and the Hydrogen explosion sprite radius is 160.

- [ ] **Step 2: Run the test and verify current behavior**

Run:

```powershell
npx vitest run tests/NukeMagnitudeParity.test.ts
```

Expected: PASS if merge preserved upstream values; if it fails, the failing value identifies the merge regression.

- [ ] **Step 3: Correct only divergent constants**

Restore upstream constants exactly; do not scale values by map size, camera zoom, or 3D mode.

- [ ] **Step 4: Re-run the invariant test**

Expected: PASS.

---

### Task 3: Restore Exact 2D Upstream Target Markers

**Files:**

- Modify: `src/client/render/gl/passes/NukeTelegraphPass.ts`
- Modify: `src/client/render/gl/shaders/nuke-telegraph/nuke-telegraph-classic.vert.glsl`
- Modify: `src/client/render/gl/shaders/nuke-telegraph/nuke-telegraph-classic.frag.glsl`
- Modify: `src/client/view/GameView.ts`
- Test: `tests/client/render/ProjectionSafety.test.ts`
- Test: `tests/client/render/frame/derive/nuke-telegraphs.test.ts`

**Interfaces:**

- Consumes: `NukeTelegraphData` containing target, source, inner/outer radii, relation, and route kind
- Produces: exact upstream 2D target geometry that persists for the entire in-flight lifetime

- [ ] **Step 1: Add failing parity assertions**

Assert that the 2D draw path consumes unmodified `innerRadius` and `outerRadius`, keeps the upstream dashed outer/solid inner target design, and retains launched nukes until impact/interception.

- [ ] **Step 2: Run the focused tests and confirm the intended failure**

Run:

```powershell
npx vitest run tests/client/render/ProjectionSafety.test.ts tests/client/render/frame/derive/nuke-telegraphs.test.ts
```

- [ ] **Step 3: Replace OpenBack's divergent 2D target shader/path with v0.33.4 behavior**

Use the v0.33.4 target derivation and shader math verbatim for 2D. Keep only finite-value rejection as a safety guard; do not clamp a valid radius below its authoritative value or paint an opaque filled region.

- [ ] **Step 4: Re-run focused tests**

Expected: PASS.

---

### Task 4: Adapt the Same Marker to 3D Without Rescaling

**Files:**

- Modify: `src/client/render/gl/passes/NukeTelegraphPass.ts`
- Modify: `src/client/render/gl/Renderer.ts`
- Modify: `src/client/render/gl/three-d/ThreeDCamera.ts` only if projection helpers require it
- Test: `tests/client/render/ProjectionSafety.test.ts`
- Test: `tests/client/render/ThreeDOverlayProjection.test.ts`

**Interfaces:**

- Consumes: the same `NukeTelegraphData` used in 2D plus `ThreeDCameraState`
- Produces: terrain-projected rings whose world-space radii equal the 2D radii

- [ ] **Step 1: Add failing 3D world-radius tests**

Assert that a 100-tile outer radius projects from center to points exactly 100 world tiles away at near/far zoom and never becomes a screen-filling quad.

- [ ] **Step 2: Run tests to confirm failure against divergent projection**

- [ ] **Step 3: Implement a perspective-safe ring adapter**

Project sampled ring vertices through the 3D view-projection matrix. Reject vertices behind the camera, keep transparent interiors, preserve upstream colors/dashes, and use depth ordering that does not hide terrain or labels.

- [ ] **Step 4: Re-run projection tests**

Expected: PASS.

---

### Task 5: Establish Shared OpenBack Tactical Presentation Tokens

**Files:**

- Modify: `src/client/style.css` or the repository's root theme stylesheet
- Modify: shared button/modal/card components under `src/client/components/ui/`
- Test: existing component tests plus a new theme contract test if no suitable test exists

**Interfaces:**

- Produces CSS variables for navy/charcoal surfaces, cyan actions, green success, amber warning, red danger, borders, text, shadow, radius, and motion timing

- [ ] **Step 1: Write a theme contract test**

Assert that the production stylesheet exposes named OpenBack tokens and shared components consume them instead of adding new hard-coded presentation values.

- [ ] **Step 2: Run the test and verify it fails for missing tokens**

- [ ] **Step 3: Add tokens and migrate shared primitives**

Keep existing DOM events, IDs, attributes, focus behavior, and modal close semantics. Motion uses transform/opacity and reduced-motion media queries.

- [ ] **Step 4: Run component and style tests**

Expected: PASS.

---

### Task 6: Apply the Presentation Layer to Player-Facing Surfaces

**Files:**

- Modify: home/navigation, lobby/map/modifier cards, HUD/build bar/leaderboard/player panel, notification/dialog, and lifecycle modal components already used by OpenBack
- Test: corresponding tests under `tests/client/`

**Interfaces:**

- Consumes: shared OpenBack Tactical tokens/components from Task 5
- Produces: consistent presentation without changing behavior or protocols

- [ ] **Step 1: Add behavior-preservation and responsive assertions**

Cover critical buttons, backdrop behavior, mobile overflow, live-match pointer gating, and unchanged event payloads.

- [ ] **Step 2: Run tests and record failures**

- [ ] **Step 3: Migrate surfaces in bounded groups**

Use existing components and tokens for home/navigation, lobby/setup, live HUD, then lifecycle screens. Do not add new per-frame DOM queries or layout reads.

- [ ] **Step 4: Run the affected client tests after each group**

Expected: PASS with unchanged interaction assertions.

---

### Task 7: Regenerate Maps and Validate the Complete Release

**Files:**

- Modify: generated map manifests/binaries produced by `npm run gen-maps`
- Modify: `resources/changelog.md`

**Interfaces:**

- Produces: OpenBack v0.34.124 release tree and validation evidence

- [ ] **Step 1: Regenerate maps**

Ensure Go is on `PATH`, then run:

```powershell
npm run gen-maps
```

Expected: Las Vegas and any generator-derived outputs match the merged sources.

- [ ] **Step 2: Add the release note**

Add the v0.34.124 entry at the top of `resources/changelog.md`, describe player-visible upstream and presentation changes, mention accurate bomb targeting, and credit **frootz jhklphy**.

- [ ] **Step 3: Run local validation**

```powershell
npm run build-prod
npm run lint
npx prettier --check .
npm test
git diff --check
```

Expected: all commands exit 0.

- [ ] **Step 4: Browser-playtest the actual game**

Use the in-app browser for desktop and mobile. Inspect home, setup, a 2D match, a 3D match, Atom/Hydrogen targeting before and after launch, camera movement, interception, HUD, victory/defeat, console logs, missing assets, and frame stability.

- [ ] **Step 5: Commit the merge release**

Stage only intended files and commit the merge as OpenBack v0.34.124. Confirm the commit has both pre-merge OpenBack and `v0.33.4` as parents.

- [ ] **Step 6: Push and await CI**

```powershell
git push origin main
gh run list --branch main --limit 5
gh run watch <run-id> --exit-status
```

Expected: generated maps, build, lint, Prettier, and coverage jobs all succeed.
