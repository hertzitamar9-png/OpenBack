# OpenFront v0.33.12 Integration Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Merge the exact published OpenFront v0.33.12 release into OpenBack as v0.36.251 without regressing OpenBack features, identity, mobile behavior, multiplayer, persistence, or deployment.

**Architecture:** Merge tag `v0.33.12` as a real second parent, then resolve the predicted conflicts as an OpenBack superset. Adopt upstream's zbin protocol atomically across client and server, integrate Overtime and the train fix, retain only the inline-modal part of upstream's layout work, and keep OpenFront advertising/press/promotional surfaces out.

**Tech Stack:** TypeScript, Lit, Zod, zbin, WebSocket, Node/Express, Vitest, Vite/Rolldown, Docker, GitHub Actions, browser-driven WebGL tests.

**Spec:** `docs/superpowers/specs/2026-08-28-openfront-v03312-integration-design.md`

## Global Constraints

- Merge only tag `v0.33.12` at `88cc95d8b6d74d951546da341be809bfb3cab960`; do not merge unreleased `upstream/main`.
- Preserve a real two-parent merge commit whose first parent is pre-merge OpenBack and whose second parent is `88cc95d8b6d74d951546da341be809bfb3cab960`.
- Preserve every intentional OpenBack feature, canonical route, product identity, mobile behavior, database field, and deployment invariant.
- Keep OpenFront-owned game and lobby WebSocket framing binary with no JSON fallback; client and server deploy from one commit.
- Exclude OpenFront advertising, press pages/assets, and optional promotional links.
- Preserve AGPL, corresponding-source availability, copyright, asset notices, and contributor attribution.
- Add the top `resources/changelog.md` entry as OpenBack v0.36.251 and credit **frootz jhklphy**.
- Do not stage `.agents/`, `.codex/`, `.codex-remote-attachments/`, `nul`, or any unrelated user file.
- Push only `main`, then verify CI and the exact live commit before completion.

## File and responsibility map

### Upstream protocol foundation

- Create from upstream: `zbin/bytes.ts`, `zbin/context.ts`, `zbin/index.ts`, `zbin/zb.ts`, `zbin/README.md` — positional binary schema implementation and contract.
- Create from upstream: `src/core/ZbinWire.ts` — typed game/lobby encode/decode boundary and client-ID dictionary construction.
- Modify: `src/core/Schemas.ts`, `src/core/StatsSchemas.ts` — zbin-compatible schemas that remain the single source of truth and include all OpenBack extensions.
- Modify: `src/client/Transport.ts`, `src/client/LobbySocket.ts` — browser binary frames and context seeding.
- Modify: `src/server/GameServer.ts`, `src/server/Worker.ts`, `src/server/WorkerLobbyService.ts` — binary decode, validation, broadcast, and lobby frames.
- Create from upstream: `tests/util/Wire.ts`, `tests/zbin/**` — protocol helpers, golden vectors, fuzzing, hardening, and every message-variant round trip.

### Overtime

- Create from upstream: `src/client/components/OvertimePanel.ts` — active threshold HUD.
- Modify: `src/core/configuration/Config.ts`, `src/core/execution/WinCheckExecution.ts`, `src/core/game/Game.ts`, `src/core/Schemas.ts` — deterministic configuration and win threshold.
- Modify: `src/client/HostLobbyModal.ts`, `src/client/SinglePlayerModal.ts`, `src/client/JoinLobbyModal.ts`, `src/client/Utils.ts`, `src/client/hud/layers/GameRightSidebar.ts`, `src/client/hud/layers/HeadsUpMessage.ts` — controls, summary, modifier badge, panel, and alert.
- Modify: `src/server/GameServer.ts`, `src/server/MapPlaylist.ts` — host updates and 25% public-FFA selection.
- Add/modify tests under `tests/client`, `tests/core/executions`, and `tests/server`.

### Train reliability

- Modify: `src/core/game/TrainStation.ts` — idempotent cluster assignment.
- Modify: `tests/core/game/Cluster.test.ts` — concrete stations and merge/duplicate coverage.
- Test OpenBack military fuel rails with existing train/rail suites.

### Desktop descriptor

