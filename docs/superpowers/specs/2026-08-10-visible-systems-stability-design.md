# OpenBack Visible Systems and Renderer Stability Design

## Goal

Make every player-visible OpenBack feature functional while restoring long-match rendering stability without changing deterministic simulation balance.

## Confirmed invariants

- Hydrogen Bomb gameplay magnitude remains `inner: 80, outer: 100`; Atom Bomb remains `inner: 12, outer: 30`; MIRV warhead remains `inner: 12, outer: 18`.
- The v0.33.0 merge did not change those values. Recent OpenBack commits changed rendering and 3D projection, not bomb damage.
- 2D remains the authoritative visual reference. 3D adapts the same frame data and simulation state.
- PostgreSQL is the hosted persistence path. File persistence remains development-only.
- Native browser dialogs are not acceptable on visible OpenBack flows.
- Dormant purchase/subscription integrations are not made visible again.

## Release 1: Renderer stability

The renderer will treat 2D and 3D projection as separate explicit paths. Screen-space safety checks reject non-finite, behind-camera, or implausibly large geometry before issuing draws. Nuke placement previews remain outlined and readable even for the 100-tile Hydrogen Bomb radius. In-flight nukes retain a destination telegraph derived from authoritative unit IDs on every frame.

Frame execution will restore framebuffer, viewport, blend, depth, and scissor state at frame boundaries. A failed optional pass will be isolated and reported without abandoning the terrain, borders, names, or HUD. WebGL context loss pauses drawing and context restoration recreates renderer resources from the latest frame rather than leaving a half-rendered battlefield.

Regression coverage will exercise repeated bomb/fallout/telegraph updates, invalid projected geometry, resize recovery, and a long synthetic effect sequence. The simulation magnitudes are asserted independently so visual fixes cannot alter damage.

## Release 2: Custom OpenBack dialogs

All remaining `alert()` calls use one OpenBack dialog service built on the existing modal system. It supports success, warning, error, information, and confirmation variants. It traps focus, closes only through explicit buttons or the back action, and never closes from clicking the backdrop.

Cosmetic purchases, reward claims, and currency purchase results update their owning panels immediately before showing the result dialog.

## Release 3: Tribe backend

Tribe names are stored inside the existing persistent OpenBack account document so PostgreSQL transactions and development-file persistence share one source of truth. Each record contains a stable ID, normalized unique name, owner public ID, purchase time, boost expirations, games appeared, player reach, and current status.

Authenticated routes implement ownership listing, purchase, boost purchase, and current-user status. Public routes implement tribe detail and a paginated 30-day leaderboard. The internal `/custom_tribes` route validates the game-server API key, weights eligible owned names by active boosts, excludes participating owners as required by the existing protocol, and returns at most the requested bot capacity. Multiplayer continues to fail open to organic names if the service is unavailable.

Names are trimmed, Unicode-normalized, length-limited, globally unique case-insensitively, and checked with the repository's inappropriate-language filter. Currency deductions and record creation happen in one persistence mutation. Client panels refresh locally from the mutation response, without a page reload.

## Release 4: Visible-feature audit

An automated inventory rejects native dialogs and known unimplemented visible endpoints. Manual desktop and mobile passes cover Home, Profile, Friends, Clans, Ranked, Store, Leaderboards, Tribes, Tutorials, Blog, legal pages, and in-game HUD actions. A visible control either completes successfully against OpenBack or is removed/disabled with clear copy. Hidden legacy payment/subscription paths remain outside this release.

## Verification

- Targeted Vitest suites are written red-first for each behavior.
- TypeScript, formatting, lint, development build, and relevant server/client tests pass.
- Browser playtests capture 2D and 3D screenshots before launch, during multiple in-flight bombs, after fallout, after resize, and after a simulated WebGL context restore.
- A long synthetic renderer stress run proves that terrain, borders, names, HUD, and telegraphs remain present.
