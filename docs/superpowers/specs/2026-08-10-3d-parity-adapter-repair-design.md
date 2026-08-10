# OpenBack 3D Parity Adapter Repair Design

**Date:** 2026-08-10

**Status:** Approved design amendment

**Creator:** **frootz jhklphy**

## Objective

Repair OpenBack's optional 3D presentation by making the established 2D game systems the single source of truth. The 3D renderer may adapt map-space positions, terrain height, depth, and perspective, but it must not independently redefine gameplay previews, tactical information, HUD behavior, menus, typography, timing, or visibility.

This amendment addresses confirmed visual failures in the current implementation: oversized and overlapping player labels, missing or black terrain below Antarctica, incomplete map fit, flying or buried models, flat placement overlays, and 3D-specific changes leaking into normal UI such as alliance requests and the leaderboard.

## Architectural Decision

Use a **shared parity adapter**.

- Existing simulation state, build validation, snapping, placement state, unit state, effect events, and visibility remain authoritative.
- Existing 2D HUD and modal components remain unchanged and render through their normal paths.
- World-space visuals receive a renderer-neutral map-space description.
- The 2D renderer applies its existing matrix.
- The 3D renderer projects the same map-space description through the terrain surface and perspective camera.

The repair must remove duplicated 3D gameplay presentation logic wherever a shared 2D source already exists. It must not solve parity bugs by hiding camera angles, clipping content, or adding special cases for a particular map.

## UI Boundary

The following remain exactly shared with 2D and must not receive a 3D-specific layout, style, translation, or control path:

- leaderboard;
- alliance, diplomacy, and chat messages;
- build bar and radial menus;
- top and bottom HUD;
- player panels and modal windows;
- buttons, tooltips, notifications, and confirmation dialogs.

Only battlefield-anchored information is projected for 3D:

- names, flags, verified marks, troop counts, and status bars;
- structure levels, construction progress, reload progress, and stack counts;
- placement ghosts, snapping feedback, crosshairs, and valid/invalid state;
- ranges, paths, trajectories, selection feedback, and destination markers;
- world effects such as smoke, wakes, explosions, fallout, fog, and disasters.

## Tactical Overlay Parity

### Shared source data

Each tactical visual is described once in map coordinates from the same state currently used by 2D. The description contains its authoritative anchor, path or radius geometry, visual state, visibility, timing, and style identifier.

The 3D adapter changes only geometry placement:

- points sample the terrain or explicit unit altitude;
- paths sample intermediate terrain points;
- radii become terrain-conforming rings or discs centered on the authoritative tile;
- labels project one world anchor and then use the established 2D screen-space typography and spacing;
- screen-space UI is never projected onto terrain.

### Placement

The existing `BuildPreviewController` remains the authority for placement, upgrades, stacking, snapping, valid or invalid state, range origin, rail previews, and target restrictions. The 3D view consumes the complete preview snapshot instead of reconstructing placement rules.

The completed unit and its placement ghost must share the same model footprint, pivot, owner-color rules, terrain anchor, scale, and orientation. A valid preview retains the established valid styling; an invalid preview retains the established invalid styling. Moving between valid and invalid terrain must update in the same frame as 2D.

### Labels

Remove the approximate flat-ground label homography. Each player label uses the exact 3D camera projection for its authoritative world anchor. After projection, the normal 2D label layout controls font, outline, flag placement, verified mark, troop count, padding, scale limits, and distance visibility.

Labels remain horizontal and screen-facing. Perspective changes their position, not their typography. Text must not be rendered as individually padded glyph blocks, terrain-colored rectangles, or giant world geometry.

## Complete Map and Antarctica

The map surface is composed of three deliberate layers:

1. A complete water surface covering the map's exact width and height.
2. Stable land/terrain chunks covering all real map coordinates, including partial final rows and columns.
3. Outer side walls and an opaque underside below the complete map rectangle.

The underside is not a substitute for missing visible terrain. It begins below the water and land surfaces and is visible only from legitimate shallow angles at the outer map boundary.

Terrain chunk visibility uses camera-frustum bounds expanded by maximum relief and a conservative safety margin. Chunks intersecting the visible map cannot be culled because a sea-level corner ray missed them. Partial edge chunks such as Antarctica's final row must use the same terrain material and height sampling as interior chunks.

## Camera Fit and Bounds

Overview fit derives from:

- complete map width and height;
- viewport aspect ratio;
- camera field of view and pitch;
- maximum terrain and model height;
- a small presentation margin.

Both horizontal and vertical field-of-view constraints are evaluated, so the complete map fits inside the available battlefield rectangle on every supported aspect ratio. Camera pitch remains useful from near top-down to shallow tabletop angles; it is not restricted merely to conceal missing geometry.

