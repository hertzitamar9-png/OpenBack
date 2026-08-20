# Twin World Stage 4: Home and Launch Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Launch the unified Twin World home, high-resolution map previews, mode-specific setup routes, and removal of the 3D modifier after all foundations are ready.

**Architecture:** The home keeps one layout and switches a shared `ExperienceContext` between 2D and 3D. Generated 1x/2x previews provide Classic and shaded-relief 3D variants. Entry points pass immutable experience context into setup screens, and hardware capability gates 3D before matchmaking/join.

**Tech Stack:** Lit 3, Tailwind CSS 4, TypeScript 6, Go map generator, WebP, WebGL2 capability probe, Vitest, browser QA.

**Spec:** `docs/superpowers/specs/2026-08-21-twin-world-experiences-design.md`

## Global Constraints

- One home screen; no duplicated 2D/3D button walls.
- New browsers default to 2D; canonical URLs override remembered selection.
- Home switching initializes no WebGL renderer.
- 3D setup cannot start or join on unsupported hardware.
- 3D checkboxes are removed from Solo and Host.
- Existing experience-less URLs migrate to 2D.
- Primary previews remain sharp on high-density desktop displays.
- Final release is v0.36.189 and credits **frootz jhklphy**.

---

### Task 1: Generate sharp 2D and shaded-relief 3D previews

**Files:**

- Modify: `map-generator/map_generator.go`
- Modify: `map-generator/main.go`
- Modify: `src/core/game/Maps.gen.ts`
- Create: `map-generator/thumbnail_test.go`
- Regenerate: `resources/maps/*/thumbnail*.webp` and manifests.

**Interfaces:**

- Produces: `thumbnail.webp`, `thumbnail@2x.webp`, `thumbnail-3d.webp`, and `thumbnail-3d@2x.webp` for every map.

- [ ] **Step 1: Write failing generator tests**

```go
func TestThumbnailVariants(t *testing.T) {
    variants := createThumbnailVariants(testTerrain())
    require.Equal(t, baseWidth*2, variants.Classic2x.Bounds().Dx())
    require.Equal(t, baseWidth*2, variants.Relief2x.Bounds().Dx())
    require.NotEqual(t, variants.Classic.RGBAAt(20, 20), variants.Relief.RGBAAt(20, 20))
}
```

Add deterministic-byte/hash, alpha, and relief-light direction cases.

- [ ] **Step 2: Verify RED**

Run: `cd map-generator; go test ./...`

Expected: variant generation and high-quality encoding are absent.

- [ ] **Step 3: Implement preview variants**

Generate density-aware dimensions from terrain4x. Encode near WebP quality 88. Use filtered downsampling. Relief color combines terrain palette, clamped height gradient, fixed north-west light, shoreline light, and cyan water. Write all four files and manifest URLs.

- [ ] **Step 4: Verify and regenerate**

```powershell
cd map-generator
go test ./...
cd ..
npm run gen-maps
git diff --check
```

Expected: every map has four deterministic previews and a second generation creates no diff.

- [ ] **Step 5: Commit**

```powershell
git add map-generator resources/maps src/core/game/Maps.gen.ts
git commit -m "Generate sharp Twin World map previews"
```

---

### Task 2: Present density-aware previews without forced blur

**Files:**

- Modify: `src/core/game/FetchGameMapLoader.ts`
- Modify: `src/core/game/BinaryLoaderGameMapLoader.ts`
- Modify: `src/client/components/LobbyCard.ts`
- Modify: `src/server/GamePreviewBuilder.ts`
- Create: `tests/client/LobbyCardPreviewQuality.test.ts`

**Interfaces:**

- Consumes: generated preview paths from Task 1.
- Produces: `previewSources(map, experience)` with 1x/2x `srcset`; priority policy for primary cards.

- [ ] **Step 1: Write failing rendering tests**

