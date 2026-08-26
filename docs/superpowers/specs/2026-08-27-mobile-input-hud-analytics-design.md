# OpenBack Mobile Input, Adaptive HUD, and Private Analytics Design

**Date:** 2026-08-27  
**Status:** Approved architecture; specification awaiting user review  
**Owner:** frootz jhklphy

## Purpose

This release makes OpenBack dependable on phones without creating a separate mobile game. It replaces overlapping touch interpretations with one explicit gesture state machine, makes the in-game HUD fit the actual usable viewport and safe areas, guarantees that visible touch coordinates are the coordinates used by gameplay, and expands the existing owner-only analytics dashboard with private account and country context.

Classic desktop mouse behavior, game simulation rules, deterministic multiplayer turns, 2D and 3D rendering quality, and existing player-visible privacy boundaries remain unchanged unless explicitly described below.

## Scope

The release covers five connected areas:

1. Touch gesture classification and event consumption.
2. Exact mobile targeting for attacks, transport ships, buildings, bombs, Aircraft, Tanks, and menus.
3. Responsive portrait and landscape HUD composition.
4. Complete build-selection and ghost-preview cleanup.
5. Owner-only player analytics enrichment.

The release also provides a reusable music-generation prompt. It does not add generated audio to the repository.

## Non-goals

- No change to desktop click, right-click, keyboard, or mouse-drag behavior except where shared correctness code is required.
- No change to annexation, ship travel, attack, build, or weapon simulation rules.
- No collection or persistence of player IP addresses, precise locations, GPS, device fingerprints, passwords, verification codes, or payment data.
- No public exposure of email, approximate country, playtime analytics, or account-level monitoring fields.
- No reduction in available HUD actions and no removal of existing units.
- No fixed CSS tailored to one Xiaomi model or one screenshot resolution.

## Design principles

- One physical gesture produces one gameplay intent.
- The final visible pointer location is the authoritative target.
- Long press is a context action and consumes its release.
- Water is never silently converted into a distant land target.
- Responsive layout depends on usable width, height, safe-area insets, and container size—not device names.
- Persistent HUD protects the playfield and never hides required global controls.
- Player-facing surfaces show only presence information; private analytics remain owner-only.

## 1. Unified touch-intent arbiter

### States

The input handler owns one touch session with these mutually exclusive states:

- `pending`: one finger is down, but no intent has been classified.
- `tap`: release occurred before the hold deadline and inside tap slop.
- `hold`: the hold deadline elapsed inside hold slop.
- `drag`: movement crossed drag slop before the hold deadline.
- `multitouch`: two or more active pointers control zoom, pan, or 3D camera.
- `consumed`: a menu, build cancellation, or other action already used the sequence.
- `cancelled`: pointer cancellation, lost capture, modal takeover, or invalid sequence.

No state may emit both a tap and a hold. Once a session becomes `hold`, `drag`, `multitouch`, `consumed`, or `cancelled`, its final pointer release cannot emit a normal tap or attack.

### Classification

- Pointer down records pointer ID, canvas-relative CSS coordinates, timestamp, and target tile but emits no gameplay action.
- Movement below touch slop keeps the session pending.
- Movement beyond drag slop classifies a drag and cancels the hold timer.
- The hold timer classifies a hold only if the same pointer is active and remains inside hold slop.
- Pointer up classifies a tap only when the session is still pending.
- Opening or closing a radial/player/alliance menu marks the session consumed before any UI changes occur.
- Pointer cancellation and loss of capture clear all pending timers and state.

### Player interaction rules

- Tap enemy land: attack or valid automatic transport action.
- Hold enemy/ally land: open the contextual action menu; release does nothing else.
- Tap own land: no player-info/action menu.
- Hold own land: open the existing self action/info menu.
- Drag: pan the map. If a build or weapon preview is active, move the preview and pan together using the same pointer coordinates.
- Two fingers: existing pinch/3D camera behavior; never build, attack, or open a menu.

## 2. Exact coordinate and transport targeting

### Coordinate contract

All touch gameplay resolves through one conversion function:

1. Read `clientX/clientY` from the active pointer.
2. Subtract the current canvas `getBoundingClientRect()` origin.
3. Convert CSS pixels to renderer coordinates using the canvas-to-CSS scale.
4. Apply the active 2D or 3D projection exactly once.
5. Bounds-check before producing a tile reference.

The same resolved coordinate is passed to preview rendering, validation, menus, and final intent emission. No subsystem may re-read the last mouse position or a stale hover coordinate for a touch action.

### Transport ships

