# OpenBack 3D Renderer Rebuild Design

**Date:** 2026-08-09

**Status:** Approved design

**Creator:** **frootz jhklphy**

## Objective

Rebuild OpenBack's optional 3D presentation so it behaves exactly like the established 2D game while presenting the battlefield as a stable, readable tabletop world. The simulation, commands, visibility rules, multiplayer protocol, and deterministic game state remain unchanged. Only input projection and rendering change.

The rebuild must eliminate terrain flicker, disappearing map sections, clipped Antarctica, transparent ground, camera inversion, unstable labels, and primitive cube-like units. Every unit becomes a true 3D recreation of its existing OpenBack 2D design.

## Player Experience

- The battlefield is a solid horizontal world below the camera, never a floating or bendable image.
- Left-drag moves the world under the cursor with the same immediate, anchored feel as 2D.
- Right-drag orbits the camera above the board. A short right-click continues to open the normal gameplay menu.
- The mouse wheel moves the camera closer or farther without retargeting, flickering, clipping terrain, or exposing empty space.
- The camera can reach useful shallow forward and backward views and a near-top-down view, but it cannot flip under the board.
- Terrain relief remains clearly visible at normal zoom and when zoomed far out. Mountains retain stable silhouettes while the camera moves.
- Names, flags, troop counts, trajectories, build previews, radii, targeting information, borders, and effects remain as readable and correctly positioned as in 2D.
- All map edges, including the full Antarctic landmass, remain visible whenever they are inside the camera frustum.

## Architecture

The 3D view remains an adapter over the existing deterministic simulation. It is divided into four independent systems:

1. **Camera and projection** owns camera pose, pointer rays, map-space projection, panning, orbiting, zoom, and camera constraints.
2. **Terrain world** owns stable terrain chunks, height sampling, materials, coast walls, map edges, and terrain level of detail.
3. **Unit world** owns the model catalog, instanced primitive batches, animation transforms, owner coloring, selection state, and depth-correct placement.
4. **Tactical overlay bridge** projects existing 2D gameplay information into stable screen-facing overlays without changing its meaning or timing.

No simulation rule may read Three.js or WebGL scene state. Rendering reads immutable frame data and current camera state from the existing game view.

## Camera and Input

### Camera model

Use one explicit perspective orbit camera described by:

- map-space target;
- yaw;
- pitch constrained strictly above the battlefield;
- camera distance;
- vertical field of view;
- near and far planes derived from distance, maximum terrain height, model height, and complete visible map bounds.

Pitch limits permit a shallow tabletop view in both forward and backward directions and a near-top-down view. Orbiting never crosses the camera pole, changes the world's handedness, or exposes the underside as transparent space.

### Left-drag

At pointer-down, cast a ray through the cursor and capture its intersection with the terrain surface. During movement, cast the updated ray and move the camera target by the difference between the original and current terrain intersections. This makes the same ground point remain under the cursor and avoids angle-based movement multipliers.

If the ray misses elevated terrain at a shallow angle, intersect the stable sea-level board plane and clamp the result to the padded map bounds. The interaction must never produce NaN, infinity, or a sudden jump.

### Right-click and right-drag

- Movement below the existing drag threshold is a normal gameplay right-click.
- Movement above the threshold is camera orbit and suppresses only that gesture's context menu.
- Releasing the button ends orbit immediately; no delayed input state remains.

### Zoom and bounds

Wheel zoom changes camera distance around the current map-space target. It does not pick a new target from the cursor, sky, fog, HUD, or water. Camera bounds are calculated in map space with enough padding to view every edge without allowing the complete world to leave the screen.

## Stable Terrain World

### World-anchored chunks

Replace the single camera-centered resampled mesh with a chunk grid anchored permanently to map coordinates. Chunk origins never move when the camera pans. A terrain vertex therefore always represents the same map location, eliminating swimming and movement flicker.

Chunks are created from the existing terrain-byte texture and use shared index buffers. Only visible chunks are submitted. Terrain changes caused by deterministic world mechanics dirty the affected chunks and their immediate edge neighbors.

