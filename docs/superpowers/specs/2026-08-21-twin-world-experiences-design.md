# OpenBack Twin World Experiences Design

Date: 2026-08-21  
Status: Approved direction, awaiting specification review  
Owner: frootz jhklphy

## Goal

Turn OpenBack's current optional 3D modifier into a first-class 3D experience parallel to Classic 2D. Both experiences remain inside one OpenBack account and one coherent interface, but each has its own play entry points, matchmaking pools, ranked ladders, statistics, achievements, cosmetic loadout, Store presentation, Inventory presentation, and replay identity.

At the same time, rebuild the home showcase to use its available space and replace blurry map previews with high-resolution, density-aware 2D and 3D preview assets.

## Product principles

1. OpenBack remains one game and one website.
2. 2D and 3D are experiences, not modifiers.
3. A player always knows which experience they are browsing or entering.
4. A 2D client never enters a 3D queue or lobby accidentally.
5. Shared social/account value is preserved; competitive records and visual loadouts remain experience-specific.
6. Selecting 3D does not load the 3D runtime until the player enters 3D setup or a 3D match.
7. Existing 2D players lose no purchases, progress, settings, links, or rankings.

## Terminology and wire values

```ts
export const ExperienceModeSchema = z.enum(["2d", "3d"]);
export type ExperienceMode = z.infer<typeof ExperienceModeSchema>;
```

Player-facing labels are **Classic 2D** and **Immersive 3D**. Protocols, database rows, API requests, telemetry, and URLs use the stable values `2d` and `3d`.

`experienceMode` becomes a top-level game configuration field. It does not live inside `worldMechanics` and is not listed with Fog of War, Living World, Natural Disasters, or other match modifiers.

## Unified Twin World home

The home screen keeps one identity strip, one lobby showcase, and one action group. A prominent segmented switch sits between the identity strip and the showcase:

```text
                 CLASSIC 2D | IMMERSIVE 3D

       LARGE LIVE PREVIEW     SMALL LIVE PREVIEW
                              SMALL LIVE PREVIEW

                         SOLO

             HOST MULTIPLAYER | RANKED | JOIN
```

The switch changes the context in place:

- lobby cards show only the selected experience;
- Solo, Host, Ranked, and Join open that experience;
- empty-state copy names the selected experience;
- 3D cards use 3D relief previews and a restrained 3D badge;
- Store, Inventory, Leaderboard, and profile statistics remember and expose the same selected context;
- transitions use a short cross-fade and elevation shift, not a page flash or horizontal carousel.

The switch is keyboard accessible, uses `aria-pressed`, and remains usable at 200% zoom. The selection is stored locally as the last-used experience. New browsers default to `2d`. A shared/canonical URL overrides the remembered value.

### Home sizing

Desktop home content grows from the current narrow column to a responsive maximum around `80rem`, while retaining readable side margins. The showcase height uses a viewport-aware clamp rather than a fixed small area. The primary card remains twice the width of the secondary column, but its rendered source is sharp enough for the larger surface.

On phones, the experience switch stays below the top bar, the primary preview becomes a full-width card, and secondary previews remain a compact two-card row. The home screen must not gain useless vertical scrolling on common phone viewports.

## Preview quality pipeline

### Existing cause

The current generator encodes `thumbnail.webp` at WebP quality 45, and the lobby card enlarges the result with `scale-[1.05]`. On a large/high-density display this visibly softens borders and terrain, especially on the primary card.

### New outputs

Each map produces:

- `thumbnail.webp`: normal-density Classic 2D preview;
- `thumbnail@2x.webp`: high-density Classic 2D preview;
- `thumbnail-3d.webp`: normal-density relief preview;
- `thumbnail-3d@2x.webp`: high-density relief preview.

The normal preview is encoded near WebP quality 88. The 2x preview uses twice the output dimensions and the same visual palette. The generator downsamples with area/bilinear filtering where needed instead of nearest-neighbor sampling. Alpha remains available for maps whose non-map area must reveal the card's ocean background.

The 3D preview is generated deterministically from the same terrain height and magnitude data. It uses OpenBack's 3D terrain palette, directional light, mountain relief, shoreline light, and cyan water treatment. It is an offline shaded-relief render rather than a runtime WebGL screenshot, keeping map generation deterministic and CI-friendly.

### Browser presentation

Lobby cards use `srcset` and `sizes` so the browser chooses 1x or 2x. The primary visible preview is eager/high priority; secondary and off-screen previews are lazy. Cards remove the forced 105% zoom and crop through their container geometry instead. A decoded image cross-fades in without applying CSS blur.

Preview generation remains part of `npm run gen-maps`, and CI rejects stale outputs.

## Game configuration and legacy migration

New game configurations write:

```ts
{
  experienceMode: "2d" | "3d",
  worldMechanics: {
    fogOfWar: boolean,
    naturalDisasters: boolean,
    livingWorld: boolean,
    // no new threeDMode writes
  }
}
```

