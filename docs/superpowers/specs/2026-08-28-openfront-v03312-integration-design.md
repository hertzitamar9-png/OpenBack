# OpenFront v0.33.12 Integration Design

**Date:** 2026-08-28  
**OpenFront baseline:** `v0.33.12` at `88cc95d8b6d74d951546da341be809bfb3cab960`  
**OpenBack release:** `v0.36.251`

## Goal

Bring OpenBack from its existing OpenFront v0.33.8 ancestry to the exact
published OpenFront v0.33.12 release while preserving every intentional
OpenBack system, product identity, mobile behavior, deployment invariant, and
license obligation.

The result must retain a real Git merge parent for `v0.33.12`. It must not
cherry-pick a subset while claiming release parity, and it must not import
unreleased commits from `upstream/main`.

## Published upstream scope

The integration imports the released behavior from v0.33.9 through v0.33.12:

1. a server-side desktop release descriptor and deterministic asset hashes;
2. the Overtime anti-stalemate option and its 25% public-FFA rotation badge;
3. the zbin serializer and binary framing for every OpenFront-owned game and
   lobby WebSocket frame;
4. the train-station cluster fix that keeps factories and trains connected
   through long loops and merged rail networks;
5. the inline-page modal scrolling fix; and
6. upstream test, schema, transport, and deployment-support changes required by
   those features.

OpenFront press pages, advertising scripts, advertising layout, promotional
assets, and promotional navigation are intentionally excluded. OpenBack's
project instructions prohibit optional OpenFront promotional surfaces, and
OpenBack's home screen intentionally fits without document scrolling.

## Integration architecture

### Release ancestry

The implementation starts from current OpenBack `main` and merges the annotated
`v0.33.12` tag with `--no-ff`. The final release commit must have the pre-merge
OpenBack head and `88cc95d8b6d74d951546da341be809bfb3cab960` as parents.

The merge base is the already-integrated OpenFront v0.33.8 commit
`d53d6c339fefe0291782e1530242a771a44c9e91`. Therefore only the published
v0.33.9-v0.33.12 delta is being integrated.

### Binary WebSocket protocol

The zbin library and `src/core/ZbinWire.ts` become the authoritative framing
layer for OpenBack-owned game and public-lobby WebSockets.

- Client and server use the same Zod-derived positional schemas.
- WebSocket `binaryType` is `arraybuffer` in browsers.
- Game start messages are decoded without a client-ID dictionary, then seed the
  identical ordered roster mapping on both peers.
- Later frames use that mapping, including an inline escape path for IDs outside
  the roster.
- Local Solo and replay object paths remain object-based and do not encode.
- HTTP endpoints, archived records, OpenBack auth/social APIs, owner analytics,
  and API-worker matchmaking remain JSON unless they already use another
  explicit format.
- Invalid binary input follows the existing validation/kick behavior.

There is no JSON fallback or protocol negotiation in upstream v0.33.12. The
client and server must therefore deploy from one commit. OpenBack's existing
fixed maintenance window and synchronized client reload remain the deployment
gate, and a two-client real-socket test is mandatory before release.

### Overtime

Overtime is integrated as an optional deterministic game configuration:

- base threshold remains 80% in FFA and 95% in team games;
- default start is 30 minutes;
- after the start, the threshold drops by two whole percentage points per
  minute with deterministic whole-second arithmetic;
- Solo and private-lobby hosts can configure it;
- joiners see it in the lobby summary;
- a top-right panel and one-time notification show the active threshold; and
- 25% of ordinary public FFA lobbies enable it and display the Overtime badge.

Team, ranked, and special public rotations do not receive the random modifier.
OpenBack's existing world-mechanics object, ranked configuration, natural
disasters, Living World, shared control, and custom map categories remain
unchanged unless an explicit adapter is required to carry the new field.

### Train-station fix

`TrainStation.setCluster()` only removes the station from its old cluster when
the new cluster is different. Duplicate `addStation()` calls become idempotent,
and cluster merges preserve trade destinations. The upstream concrete
TrainStation/Cluster regression tests are retained and extended only if
OpenBack's military fuel-railway behavior needs an additional invariant.

### Desktop release descriptor

The upstream descriptor builder, asset hashing, routes, and tests are integrated
without adding Steam or OpenFront promotional UI.

- Descriptor URLs remain server endpoints only.
- Product-visible identifiers and generated metadata must identify OpenBack,
  not OpenFront.
- Builds emit `asset-hashes.json` and `core-version.txt` after Vite output.
- Docker copies the hashing script and zbin sources required by the build.
- Existing OpenBack CDN and same-origin behavior remains authoritative.
- No desktop-client marketing, store link, or download prompt is added.

### Page scrolling and home layout

Only the v0.33.12 inline-page containment behavior is imported:

- non-Play pages toggle `body.page-open`;
- the document remains locked while Store, Settings, Leaderboard, Help, News,
  Account, Tutorials, Blog, Privacy, Terms, and similar inline pages are open;
- the modal's own scroll region scrolls; and
- returning to Play removes the class.

The v0.33.12 advertising slot, AdShield script, header-ad padding, document-level
homepage scrolling, and OpenFront press navigation are excluded. OpenBack's
desktop and mobile home layouts must continue fitting their viewport without an
empty document scroll range.

## Conflict-resolution contract

The merge preview reports conflicts in these files. Each is resolved
semantically rather than by accepting an entire side.