- Create from upstream: `src/server/DesktopRelease.ts`, `scripts/buildAssetHashes.ts` — descriptor construction and deterministic output hashes.
- Modify: `src/server/Master.ts`, `src/server/PublicAssetManifest.ts`, `Dockerfile`, `package.json`, `tsconfig.json` — routes and build packaging.
- Create from upstream: `tests/DesktopRelease.test.ts`, `tests/BuildAssetHashes.test.ts`; merge `tests/server/PublicAssetManifest.test.ts` with OpenBack's missing-file security behavior.

### OpenBack UI and product boundary

- Modify: `index.html`, `src/client/Navigation.ts`, `src/client/components/MainLayout.ts`, `src/client/components/PlayPage.ts`, `src/client/styles.css`, `src/client/styles/openback.css` — contained inline-page scrolling without ads or Play-page document scrolling.
- Keep: `README.md` — OpenBack product/licensing information only.
- Modify: `resources/lang/en.json`, `resources/lang/en.openback.json` — upstream Overtime text plus OpenBack overrides, without marketing copy.
- Do not add: `resources/press/**`, upstream AdShield/Playwire layout, OpenFront press navigation, or promotional URLs.

### Release evidence

- Create: `tests/integration/OpenFrontV03312Contract.test.ts` — OpenBack-specific contract for the released protocol, Overtime, train idempotence, and product exclusions.
- Modify: `resources/changelog.md` — v0.36.251 release entry.
- Modify: `src/scripts/multiplayer-smoke.ts` — convert the existing two-client real-socket smoke harness from JSON to zbin and assert zero text frames.

---

### Task 1: Lock the OpenBack v0.33.12 contract before merging

**Files:**

- Create: `tests/integration/OpenFrontV03312Contract.test.ts`
- Read: `src/core/Schemas.ts`
- Read: `src/core/configuration/Config.ts`
- Read: `src/core/game/TrainStation.ts`
- Read: `src/client/Navigation.ts`

**Interfaces:**

- Consumes: current OpenBack v0.33.8-derived APIs.
- Produces: a failing contract that becomes green only after zbin, Overtime, train idempotence, and product exclusions are integrated.

- [ ] **Step 1: Record the exact upstream and workspace baseline**

Run:

```powershell
git fetch upstream --tags --prune
git show -s --format="%H %s" v0.33.12
git merge-base main v0.33.12
git status --short
```

Expected: tag commit `88cc95d8b6d74d951546da341be809bfb3cab960`, merge base `d53d6c339fefe0291782e1530242a771a44c9e91`, and only known unrelated untracked files.

- [ ] **Step 2: Write the failing integration contract**

Create `tests/integration/OpenFrontV03312Contract.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { GameMode, UnitType } from "../../src/core/game/Game";
import { Config } from "../../src/core/configuration/Config";
import { Cluster, TrainStation } from "../../src/core/game/TrainStation";
import {
  createGameWireContext,
  decodeClientMessage,
  encodeClientMessage,
} from "../../src/core/ZbinWire";

describe("OpenFront v0.33.12 integration contract", () => {
  it("round-trips an OpenBack attack intent through the binary wire", () => {
    const ctx = createGameWireContext([
      { clientID: "player01" },
      { clientID: "player02" },
    ]);
    const intent = {
      type: "intent",
      intent: {
        type: "attack",
        targetID: "player02",
        troops: 100,
      },
    } as const;
    expect(decodeClientMessage(encodeClientMessage(intent, ctx), ctx)).toEqual(
      intent,
    );
  });

  it("drops the FFA overtime threshold deterministically", () => {
    const config = new Config(
      {
        gameMode: GameMode.FFA,
        overtime: { enabled: true, startMinutes: 30 },
        disabledUnits: [],
      } as any,
      null,
      false,
    );
    expect(config.percentageTilesOwnedToWin(30 * 60)).toBe(80);
    expect(config.percentageTilesOwnedToWin(31 * 60)).toBe(78);
  });

  it("keeps duplicate train-station insertion idempotent", () => {
    const station = new TrainStation(
      { ticks: () => 0 } as any,
      {
        type: () => UnitType.City,
        owner: () => ({ canTrade: () => true }),
      } as any,
    );
    const cluster = new Cluster();
    cluster.addStation(station);
    cluster.addStation(station);
    expect(cluster.has(station)).toBe(true);
    expect(station.getCluster()).toBe(cluster);
  });

  it("does not restore OpenFront advertising or press promotion", () => {
    const html = readFileSync("index.html", "utf8");
    expect(html).not.toContain("AdShield");
    expect(html).not.toContain("openfront.io/press");
  });
});
```