```ts
expect(previewSources(map, "2d").srcset).toContain("thumbnail@2x.webp 2x");
expect(previewSources(map, "3d").srcset).toContain("thumbnail-3d@2x.webp 2x");
expect(cardHtml).not.toContain("scale-[1.05]");
expect(primaryImage.fetchPriority).toBe("high");
expect(secondaryImage.loading).toBe("lazy");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/LobbyCardPreviewQuality.test.ts`

Expected: cards use one quality-45 source and forced zoom.

- [ ] **Step 3: Implement responsive image selection**

Extend map loaders with classic/relief preview descriptors. LobbyCard accepts `experienceMode` and `priority`. Render `src`, `srcset`, and `sizes`; remove CSS scale; preserve contain handling for extreme ratios. Fade opacity only after decode.

- [ ] **Step 4: Verify GREEN**

Run `npx vitest run tests/client/LobbyCardPreviewQuality.test.ts tests/core/game/FetchGameMapLoader.test.ts tests/core/game/TerrainMapLoader.view.test.ts`.

- [ ] **Step 5: Commit**

```powershell
git add src tests/client/LobbyCardPreviewQuality.test.ts
git commit -m "Render sharp Twin World lobby previews"
```

---

### Task 3: Build ExperienceContext and clean routes

**Files:**

- Create: `src/client/ExperienceContext.ts`
- Modify: `src/client/AppRoutes.ts`
- Modify: `src/client/AppRouter.ts`
- Create: `tests/client/ExperienceRoutes.test.ts`

**Interfaces:**

- Produces: `experienceContext.get()`, `experienceContext.select(mode, source)`, `experience-changed`, and canonical experience routes.

- [ ] **Step 1: Write failing context and route tests**

```ts
expect(parse("/play/3d").experienceMode).toBe("3d");
expect(parse("/solo").canonicalPath).toBe("/solo/2d");
experienceContext.select("3d", "user");
expect(localStorage.getItem("openback-experience")).toBe("3d");
expect(routeSelection("/play/2d", "3d")).toBe("2d");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/ExperienceRoutes.test.ts`

Expected: routes and remembered context have no experience segment.

- [ ] **Step 3: Implement context and migration**

Support canonical paths from the spec. URL source wins over storage. Old Store/Inventory/Leaderboard/Play/Solo/Ranked/Multiplayer paths replace to `2d`. Dispatch one event after state changes; do not reload.

- [ ] **Step 4: Verify GREEN**

Run route/context tests plus all AppRouter/navigation tests.

- [ ] **Step 5: Commit**

```powershell
git add src/client tests/client
git commit -m "Add Twin World experience navigation"
```

---

### Task 4: Rebuild Home around one 2D/3D switch

**Files:**

- Create: `src/client/components/ExperienceSwitch.ts`
- Modify: `src/client/GameModeSelector.ts`
- Modify: `src/client/components/PlayPage.ts`
- Modify: `src/client/components/LobbyCard.ts`
- Modify: `src/client/styles/openback.css`
- Modify: `resources/lang/en.openback.json`
- Create: `tests/client/TwinWorldHome.test.ts`

**Interfaces:**

- Consumes: `ExperienceContext`, experience-filtered lobbies, and preview sources.
- Produces: one responsive switch, filtered showcase, and mode-correct Solo/Host/Ranked/Join actions.

- [ ] **Step 1: Write failing home tests**

```ts
expect(home.querySelectorAll("experience-switch")).toHaveLength(1);
selectExperience(home, "3d");
expect(
  visibleLobbyCards(home).every((card) => card.experienceMode === "3d"),
).toBe(true);
clickSolo(home);
expect(singlePlayer.experienceMode).toBe("3d");
expect(home.querySelectorAll("[data-action=solo]")).toHaveLength(1);
```

