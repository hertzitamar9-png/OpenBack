# OpenBack Production 3D Assets and Full Visual Parity Design

**Date:** 2026-08-09
**Owner:** frootz jhklphy
**Status:** Approved direction; implementation specification

## Objective

Replace the procedural placeholder models in 3D mode with locally shipped, licensed third-party models and make every gameplay visualization available in 2D behave correctly in 3D. The deterministic simulation, costs, damage, ownership, multiplayer turns, and visibility rules remain unchanged. Only the presentation and picking/projection adapters change.

## Approved visual direction

Use a curated hybrid of real downloadable models rather than forcing one incomplete pack to cover every role. Prefer CC0 assets; CC-BY assets are allowed only when no suitable CC0 model exists and must be attributed in the repository and visible license notices.

Primary sources:

- Quaternius Animated Tanks Pack (CC0) for articulated tanks.
- Quaternius Ships Pack (CC0) for ship hulls.
- Quaternius Modular Train Pack and Kenney Train Kit (CC0) for locomotives, wagons, and track parts.
- Kenney City Kit Industrial and compatible Kenney building kits (CC0) for cities, factories, and industrial structures.
- Quaternius turret/building packs (CC0) for defenses, launchers, and military structures.
- Curated Poly Pizza GLTF aircraft or equivalent open model when a CC0 aircraft is not suitable; any CC-BY model must retain creator attribution.

The shipped game must not hotlink models or textures. Source downloads are converted to optimized GLB files and committed with a machine-readable asset manifest containing source URL, creator, license, original filename, checksum, and OpenBack mapping.

## Complete model catalog

The asset registry must cover every `UnitType` without fallback cubes:

1. City
2. Factory
3. Port
4. Defense Post
5. Missile Silo
6. SAM Launcher
7. Runway
8. MANPAD
9. Military Base
10. Tank Mine
11. Tank
12. Plane
13. Transport Ship
14. Warship
15. Trade Ship
16. Train
17. Atom Bomb
18. Hydrogen Bomb
19. MIRV
20. MIRV Warhead
21. SAM Missile
22. Shell

Each registry entry declares the GLB path, orientation, scale, ground or flight offset, owner-color material slots, shadow footprint, LODs, named movable nodes, supported animation states, and optional effect anchors such as exhaust, muzzle, wake, engine, impact, and launch points.

## Asset normalization

All models are normalized into one OpenBack visual language while preserving their real downloaded geometry:

- consistent world units and forward axis;
- centered gameplay pivot and correct ground contact;
- shared owner-color palette and restrained neutral materials;
- dark silhouette/edge treatment compatible with existing 2D readability;
- consistent apparent size against the current 2D icon footprint;
- high, medium, and distant LODs;
- merged materials and texture atlases where practical;
- Meshopt-compressed geometry and compressed web textures;
- no raw Blender, FBX, or OBJ files in the runtime bundle.

## Animation contract

Every model supports explicit state-driven animation. Imported animation clips are preserved. Missing clips are built from the real model's named parts; geometry is not replaced with procedural placeholder shapes.

Common states:

- `constructing`: parts assemble from foundation/chassis outward, synchronized to the authoritative construction progress.
- `idle`: subtle role-appropriate motion only when it helps readability.
- `moving`: wheels, tracks, hull bob, banking, or projectile spin driven by deterministic movement state.
- `attacking`: turret, barrel, launcher, or relevant moving part aims and fires.
- `reloading`: visible mechanism resets and the existing progress bar remains authoritative.
- `damaged`: restrained sparks, smoke, and material response without obscuring gameplay.
- `destroying`: parts disassemble or collapse, followed by the existing explosion/effect timing and cleanup.

Specialized animation requirements:

- **Plane:** visible on runway; loading/ready state; engine startup and smoke; runway takeoff; heading and banking along trajectory; crash descent, impact, and localized fire/smoke.
- **Tank:** moving tracks; hull aligned to path; independent turret aim; muzzle flash and fireball; mine hit and self-destruction sequence.
- **Train:** rotating wheels and rods where present; locomotive exhaust; wagons following rails; visible cargo/fuel role.
- **Ships:** correct waterline; pitch/roll kept subtle; wake and foam trails; turret action for warships.
- **Missiles and bombs:** launch separation, orientation along the 3D curve, exhaust trail, interception, impact, shockwave, and fallout effects.
- **Buildings:** construction assembly, doors/launch bays where applicable, reload mechanisms, damage response, and destruction collapse.

Animations are presentation-only and sample simulation state. They never control movement, damage, cooldowns, ownership, or multiplayer results.

## Shared 2D-to-3D visual parity bridge

The renderer needs one world-projection service shared by 3D models and every existing 2D gameplay pass. A visual is defined in map coordinates once, then projected either through the 2D matrix or onto the 3D terrain/camera.

The 3D path must support:

- names, flags, troop counts, unit stack counts, health, construction, reload, and readiness bars;
- selection ghosts, snap previews, crosshairs, defense coverage, MANPAD/mine/runway/base ranges, and hover highlights;
- attack lines, ship routes, railroads, aircraft routes, tank paths, missile trajectories, bomb arcs, interception paths, and destination indicators;
- wakes, smoke, exhaust, fireballs, muzzle flashes, sparks, debris, explosions, shockwaves, fallout, crash fires, and construction particles;
- day/night lighting, fog of war, natural disasters, living-world terrain changes, strategic objectives, radiation, and every effect cosmetic selected by the player.