If current schema field names differ, inspect upstream `tests/zbin/wire.test.ts` and use the exact released `ClientMessage` attack shape; do not weaken the assertion with `unknown` decoding.

- [ ] **Step 3: Run the contract and verify RED**

Run:

```powershell
npx vitest run tests/integration/OpenFrontV03312Contract.test.ts
```

Expected: FAIL because `src/core/ZbinWire.ts` and Overtime APIs do not exist yet; the train assertion may also expose the pre-v0.33.12 bug.

- [ ] **Step 4: Commit the failing contract**

```powershell
git add -- tests/integration/OpenFrontV03312Contract.test.ts
git commit -m "Test OpenFront v0.33.12 integration contract"
```

### Task 2: Start the real upstream merge and enforce the product boundary

**Files:**

- Merge: all files changed by `v0.33.8..v0.33.12`
- Resolve: `README.md`, `index.html`, `resources/lang/en.json`
- Remove from merge result: `resources/press/**`
- Review: `CLAUDE.md`, `Dockerfile`, `package.json`, `src/client/HomepagePromos.ts`, `src/client/styles.css`

**Interfaces:**

- Consumes: Task 1 contract commit and tag `v0.33.12`.
- Produces: an unresolved merge state with the product boundary resolved and all remaining semantic integration localized.

- [ ] **Step 1: Start the merge without committing**

```powershell
git merge --no-ff --no-commit v0.33.12
```

Expected: merge stops with the 14 conflicts listed in the spec. Do not abort unless the conflict set differs materially.

- [ ] **Step 2: Verify the second parent candidate**

```powershell
git rev-parse MERGE_HEAD
```

Expected: `88cc95d8b6d74d951546da341be809bfb3cab960`.

- [ ] **Step 3: Resolve README and promotional content**

Keep current OpenBack `README.md`. Remove newly added upstream press assets and page:

```powershell
git checkout --ours -- README.md
git rm -r --ignore-unmatch resources/press
```

In `index.html`, preserve OpenBack title, metadata, logos, routes, consent, and legal notices. Do not retain `AdShield`, `pw-oop-flex_container`, Playwire header padding, or a press link. Leave the page-open containment hook for Task 6.

- [ ] **Step 4: Resolve translation ownership**

Use upstream `resources/lang/en.json` as the base so released Overtime keys and schema-order checks remain valid, then restore any OpenBack-required legal exceptions only through the existing translation overlay architecture. Ensure OpenBack product text remains in `resources/lang/en.openback.json` and not duplicated into the upstream base.

```powershell
git checkout --theirs -- resources/lang/en.json
npx vitest run tests/TranslationSystem.test.ts tests/OpenBackBrand.test.ts
```

Expected: tests identify any OpenBack overlay keys that need restoration; fix only the overlay, then rerun to PASS.

- [ ] **Step 5: Audit every automatically merged promotional hunk**

```powershell
git diff --cached --name-only
git diff -- src/client/HomepagePromos.ts src/client/components/PlayPage.ts src/client/components/MainLayout.ts src/client/styles.css index.html
rg -n "AdShield|Playwire|openfront\.io/press|resources/press" index.html src resources --glob '!resources/changelog.md'
```

Expected: no player-visible upstream promotion remains.

### Task 3: Integrate zbin schemas and every binary WebSocket boundary

**Files:**

- Create/accept: `zbin/**`, `src/core/ZbinWire.ts`, `tests/zbin/**`, `tests/util/Wire.ts`
- Resolve: `src/core/Schemas.ts`, `src/client/LobbySocket.ts`, `src/server/Worker.ts`
- Modify/merge: `src/core/StatsSchemas.ts`, `src/client/Transport.ts`, `src/server/GameServer.ts`, `src/server/WorkerLobbyService.ts`, `tests/LobbySocket.test.ts`, affected server tests

**Interfaces:**

- Consumes: released `zb.*` builders and all current OpenBack schema fields.
- Produces: `createGameWireContext`, `encodeServerMessage`, `decodeServerMessage`, `encodeClientMessage`, `decodeClientMessage`, `decodeClientMessageUnvalidated`, `encodeLobbyMessage`, and `decodeLobbyMessage` with released signatures.

- [ ] **Step 1: Inventory OpenBack-only schema fields before resolving**