The wire schema temporarily accepts legacy configurations. Normalization follows one rule:

```ts
experienceMode =
  config.experienceMode ??
  (config.worldMechanics?.threeDMode === true ? "3d" : "2d");
```

After normalization, internal code reads `config.experienceMode()` rather than `worldMechanics().threeDMode`. Legacy replay records continue to load. New records never write `worldMechanics.threeDMode`.

The existing 3D-dependent aircraft landing and train-spacing rules continue under `experienceMode === "3d"`; this project does not silently change their gameplay semantics while moving the configuration boundary.

## Solo and multiplayer separation

The 3D checkbox is removed from Solo and Host setup. The experience is supplied by the entry point and displayed as a non-editable context badge/header.

Every lobby advertises `experienceMode`. Public lobby lists, featured cards, lobby filters, browser counts, invitations, party requests, and successor lobbies preserve it.

2D and 3D do not crossplay. Joining an incompatible lobby never silently switches an active setup; the invite opens the correct experience context before joining. Version mismatch and unsupported-hardware errors remain distinct from experience mismatch errors.

Shared-control teams, bots, nations, modifiers, maps, and game rules remain available in both experiences unless an individual feature is explicitly marked unsupported.

## Ranked separation

Matchmaking queue identity becomes:

```ts
type RankedQueueKey = `${ExperienceMode}:${RankedType}`;
```

The server maintains independent 2D and 3D pools for 1v1, 2v2, 3v3, and 4v4. Queue size broadcasts, cancellation, party invitations, party validation, match creation, and retry logic all carry `experienceMode`.

Players receive independent OB ratings and peaks for each experience and ranked team size. Existing OB data migrates into the 2D ladder. New 3D ratings begin at the current new-player default. A 3D result never changes a 2D rating.

Leaderboards expose an experience selector followed by the current 1v1/2v2/3v3/4v4 tabs. Profile statistics and game history can filter by experience. Ranked URLs use `/ranked/2d`, `/ranked/3d`, `/leaderboard/2d/1v1`, and `/leaderboard/3d/1v1` patterns.

## Shared and separate account data

### Shared

- email identity and authentication;
- username, public ID, profile picture, description, country flag, and verification state;
- friends, blocks, parties, groups, persistent chats, and clans;
- wallet currencies;
- cosmetic ownership and purchase history;
- service/support history;
- general account settings that are not renderer-specific.

### Separate by experience

- equipped cosmetic loadout;
- ranked ratings and peak ratings;
- ranked placement and leaderboard entries;
- aggregate and recent statistics;
- achievements and medals where gameplay/render mode matters;
- saved setup defaults;
- graphics/input settings that only apply to the selected renderer;
- replay and match-history filters.

## Cosmetics, Store, and Inventory

Every cosmetic definition receives an explicit compatibility field:

```ts
experiences: Array<"2d" | "3d">;
```

The absence of this field is accepted only for legacy catalog migration. Migration defaults are:

- existing territory patterns, flat skins, and 2D effects: `2d`;
- flags and crowns that render correctly in both: `2d`, `3d`;
- newly created 3D materials, wraps, model skins, volumetric effects, trails, sky themes, and structure styles: `3d` unless explicitly universal.

Ownership remains shared. A player does not buy the same universal item twice. Each experience stores its own equipped selections, so equipping a 3D wrap never replaces the player's 2D territory pattern.

The Store and Inventory use the same Twin World switch language as Home. Routes include:

- `/store/2d/skins`, `/store/2d/effects`;
- `/store/3d/skins`, `/store/3d/wraps`, `/store/3d/effects`;
- `/inventory/2d/...` and `/inventory/3d/...`.

Unsupported items are filtered rather than shown disabled throughout the catalog. Universal items may appear in both contexts with one ownership state. Purchase, equip, preview, and account restoration update instantly without refreshes.

3D cosmetic previews use a small isolated WebGL preview scene loaded only when a visible 3D item needs it. The main Store bundle does not eagerly load every model or effect.

## URLs

Canonical routes include:

- `/play/2d`, `/play/3d`;
- `/solo/2d`, `/solo/3d`;
- `/ranked/2d`, `/ranked/3d`;
- `/multiplayer/2d/host`, `/multiplayer/3d/host`;
- `/multiplayer/2d/join`, `/multiplayer/3d/join`;
- `/store/2d/:tab`, `/store/3d/:tab`;
- `/inventory/2d/:tab`, `/inventory/3d/:tab`;
- `/leaderboard/2d/:ladder`, `/leaderboard/3d/:ladder`.

`/` resolves to the remembered experience and replaces to `/play/:experience`. Existing clean paths without an experience segment migrate to their 2D equivalents. Lobby invite URLs keep their existing game ID form because the authoritative lobby supplies its experience.

## Renderer and asset boundaries

Classic 2D keeps the existing 2D renderer, controls, models, and effects. Immersive 3D keeps the existing 3D renderer and 3D-specific behavior. The shared deterministic simulation remains one codebase; experience-specific branches are selected through the normalized configuration.