### Level of detail

Each chunk supports fixed LOD levels aligned to the same world grid. LOD selection uses screen-space error plus hysteresis, so a chunk cannot alternate levels at a threshold on successive frames. Adjacent levels use shared edge samples and skirts or stitched indices to prevent cracks.

The farthest LOD preserves averaged relief rather than flattening the terrain. Mountain and plateau height contrast is deliberately amplified at distant zoom, while close views use the accurate terrain heights. The transition is continuous and does not alter the world position of gameplay overlays.

### Height and materials

- Preserve the relative ordering of plains, highlands, mountains, snow peaks, volcanic/impassable terrain, shorelines, and water.
- Increase the vertical scale of the complete land relief consistently, then apply a restrained distance-readability multiplier at far zoom.
- Use stable normals derived from fixed neighboring height samples.
- Preserve player ownership colors while keeping rock, slope, and snow readable.
- Water remains below land and cannot overwrite land through depth fighting.
- Terrain sampling uses fixed map coordinates; camera motion never changes the sampled source radius.

### Solid map construction

Generate coastline and outer-map side walls down to a solid base plane. Render a non-transparent underside/base beneath visible land and water. At shallow views, the player sees a deliberate tabletop edge rather than holes, inverted terrain, or transparent geometry.

### Culling and clipping

Use the real camera frustum against chunk bounds expanded by maximum terrain height. Near and far planes include all visible terrain and models. The renderer must not discard a chunk merely because its sea-level box is outside the frustum while a raised mountain is visible.

## Faithful 3D Unit Models

### Visual contract

The existing 2D unit artwork is the source of truth. Each model must retain:

- recognizable silhouette;
- relative proportions;
- owner-colored regions;
- dark outlines and material separations;
- important identifying parts;
- orientation and movement direction;
- existing animation meaning.

Models are stylized OpenBack pieces, not externally sourced realistic military assets and not flat SVG extrusions.

### Model catalog

Replace generic box/cylinder definitions with purpose-built mesh definitions for every rendered unit, including cities, factories, ports, defense posts, silos, SAM launchers and missiles, runways, aircraft, MANPADs, military bases, tanks, tank mines, ships, trains and carriages, nuclear weapons, and all other current `UnitType` entries.

The catalog remains data-driven. Adding a future unit requires registering its mesh parts, materials, sockets, animation channels, footprint, altitude behavior, and optional LOD model without editing the shared renderer.

### Geometry and performance

- Build reusable low-poly geometry shaped specifically for each unit.
- Batch matching mesh/material parts with instanced rendering.
- Supply close and distant model LODs where silhouette detail would otherwise create excessive geometry.
- Keep owner colors in instance data rather than cloning materials.
- Reuse shared material and geometry objects and dispose them on game teardown or WebGL context loss.
- Retain full silhouettes at distance; switch to simplified models before pieces become noisy clusters.

### Placement and animation

Every model is placed at the same map coordinate used by 2D and raised by the terrain height sampled at its footprint. Moving units orient toward their current direction. Existing aircraft banking, ship movement, tank turret motion, train motion, missile flight, construction, interception, launch, crash, and destruction effects keep their gameplay timing.

## Tactical UI and Labels

Names, flags, troop counts, bars, verified marks, trajectories, targeting circles, radii, build previews, selection feedback, borders, and combat effects remain screen-facing tactical information.

Use the same authoritative world-to-screen camera projection as the terrain and models. Remove the separate approximate label matrix. A single projected anchor is calculated per element, then the established 2D UI draws around that anchor using its normal spacing and typography.

Labels must:

- remain horizontal and readable;
- preserve 2D font spacing and line alignment;
- avoid per-character background blocks or exaggerated outlines;
- disappear at the same distance as their associated player information;
- depth-hide only when intentionally occluded, never because the projection disagrees with the terrain camera.

## Rendering Order

