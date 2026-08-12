# OpenFront v0.33.4 Merge and OpenBack Presentation Design

## Objective

Bring OpenBack onto the exact published OpenFront v0.33.4 gameplay baseline,
repair Hydrogen Bomb visuals to match upstream behavior, and make the product
visibly OpenBack through a coherent presentation layer. Simulation, networking,
map coordinates, hitboxes, gameplay radii, and deterministic turn behavior must
not change as part of the visual work.

## Source Baseline

- Merge the annotated release tag `v0.33.4`, not unreleased `upstream/main`.
- Preserve a real merge commit so upstream ancestry remains auditable.
- Preserve all OpenBack-specific systems: aircraft, tanks, tank mines, runways,
  military bases, military fuel trains, 3D mode, Frootz maps, modifiers,
  disasters, social parties, friends, email accounts, persistent data, Ranked
  extensions, branding, guides, and deployment behavior.
- Do not reintroduce optional OpenFront promotional links, Google login,
  subscriptions, paid access, Steam advertising, Discord, Reddit, or Wiki links.
- Preserve the AGPL, corresponding-source access, copyright notices, asset
  notices, and contributor attribution.

## Released Upstream Changes

The merge imports the published v0.33.1 through v0.33.4 changes, including:

- archived custom Tribe names and replay wire-data fixes;
- clearer Ranked teammate pairing information;
- Streaming Now translation-key fallback;
- visibility of the local player's structure effect;
- Doomsday Clock territory rot;
- player statistics improvements;
- shorter anonymized in-game names;
- the Las Vegas Strip map correction;
- stacked structure upgrades and repeated nuke launches through `U` plus left
  click;
- prevention of multiple nuclear launches during one simulation tick; and
- correct Solo archive timing at victory.

OpenBack-specific equivalents win conflicts only when they provide a superset
of the upstream behavior. Otherwise the v0.33.4 implementation is retained.

## Hydrogen Bomb Invariants

The authoritative values remain exactly those in OpenFront v0.33.4:

- inner blast radius: 80 world tiles;
- outer blast radius: 100 world tiles;
- explosion artwork radius: 160 render units.

The merge must add regression tests proving that these values do not change.
OpenBack's aircraft crash and other added-unit effects must not reuse or alter
the Hydrogen Bomb magnitude.

### Targeting and In-Flight Visuals

In 2D, Hydrogen Bomb, Atom Bomb, and MIRV-warhead target indicators use the
exact OpenFront v0.33.4 target geometry, colors, dashed/solid rings, opacity,
trajectory endpoint, camera scaling, and lifetime. The target remains visible
after launch until impact or interception.

The 3D adapter projects that same upstream target data onto the terrain without
changing its world-space radius. It may correct perspective and depth ordering,
but it may not substitute a screen-sized quad, opaque terrain fill, decorative
radius, or different target design.

The explosion animation remains decorative and cannot change destroyed tiles,
fallout, alliance consequences, or damage. Projection safety must prevent any
target or explosion geometry from covering the viewport.

## OpenBack Presentation Direction

OpenBack uses a tactical command-center identity:

- deep navy and charcoal surfaces;
- cyan for selection, navigation, and normal actions;
- green for ownership, completion, and friendly confirmation;
- amber for warnings and countdowns;
- red only for destructive or hostile actions;
- the circular OB mark as the default identity asset;
- compact, bold, legible typography consistent across desktop and mobile;
- restrained panel blur, dark borders, and short purposeful transitions.

Presentation must be implemented through shared tokens and components, not
one-off colors and duplicated markup.

## Safe Presentation Surfaces

### Home and Navigation

- Use the OpenBack logo, name, background art, loading treatment, and navigation
  language everywhere product identity appears.
- Remove stale OpenFront marketing presentation while keeping required legal
  attribution available in Source and Terms.
- Keep the playable actions dominant on desktop and mobile.

### Lobby and Match Setup

- Restyle game-mode cards, map cards, modifiers, lobby status, teams, countdown,
  and invite surfaces with shared OpenBack tokens.