```powershell
git diff v0.33.8..HEAD -- src/core/Schemas.ts src/core/StatsSchemas.ts src/core/WorkerSchemas.ts > .git/openback-schema-delta.txt
rg -n "worldMechanics|experienceMode|Plane|Runway|MANPAD|MilitaryBase|TankMine|sharedControl|naturalDisasters|livingWorld" src/core/Schemas.ts src/core/configuration/Config.ts
```

Do not stage `.git/openback-schema-delta.txt`; it is temporary evidence.

- [ ] **Step 2: Resolve `src/core/Schemas.ts` as a zbin-compatible superset**

Begin from upstream's zbin builder conversion, then reinsert every OpenBack field at a deterministic position. Use:

```ts
zb.uint()             // unsigned integral wire values
zb.int()              // signed integral wire values
zb.float()            // non-integral numbers
zb.mapped("clientId") // repeated client IDs
zb.json()             // intentionally open/partial JSON payloads
zb.stamped(...)       // server-stamped clientID on intent unions
```

Do not convert an OpenBack numeric field to plain `z.number()` inside a binary root. Preserve `.optional()`, enum order, discriminated-union order, and object field order because each is wire format.

- [ ] **Step 3: Resolve client transport**

In `src/client/LobbySocket.ts`, keep OpenBack reconnect/backoff logic but set `binaryType = "arraybuffer"` and decode with `decodeLobbyMessage`.

In `src/client/Transport.ts`, preserve OpenBack auth, worker routing, update handling, reconnect buffering, and local server behavior while adopting released binary framing:

```ts
this.socket.binaryType = "arraybuffer";
this.socket.send(encodeClientMessage(msg, this.zbinCtx ?? undefined));
const msg = decodeServerMessage(
  new Uint8Array(event.data as ArrayBuffer),
  this.zbinCtx ?? undefined,
);
if (msg.type === "start") {
  this.zbinCtx = createGameWireContext(msg.gameStartInfo.players);
}
```

Store buffered `ClientMessage` objects and encode only when flushing.

- [ ] **Step 4: Resolve server framing and validation**

In `src/server/Worker.ts`, decode pre-join messages without a dictionary and encode errors with `encodeServerMessage`.

In `src/server/GameServer.ts`, preserve OpenBack auth, social, matchmaking, telemetry, custom units, shared control, and hosted-lobby behavior while:

- constructing one game wire context from the immutable start roster;
- encoding start without that context;
- encoding later messages with it;
- structurally decoding invalid client frames before validation only where rejected-intent telemetry requires raw intent type; and
- closing corrupt peers with existing invalid-message semantics.

- [ ] **Step 5: Convert server tests to real binary helpers**

Use `tests/util/Wire.ts` instead of JSON strings or `JSON.parse(ws.send)` in every affected test. Fixtures must satisfy the complete schema; do not use partial `{...} as any` messages where serialization would reject missing required fields.

- [ ] **Step 6: Run focused protocol tests**

```powershell
npx vitest run tests/zbin tests/LobbySocket.test.ts tests/server/SpectatorJoin.test.ts tests/server/GameLifecycle.test.ts tests/server/TurnstileReadmit.test.ts tests/integration/OpenFrontV03312Contract.test.ts
npx tsc --noEmit
```

Expected: all zbin golden, fuzz, hardening, protocol, and wire tests pass; the integration contract may still fail only on Overtime or trains.

### Task 4: Integrate deterministic Overtime without losing OpenBack configuration

**Files:**

- Resolve: `src/client/HostLobbyModal.ts`, `src/client/SinglePlayerModal.ts`, `src/core/configuration/Config.ts`
- Create/accept: `src/client/components/OvertimePanel.ts`
- Modify/merge: `src/client/JoinLobbyModal.ts`, `src/client/Utils.ts`, `src/client/hud/layers/GameRightSidebar.ts`, `src/client/hud/layers/HeadsUpMessage.ts`, `src/core/execution/WinCheckExecution.ts`, `src/core/game/Game.ts`, `src/server/GameServer.ts`, `src/server/MapPlaylist.ts`
- Test: `tests/core/executions/WinCheckExecution.test.ts`, `tests/server/MapPlaylistOvertime.test.ts`, `tests/client/OvertimeModifierBadge.test.ts`

**Interfaces:**