1. Opaque sky/background.
2. Solid base and map side walls.
3. Opaque water and terrain chunks with depth writes.
4. Opaque instanced unit models.
5. Depth-aware world effects and trajectories.
6. Fog and translucent world events using explicit blend order.
7. Screen-facing tactical overlays and HUD.

Every pass restores the WebGL state it changes. Depth testing, depth writes, blending, culling, framebuffer binding, and viewport state cannot leak into the next pass.

## Performance and Quality Scaling

The rebuild preserves visual quality while adapting workload:

- Frustum-cull terrain chunks and model batches.
- Use stable LOD rather than changing geometry every camera movement.
- Upload only dirty terrain chunks and changed instances.
- Reuse GPU buffers and avoid per-frame allocations.
- Keep one synchronized animation-frame loop for simulation-derived frame data, camera state, WebGL rendering, and overlays.
- Scale shadow detail, effect density, and distant model LOD on mobile without changing game information or mechanics.
- Handle resize, device-pixel-ratio changes, context loss, and context restoration explicitly.

The minimum fallback is the existing 2D renderer. A failed 3D initialization must return the player to 2D with a clear message rather than leaving a black battlefield.

## Error Handling

- Validate camera matrices and pointer intersections before committing state.
- Reject or clamp invalid pitch, yaw, distance, zoom, and target values.
- If a model definition is missing, render a clearly logged development fallback while production tests prevent shipping the omission.
- If chunk creation fails because of GPU limits, reduce terrain detail and retry once; if it still fails, return to 2D.
- On WebGL context restoration, rebuild chunk buffers, model batches, textures, dirty state, and the current camera without restarting the match.

## Testing and Acceptance

### Automated tests

- Camera never crosses below the board across complete right-drag limits.
- Forward and backward shallow angles remain symmetrical and valid.
- Left-drag keeps the picked terrain point under the cursor at multiple yaw, pitch, and zoom values.
- Zoom keeps the current camera target fixed.
- Full map bounds, including Antarctica, remain inside available chunk coverage.
- Stable chunk origins and LOD hysteresis do not change under sub-chunk panning.
- Adjacent chunk LODs share edges without cracks.
- Near/far planes contain maximum terrain and model height.
- Every `UnitType` has a complete model and valid close/distant LOD.
- Model orientation, owner color, altitude, and animation sockets are correct.
- World-to-screen projection is shared by terrain interaction and tactical overlays.
- Context restoration reproduces the pre-loss scene state.

### Visual playtests

Capture fixed screenshots and movement recordings for:

- near-top-down, default, low-forward, and low-backward camera angles;
- minimum, normal, and maximum zoom;
- full Earth with Antarctica and all four map corners;
- mountain, snow, coast, water, volcanic, and player-owned terrain;
- dense cities, ships, aircraft, tanks, trains, missiles, and effects;
- 2D versus 3D label alignment and tactical path parity;
- desktop and mobile aspect ratios;
- continuous pan, orbit, and zoom recordings checked for flicker or geometry popping.

### Completion criteria

The rebuild is complete only when:

- no tested camera movement produces black frames, transparent ground, missing terrain, inverted maps, or visible under-map holes;
- terrain does not swim, flicker, or change shape while panning;
- left-drag feels anchored like 2D;
- all current units are recognizable faithful 3D recreations rather than generic primitives;
- all tactical information available in 2D remains available, aligned, and readable in 3D;
- multiplayer and deterministic simulation checks remain unchanged and passing;
- performance remains playable on supported desktop and mobile WebGL2 devices, with adaptive rendering affecting presentation only.

## Delivery Sequence

The work ships as one player-facing OpenBack release but is implemented in independently verifiable stages:

1. camera math and cursor-anchored controls;
2. world-anchored chunk terrain, clipping, solid edges, and LOD;
3. shared tactical projection and overlay parity;
4. complete faithful model catalog and instanced unit renderer;
5. effects, context recovery, adaptive quality, and full visual playtest.

No stage is considered releasable by itself. The 3D option remains development-only until every completion criterion passes.
