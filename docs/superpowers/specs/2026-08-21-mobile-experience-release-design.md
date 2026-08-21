# OpenBack Mobile Experience Release Design

**Date:** 2026-08-21

**Status:** Approved scope; pending specification review

**Creator:** **frootz jhklphy**

## Objective

Make OpenBack feel intentionally designed for phones rather than adapting desktop controls after the fact. The release covers Home navigation, responsive safe-area layout, touch gameplay, 3D touch camera controls, repeat placement, vehicle placement, audio, and touch-specific settings language. It must preserve the authoritative simulation, multiplayer protocol, pricing, cooldowns, unit limits, and desktop controls.

## Input Architecture

`InputHandler` remains the single owner of physical pointer gestures. It maps touch sequences into explicit game actions before controllers receive them. Rendering and simulation do not infer gesture meaning independently.

The mobile gesture states are:

- **Idle:** no active pointer.
- **Single-finger world pan:** one finger moves the map when no build or weapon is selected.
- **Single-finger placement preview:** one finger moves the selected unit or weapon preview directly under the finger without panning the map.
- **Tap confirmation:** a short release within touch slop confirms a valid placement or launch.
- **Stationary hold cancellation:** a stationary hold cancels an Atom Bomb, Hydrogen Bomb, or MIRV selection without launching it.
- **Two-finger 2D navigation:** pinch zooms while the midpoint may pan the 2D map without producing a tap.
- **Two-finger 3D navigation:** pinch zooms and midpoint movement rotates the 3D camera. Lifting either finger keeps the gesture consumed until all fingers are released.

Every pointer sequence has one owner and produces at most one confirmation, attack, menu action, or camera action.

## Touch Placement and Combat

### Finger-following previews

When any building, vehicle, mine, ship, or weapon is selected, touch movement emits preview-coordinate updates instead of map-drag events. `BuildPreviewController` uses those coordinates for the ghost, range, trajectory, snap state, and asynchronous build validation.

Moving the finger never confirms placement. Only a tap release confirms. The touch slop is larger than the mouse drag threshold so normal finger jitter does not turn a tap into an ignored drag.

Tapping the currently selected unit in the build strip toggles it off. Deselecting immediately clears the mobile description panel together with the ghost, range, trajectory, snap highlight, and any pending asynchronous validation. No description or preview from the cancelled unit may survive into the next interaction.

### Cancel then attack

While a normal structure is selected, tapping invalid, neutral, or enemy terrain cancels the selection and consumes that tap. It cannot also attack, open a radial menu, or send a ship. A subsequent tap with no selection performs the established attack or transport-ship action.

The cancellation remains safe while build validation is asynchronous: the event is marked as belonging exclusively to placement before it enters the event bus, so world-action listeners cannot act on it even if the worker response arrives later.

### Nuclear hold cancellation

With an Atom Bomb, Hydrogen Bomb, or MIRV selected:

- moving beyond touch slop cancels the hold timer and continues preview movement;
- releasing after a tap launches only at a valid target;
- holding still for the configured long-press duration clears the weapon selection immediately;
- releasing after cancellation is consumed and cannot launch, attack, pan, or open a menu.

Long press does not start warship box selection while a build or weapon ghost is active.

## Tank and Aircraft Placement

Tank and aircraft flows must work from selection through deployment on touch devices.

### Aircraft

- Selecting Aircraft shows a finger-following placement preview.
- A completed owned Runway is detected using the same snap and range rules as desktop.
- The preview visibly snaps only when the finger is inside the valid Runway placement area.
- A tap on the snapped Runway builds or loads exactly one aircraft.
- A ready aircraft can then be selected and its destination preview follows the finger.
- A valid destination tap launches once; an invalid tap cancels without attacking.
- The existing 3D high-terrain landing restriction and all MANPAD, loading, cost, range, and cooldown rules remain unchanged.

### Tanks

- Selecting Tank shows a finger-following placement preview.
- A completed owned Military Base is detected using the same snap and range rules as desktop.
- A tap on the snapped Base builds exactly one tank.
- A ready tank can then be selected and its destination preview follows the finger.
- A valid destination tap deploys once; an invalid tap cancels without attacking.
- Tank Mine interception, range, cost, stacking, defense slowdown, and destination behavior remain unchanged.