- Consumes: `GameConfig.overtime?: { enabled: boolean; startMinutes?: number }` and `PublicGameModifiers.isOvertime?: boolean` from Task 3 schemas.
- Produces: `Config.overtimeConfig()` and `Config.percentageTilesOwnedToWin(elapsedGameSeconds: number)`.

- [ ] **Step 1: Run upstream Overtime tests to establish RED**

```powershell
npx vitest run tests/core/executions/WinCheckExecution.test.ts tests/server/MapPlaylistOvertime.test.ts tests/client/OvertimeModifierBadge.test.ts tests/integration/OpenFrontV03312Contract.test.ts
```

Expected: failures name missing/incorrect Overtime behavior while conflicts are unresolved.

- [ ] **Step 2: Resolve core calculation exactly**

Preserve all OpenBack constants and methods in `Config.ts`, then add:

```ts
const OVERTIME_DEFAULTS = {
  enabled: false,
  startMinutes: 30,
  dropPercentPerMinute: 2,
};

percentageTilesOwnedToWin(elapsedGameSeconds: number): number {
  const base = this._gameConfig.gameMode === GameMode.Team ? 95 : 80;
  const overtime = this.overtimeConfig();
  if (!overtime.enabled) return base;
  const secondsPastStart =
    Math.floor(elapsedGameSeconds) - overtime.startMinutes * 60;
  if (secondsPastStart <= 0) return base;
  return Math.max(
    0,
    base - Math.floor((secondsPastStart * overtime.dropPercentPerMinute) / 60),
  );
}
```

Pass the same elapsed seconds into FFA and team win checks.

- [ ] **Step 3: Resolve host and Solo controls as OpenBack supersets**

Add Overtime controls to the existing OpenBack settings sections. Do not remove or reorder OpenBack world mechanics, 2D/3D selection, custom units, bots/nations, friends/teams, or custom maps. Use the released translation keys and existing OpenBack input components.

- [ ] **Step 4: Integrate panel, notification, and public modifier**

Mount `<overtime-panel>` in `GameRightSidebar` alongside Doomsday without covering OpenBack controls. Add the one-time heads-up message and modifier badge. In `MapPlaylist`, use `OVERTIME_FFA_CHANCE = 0.25`, apply only to ordinary public FFA, and keep ranked/team/special behavior unchanged.

- [ ] **Step 5: Run Overtime GREEN tests**

```powershell
npx vitest run tests/core/executions/WinCheckExecution.test.ts tests/server/MapPlaylistOvertime.test.ts tests/client/OvertimeModifierBadge.test.ts tests/integration/OpenFrontV03312Contract.test.ts
```

Expected: Overtime and integration assertions pass except any remaining train/product-boundary item.

### Task 5: Integrate the train-cluster fix and desktop descriptor

**Files:**

- Modify/accept: `src/core/game/TrainStation.ts`, `tests/core/game/Cluster.test.ts`
- Create/accept: `src/server/DesktopRelease.ts`, `scripts/buildAssetHashes.ts`, `tests/DesktopRelease.test.ts`, `tests/BuildAssetHashes.test.ts`
- Modify/merge: `src/server/Master.ts`, `src/server/PublicAssetManifest.ts`, `tests/server/PublicAssetManifest.test.ts`, `Dockerfile`, `package.json`, `tsconfig.json`

**Interfaces:**

- Consumes: current OpenBack railway/fuel-train logic and static asset manifest.
- Produces: idempotent `TrainStation.setCluster(cluster)` and `/desktop/version.json` plus `/desktop/release.json` descriptor routes.

- [ ] **Step 1: Apply the exact train root-cause fix**

Ensure `TrainStation.setCluster()` contains:

```ts
if (this.cluster !== null && this.cluster !== cluster) {
  this.cluster.removeStation(this);
}
this.cluster = cluster;
```

Use upstream's concrete `TrainStation` tests rather than mocks.

- [ ] **Step 2: Run train regressions**

```powershell
npx vitest run tests/core/game/Cluster.test.ts tests/core/game/RailNetwork.test.ts tests/integration/OpenFrontV03312Contract.test.ts
```

Expected: duplicate insertion, cluster merge, ordinary trains, and OpenBack rail behavior pass.

- [ ] **Step 3: Integrate descriptor build files and routes**

Accept upstream `DesktopRelease.ts` and `buildAssetHashes.ts`. Mount routes before the SPA fallback in `Master.ts`. Keep OpenBack's explicit 404 behavior for unknown file-like paths in `PublicAssetManifest` and its tests.