Add portrait/landscape class assertions and reduced-motion behavior.

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/TwinWorldHome.test.ts`

Expected: home has no experience selector or filtering.

- [ ] **Step 3: Implement the unified layout**

Render the switch between identity and showcase. Expand desktop max width/height with CSS clamps. Keep one action group. Filter lobbies before selecting primary/secondary cards. Cross-fade normally and switch instantly under reduced motion. Pass experience into every action.

- [ ] **Step 4: Verify GREEN**

Run home tests plus GameModeSelector, LobbyCard, PlayPage, desktop-nav, and mobile-home suites.

- [ ] **Step 5: Commit**

```powershell
git add src/client resources/lang tests/client
git commit -m "Build the Twin World home"
```

---

### Task 5: Remove 3D modifier controls and gate hardware

**Files:**

- Modify: `src/client/SinglePlayerModal.ts`
- Modify: `src/client/HostLobbyModal.ts`
- Create: `src/client/ThreeDCapability.ts`
- Modify: `src/client/JoinLobbyModal.ts`
- Modify: `src/client/components/ExperienceSwitch.ts`
- Create: `tests/client/ThreeDCapabilityGate.test.ts`

**Interfaces:**

- Produces: `probeThreeDCapability(): ThreeDCapabilityResult`, immutable setup experience, and OpenBack-styled unsupported-hardware messaging.

- [ ] **Step 1: Write failing removal and gate tests**

```ts
expect(singlePlayer.textContent).not.toContain("3D World");
expect(host.textContent).not.toContain("3D World");
expect(probe({ webgl2: false }).supported).toBe(false);
await attemptJoin(threeDLobby, unsupportedDevice);
expect(joinSocket).not.toHaveBeenCalled();
expect(dialog.textContent).toContain("Immersive 3D requires WebGL2");
```

- [ ] **Step 2: Verify RED**

Run: `npx vitest run tests/client/ThreeDCapabilityGate.test.ts`

Expected: checkboxes remain and no pre-join gate exists.

- [ ] **Step 3: Remove modifiers and implement capability probe**

Delete 3D option rows/state handlers from setup components. Show experience as fixed context. Probe WebGL2 and required limits without importing the renderer. Disable 3D with Help/Troubleshooting action when unsupported. Join/replay paths check before opening a socket.

- [ ] **Step 4: Verify GREEN**

Run focused test and all Solo/Host/Join setup tests.

- [ ] **Step 5: Commit**

```powershell
git add src/client tests/client
git commit -m "Launch 3D as its own experience"
```

---

### Task 6: Final release verification and enablement

**Files:**

- Create: `src/core/openback/FeatureFlags.ts`
- Create: `tests/core/TwinWorldFeatureFlag.test.ts`
- Modify: `resources/changelog.md`
- Modify: only files named by a failing regression test created during Step 3.

**Interfaces:**

- Consumes: completed Stages 1-4.
- Produces: enabled Twin World v0.36.188 on `main` with passing CI.

- [ ] **Step 1: Add release entry and enable the gate**

```md
## OpenBack v0.36.189 - Twin Worlds

- Separated Classic 2D and Immersive 3D into complete experiences with their own games, ranked ladders, statistics, achievements, and cosmetic loadouts inside one shared OpenBack account.
- Rebuilt Home around one 2D/3D world switch and larger high-resolution live map previews.
- Removed 3D from match modifiers while preserving existing 3D games and replays.

Created by **frootz jhklphy**.
```

- [ ] **Step 2: Run full automation**

```powershell
npm test
npm run build-prod
npm run lint
npx prettier --check .
npm run gen-maps
git diff --check
```

Expected: all checks pass and a second map generation produces no diff.

- [ ] **Step 3: Run browser/game QA**

Verify desktop, portrait mobile, and landscape mobile for both experiences: switch, sharp previews, routes, Solo, Host, Join, Ranked, parties, Store, Inventory, Leaderboards, profiles, history, replays, unsupported hardware, Back/Forward, refresh, and console/GPU cleanup. Capture screenshots and confirm 2D navigation requests no GLB/3D shader assets.

- [ ] **Step 4: Commit and push the player-facing release**

```powershell
git add src resources map-generator tests
git commit -m "Release OpenBack Twin Worlds"
git push origin main
```

- [ ] **Step 5: Watch CI**

```powershell
$runId = gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $runId --exit-status
gh run view $runId --json status,conclusion,url,headSha
```

Expected: Build, Test Coverage, Prettier, Lint, and Generated Maps succeed for the pushed SHA.