Automated tests must cover both source placement and destination deployment. Browser playtesting must verify the visible snap, preview, and confirmation states on a phone viewport.

## Repeat Placement

After every successful build or upgrade, the selected unit remains active. The player may place or upgrade another copy immediately while the next tile is valid and the current price is affordable.

This applies to cities, factories, ports, defenses, silos, SAMs, warships, Runways, aircraft, MANPADs, Military Bases, tanks, Tank Mines, and nuclear weapons.

The repeat-placement behavior does not bypass simulation rules:

- each placement re-queries the authoritative current cost;
- max levels, source requirements, cooldowns, range, terrain restrictions, and disabled-unit configuration still apply;
- unaffordable previews become unavailable but the unit is not permanently disabled;
- stackable units continue upgrading through their normal upgrade intent;
- selection ends only through explicit cancellation, invalid-target cancellation, selecting the active unit again, nuclear hold cancellation, or leaving the game.

## Two-Finger 3D Camera

On mobile 3D maps, two-finger midpoint movement emits `RotateCameraEvent` using the same camera constraints as desktop right-drag. Pinch distance simultaneously emits zoom. The two calculations share one tracked gesture snapshot so sequential pointer events do not introduce jitter.

The camera cannot flip, expose the board underside, or continue moving after release. One remaining finger from a completed two-finger gesture is ignored until it lifts, preventing phantom pans and attacks.

One-finger movement remains ordinary map panning when no unit is selected. UI and modal touches never reach camera controls.

## Mobile Home and Navigation

- Lobby timers use a two-column top-row layout: modifier labels may truncate, but the countdown never does. A timer such as `24s` or `1min 15s` remains complete on featured and compact cards.
- The persistent mobile header includes the existing account trigger. Signed-out players reach the existing Sign In / Sign Up choice in one press; signed-in players see their normal profile control.
- The header is painted above every inline page and remains interactive on Play, News, Help, Store, Inventory, Leaderboard, Clans, Settings, account, tutorials, and blogs.
- Hamburger handling is owned by the persistent component or delegated through its stable host, so Lit rerenders cannot remove the listener.
- Back performs one level of the visible page's existing hierarchy and then returns to Play.

## Safe-Area and HUD Layout

The complete in-game bottom HUD respects `safe-area-inset-left`, `safe-area-inset-right`, and `safe-area-inset-bottom`, with a small fallback inset for rounded screens that report zero. Padding remains inside the viewport width.

No build item, cost, count, label, or action target may be clipped by a curved corner, notch, or home indicator. The build strip remains fully usable in portrait and short landscape without horizontal scrolling.

The top player-information unit counters use a deterministic portrait grid:

- twelve enabled counters form two equal rows of six;
- disabled configurations retain balanced geometry with an inert placeholder when an odd visible count requires it;
- counters use equal widths and tabular numbers;
- the name and economy columns cannot squeeze the counter grid off-screen;
- short landscape retains one compact row when it fits, otherwise uses balanced wrapping without clipping.

## Mobile Audio

OpenBack ships an original, locally stored tactical ambient soundtrack created for this project. It does not request proprietary OpenFront music or depend on an external streaming service.

Audio initialization follows browser autoplay requirements:

- the first genuine pointer or keyboard interaction resumes the shared audio context;
- the unlock listener is installed before a match can begin and runs once;
- the first effect after unlocking is audible rather than being discarded;
- music begins only after user interaction;
- music pauses while the document is hidden and resumes when visible if the player has not muted it;
- one game session owns one music instance, preventing overlapping tracks after navigation or restart;
- teardown stops and unloads all tracks and effects.

For players with no saved preference, music and effects start at restrained audible defaults. Existing saved volume choices, including intentional zero, are preserved. The soundtrack is compressed and loop-safe to minimize mobile download, memory, and decoding cost.

## Touch-Specific Settings

Settings detect a touch-only primary input using media queries rather than a user-agent string.

On touch-only devices:

- “Left Click to Open Menu” becomes “Tap to Open Menu” with an accurate touch description;
- the Basic screen includes a compact Mobile Controls explanation covering tap, drag, pinch, two-finger 3D movement, placement cancellation, and nuclear hold cancellation;
- keyboard-only remapping is hidden from the primary settings tabs;
- mouse icons and desktop-only instructions are replaced by touch icons and language;
- controls remain at least 44 CSS pixels and respect safe areas.

Hybrid devices retain both touch guidance and keyboard remapping. Desktop wording and behavior remain unchanged.

## Performance and Compatibility

- Gesture processing allocates no per-move arrays beyond the existing two-pointer state.
- Preview validation remains single-flight and rejects stale tile responses.
- Audio uses one decoded music track and lazy-loaded effects.
- Safe-area CSS does not alter desktop dimensions.
- Input changes are presentation/control changes only; no deterministic game state depends on device type.
- Classic 2D and Immersive 3D use the same action mapping with only the camera action differing.

## Error Handling

- Pointer cancellation, window blur, modal opening, and game teardown clear all gesture, hold, preview, and audio-unlock state.
- Failed audio decoding leaves effects and gameplay operational and surfaces one diagnostic rather than retrying continuously.
- Missing Runway or Military Base sources produce the normal invalid preview without sending an intent.
- Stale async placement validation can neither place on an old tile nor cancel a newer selection.
- Unsupported safe-area variables fall back to ordinary compact padding.

## Testing

### Automated regressions

- Compact lobby timers never use ellipsis and remain width-reserved.
- Account, Menu, and Back controls remain clickable above every page after repeated navigation rerenders.
- Portrait player counters form equal rows and remain inside safe-area bounds.
- A selected ghost follows touch pointer movement without a map drag.
- Preview dragging never confirms; a tap confirms once.
- Finger jitter remains a tap within mobile touch slop.
- An invalid structure tap cancels and emits no attack or boat intent; the next tap may attack.
- Tapping an already-selected build item clears its description and every associated preview state immediately.
- Nuclear stationary hold cancels and release emits no launch.
- Nuclear drag cancels the hold timer and updates the trajectory.
- Two-finger 3D drag rotates, pinch zooms, and final release emits no phantom action.
- Aircraft snaps to a completed Runway, builds once, and launches once.
- Tank snaps to a completed Military Base, builds once, and deploys once.
- Successful builds and upgrades preserve selection; each repeat uses refreshed affordability and placement state.
- New settings defaults are audible only when no preference exists.
- Saved zero volume remains zero.
- Audio unlock resumes once and visibility changes pause/resume one music instance.
- Touch-only settings show touch language and hybrid/desktop settings retain keybind access.

### Browser playtests

Test at minimum:

- 390×844 portrait;
- 844×390 short landscape;
- a viewport with simulated left, right, and bottom safe-area padding;
- Classic 2D and Immersive 3D;
- normal buildings, stack upgrades, aircraft, tanks, ships, and all nuclear weapons;
- Home, every persistent navigation target, settings, and account entry;
- first-load audio, tab background/foreground, mute, and game restart.

Inspect visible layout, gesture results, browser logs, duplicate intents, horizontal overflow, clipped hit targets, and audio errors.

## Completion Criteria

The release is complete only when:

- every approved mobile Home, navigation, HUD, input, placement, vehicle, repeat-build, audio, and settings behavior works in browser playtesting;
- no tested gesture can emit two ships, two builds, two launches, or both cancellation and attack;
- all build controls fit supported phone screens and safe areas;
- tanks and aircraft can be placed and deployed entirely by touch;
- music and effects are audible after the first interaction at nonzero volume;
- desktop mouse, keyboard, and camera behavior remains unchanged;
- focused tests, full coverage, TypeScript, production build, lint, formatting, generated-map verification, and GitHub CI pass.

## Delivery

Ship the complete implementation as **OpenBack v0.36.197**, credited to **frootz jhklphy**, with one player-facing release-note entry. Stage only intended files, leave `.codex-remote-attachments/` untouched, push to `main`, and wait for GitHub CI before reporting completion.
