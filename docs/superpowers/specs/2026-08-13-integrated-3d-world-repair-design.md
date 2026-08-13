# Integrated 3D World Repair Design

**Status:** Approved by the user on 2026-08-13  
**Release author:** **frootz jhklphy**

## Goal

Make OpenBack's 3D modifier reliable and visually distinct without changing the deterministic territorial simulation or degrading 2D play. Clicking, placement previews, units, paths, terrain, rails, trains, ships, effects, water, tides, and lighting must agree on one authoritative world position at every camera angle.

## Player-facing scope

- Military fuel trains show the same visible gold-gain feedback as ordinary trains while preserving their existing half-rate payout.
- OpenBack's 2D terrain receives a distinct, readable visual identity rather than looking unchanged from OpenFront.
- Flat 3D-mode models remain anchored to their exact world tile and face the camera without appearing to slide when the camera rotates.
- Ships use a restored 3D model, face the current route segment, leave an owner-colored wake, and begin their arrival attack immediately.
- Bomb projectiles and explosions receive terrain-aware 3D presentation.
- Tanks remain flat camera-facing models while moving. Only the terminal self-destruction sequence uses 3D parts: the turret raises, fires a 3D bomb upward, lowers, and the tank explodes.
- Water has raised animated geometry, visible crest and shoreline foam, and shore-breaking and retreat motion.
- The 3D sky and battlefield lighting follow a deterministic day/night cycle.
- Night tide temporarily covers eligible coastal territory and restores it during the returning day.
- Railways are continuous, terrain-following routes that remain readable across mountains in both normal and military networks.
- Fallout has the same readable dark-green identity in 2D and 3D.
- All 3D targeting cursors, placement previews, MIRV targets, aircraft targets, tank targets, attacks, and radial actions align with the pointer.
- Existing optional world modifiers keep their authoritative rules and receive terrain-aware 3D presentation where required.

## Non-goals and constraints

- Do not rewrite or fork the deterministic game simulation for visual effects.
- Do not change 2D targeting, aircraft landing rules, unit prices, combat balance, or train payout amounts.
- Do not convert ordinary structures, trains, aircraft, or moving tanks into permanent 3D models.
- Do not make the moving tank turret 3D outside its terminal self-destruction animation.
- Do not introduce nondeterministic physics into multiplayer state.
- Do not let visual wave displacement decide ownership, pathfinding, or combat.
- Preserve existing AGPL, attribution, corresponding-source, and asset-license notices.

## Architecture

### 1. Shared 3D world projection

Introduce one immutable per-frame `ThreeDWorldFrame` assembled by the renderer from the active map, canvas viewport, camera center, zoom, yaw, pitch, simulation tick, and the terrain-height sampler. The renderer and `TransformHandler` must consume the same camera parameters and the same `threeDHeightForTerrainByte` sampling rule.

The frame exposes:

- `projectWorld(x, z, heightMode)` for overlays and previews;
- `screenRay(screenX, screenY)` for input;
- `intersectTerrain(screenX, screenY)` for exact pointer-to-terrain selection;
- `surfaceHeight(x, z)` for models, rails, effects, and paths;
- `billboardBasis()` for camera-facing flat artwork.

The input transform must not silently fall back to the camera center when a ray misses. It clamps to the nearest valid board intersection or reports no target, preventing accidental attacks on unrelated countries.

All actions use the same resolved world coordinate that drives the visible cursor. Target validation receives this coordinate rather than independently re-projecting the original browser event.

### 2. Stable flat-model billboards

Classic 2D structures, aircraft, trains, and non-terminal tanks remain sprite-based. Their world anchor is projected once through `ThreeDWorldFrame`; camera-facing orientation changes only their basis vectors, never their world position.

The billboard quad uses a screen-facing basis derived from the current view matrix. It preserves a stable pixel size within existing zoom limits and samples terrain height at the authoritative unit tile. Camera rotation therefore changes the apparent facing but cannot translate the anchor.

Construction ghosts, stacking counts, progress bars, radii, trajectories, and selection states use the same anchor and billboard basis.

### 3. Hybrid special models and effects

Ships use a compact 3D hull registered through the existing 3D model pipeline. Heading follows the latest authoritative route segment, not merely the final destination. The wake is a short world-space ribbon colored from the owner's palette, tapered behind the stern and removed promptly when the ship disappears.

Bombs use 3D projectile geometry while their target warnings, radii, timing, and damage remain authoritative existing systems. Explosions sample the terrain surface and cannot create screen-sized geometry.

Tanks stay flat during deployment and travel. At terminal self-destruction only, a transient 3D sequence is rendered from deterministic execution progress: turret pitch rises to its full angle, muzzle flash appears, a round 3D bomb follows a visible up-and-down arc, the turret lowers, and the existing explosion resolves. This visual state cannot affect damage timing.

### 4. Immediate ship arrival

`TransportShipExecution` checks route completion before applying a current-induced zero-step result. Currents may slow travel between nodes, but once the boat is already at its destination they cannot add idle ticks. Arrival immediately deletes or transitions the transport and starts `AttackExecution` with the sent troop count.

The same rule applies to retreat completion. Motion plans, sprite interpolation, and wakes end on the same tick as authoritative completion.

### 5. Fuel-train rewards and rail presentation

Military fuel stops continue using `Config.trainGold(...) / 2n`. `PlayerImpl.addGold(gold, station.tile())` already emits `BonusEvent`; the client must render this event both in the top gold pulse and as a world-space floating amount above the station. Ordinary and fuel train stop rewards share one event visualization.