Update `build-prod` exactly once:

```json
"build-prod": "concurrently --kill-others-on-fail \"tsc --noEmit\" \"vite build\" && tsx scripts/buildAssetHashes.ts"
```

Ensure Docker copies both `scripts` and `zbin` before build execution.

- [ ] **Step 4: Verify descriptor identity and security**

Tests must assert:

```ts
expect(descriptor.schemaVersion).toBe(1);
expect(descriptor.clientVersion).toBe(testCommit);
expect(descriptor.assets).not.toEqual({});
expect(unknownFileResponse.status).toBe(404);
```

No descriptor UI, OpenFront store link, Steam prompt, or promotional download button is added.

- [ ] **Step 5: Run descriptor tests and production build**

```powershell
npx vitest run tests/DesktopRelease.test.ts tests/BuildAssetHashes.test.ts tests/server/PublicAssetManifest.test.ts
npm run build-prod
```

Expected: descriptor tests pass and the build emits `static/asset-hashes.json` plus `static/core-version.txt`.

### Task 6: Restore contained inline-page scrolling without changing the Play page

**Files:**

- Resolve: `index.html`, `src/client/Navigation.ts`, `src/client/components/MainLayout.ts`, `src/client/components/PlayPage.ts`
- Modify: `src/client/styles.css`, `src/client/styles/openback.css`
- Create: `tests/client/OpenBackPageScrollContract.test.ts`

**Interfaces:**

- Consumes: `showPage(pageId)` and OpenBack canonical routes.
- Produces: `body.page-open` true for inline pages and false for `page-play`; modal-internal scroll containment.

- [ ] **Step 1: Write the page-scroll regression test**

Create `tests/client/OpenBackPageScrollContract.test.ts`:

```ts
import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("OpenBack inline page scrolling", () => {
  it("locks only inline pages and keeps the Play page free of ad layout", () => {
    const navigation = readFileSync("src/client/Navigation.ts", "utf8");
    const styles = readFileSync("src/client/styles.css", "utf8");
    const html = readFileSync("index.html", "utf8");
    expect(navigation).toContain(
      'document.body.classList.toggle("page-open", pageId !== "page-play")',
    );
    expect(styles).toContain("body.page-open");
    expect(html).not.toContain("AdShield");
    expect(html).not.toContain("pw-oop-flex_container");
  });
});
```

- [ ] **Step 2: Run RED**

```powershell
npx vitest run tests/client/OpenBackPageScrollContract.test.ts
```

Expected: FAIL until `page-open` is integrated.

- [ ] **Step 3: Implement the minimum containment behavior**

In `showPage()`:

```ts
document.body.classList.toggle("page-open", pageId !== "page-play");
```

Add `min-h-0` to the MainLayout containers and a `body.page-open` rule that locks the document. Do not copy ad-slot CSS or make Play document-scrollable.

- [ ] **Step 4: Run GREEN and route tests**

```powershell
npx vitest run tests/client/OpenBackPageScrollContract.test.ts tests/client/AppRoutes.test.ts tests/client/Navigation.test.ts tests/client/MobileHomepageLayout.test.ts
```

Expected: all pass.

### Task 7: Resolve the merge completely and create OpenBack v0.36.251

**Files:**

- Resolve all remaining `git diff --name-only --diff-filter=U` paths.
- Modify: `resources/changelog.md`
- Review: every file in `git diff --name-only v0.33.8..v0.33.12`.

**Interfaces:**

- Consumes: Tasks 2-6 resolved merge tree.
- Produces: a green two-parent merge commit and player-facing v0.36.251 notes.

- [ ] **Step 1: Prove no conflict markers remain**

```powershell
git diff --name-only --diff-filter=U
rg -n "^(<<<<<<<|=======|>>>>>>>)" . --glob '!node_modules/**' --glob '!.git/**' --glob '!.agents/**' --glob '!.codex/**'
```

Expected: no output.

- [ ] **Step 2: Review auto-merges for silent regression**

For every upstream-changed file, compare three views:

```powershell
git diff v0.33.8..v0.33.12 -- <file>
git diff v0.33.8..HEAD -- <file>
git diff -- <file>
```

Confirm released upstream behavior and independent OpenBack behavior are both present. Pay special attention to `Transport.ts`, `GameServer.ts`, `MapPlaylist.ts`, `Master.ts`, `HomepagePromos.ts`, and `styles.css` even if Git auto-merged them.

