# OpenBack Living War Table 2D Design

**Status:** Approved  
**Release target:** The next OpenBack release after v0.34.125  
**Creator:** **frootz jhklphy**

## Objective

Give OpenBack a distinct, coherent visual identity centered on the feeling of commanding a physical living war table. The redesign covers the complete 2D battlefield presentation: terrain, water, units, structures, effects, typography, overlays, and battlefield HUD. It must improve visual ownership without changing simulation, balance, controls, map data, multiplayer synchronization, or visibility rules.

The 3D mode is outside this redesign. The only permitted 3D change is a narrowly isolated repair that fills Antarctica's missing southern terrain and closes its visible edge and underside. The repair must not change the 3D camera, terrain style, relief, models, labels, effects, controls, projection, or other maps.

## Product identity

OpenBack's 2D battlefield should read immediately as a physical command table rather than a renamed interface:

- sculpted but restrained top-down terrain;
- polished strategic miniatures derived from OpenBack's established unit silhouettes;
- tactile construction, movement, reload, impact, and destruction;
- a compact military command console with one typography and icon system;
- effects embedded in the battlefield instead of opaque screen decoration;
- identical visual language on desktop and mobile, with adaptive effect density.

Required OpenFront attribution, source availability, copyright notices, asset notices, and contributor credit remain accurate and accessible in the legal and source surfaces. The main battlefield earns a separate identity through original presentation rather than obscuring provenance.

## Scope

### Included

1. All 2D terrain and water presentation on every map.
2. All visible 2D structures, units, projectiles, trains, ships, aircraft, tanks, and OpenBack-added units.
3. Placement previews, snapping, stacking, construction progress, reload state, counts, readiness, paths, ranges, targeting, selection, damage, and destruction.
4. The in-match HUD, build bar, resource display, leaderboard treatment, alerts, and tactical panels.
5. Desktop and mobile battlefield layouts.
6. Performance controls for effect pooling, culling, level of detail, and mobile density.
7. Antarctica's missing 3D top geometry and terrain-matched southern closure only.

### Excluded

1. Gameplay, economy, prices, damage, ranges, timings, AI, matchmaking, and deterministic simulation.
2. Map masks, spawn rules, ownership data, terrain classifications, or navigation.
3. Any broad 3D redesign or camera change.
4. Account, social, Store, News, Tutorial, Blog, or legal-page redesigns, except when an in-match overlay directly uses the shared battlefield HUD style.
5. Hiding or weakening required licensing and attribution.

## Architecture

The redesign must extend the existing renderer rather than introduce a parallel game or simulation path. Existing frame data remains the single visual input contract. Each new subsystem is rendering-only and independently replaceable.

### `WarTableTerrain2D`

Owns the 2D surface presentation while preserving the current map texture, territory composition, and tile alignment.

Responsibilities:

- derive subtle material variation from existing terrain type and elevation data;
- add readable relief lighting without displacing interaction coordinates;
- render coastline depth and near-shore shading beneath territory borders;
- animate water in world space so waves do not swim when the camera moves;
- provide stable zoom levels that simplify detail without changing terrain shape;
- expose terrain and water surfaces needed by miniature shadows and grounded effects.

The terrain layer must never reduce the contrast of territory ownership, borders, fallout, fog, targets, or strategic overlays. Player colors remain the primary ownership signal.

### `WarTableMiniatures2D`

Provides a shared rendering contract for every structure and mobile unit. Miniatures remain top-down artwork, not 3D meshes.

Each miniature is constructed from three readable layers:

1. a dark outer silhouette and contact shadow;
2. material and mechanical detail;
3. a clear owner-color component.

At distant zoom, the renderer keeps the silhouette and owner section while omitting fine detail. At close zoom, it adds mechanical detail and state animation. Scale is defined centrally by unit class so no miniature obscures excessive territory or becomes unreadable.

The implementation must cover all existing and OpenBack-added types through a registry keyed by the canonical unit or structure type. Missing registry entries must fall back to the current safe artwork and be reported during development rather than disappearing.

### `WarTableEffects2D`

Consumes current simulation events without changing their timing or outcome.

Effect families:

- build: staged assembly, foundation shadow, completion lock-in;
- reload: moving mechanical part or restrained readiness pulse;
- movement: wake, dust, exhaust, rail smoke, aircraft trail, or tank movement appropriate to the unit;
- impact: brief light, debris, shock, and terrain-aligned residue;
- destruction: unit-specific break, collapse, burn, or dispersal;
- modifiers: fog, disasters, objectives, fallout, and world events rendered in the same tabletop material language.

All effects use bounded geometry and pooled instances. Off-screen effects do not update at full rate. Distant effects reduce detail rather than changing gameplay information. Reduced-motion settings suppress decorative motion while preserving required warnings.

### `WarTableHUD`

Restyles existing in-match surfaces without changing their behavior or information architecture.

Rules:

- one display typeface and one body typeface already distributable with OpenBack;
- one spacing scale, corner treatment, border weight, icon grid, and state-color system;
- compact panels with opaque readable backgrounds rather than scattered translucent boxes;
- the build bar keeps every unit visible and preserves shortcuts, price, availability, count, loading, and selection states;
- tactical dialogs and notifications use the existing OpenBack modal system;
- labels, counts, flags, verified state, paths, ranges, and target warnings preserve their canonical data and interaction;
- mobile rearranges and collapses panels without deleting gameplay information.

The HUD may visually integrate with the battlefield, but it remains a screen-space interface and must not inherit world projection or camera scale.