Screen-facing UI remains visually identical to 2D. World-space effects gain terrain height and perspective but retain the same colors, timing, semantics, and visibility rules.

## Coordinate and gameplay correctness

All affected-area tests remain tile-based in the deterministic simulation. The renderer must not reinterpret a 2D radius as a screen-space circle or a full-map quad.

- Range and target circles are terrain-conforming discs centered on the authoritative tile.
- Bomb and disaster damage checks use the existing horizontal map-space radius, regardless of terrain elevation.
- The visual blast may rise vertically, but it damages only tiles selected by the simulation.
- Trajectories are world-space curves between authoritative map positions and are clipped/occluded correctly by the camera without changing their game path.
- Fog and visibility filter models, labels, trails, trajectories, particles, and effect cosmetics consistently.
- Picking always converts the screen ray to the same terrain position used by rendering.

## Zoom and camera

Increase close tactical zoom beyond the current 3D limit while keeping near-plane clearance based on local terrain and model bounds. Panning must remain stable at maximum zoom. Camera constraints must prevent entering geometry, exposing the board underside, flipping the world, or losing map edges.

## Home-screen selector polish

`Select Flag` and `Select Cosmetic` use the same borderless resting state. Neither receives a persistent blue outline. Hover and keyboard focus lift and brighten the complete control with a small scale/translation change, stronger shadow, and accessible focus indicator that does not look like the old permanent outline.

## Rendering architecture

Introduce these bounded components:

- `ThreeDAssetManifest`: license and runtime mapping data.
- `ThreeDAssetLoader`: GLB/Meshopt/texture loading, validation, caching, and disposal.
- `ThreeDModelPool`: instanced static meshes and pooled animated instances.
- `ThreeDAnimationController`: maps simulation state to clips, node transforms, and effect anchors.
- `ThreeDProjection`: shared terrain height, world projection, path extrusion, and screen-facing overlay anchoring.
- `ThreeDEffectBridge`: adapts existing FX events and cosmetics to terrain-aware 3D instances.
- `ThreeDOverlayPass`: stack counts, bars, names, indicators, and progress synchronized to model anchors.

Simulation and renderer remain separated. Renderer code may read unit/event state but must never mutate gameplay state.

## Performance budgets

- No per-unit network requests; all assets are bundled and cacheable.
- Static structures use instancing by model/material/LOD.
- Animated vehicles use pooled skeleton/node instances only within a visible distance; distant units use baked or simplified motion.
- Effects are pooled and capped by visibility/importance, not simply dropped by unit type.
- LOD transitions use hysteresis to prevent flicker.
- Texture and geometry memory have explicit budgets and diagnostics.
- 2D mode loads no 3D model bundle.
- Mobile 3D uses the same gameplay and silhouettes with lower LOD/particle density, not missing effects.

## Failure handling

Asset loading is validated before entering a 3D match. A corrupt optional high LOD falls back to the lower LOD of the same real model. A missing mandatory model prevents enabling 3D mode and reports the exact asset rather than showing a cube. License metadata validation is part of CI.

## Testing and acceptance

Automated tests must prove:

- all 22 unit types have valid assets, LODs, animation-state declarations, anchors, and license metadata;
- construction/reload/stack values match 2D state calculations;
- 2D and 3D projection share authoritative map coordinates;
- radii never expand into full-map quads;
- bomb/disaster affected tiles are unchanged by 3D mode;
- fog hides the same opponent information in both modes;
- every gameplay effect and cosmetic has a 3D mapping or an intentional screen-facing mapping;
- no persistent selector outline remains and hover/focus states remain accessible;
- maximum zoom, pan, map edges, and local terrain clearance are stable;
- asset bundle, draw calls, frame time, and memory remain within agreed budgets.

Browser playtests cover a construction/destruction cycle for every building, travel/attack/destruction for every vehicle, all projectile families, fog, every natural disaster, living-world terrain changes, effect cosmetics, mobile controls, and a multiplayer replay comparison to confirm deterministic parity.

## Implementation sequence

1. Selector UI parity and regression tests.
2. Asset manifest, license validation, loader, and one vertical slice (tank).
3. Remaining mobile units and specialized animations.
4. Buildings, construction/reload/destruction states, counts, and bars.
5. Shared 3D projection for paths, radii, trajectories, and target indicators.
6. FX bridge for attacks, explosions, wakes, smoke, fallout, and cosmetics.
7. Fog, disasters, living-world visuals, and all modifier parity.
8. Close zoom/camera hardening, LOD, pooling, and mobile performance.
9. Full automated and browser parity matrix, license audit, changelog, and release verification.

## Out of scope

- changing deterministic combat, economy, damage, cooldown, or visibility rules;
- introducing physics-controlled gameplay;
- hotlinking or downloading runtime assets from third-party websites;
- using assets without a verified redistribution license;
- removing or weakening 2D mode.