- [ ] **Step 3: Add the release notes**

Add at the top of `resources/changelog.md`:

```markdown
## OpenBack v0.36.251 - Faster Fronts

- Multiplayer game and lobby traffic now uses OpenFront v0.33.12's binary protocol, sharply reducing bandwidth while keeping the authoritative simulation unchanged.
- Added optional Overtime: after its configured start, the territory required to win falls gradually so stalled wars reach a result. It can appear as a public FFA modifier.
- Fixed long and merged railway networks disconnecting stations and preventing trains from spawning.
- Inline pages now keep their scrolling inside the page while the Play screen retains OpenBack's fitted, non-scrolling layout.
- Updated OpenBack to the published OpenFront v0.33.12 gameplay baseline while preserving OpenBack units, modes, mobile controls, accounts, social systems, maps, and 2D/3D experiences.

Created by **frootz jhklphy**.
```

- [ ] **Step 4: Run the focused merge gate**

```powershell
npx vitest run tests/integration/OpenFrontV03312Contract.test.ts tests/zbin tests/core/game/Cluster.test.ts tests/core/executions/WinCheckExecution.test.ts tests/server/MapPlaylistOvertime.test.ts tests/client/OpenBackPageScrollContract.test.ts tests/server/PublicAssetManifest.test.ts
npx tsc --noEmit
```

Expected: PASS.

- [ ] **Step 5: Stage only intended merge files**

```powershell
git add -u
git add -- zbin src tests scripts Dockerfile package.json package-lock.json tsconfig.json index.html resources/lang/en.json resources/lang/en.openback.json resources/changelog.md README.md CLAUDE.md
git status --short
```

Verify `.agents/`, `.codex/`, `.codex-remote-attachments/`, `nul`, and other unrelated untracked paths remain unstaged.

- [ ] **Step 6: Commit the merge**

```powershell
git commit -m "Merge OpenFront v0.33.12 into OpenBack v0.36.251"
```

- [ ] **Step 7: Verify ancestry**

```powershell
git show -s --format="%H%n%P%n%s" HEAD
```

Expected: exactly two parents; the second is `88cc95d8b6d74d951546da341be809bfb3cab960`.

### Task 8: Run the complete static and runtime verification matrix

**Files:**

- Verify only; modify implementation/tests only when a failure has a traced root cause and a new regression test.
- Use: `.agents/skills/run-openfront/driver.mjs`, `.agents/skills/run-openfront/game.mjs` without staging them.
- Modify: `src/scripts/multiplayer-smoke.ts`.

**Interfaces:**

- Consumes: committed v0.36.251 merge.
- Produces: evidence that Solo, two-client multiplayer, binary frames, Overtime, trains, UI, build, maps, and container all work.

- [ ] **Step 1: Run the full test suites**

```powershell
npm test
npm run test:coverage
```

Expected: all client/core and server tests pass with no new unhandled errors.

- [ ] **Step 2: Run code-quality gates**

```powershell
npx tsc --noEmit
npm run lint:github
npx prettier --check .
git diff --check
```

If local lint sees unrelated untracked `.agents` or `.codex` files, rerun ESLint with those two paths ignored and rely on clean-checkout CI for the canonical whole-repository result. Do not modify or delete the user's untracked files.

- [ ] **Step 3: Run production and generated-asset gates**

```powershell
npm run build-prod
npm run gen-maps
git diff --check
```

Expected: build passes; generated maps and thumbnails are either unchanged or intentionally staged if upstream generation legitimately changed them.

- [ ] **Step 4: Build the production container**

```powershell
docker build --build-arg GIT_COMMIT=$(git rev-parse HEAD) -t openback:v0.36.251 .
```

Expected: Docker build succeeds with scripts and zbin available during `build-prod`. If Docker is unavailable, record that exact limitation and require GitHub's build job plus OCI deployment build before release completion.

- [ ] **Step 5: Run real Solo WebGL smoke**

Start the dev server, then run the repository driver:

```powershell
npm run dev
node .agents/skills/run-openfront/game.mjs
```

Expected: real match starts, spawn succeeds, territory grows after attack, radial menu opens, and screenshots contain rendered terrain/HUD rather than a blank canvas.

- [ ] **Step 6: Convert and run real two-client binary multiplayer**