Panning and zooming retain the existing map target and cannot move the complete board irrecoverably outside the viewport. All calculations apply generically to every current and future map dimension.

## Terrain Relief and Materials

Increase current land relief by a restrained 15 to 20 percent after fixing surface consistency. Preserve relative terrain ordering and smoothing so the result is more readable without returning to needle-like mountains.

Terrain height is deterministic in map space. Camera movement and LOD selection cannot change the sampled height of a fixed world coordinate.

Ownership colors remain readable while rock, snow, highland, and slope materials remain visible. Land, water, outer walls, and underside are opaque in their opaque passes and use correct depth writes.

## Ocean and Waves

Use a lighter cyan-blue ocean palette that remains distinguishable from the dark battlefield surround.

Waves are presentation-only and world anchored:

- broad low-contrast moving highlights remain visible from overhead;
- finer ripples and normal variation appear when zoomed in;
- shallow-water foam may appear near coastlines without obscuring borders;
- wave motion does not move water geometry enough to affect picking or expose seams;
- quality scaling changes wave detail, not water coverage or gameplay information.

The water plane always covers the complete map rectangle beneath land chunks, preventing black gaps when an edge chunk is absent or delayed.

## Unified Surface Anchoring

Introduce one `ThreeDSurfaceSampler` contract used by camera picking, world overlays, placement ghosts, and unit models. Its height calculation must match terrain rendering closely enough that the same map coordinate resolves to the same visible surface.

Anchoring rules are data driven:

- **Buildings:** sample the footprint, use a stable median or support plane, and add a shallow foundation where needed. Buildings remain upright unless a model explicitly supports slope alignment.
- **Ground vehicles:** sample beneath the vehicle, align gently to the local normal with a capped pitch and roll, and update continuously along movement paths.
- **Tank mines and small ground equipment:** use a small ground offset that prevents z-fighting without floating.
- **Ships:** use an explicit waterline independent of seabed depth and add only subtle presentation bob.
- **Aircraft:** use runway surface height while parked and an explicit flight altitude while airborne.
- **Missiles and bombs:** use their authoritative trajectory altitude and never snap to terrain in flight.
- **Trains:** follow rail anchors and sample each carriage or bogie support point so long trains do not cut through slopes.

Model definitions declare footprint, pivot, support points, waterline or flight behavior, maximum slope, and presentation offset. Per-unit magic offsets in rendering code are prohibited.

## Rendering Order and State

1. Battlefield surround.
2. Complete water surface.
3. Opaque terrain chunks.
4. Outer walls and underside where visible.
5. Opaque 3D models.
6. Terrain-aware paths, ranges, and world effects.
7. Fog and translucent environment effects.
8. Projected battlefield labels.
9. Unchanged 2D HUD, menus, leaderboard, messages, and modals.

Every pass restores depth test, depth write, blending, culling, viewport, and framebuffer state before returning.

## Testing and Acceptance

### Automated

- Every map dimension produces complete water, land-chunk, partial-edge, and base coverage.
- Antarctica and every partial final chunk remain submitted at overview and shallow angles.
- Overview fit contains all four map corners and maximum relief on desktop and mobile aspect ratios.
- The shared placement snapshot produces equivalent 2D and 3D validity, snap target, radius origin, and target restrictions.
- Every unit type has explicit anchoring metadata.
- Static structures, moving vehicles, ships, aircraft, trains, and projectiles resolve to their correct surface mode.
- Labels use the canonical camera projection while preserving established screen-space sizing.
- Range and trajectory geometry remains local and cannot expand into a full-map quad.
- Enabling 3D does not alter HUD or modal component output.

### Visual playtest

Automated tests are necessary but not sufficient. Completion requires captured browser evidence for:

- full Earth at overview with complete Antarctica and all map edges;
- a non-Earth irregular map and a Frootz map;
- top-down, default, shallow-forward, and shallow-backward camera angles;
- cyan waves from overview and close zoom;
- dense player names compared directly with 2D;
- every build preview state: valid, invalid, snapped, stacking, range, upgrade, and targeting;
- buildings on plains and slopes, ground vehicles moving over relief, ships, aircraft, and trains;
- bombs, fallout, trajectories, fog, natural disasters, selection, and alliance interactions;
- desktop and mobile viewport sizes;
- continuous pan, orbit, and zoom recordings checked for shaking, black gaps, flicker, clipping, or floating models.

### Release gate

The repair is complete only when the visual matrix passes, focused renderer tests pass, the full project checks pass, and GitHub CI is green. The changelog entry for the player-facing release must describe only verified results and credit **frootz jhklphy**.