- A transport target must be a valid land tile selected by the tap release.
- A water tile, invalid tile, or UI-covered point is rejected with no ship intent.
- The client sends the exact selected land tile; it does not search for a replacement destination.
- Existing authoritative pathfinding selects the shortest valid launch coast and route to that target.
- Port ownership is not required for transport ships. The existing authoritative coastal reachability and pathfinding rules remain the only launch requirements.
- If no route exists, the player receives normal invalid feedback and no ship is created.
- A hold used to open a player/alliance menu can never also emit a transport or ground attack.

Regression tests must include a nearby island whose valid route is seconds long and a farther island, proving that the nearby tap cannot resolve to the far destination.

## 3. Build and weapon selection lifecycle

The UI and renderer share one selection lifecycle rather than clearing independent fragments.

### Clear operation

A single `clearActivePlacement()` operation clears:

- selected build/weapon type;
- ghost structure or vehicle;
- transparent previews for all units;
- pending validation and confirm requests;
- cached validated tile;
- range and trajectory overlays;
- cost/description panel;
- mobile drag anchor and gesture ownership.

### Clear triggers

- Pressing the selected build button again.
- Tapping water, enemy land, impassable terrain, outside the map, or another invalid placement.
- Choosing an attack or contextual action.
- Opening a modal/menu that takes pointer ownership.
- Escape/back/cancel.
- A failed final placement validation.

### Repeat placement

Successful placement preserves selection only for unit types whose existing rules support repeat placement/stacking and only while the player can continue placing. Invalid taps always clear selection. This preserves quick repeated building without leaving stale transparent models after cancellation.

## 4. Adaptive mobile HUD

### Layout inputs

HUD layout is driven by:

- `100dvw` and `100dvh`;
- `env(safe-area-inset-*)`;
- CSS container query width and height;
- portrait versus landscape aspect ratio;
- the number of enabled units;
- minimum touch target and readable label constraints.

There are no model-specific width exceptions.

### Portrait control panel

- The bottom panel uses the actual safe-area rectangle.
- Economy/army controls remain one compact summary row.
- Unit buttons use an adaptive grid whose column count is calculated from usable width and a minimum button width.
- The grid may use additional rows on narrow phones rather than clipping beyond rounded corners.
- Labels may wrap to two lines inside a fixed button height; they never escape the viewport.
- The panel has no horizontal scrolling and no invisible off-screen controls.

### Landscape control panel

- The bottom build bar remains one unit row whenever all enabled unit buttons meet the minimum usable width.
- On very narrow landscape screens, labels collapse before controls wrap: full label, compact label, then icon-only with accessible label.
- Economy/army controls use the first row above the units without excessive empty horizontal space.
- The control panel respects left and right safe-area insets.

### Player unit-count overlay and global controls

The selected-player overlay must not cover pause, speed, settings, leaderboard, fullscreen, wallet, or exit controls.

- On wide landscape screens, unit counters use one evenly spaced row.
- When the combined overlay and global controls cannot fit, the unit counters become two balanced compact rows inside a narrower player panel.
- Global controls occupy a reserved edge slot and remain visible and tappable.
- Empty counter slots are distributed symmetrically; they are not accumulated at one side.
- The player identity and economy block never forces global actions off-screen.
- Opening another player’s overlay does not resize or hide the global-control cluster.

### Responsive validation matrix

Browser playtests cover at least:

- Portrait: 320×568, 360×800, 393×852, 430×932.
- Landscape: 568×320, 667×375, 740×360, 852×393.
- Safe-area simulations with asymmetric left/right and bottom insets.
- Hebrew/RTL and English/LTR labels.

Every viewport must have zero horizontal document overflow, reachable build units, visible global controls, and an unobstructed playable center.

## 5. Private owner analytics

### Player-visible data

Players continue to see only:

- online now; or
- localized last-online time.

Email, approximate country, playtime, mode totals, and monitoring fields remain absent from public profiles, friend APIs, clan APIs, leaderboards, game records, and social events.

### Owner-only player fields

The existing owner analytics endpoint and dashboard add:

- verified account email;
- public player ID;
- in-game/profile name;
- account creation and last-online timestamps;
- current online state;
- selected flag;
- approximate connection country;
- equipped cosmetic;
- clan membership;
- profile-picture presence;
- total games, wins, losses, and incomplete games;
- total playtime and average match length;
- favorite mode;
- per-mode, game-type, map, and 2D/3D breakdowns;
- first and most recent completed game.

The dashboard remains searchable, responsive, and auto-refreshes while visible.

### Approximate-country collection