### `AntarcticaClosure3D`

Repairs the southern world-map geometry through the existing 3D terrain pipeline.

Requirements:

- generate filled top triangles through the complete valid southern terrain mask, including Antarctica;
- generate terrain-matched edge walls from the real irregular boundary to a closed underside;
- avoid a rectangular cover, camera clamp, crop, or opaque masking plane;
- preserve water, world bounds, projection, relief, camera angles, input, labels, and all other 3D output;
- stay valid at every supported zoom and pitch, including views that expose the terrain edge.

The fix must be implemented and tested as an independent geometry contract so the 2D redesign cannot accidentally alter 3D.

## Visual rules

### Terrain

- Relief is visible from the standard top-down play angle but remains subordinate to borders and units.
- Materials use restrained variation; no tile noise, moving texture, or camera-dependent terrain shape.
- Coastlines have a narrow depth transition and do not glow globally.
- Water is clearly separate from land, animated subtly, and stable during camera movement.
- Fallout and changed terrain remain unmistakable against every biome.

### Miniatures

- A unit must remain identifiable from silhouette at normal zoom.
- Owner color appears in the same logical part of each unit family.
- Dark edging is strong enough for light and dark territories.
- Buildings feel anchored; ships follow water; moving land units stay on land; aircraft remain visually above the surface.
- Stacked counts, construction bars, readiness, and selection do not overlap the miniature at supported zooms.

### Effects and overlays

- Paths, ranges, targets, and territory focus stay thin, readable, relation-colored, and bounded.
- No radius or effect may generate screen-sized opaque geometry.
- Required tactical warnings take priority over decorative particles.
- Existing 2D bomb placement and in-flight target behavior stays unchanged unless a separately approved gameplay-visual specification changes it.

### Performance

- Static terrain detail is cached by map and zoom level.
- Miniatures and particles are batched or instanced where the existing renderer supports it.
- Culling uses the visible map region plus a small transition margin.
- Effect pools have deterministic visual caps that do not affect simulation.
- Mobile reduces particle density, shadow samples, and secondary animation frequency, not models, terrain classifications, warnings, or gameplay state.
- Quality changes occur at stable thresholds with hysteresis to prevent flicker.

## Data flow

1. The existing game runner advances deterministic simulation.
2. Existing renderer integration produces canonical frame data and event data.
3. `WarTableTerrain2D` renders the stable map surface.
4. Existing territory, border, fallout, fog, and world-event state composes over or with the terrain according to current ordering.
5. `WarTableMiniatures2D` renders structures and units from canonical state.
6. `WarTableEffects2D` renders bounded visual responses to canonical events.
7. Existing labels, paths, ranges, targets, progress, and tactical overlays render with Living War Table styling.
8. `WarTableHUD` renders screen-space controls and information.

No new visual subsystem writes to simulation state. Replays and multiplayer clients therefore display the same authoritative outcome.

## Failure handling

- Missing miniature artwork falls back visibly to the existing compatible sprite and records a development warning.
- Failed decorative effect allocation drops the decoration, never the tactical warning or frame.
- WebGL context restoration rebuilds cached terrain, miniature atlases, pools, and HUD bindings from canonical state.
- Invalid positions or radii are rejected before GPU upload so a single event cannot cover or erase the frame.
- Adaptive quality responds to measured sustained load and recovers gradually; it does not oscillate every frame.
- Antarctica closure validation fails tests when the southern top surface is absent, open, non-finite, or detached from its edge wall.

## Verification

### Automated

- Registry coverage test for every canonical unit and structure type.
- Terrain shader and composition tests across terrain classes, ownership colors, fallout, fog, and modifiers.
- Overlay bounds tests for paths, ranges, targets, names, counts, bars, and selection.
- Effect lifecycle tests covering pooling, culling, completion, reduced motion, and context restoration.
- Responsive HUD tests for desktop and representative phone widths.
- Antarctica geometry tests for top coverage, finite vertices, winding, boundary closure, and underside continuity.
- TypeScript, formatting, lint, focused renderer tests, complete tests, and production build.

### Browser and visual QA

- Every map at world, medium, and near zoom in 2D.
- Every unit and structure in preview, building, ready, active, reloading, stacked, damaged, and destroyed states where applicable.
- Ships, trains, aircraft, tanks, missiles, nuclear effects, disasters, fog, objectives, and changed terrain.
- Long large-map matches with high unit and effect counts on desktop and mobile profiles.
- Camera movement and zoom without terrain swimming, popping, flicker, missing labels, or overlay expansion.
- 3D World map from extreme valid pitch and zoom angles, confirming all Antarctica top terrain and closure while comparing other 3D output for no unintended visual change.

### Release gate

The release is not complete until local verification passes, the visual browser playtest demonstrates the approved design, the user-facing changelog entry accurately describes delivered behavior and credits **frootz jhklphy**, the commit is pushed to `main`, and GitHub CI succeeds.

## Acceptance criteria

1. A player can identify OpenBack screenshots from the terrain, miniatures, and HUD without reading the title.
2. All 2D maps and gameplay systems retain identical simulation and controls.
3. All current units and structures have readable Living War Table presentation at normal zoom.
4. Tactical information is at least as readable as before on desktop and mobile.
5. Long matches do not regress frame stability or memory behavior.
6. Antarctica is fully surfaced and closed in 3D at every supported view without hiding the defect through camera limits.
7. No other 3D presentation or behavior changes.
8. Required licensing, attribution, notices, and source obligations remain accurate.