| Conflict                                   | Resolution invariant                                                                                                                                                          |
| ------------------------------------------ | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `README.md`                                | Keep OpenBack's product/licensing-only README; do not restore setup or promotional instructions.                                                                              |
| `index.html`                               | Keep OpenBack identity, routes, logo, SEO, legal notices, and no-ad home layout; add only page-open containment hooks needed by v0.33.12.                                     |
| `resources/lang/en.json`                   | Preserve upstream-byte-compatible base translations where possible; put OpenBack overrides in `en.openback.json`; add Overtime keys without restoring removed marketing copy. |
| `src/client/HostLobbyModal.ts`             | Preserve OpenBack private-lobby, teams, friends, 2D/3D, and custom-unit settings; add the upstream Overtime controls.                                                         |
| `src/client/LobbySocket.ts`                | Preserve OpenBack reconnect and public-lobby behavior; switch released lobby frames to zbin.                                                                                  |
| `src/client/Navigation.ts`                 | Preserve canonical `/name` routes, back behavior, and modal dismissal rules; add `body.page-open` toggling.                                                                   |
| `src/client/SinglePlayerModal.ts`          | Preserve OpenBack world mechanics, custom maps, units, and experience mode; add Overtime configuration.                                                                       |
| `src/client/components/MainLayout.ts`      | Preserve OpenBack responsive home layout and add only the minimum height constraints required for modal scrolling.                                                            |
| `src/client/components/PlayPage.ts`        | Preserve OpenBack home actions, 2D/3D selection, cards, and no-scroll phone layout; reject upstream ad/press changes.                                                         |
| `src/core/Schemas.ts`                      | Rebuild schemas as the zbin-compatible superset containing every OpenBack field in stable order plus Overtime/public modifiers.                                               |
| `src/core/configuration/Config.ts`         | Preserve all OpenBack units, prices, ranges, world mechanics, and game rules; add upstream Overtime calculation exactly.                                                      |
| `src/server/Worker.ts`                     | Preserve OpenBack auth, social, matchmaking, hosted routes, IP trust, and telemetry; adopt binary game frames and encoded errors.                                             |
| `tests/server/PublicAssetManifest.test.ts` | Preserve OpenBack missing-file/manifest security coverage and add upstream descriptor expectations.                                                                           |
| Other automatically merged files           | Review every hunk for silent OpenBack regression even when Git reports no conflict.                                                                                           |

No conflict may be resolved by wholesale `--ours` or `--theirs` unless a
byte-for-byte comparison proves the discarded side contains no independent
behavior.

## Product and licensing invariants

- OpenBack branding remains visible everywhere.
- Existing OpenBack units, mechanics, maps, accounts, profiles, friends,
  parties, clans, chats, store, analytics, 2D/3D modes, and mobile controls
  remain available.
- The AGPL, corresponding-source availability, required copyright notice,
  asset-license notices, upstream contributor history, and OpenBack contributor
  credit remain intact.
- No optional OpenFront Discord, Reddit, Wiki, store, press, advertising, or
  promotional links are introduced.
- The release notes appear at the top of the existing in-game modal as
  **OpenBack v0.36.251**, describe player-visible behavior, and credit
  **frootz jhklphy**.

## Failure handling

- A schema or golden-vector mismatch blocks the release; it is never bypassed
  with an unversioned JSON fallback.
- Any client/server binary disagreement is treated as a merge defect.
- If current deployed clients cannot traverse the synchronized update window
  safely, the deployment is stopped before replacing the live container.
- Existing user data migrations are additive; no account, purchase, profile,
  social, clan, game-history, or analytics field may be dropped.
- Unrelated untracked workspace files remain untouched and uncommitted.

## Verification

### Static and automated

1. Confirm the merge commit has both expected parents.
2. Run upstream zbin unit, fuzz, hardening, protocol, wire, and golden-vector
   suites.
3. Run Overtime config, HUD, public-playlist, and deterministic win-threshold
   tests.
4. Run concrete train-cluster duplicate/merge tests and existing OpenBack
   military fuel-rail tests.
5. Run navigation/modal scrolling and responsive-home tests.
6. Run the complete OpenBack client/core and server suites with coverage.
7. Run TypeScript, Oxlint, ESLint, Prettier, production build, Docker build,
   generated-map verification, and asset-descriptor tests.

### Runtime

1. Start a real Solo game, spawn, expand, and verify rendered HUD/gameplay.
2. Run a real two-client private multiplayer game and confirm both clients:
   join the same lobby, see the roster, start together, exchange binary frames,
   advance synchronized turns, and render the map without text-frame fallback.
3. Exercise Overtime in an accelerated test game and verify its threshold,
   badge, notification, and panel.
4. Build or merge long/looping rail clusters and confirm trains continue
   spawning.
5. Check desktop and representative mobile portrait/landscape layouts, including
   modal-contained scrolling and a non-scrolling Play page.

### Release

Push only after all local gates pass. Await all GitHub CI jobs, verify the live
server reports the exact merge commit, verify `/api/health` and `/auth/health`,
confirm the fixed maintenance lifecycle, and perform a final production browser
smoke test.

## Acceptance criteria

The integration is complete only when:

- OpenBack contains `v0.33.12` as a merge parent;
- every released non-promotional v0.33.9-v0.33.12 behavior is present;
- OpenBack features and identity have no known regression;
- game and lobby sockets use the released binary protocol end-to-end;
- Overtime and the train-cluster fix work in tests and runtime;
- the home page still fits without document scrolling while inline pages scroll
  internally;
- the full local and CI verification matrix is green; and
- production serves the exact pushed commit.