Update `src/scripts/multiplayer-smoke.ts` to import:

```ts
import {
  createGameWireContext,
  decodeServerMessage,
  encodeClientMessage,
} from "../core/ZbinWire";
import type { ServerMessage } from "../core/Schemas";
import type { ZbContext } from "../../zbin";
```

Represent each socket with exact state:

```ts
interface SmokeClient {
  socket: WebSocket;
  context: ZbContext | null;
  binaryFramesReceived: number;
  textFramesReceived: number;
  turns: number;
  roster: string[];
}
```

On every message, increment `textFramesReceived` when `isBinary === false`; otherwise decode `new Uint8Array(data as Buffer)` with the current context. When `message.type === "start"`, seed `createGameWireContext(message.gameStartInfo.players)` and record the roster. Count `turn` messages. Send join and toggle-start with `encodeClientMessage(message, context ?? undefined)`, never `JSON.stringify`.

After both clients pass 20 turns, throw unless all conditions are true:

```ts
for (const [index, client] of clients.entries()) {
  if (client.textFramesReceived !== 0) {
    throw new Error(`Client ${index + 1} received text WebSocket frames`);
  }
  if (client.binaryFramesReceived === 0 || client.turns <= 20) {
    throw new Error(
      `Client ${index + 1} did not receive the binary turn stream`,
    );
  }
  if (client.roster.length !== 2) {
    throw new Error(
      `Client ${index + 1} did not receive the two-player roster`,
    );
  }
}
```

Run:

```powershell
npm run test:multiplayer
```

Expected: two clients join one private lobby, see the same two-player roster, start together, advance beyond 20 turns, receive binary frames, and receive zero text frames.

- [ ] **Step 7: Exercise Overtime and train runtime behavior**

Start a short Solo/private game with Overtime enabled and an accelerated start minute through test configuration. Verify the panel appears, the threshold drops according to the core method, and the notification fires once.

Create a long or merged rail loop in a deterministic test/harness and confirm eligible factories continue spawning trains after duplicate station connections.

- [ ] **Step 8: Browser-check modal and responsive layouts**

At desktop, 393x852 portrait, and 852x393 landscape:

- Play has `document.scrollingElement.scrollHeight === innerHeight` where OpenBack intentionally fits it;
- Help/Store/Settings use internal modal scrolling and the document remains locked;
- no ad or press UI appears;
- home cards, header, footer, build bar, and global controls remain within viewport; and
- browser console has no new application errors.

### Task 9: Push main, await CI, and verify production

**Files:**

- No new source files unless CI or production exposes a reproducible defect.

**Interfaces:**

- Consumes: fully verified v0.36.251 merge commit.
- Produces: `origin/main`, green CI, and production serving the exact commit.

- [ ] **Step 1: Final pre-push evidence**

```powershell
git status --short
git show -s --format="%H%n%P%n%s" HEAD
git diff origin/main..HEAD --check
```

Expected: only known unrelated untracked files, two-parent merge ancestry, and no whitespace errors.

- [ ] **Step 2: Push main**

```powershell
git push origin main
```

- [ ] **Step 3: Await every GitHub CI job**

```powershell
gh run list --branch main --limit 5 --json databaseId,headSha,status,conclusion,url
gh run watch <run-id> --exit-status
```

Expected: Prettier, lint, coverage, production build, and generated maps all succeed for the merge commit.

- [ ] **Step 4: Verify synchronized production deployment**

Verify:

```text
https://openback.dedyn.io/api/health
https://openback.dedyn.io/auth/health
https://openback.dedyn.io/api/deploy-status
https://openback.dedyn.io/desktop/version.json
https://openback.dedyn.io/desktop/release.json
```

The public HTML embedded commit, `/commit.txt` when available, health response, and release descriptor must all identify the pushed merge commit. The fixed 60-second update lifecycle must close, and connected clients must reload together.

- [ ] **Step 5: Final production browser smoke**

Open the live Play page, Solo, one inline page, one private-lobby flow, and the release notes. Confirm v0.36.251 appears first, no OpenFront promotion appears, modal scrolling is contained, and no binary protocol or application console errors occur.

- [ ] **Step 6: Report exact evidence**

Report the merge SHA, both parents, local test counts, runtime scenarios, CI URL, production commit, and any remaining external-only limitation. Do not claim completion if any required gate is still pending.