Rail geometry comes from the authoritative railroad network. A terrain-following polyline samples intermediate heights densely enough to climb slopes without floating or cutting through peaks. Twin rails, sleepers, and junction joins remain continuous at normal gameplay zoom. Military rail tinting may differ, but topology and placement remain shared.

Classic 2D train sprites remain the source artwork for the normal train. Military trains keep their camouflage identity. Neither train may overlap adjacent cars because carriage spacing is derived from path distance rather than screen-space offsets.

### 6. OpenBack 2D terrain identity

The 2D terrain shader receives an OpenBack biome palette with deeper oceans, clearer shallows, warmer lowlands, restrained rock bands, brighter snow, and a subtle topographic grain. Territory ownership remains the dominant readable color layer; terrain detail is low contrast under owned land and stronger on neutral land.

Coastlines gain a thin cyan shoreline and sparse animated water highlights. This is a shader/material change only: map bytes, ownership, borders, and hit testing remain untouched.

### 7. Raised water, foam, sky, and day/night

The existing deterministic `threeDWorldCycle(tick)` remains the single clock. Rendering interpolates between simulation ticks without changing its phase.

The ocean mesh uses several bounded Gerstner components with vertical displacement, horizontal crest motion, analytic or finite-difference normals, and distance-based tessellation. Crest height is visibly above the calm surface while remaining below gameplay-obscuring scale. Foam is concentrated on high curvature and shoreline breaks, moves with the crest, spreads briefly onto the coast, and retreats with the water.

The sky renders a continuous day gradient, warm dawn/dusk, night stars, and moonlight. Terrain, models, water, and effects share the same daylight and ambient values. UI brightness remains unchanged.

The tide simulation continues to alter only low ocean-facing coastal tiles selected by `isTidalCoast`. The server applies flooding and restoration incrementally and deterministically. Flooded territory is visibly water-covered at night, unavailable as land until restored, and returned to its recorded owner during the day according to the existing restoration ledger. Events are synchronized in multiplayer and replay.

### 8. Fallout and modifier parity

Fallout uses one shared semantic color definition: dark irradiated green with enough contrast against healthy ownership green. The 2D tile shader and 3D terrain shader consume the same palette values.

Fog, disasters, living-world events, and strategic effects use the shared surface sampler. Their geometry conforms to terrain, respects the camera frustum, and never replaces or scales the full map surface. Visual particles are client-only; event timing and affected tiles remain authoritative.

## Data flow

1. The deterministic simulation advances units, trains, tide state, combat, and events.
2. `GameView` builds the frame snapshot without converting world coordinates to screen coordinates.
3. The renderer creates one `ThreeDWorldFrame` for the frame.
4. Terrain, water, rails, models, sprites, paths, previews, names, and effects consume that frame.
5. Pointer input asks the same frame/camera representation for a terrain intersection.
6. The resolved tile is displayed by the cursor and sent unchanged to action validation and intent creation.

## Failure handling and performance

- A missed terrain ray produces no actionable target and keeps the last valid preview grey; it never substitutes the map center.
- WebGL context recovery rebuilds water, rail, model, and special-effect resources from snapshot state.
- Terrain and water use adaptive mesh density based on camera distance with stable thresholds and hysteresis to prevent flicker.
- Billboard and rail buffers update only when their world state or camera matrix changes.
- Wakes, foam, muzzle flashes, bomb arcs, and disaster particles use fixed instance budgets and deterministic eviction.
- Tide application remains incrementally budgeted per simulation tick.
- All new shader paths honor reduced visual quality settings without changing gameplay.

## Testing

### Unit and integration tests

- Camera construction in renderer and input produces identical matrices for the same state.
- Screen-to-terrain round trips remain within half a tile across representative zoom, pitch, yaw, terrain height, and map edge cases.
- Missed rays do not return the camera center.
- Billboards retain a fixed world anchor while yaw and pitch change.
- Transport arrival resolves on the first complete-path tick even when the current schedule returns zero movement.
- Fuel stops emit the expected half-rate `BonusEvent` at the station tile.
- Rails sample terrain continuously and produce finite joined geometry across steep terrain.
- Day/night, wave, current, and tide outputs remain deterministic and bounded.
- Tank terminal animation timing cannot change the authoritative explosion tick.
- Fallout palette output differs clearly from healthy green in both shader paths.

### Browser visual playtest

- Play 2D and 3D World matches at desktop and mobile viewports.
- Rotate and zoom while observing multiple flat units; anchors must not slide.
- Click small countries and mountainous targets using attacks, MIRV, aircraft, tanks, and placement previews; cursor and action tile must match.
- Observe ordinary and fuel trains through full station stops; rails, spacing, and money feedback must remain visible.
- Send ships across and against currents; heading, wake, arrival, and attack timing must remain coherent.
- Observe a full accelerated day/night transition, shoreline flooding, restoration, raised waves, foam, sky, and lighting.
- Trigger all bombs, tank self-destruction, fallout, fog, and every disaster in 3D.
- Inspect console logs, WebGL errors, screenshots, and long-match frame stability.

## Release and verification

The player-facing implementation ships as the next OpenBack patch release with a top-of-file `resources/changelog.md` entry crediting **frootz jhklphy**. Required gates are focused red/green tests, full `npm test`, lint, Prettier, production build, browser visual evidence, generated-map consistency in CI, push to `main`, and successful GitHub CI for the exact commit.