The 2D home and setup paths must not request GLB files, 3D shaders, 3D preview scenes, or 3D effect textures. The 3D runtime loads on demand after selecting a 3D setup/match, with existing asset fallbacks preserved.

## Hardware capability and failure behavior

The home switch detects required WebGL2 capabilities without downloading the 3D runtime. If unavailable, Immersive 3D remains visible but disabled with a clear OpenBack-styled explanation and troubleshooting link.

There is no silent 3D-to-2D fallback for multiplayer, ranked, or replays because the experience can affect deterministic gameplay rules. A failed 3D renderer initialization returns safely to the 3D setup screen with an actionable error and does not join the match.

## Data migration and persistence

PostgreSQL migrations add experience dimensions without deleting legacy columns. Existing ratings, stats, histories, achievements, and saved loadouts become 2D records. Shared ownership and wallet rows remain untouched.

Migration is idempotent and safe across rolling deployments. During the transition, servers accept old clients/configs as 2D unless the legacy `threeDMode` flag is true. New servers never put 2D and 3D entrants into the same ranked assignment.

Active matches remain in memory and are not rewritten during deployment. Archived legacy replays normalize when read.

## Accessibility and responsive behavior

- Experience selectors are buttons, not unlabeled decorative cards.
- Color is never the only 2D/3D signal; labels and icons remain visible.
- Focus order is identity, experience, previews, primary action, secondary actions.
- Reduced-motion users receive an instant state transition.
- Mobile landscape preserves the top bar, switch, primary action, and at least one preview without overlapping.
- Screen readers announce the selected experience and the destination of each action.

## Performance budgets

- Switching the home context performs no WebGL initialization.
- Preview images are responsive and cached; only visible images receive high priority.
- 2D first load does not regress because of 3D models or cosmetics.
- 3D Store previews dispose GPU resources when cards leave the viewport.
- Lobby and queue filtering is O(number of advertised lobbies), with no duplicate sockets per experience.
- Database leaderboard queries index experience plus ranked type.

## Delivery decomposition

This program is too large for one unsafe all-at-once patch. It is delivered through four internally testable stages while remaining hidden behind one feature gate until the end:

1. **Experience foundation:** schema, normalization, legacy replay compatibility, configuration accessors, and removal of new `threeDMode` writes.
2. **Server separation:** lobby advertisements, invitation propagation, queue keys, separate ratings/statistics, database migration, leaderboards, and replay metadata.
3. **Cosmetic separation:** compatibility metadata, experience loadouts, Store/Inventory routes, previews, persistence, and migration.
4. **Twin World launch:** high-resolution map preview generation, expanded home layout, experience switch, setup entry points, removal of modifier checkboxes, responsive/browser QA, release notes, and feature-gate enablement.

No intermediate stage exposes a half-separated competitive system to players. The final player-facing launch is OpenBack v0.36.188 and credits **frootz jhklphy**. If implementation requires more than one player-visible release, each additional release increments the patch and receives its own changelog entry under the project rules.

## Testing and verification

### Configuration

- new 2D and 3D configs normalize correctly;
- legacy `threeDMode` configs and replays normalize correctly;
- new configs never serialize `worldMechanics.threeDMode`;
- 3D-specific aircraft/train behavior still selects only 3D.

### Multiplayer and ranked

- lobby discovery and invite links preserve experience;
- 2D and 3D queue members cannot match each other;
- every team size has independent pools and ratings;
- cancellation, parties, reconnects, successor lobbies, and retries retain experience;
- database restart preserves both ladders and statistics.

### Cosmetics

- legacy ownership migrates without loss;
- universal ownership is shared without duplicate purchase;
- separate loadouts never overwrite each other;
- Store/Inventory filtering, routes, previews, equip, and restore work for both experiences;
- 2D browsing does not load 3D assets.

### Home and previews

- generated previews are current and CI-clean;
- source selection uses 2x assets on high-density displays;
- primary previews remain sharp at the desktop maximum width;
- 2D/3D switching updates cards and destinations without reload;
- desktop, portrait phone, and landscape phone layouts use available space without overflow or useless scrolling.

### End-to-end

- Solo, Host, Join, Ranked, parties, replays, Store, Inventory, Leaderboard, profiles, and history are exercised in both experiences;
- old URLs migrate to 2D routes;
- unsupported hardware cannot enter a 3D match;
- full tests, coverage, TypeScript, production build, lint, Prettier, generated maps, browser screenshots, console audit, and GitHub CI pass before launch.

## Non-goals

- separate OpenBack accounts or wallets for 2D and 3D;
- separate friends, clans, chats, or purchases;
- 2D/3D ranked crossplay;
- duplicating universal cosmetic purchases;
- rewriting the deterministic simulation into two forks;
- eagerly loading the 3D renderer on the home screen;
- replacing existing 3D assets or camera behavior as part of this separation project.