- Preserve all control IDs, events, validation, map selection values, game
  configuration, and lobby protocol fields.

### Live Match HUD

- Unify the build bar, leaderboard, resource bars, player panel, radial menus,
  settings, events, tooltips, and notifications.
- Protect the playfield and retain the current compact density.
- Preserve input gestures, keyboard shortcuts, targeting behavior, unit prices,
  cooldowns, simulation commands, and HUD update frequency.
- Never move information into WebGL when DOM is clearer and cheaper.

### Match Lifecycle

- Apply OpenBack presentation to spawn countdown, loading, victory, defeat,
  spectating, replay, reconnect, and error states.
- Keep the existing first-death tutorial and subsequent battle-art behavior.

### Battlefield Effects and Assets

- Use OpenBack-owned or properly licensed icons, unit artwork, sounds, trails,
  warnings, explosions, construction, and destruction effects.
- Decorative effect bounds must derive from authoritative game data.
- Existing unit placement footprints, selectable pixels, interaction ranges,
  trajectories, and visibility rules remain unchanged.
- Cosmetics remain cosmetic: they cannot alter recognition, hitboxes, range,
  ownership, simulation, or network data beyond existing cosmetic identifiers.

### Themes

This release establishes one production OpenBack Tactical theme and the shared
token architecture needed for later optional presets. It does not introduce
multiple unfinished themes. Existing graphics settings continue to work.

## Accessibility and Responsive Behavior

- Maintain readable contrast, keyboard focus, reduced-motion behavior, and
  screen-reader labels.
- All core actions remain reachable on narrow mobile screens without horizontal
  overflow or overlapping the browser controls.
- Dialogs never close from accidental backdrop clicks unless the existing
  explicit interaction contract requires it.
- Camera and battlefield input are gated while pointer-driven modal UI is open.

## Performance Contract

Visual customization must not reduce simulation speed, render quality, server
capacity, or responsiveness.

- Theme tokens resolve through CSS variables or cached render settings.
- No new per-frame DOM queries, layout reads, asset decoding, or allocations.
- Static assets are cached and sized for their display use.
- Animations use transform/opacity where possible and respect reduced motion.
- WebGL effects remain instanced or batched and bounded by authoritative world
  geometry.
- Any optimization change requires profiler evidence and must preserve output.

## Conflict Resolution

For every merge conflict:

1. identify the upstream intent and OpenBack behavior;
2. retain both when OpenBack adds functionality without contradicting upstream;
3. retain upstream fixes when OpenBack has no intentional replacement;
4. add or update a regression test before resolving behavior-sensitive code;
5. never discard entire OpenBack or upstream files merely to make Git clean.

Generated maps are regenerated after resolution with the required Go toolchain.
Generated output must be committed only when produced by the merged source.

## Verification

Automated checks must cover:

- all Hydrogen Bomb magnitude and render-radius invariants;
- exact 2D upstream target-marker data and in-flight lifetime;
- 3D projection retaining the same world-space radii;
- stacked `U` plus left-click upgrades/launches;
- same-tick nuke launch prevention;
- Doomsday territory rot and Solo archive fixes;
- OpenBack custom-unit, modifier, social, map, account, and 3D regressions;
- responsive presentation components and interaction semantics;
- generated-map cleanliness, TypeScript, production build, lint, formatting,
  unit/integration tests, and coverage.

Browser playtesting must visually inspect:

- Atom and Hydrogen target circles before and after launch in 2D;
- the same targets and explosions in 3D at near and far zoom;
- target persistence through camera movement and interception;
- home, lobby, build bar, leaderboard, player panel, notifications, victory,
  defeat, desktop, and mobile layouts;
- console errors, WebGL errors, missing assets, input conflicts, and frame-time
  regressions.

## Release and Delivery

- Release as OpenBack v0.34.124.
- Add a player-readable top entry to `resources/changelog.md` crediting
  **frootz jhklphy**.
- Keep upstream release ancestry and contributor attribution.
- Commit only intended workspace files; leave user attachment folders intact.
- Push `main` and wait for every GitHub CI job to complete successfully before
  reporting completion.