- The server obtains the real client address only from the trusted reverse-proxy chain.
- It performs an offline country-level GeoIP lookup.
- It immediately discards the address and stores only a two-letter ISO country code plus the first/last observation timestamp.
- No third-party geolocation request is made.
- Private/reserved/local addresses produce `Unknown`.
- Existing accounts show `Unknown` until their next authenticated connection.
- Country is explicitly labeled `Approximate country` in the owner dashboard.
- Selected flag and approximate country are shown separately; neither overwrites the other.

The GeoIP dataset and runtime library must have compatible licenses, be documented in the existing attribution system, and be updated through a deterministic repository process.

### Access control

- The navigation item is returned only to the configured owner account.
- The server reauthorizes every analytics request by verified owner email.
- Direct `/analytics` navigation by another account receives no private payload.
- Responses use `no-store` and contain no session tokens, verification codes, passwords, raw IPs, or payment data.

## 6. Data flow and persistence

- Last-online remains updated from authenticated activity and social connection lifecycle with write throttling.
- Completed-match duration and mode data remain derived from authoritative archived game records.
- New country metadata is added to the durable PostgreSQL account state and migrates safely from missing fields.
- Analytics aggregates are derived from persisted accounts and player-game records on request; no duplicate mutable counters are introduced.
- The owner account remains excluded from aggregate player totals while still being authorized to view the dashboard.

## 7. Error handling

- Invalid or stale touch coordinates produce no intent and clear active placement when appropriate.
- Pointer cancellation cannot leave a timer, menu release, or ghost active.
- A failed transport route produces no fallback destination.
- GeoIP lookup failure records `Unknown`, never blocks login, and never logs the address.
- Dashboard fetch failure keeps the previous successful snapshot and displays a retry state rather than clearing data.
- Missing historical fields render as `Unknown` or zero without corrupting existing accounts.

## 8. Verification strategy

Implementation follows test-driven development.

### Automated tests

- Gesture transition table: tap, hold, drift, drag, multitouch, cancel, menu-consumed release.
- Exact canvas/CSS coordinate conversion across device-pixel ratios.
- Self tap versus self hold behavior.
- Alliance-menu hold release cannot attack.
- Near-island transport intent preserves the exact target; water emits no intent.
- Every placement-clear trigger removes UI state, renderer ghost, overlays, and description.
- Repeat placement remains available after successful supported builds.
- HUD layout helpers produce balanced unit rows and preserve global-control capacity.
- Owner analytics includes private fields only for the owner endpoint.
- Public schemas reject or omit email, approximate country, and private analytics.
- GeoIP stores only ISO country code and never serializes the source address.

### Browser playtests

- Use the production-like local game through the browser plugin.
- Capture portrait and landscape screenshots at every validation size.
- Exercise tap attack, long-press menu, self tap, self hold, build select/cancel, nearby-island ship, water rejection, and menu-close release.
- Inspect console warnings/errors and verify no framework overlay.
- Verify the owner dashboard on desktop and mobile and a non-owner denial path.

### Release gates

- Targeted tests fail before implementation and pass afterward.
- Full tests, coverage, TypeScript, lint, formatting, production build, and generated-map checks pass.
- A player-facing changelog entry credits **frootz jhklphy**.
- Push only to `main`, verify production commit, and await green GitHub CI.

## 9. Background-music generation prompt

Use this prompt with a music-generation model:

> Create a seamless instrumental background loop for OpenBack, a modern browser territorial war and geopolitical real-time strategy game. The music should feel strategic, focused, expansive, and quietly tense—not heroic trailer music and not aggressive combat music. Blend restrained cinematic orchestra, low pulsing analog synths, subtle military percussion, distant metallic textures, warm evolving pads, and sparse map-room piano notes. Begin with calm nation-building atmosphere, gradually introduce understated tactical momentum, then resolve naturally into the opening so the loop is invisible. Keep the center frequencies clear for interface sounds, explosions, alerts, and multiplayer communication. No vocals, no choir, no recognizable melody from another work, no sudden drops, no huge brass blasts, and no exhausting constant drums. Dark navy and neon-cyan atmosphere, global command-room mood, polished game-ready mix. 92 BPM, D minor, 4/4, approximately 3 minutes, seamless loop, moderate dynamic range, stereo, suitable for hours of repeated strategy gameplay.

Optional negative prompt:

> vocals, lyrics, choir, EDM drop, dubstep, upbeat pop, fantasy tavern, heroic fanfare, excessive brass, nonstop drums, jump scares, distorted master, copyrighted melody, abrupt ending
