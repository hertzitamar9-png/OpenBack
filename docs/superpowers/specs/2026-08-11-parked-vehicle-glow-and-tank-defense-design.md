# Parked Vehicle Glow and Tank Defense Design

**Status:** Approved  
**Target release:** OpenBack v0.34.122  
**Author credit:** frootz jhklphy

## Goal

Make parked Tanks and Aircraft easy to identify, preserve Tank immunity to bombs, and give Defense Posts a useful but non-blocking interaction with moving Tanks without changing deterministic gameplay.

## Player-visible behavior

### Parked vehicle glow

- A Tank being built or waiting at a Military Base produces a pulsing owner-colored glow beneath its tile.
- An Aircraft being built, loaded, or waiting at a Runway produces the same kind of glow beneath its tile.
- The glow is a renderer-only indication. It does not reveal hidden information, change ownership, affect simulation state, or create a new unit.
- The glow disappears immediately when the vehicle is launched, destroyed, or otherwise removed from its base.
- The indication is available in both 2D and 3D rendering paths and represents the same simulation state in each.

### Tank counters

- A moving Tank cannot be destroyed by Atom Bombs, Hydrogen Bombs, MIRVs, or other nuclear blast unit-deletion logic.
- Tank Mines remain the dedicated instant counter to moving Tanks.
- Existing Tank Mine activation, consumption, and Tank destruction behavior remains unchanged.

### Defense Post slowdown

- A moving hostile Tank inside the coverage of at least one active, completed enemy Defense Post moves one-third slower.
- Normal movement remains 1.5 path tiles per simulation tick. Covered movement becomes exactly 1 path tile per simulation tick.
- Multiple overlapping Defense Posts do not stack the slowdown.
- Friendly, allied, inactive, destroyed, or under-construction Defense Posts do not slow the Tank.
- The slowdown begins and ends from current simulation state on each tick. Speed returns immediately after the Tank leaves all hostile coverage or the relevant Defense Posts are destroyed.
- A slowed Tank remains able to advance, sweep territory, and destroy the Defense Post. The post delays the attack but cannot permanently trap it.

## Determinism and networking

- The slowdown uses integer movement-credit arithmetic only; no wall-clock time, frame delta, floating-point accumulation, or renderer state affects simulation movement.
- Server, client, bots, replays, and deterministic multiplayer execute the same coverage test and movement-credit rule.
- The glow is derived from synchronized unit state and does not add network messages.

## Implementation boundaries

- Reuse the current Tank and Aircraft loaded/under-construction state rather than introducing duplicate parked-state tracking.
- Reuse the existing Defense Post coverage/range calculation so the visible radius and gameplay radius cannot diverge.
- Reuse an existing OpenBack glow/light rendering primitive where possible and gate it by parked vehicle state.
- Do not change Tank price, damage, pathfinding, Tank Mine balance, Aircraft behavior, Defense Post range, or nuclear blast radius.
- Do not make Defense Posts damage Tanks directly.

## Verification

Add focused regression coverage proving:

1. A hostile completed Defense Post changes Tank movement from three tiles per two ticks to two tiles per two ticks.
2. Overlapping hostile Defense Posts do not stack.
3. Friendly, allied, under-construction, inactive, and out-of-range posts do not slow Tanks.
4. Full speed returns when coverage ends.
5. Tanks remain active after nuclear unit-destruction processing while ordinary eligible units in the blast are destroyed.
6. Parked/loading Tank and Aircraft states produce a glow, and launching or destroying them removes it.
7. The glow state is consistent in both 2D and 3D renderer inputs.

Run targeted tests first, then TypeScript checking, formatting verification, lint, build, and the repository's required CI checks before publishing the release.
