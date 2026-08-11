## OpenBack v0.34.118 - Restored OpenFront Bomb Targets

- Restored OpenFront's original in-flight bomb target visualization: the translucent inner blast area, solid inner boundary, and animated dashed outer radius.
- Own bomb targets are green, allied targets are yellow, and enemy targets are red exactly as in the established OpenFront renderer.
- Applied the same target shader and real gameplay radii to both 2D and 3D mode without changing bomb damage, interception, or multiplayer simulation.
- Preserved the separate aircraft and tank route visuals added by OpenBack.

Created by **frootz jhklphy**.

## OpenBack v0.34.117 - Classic Units in 3D

- Replaced the mismatched 3D unit and structure meshes with OpenBack's established 2D artwork while keeping the battlefield terrain in 3D.
- Restored the classic placement previews, stacking feedback, construction bars, unit counts, missiles, paths, ranges, and combat effects in 3D mode.
- Made ships turn along every segment of a curved route so their bow always faces their current movement direction instead of staring at the final destination.
- Kept ship trails attached to the 3D water and colored with the sending player's color, matching the established 2D presentation.
- Preserved the deterministic simulation, multiplayer results, and classic 2D renderer.

Created by **frootz jhklphy**.

## OpenBack v0.34.116 - Living 3D Battlefield

- Made leaderboard player focus move into a tactical view and pulse that player's complete territory with a bright cyan-white border for three seconds.
- Rebuilt the ocean as a dense, animated 3D wave surface while keeping wave crests below coastlines, and replaced hollow-looking southern map edges with an opaque rock underside.
- Replaced flat disaster particles with animated volumetric 3D geometry for natural disasters, Living World terrain events, disaster warnings, and strategic objectives whenever 3D mode is enabled.
- Preserved the established deterministic modifier simulation, multiplayer results, classic 2D renderer, and gameplay rules.

Created by **frootz jhklphy**.

## OpenBack v0.34.115 - Clear 2D Bomb Targets

- Replaced the enormous Atom Bomb and Hydrogen Bomb placement-radius overlay with a compact green landing reticle that stays readable at every 2D zoom level.
- Kept the landing reticle visible while bombs are in flight without drawing their real damage radius across the map.
- Preserved the established Atom Bomb and Hydrogen Bomb damage, simulation, interception, and multiplayer behavior; this release changes only their 2D targeting visuals.

Created by **frootz jhklphy**.

## OpenBack v0.34.114 - Restored Bomb Destinations

- Restored a compact, clearly visible final-destination reticle for every in-flight Atom Bomb, Hydrogen Bomb, and MIRV warhead.
- Kept real blast radii as readable outlines so large Hydrogen Bomb warnings no longer cover the battlefield with an opaque surface.
- Kept destination colors tied to player relations while preserving the distinct aircraft and tank targeting visuals.

Created by **frootz jhklphy**.

## OpenBack v0.34.113 - Stable Railroad Rendering

- Fixed an invalid railroad terrain-texture connection that could fail every WebGL frame after railroads appeared, causing severe slowdown and eventually leaving the battlefield frozen while match time continued.
- Shared one live terrain texture across railroads and map effects so terrain changes remain synchronized without duplicate GPU uploads.
- Verified sustained live matches keep the battlefield, borders, destination warnings, and HUD rendering after the previous freeze window.

Created by **frootz jhklphy**.

## OpenBack v0.34.112 - Complete Visible Features

- Audited the visible account, profile, friends, chat, clan, Store, Tribe, ranked, game-history, News, Tutorial, Blog, legal, and support surfaces against their local OpenBack implementations.
- Removed dead currency top-up actions that led players to an empty Packs page; insufficient balances now give a clear in-game message and can be earned through play.
- Added an automated release contract that prevents browser-native popups, unfinished payment panels, and missing local routes from returning unnoticed.

Created by **frootz jhklphy**.

## OpenBack v0.34.111 - Complete Tribe Service

- Made purchased Tribe names persist with their owner, moderation status, boosts, and appearance history across server restarts.
- Added unique-name validation and inappropriate-name filtering before Store currency is spent.
- Added working Tribe purchases, 30-day boosts, owned-name management, public statistics pages, and the global Tribe leaderboard.
- Connected purchased names to real multiplayer bot tribes, prioritizing names owned by players in the lobby and applying active boost weighting.
- Made completed matches update Tribe game and player-reach statistics exactly once, with instant Store balance and owned-name refreshes.

Created by **frootz jhklphy**.

## OpenBack v0.34.110 - Native OpenBack Dialogs

- Replaced the remaining browser-generated store and reward popups with consistent OpenBack success, warning, and error dialogs.
- Kept purchase, login-required, checkout, and reward feedback inside the game interface so browser or language settings cannot replace it with mismatched system UI.

Created by **frootz jhklphy**.

## OpenBack v0.34.109 - Stable Nuclear Warnings

- Kept the Hydrogen Bomb's established gameplay damage while changing its in-flight warning to readable outlines instead of a map-covering green surface.
- Prevented invalid effect radii and projection values from creating screen-sized geometry.
- Made failed WebGL frames recover on the next animation frame instead of permanently freezing borders, names, effects, and the battlefield while the match continues.
- Corrected WebGL context-loss recovery so restored games rebuild their live terrain and tactical state rather than losing the renderer a second time.

Created by **frootz jhklphy**.

## OpenBack v0.34.108 - Complete Battle Artwork

- Restored the full OpenBack battlefield artwork with its larger collection of aircraft, ships, tanks, missiles, structures, routes, and explosions while removing the tank that appeared in the water.
- Made the defeat screen preserve the complete artwork instead of cropping its outer edges.

Created by **frootz jhklphy**.

## OpenBack v0.34.107 - Complete 3D Battlefield Parity

- Raised all 3D land relief by 50% through one canonical terrain-height contract shared by terrain interaction and the remaining 3D parity work.
- Added a complete cyan ocean surface with animated world-space waves, removed broad terrain-lighting and chunk-LOD bands, and made radioactive ground remain clearly dark green after a blast.
- Corrected transports, warships, and trade ships so their bows face their movement direction instead of travelling sideways, stay anchored to the water plane, and no longer inherit nearby land height.
- Unified terrain and unit surface smoothing so buildings, previews, shadows, and moving units remain stable instead of jumping or floating across terrain-detail boundaries.
- Locked 3D names, flags, troop counts, structure levels, and world text to the battlefield's real camera scale so zoom limits cannot enlarge UI into screen-covering blocks.
- Removed colored glyph boxes from 3D player labels and culled unsafe behind-camera tactical geometry so blasts, fallout, ranges, paths, and selection effects cannot stretch across the whole screen.
- Made 3D overview fitting account for the full map width, height, terrain relief, camera angle, and screen aspect ratio so partial edges such as Antarctica remain inside the battlefield.

Created by **frootz jhklphy**.

## OpenBack v0.34.106 - Clean Profile Identity

- Replaced raw profile flag text with the player's selected flag in the bottom-right corner of the profile banner.
- Removed the remaining blue selector outlines and browser hover tooltips while preserving the clean flag and cosmetic pop-out response.

Created by **frootz jhklphy**.

## OpenBack v0.34.105 - Reliable Social Connection

- Connected Friends, parties, invitations, presence, and chat through the local OpenBack gateway so those features no longer fail while the rest of the game remains connected.
- Prevented account refreshes from leaving duplicate social reconnect attempts behind.

Created by **frootz jhklphy**.

## OpenBack v0.34.104 - Stable 3D Battlefield

- Stopped the 3D camera from shaking over changing terrain and made left-drag movement use the same direct screen translation as the regular battlefield, rotated only when the player rotates the board.
- Restored the earlier balanced terrain relief, kept complete partial map edges such as Antarctica, removed ocean chunk seams, and retained automatic 3D terrain generation for every map size.
- Fixed 3D perspective projection for fallout, nuclear effects, trajectories, ranges, selection markers, movement indicators, and combat effects so local effects can no longer stretch across the entire screen.
- Kept player names, flags, verification marks, troop counts, structure levels, and world text at readable screen sizes across the complete zoom range.

Created by **frootz jhklphy**.

## OpenBack v0.34.103 - Clean Home Selectors

- Removed the blue focus outline from Select Flag and Select Cosmetic while preserving their matching hover and press feedback.

Created by **frootz jhklphy**.

## OpenBack v0.34.102 - Real 3D Battlefield Models

- Replaced the temporary primitive unit bodies in 3D World with locally bundled low-poly models for every ship, projectile, bomb, building, train, runway, aircraft, launcher, tank, and mine.
- Made placement previews use the same real model that is placed on the battlefield, while keeping white valid and gray blocked placement feedback.
- Added a validated model loader with cached downloads, strict GLB parsing, local hashed assets, and deterministic missing-asset handling instead of silently restoring crude cube-like bodies.
- Preserved owner colors, unit heading, terrain anchoring, construction pulses, plane banking, ship movement, and the existing 2D simulation and multiplayer behavior.

Created by **frootz jhklphy**.

## OpenBack v0.34.101 - Visible 3D Construction

- Restored every structure to the 3D battlefield alongside mobile units, including stacked structure levels and construction or reload progress bars.
- Added the live 3D placement model at the exact validated build tile, using a bright white preview for valid placement and a gray preview where placement is blocked.
- Made structures visibly pulse while they are being assembled instead of appearing as silent transparent placeholders.
- Matched the Select Flag and Select Cosmetic controls with borderless styling, consistent hover lift, and keyboard-visible focus feedback.

Created by **frootz jhklphy**.

## OpenBack v0.34.100 - Precise 3D Control and Territory Locator

- Expanded the 3D tactical zoom range and made the camera follow local terrain height, allowing much closer inspection without clipping peaks or exposing the board underside.
- Stabilized close-range left-drag movement on a fixed camera plane so detailed terrain can no longer shake the camera while panning.
- Removed visible cracks and distant z-fighting bands by keeping neighboring mesh edges compatible and separating the solid board base from the playable terrain, while retaining zoom-adaptive quality.
- Doubled 3D terrain relief while keeping terrain, units, effects, spawn markers, and pointer targeting synchronized to the same height model.
- Restored the established 2D presentation for names, troop counts, flags, status icons, structure levels, and world numbers while keeping every label anchored to its 3D position.
- Preserved the chosen camera position after manual 3D spawning instead of automatically pulling the view elsewhere.
- Made leaderboard selection blink the chosen player's territory outline for three seconds in both 2D and 3D, making the local player and other nations easy to identify.

Created by **frootz jhklphy**.

## OpenBack v0.34.99 - Tabletop Camera Foundation

- Rebuilt the 3D camera around one finite perspective projection shared by pointer picking and world positioning, preventing inverted views and unstable near-plane behavior.
- Kept the camera physically above the highest terrain across the full orbit and zoom range while preserving short right-click menus.
- Made left-dragging follow the picked ground point instead of using angle-dependent screen deltas, so movement stays attached to the tabletop at shallow and steep views.
- Replaced the moving terrain sheet with fixed world-anchored chunks, stable level-of-detail transitions, a solid underside, and protected map edges so terrain no longer flickers, tears, or disappears while moving and zooming.
- Rebuilt the complete unit catalog as reusable stylized 3D geometry matching OpenBack's silhouettes, owner colors, proportions, and animated parts, with cheaper distant versions that preserve gameplay visibility.
- Unified names, flags, troop counts, paths, ranges, spawn markers, fog, nuclear warnings, and world events under the same 3D projection so tactical information stays attached to its real map position.
- Added adaptive 3D rendering that reduces only terrain subdivision, distant model detail, and particle density during heavy frames while retaining full simulation, visibility, labels, paths, ranges, and effects.
- Capped 3D labels, flags, and status icons to a readable screen size and kept them upright through every camera angle without changing the established 2D presentation.

Created by **frootz jhklphy**.

## OpenBack v0.34.98 - Persistent Player Identity

- Added optional account profile pictures with automatic square cropping, persistent storage, and the updated circular OB logo as the reliable default everywhere.
- Showed profile pictures beside player names across the Profile button, public profiles, friends, clans, Ranked ladders, lobbies, and live match leaderboards without affecting deterministic gameplay.
- Made the first recorded death on a signed-in account show the Need Help tutorial once across every device; all later deaths show the OpenBack battle artwork in the same 16:9 frame.
- Made guests see the tutorial once per open page, resetting naturally when OpenBack is closed and reopened.
- Removed the Profile button's permanent loading spinner and kept the profile name visible beside the resolved avatar.

Created by **frootz jhklphy**.

## OpenBack v0.34.97 - Accurate Profile Status

- Removed the stuck loading indicator from the Profile button as soon as account authentication finishes, so signed-in profiles no longer appear to be loading forever.

Created by **frootz jhklphy**.

## OpenBack v0.34.96 - Continuous 3D Zoom

- Kept the current battlefield target locked while zooming in 3D, so scrolling over water, fog, interface panels, or sky can no longer pull the entire map out of view.
- Expanded terrain coverage for every camera rotation and viewport shape, preventing the ground from disappearing at intermediate, close, or distant zoom levels.
- Added full-range zoom and rotated-camera regression coverage for the 3D renderer.

Created by **frootz jhklphy**.

## OpenBack v0.34.95 - Stable 3D Zoom

- Prevented close 3D zoom from clipping the battlefield and leaving only flags or UI markers on a flat background.
- Rebalanced 3D fog particle density, size, and transparency so fog remains visible without merging into an opaque full-screen sheet.
- Synchronized raised terrain height across buildings, units, spawn markers, trajectories, and world-event effects so every layer stays attached to the same surface while zooming.

Created by **frootz jhklphy**.

## OpenBack v0.34.94 - Clearer 3D Battlefield

- Kept the 3D camera above the battlefield across its full forward and backward tilt range, removing the pole-crossing flip that could turn the map upside down.
- Made 3D country names and troop counts clean, screen-facing labels without the heavy colored blocks around each character.
- Increased visible elevation and restored distinct green lowlands, exposed rocky slopes, and snowy high peaks even inside player territory.
- Added a clear, working **Select Cosmetic** control that opens the Store, so the identity row no longer contains an unexplained blank square.

Created by **frootz jhklphy**.

## OpenBack v0.34.93 - Distinct Store Collection

- Extended the Store uniqueness pass across every catalog section instead of limiting it to wraps.
- Rebuilt all six crowns as separate silhouettes with their own shapes, symbols, gems, detailing, rarity, and wallet price.
- Curated item-specific rarity and pricing across the fictional-flag collection while preserving every flag's original artwork and attribution.
- Verified that every flag, skin, crown, and effect has distinct artwork or behavior and added protection against future recolor-only duplicates.

Created by **frootz jhklphy**.

## OpenBack v0.34.92 - Complete Ranked and Distinct Cosmetics

- Added dedicated 3v3 and 4v4 Ranked leaderboard tabs beside the existing 1v1 and 2v2 ladders, with each mode showing its own ratings and match history.
- Kept the verified blue check visible for exactly as long as its highlighted player name remains visible at distance.
- Replaced the dismissible News-page announcement with a permanent compact header explaining the release notes below it.
- Rebuilt all 100 wrap skins with individually composed geometry, details, orientation, rarity, and matching wallet price instead of repeated recolors of the same design.
- Refocused Service Requests on general problems, questions, expectations, and useful troubleshooting details.
- Removed obsolete locked-map presentation so every map category uses the same direct selection behavior.

Created by **frootz jhklphy**.

## OpenBack v0.34.91 - Clean Production Matches

- Removed the failed custom-tribe network request that ran before every public match when no compatible tribe service was configured, eliminating repeated 404 warnings and unnecessary startup work.
- Corrected production identity so the live OpenBack service, workers, and optional telemetry no longer identify themselves as a development OpenFront server.
- Disabled unused remote telemetry work cleanly when no collector is configured and reduced deployment noise without changing gameplay or visual quality.

Created by **frootz jhklphy**.

## OpenBack v0.34.90 - Reliable Artwork

- Fixed broken flag thumbnails, Help illustrations, icons, map previews, and other bundled images after deployments or in older mobile browser tabs.
- Added stable versioned image delivery while preserving the existing high-performance hashed pipeline for maps, audio, and game data.
- Made every Help illustration load as soon as the Help page opens so images no longer remain blank inside mobile scrolling panels.

Created by **frootz jhklphy**.

## OpenBack v0.34.89 - Clean Fast Mobile

- Removed the remaining homepage, in-game, live-stream, Steam, Discord, tutorial, and upstream store-prompt surfaces so the play screen stays focused entirely on OpenBack.
- Removed the obsolete injected mobile-logo layer that could leave oversized or broken branding over the phone interface.
- Added adaptive phone and tablet render resolution plus stable 60 FPS pacing on high-refresh touch screens, keeping every gameplay system and visual effect while reducing GPU load, heat, and frame spikes.
- Shipped the complete responsive phone layout with compact controls, safe-area support, readable cards, and touch-friendly menus instead of the stale desktop-scaled interface.

Created by **frootz jhklphy**.

## OpenBack v0.34.88 - Mobile Everywhere

- Reworked every menu page and modal for phones and tablets with compact responsive headers, horizontally scrollable tabs, safe-area-aware full-height panels, touch-friendly controls, and smoother contained scrolling.
- Fixed narrow-phone clipping in player names and clan tags, prevented lobby modifiers from colliding with start timers, and made public-game cards easier to read without hiding their details.
- Rebuilt the mobile footer and language placement so legal links and controls wrap cleanly without overlap, and removed the footer from focused setup, account, store, clan, Ranked, and content pages to restore the full usable screen.
- Improved short-screen navigation, iOS keyboard behavior, tap responsiveness, and modal spacing while preserving the existing desktop layout and gameplay quality.

Created by **frootz jhklphy**.

## OpenBack v0.34.87 - Clean Mobile Home

- Removed homepage announcement and warning banners and moved compatibility notices and important announcements into the dedicated News page.
- Removed the oversized decorative OB background that overlapped the home controls during startup and corrected the mobile header to use the real OpenBack logo.
- Rebuilt phone lobby browsing as a compact swipeable carousel, tightened the identity and action controls, and wrapped the compact footer cleanly while preserving access to legal pages and language selection.
- Removed the unrelated mobile store promotion from the OpenBack home screen so the first view stays focused on playing.

Created by **frootz jhklphy**.

## OpenBack v0.34.86 - Anchored 3D Battlefield

- Locked 3D terrain geometry to the world so hills and coastlines no longer reshape or swim when the camera moves.
- Increased mountain and high-ground elevation and strengthened stable terrain shading so relief remains readable from overhead views.
- Kept the camera above the battlefield while allowing vertical orbit to continue past the top-down position instead of stopping there or exposing the underside of the map.
- Rebuilt composite unit grounding so bodies, turrets, chimneys, wings, and other connected parts stay assembled on sloped terrain, with cleaner matte materials for stronger silhouettes.
- Reprojected player names, flags, and status icons as straight screen-facing UI anchored by exact 3D perspective, removing skewed text and uneven spacing while the camera moves.

Created by **frootz jhklphy**.

## OpenBack v0.34.85 - Stable 3D Terrain and Routes

- Rebuilt the 3D terrain as a continuous opaque floor with stable topology, smoother coast transitions, stronger mountain elevation, matte lighting, and the same readable territory colors as classic 2D.
- Removed reflective contour and distance-light effects that caused flashing while moving the camera, while keeping snow, high ground, water depth, and neutral terrain visually distinct.
- Projected live ship trails and aircraft destination routes through the real 3D battlefield so their paths stay on the correct terrain instead of lagging behind or sliding across land.
- Kept player spawn markers circular and anchored them to the actual terrain height, with upright screen-facing player information throughout camera movement.
- Expanded the camera's forward and backward tilt range, corrected vertical orbit direction, and made a short right-click open the normal gameplay menu while a held right-drag continues to move the camera.
  Created by **frootz jhklphy**.

## OpenBack v0.34.84 - Complete 3D Gameplay View

- Restored ship routes, railways, targeting paths, range indicators, build previews, selections, and combat effects in 3D World so tactical information matches the classic 2D game.
- Split the right mouse gesture cleanly: a normal right-click opens the gameplay menu while a deliberate right-drag orbits the 3D camera.
- Reworked the 3D terrain into a cleaner tabletop surface with broader smoothing, restrained ordinary relief, clearly elevated impassable ridges, safer camera angles, and a dark classic-style surround without the detached painted horizon.
- Kept spawn markers as crisp screen-facing circles and synchronized the increased terrain relief across units, structures, world events, and mouse targeting.
- Kept multiplayer, Ranked, parties, invite links, public lobbies, and every Frootz map directly available from their normal game menus.
- Made the blue verified-name mark work for signed-in email accounts, proving that the reserved displayed username belongs to that account.
- Removed the Source and Licenses homepage news banner while retaining the required notices in OpenBack's legal and source pages.
- Corrected the 3D map's vertical camera basis so geography, labels, models, spawn markers, effects, mouse targeting, and drag movement preserve the same orientation as the 2D battlefield.

Created by **frootz jhklphy**.

## OpenBack v0.34.83 - Complete OpenBack Store

- Removed the OpenFront merchandise destination and unsupported empty catalog sections from the Store.
- Made Cosmetics the Store landing section and added six purchasable OpenBack crowns with clear rarity and price progression.
- Filled every effects category with purchasable OpenBack visuals, including ship wakes, nuclear trails, Atom Bomb, Hydrogen Bomb, and MIRV explosions, animated structures, and warship finishes.
- Completed wallet support for crowns and effects and replaced blank effect panels with a clear catalog message if a future category has no available items.
- Corrected the local OpenBack API fallback so Store inventory, profiles, and other self-contained services load through the running game instead of an unused legacy port.

Created by **frootz jhklphy**.

## OpenBack v0.34.82 - Solid 3D Battlefield

- Replaced the 3D renderer's screen-space projection with true perspective depth and near-plane clipping so terrain, player territory, units, and structures no longer stretch into broken triangles while orbiting or zooming.
- Rebuilt aircraft wings as closed solid geometry, doubled the smoothness of round units, closed cylinder and cone bases, replaced faceted projectile balls with smooth spherical meshes, and locked every model part to its parent while turning.
- Raised contiguous impassable terrain into bright, readable wall ridges while smoothing isolated height noise so mountain barriers remain dramatic without needle spikes.
- Integrated the ocean floor with a camera-aware horizon and skybox: the sky appears naturally when the camera is lowered and remains outside the view while looking down from above.
- Corrected the inverted camera basis that made the world resemble a hanging 2D sheet: the battlefield is now a horizontal floor below the camera, distant land converges toward the upper horizon, and elevated terrain rises toward the viewer.
- Rebuilt tabletop navigation so left-drag stays attached to the foreshortened floor, right-drag orbits and tilts above it, and wheel zoom preserves the exact ground point under the cursor.

Created by **frootz jhklphy**.

## OpenBack v0.34.81 - Living 3D World

- Added the optional Living World modifier: warned, deterministic winter freezes create temporary crossings; droughts expose routes; floods and tsunamis form temporary barriers; volcanic eruptions and sinkholes create impassable ground; and nuclear saturation can permanently reshape contested routes.
- Expanded Natural Disasters to 14 rotating event types with distinct movement, damage, warnings, recovery announcements, and richer 2D and 3D effects.
- Added the optional 3D World foundation with height-mapped terrain, cliffs, water depth, perspective controls, owner-colored lighting, and data-driven instanced 3D models for every current unit and structure while preserving the complete classic 2D mode.
- Rebuilt 3D World as a Catan-style tabletop battlefield: a horizontal ocean board below the camera, stylized elevated land, owner-colored territory materials, adaptive local geometry, and no projected flat-map sheet, skybox, grid, or black seams.
- Added layered volumetric fog, animated 3D objective beacons, screen-facing battlefield labels, shadows, and event particles while retaining lighter rendering paths for smaller screens.
- Made live terrain changes part of multiplayer desync detection and rebuilt water navigation after route changes so clients, bots, replays, and servers stay synchronized.
- Made temporary flood barriers restore surviving nations' original ground when the water recedes and hardened game startup against removed optional HUD components.
- Restored the complete terrain during the spawn countdown by matching the terrain shader to OpenBack's live RGBA terrain texture, removing the blank gray pre-game battlefield.
- Added dedicated desktop 3D camera controls: hold left mouse and drag to move across the board, hold right mouse and drag to orbit and tilt the camera, and use the wheel to move closer or farther.
- Removed the early HUD startup error during 3D loading and kept the unlimited-gold indicator stable during the first frame.
- Improved touch targeting so attacks on enemy land no longer open the ship or trade menu by mistake.

Created by **frootz jhklphy**.

## OpenBack v0.34.80 - Expanded World Update

- Added 22 maps, including Sol, Russia, the United States, Germany, China, France, Vietnam, Scandinavia, the Baltics, Crimea, and new arcade battlefields, while keeping every Frootz map available.
- Added impassable terrain, the Doomsday Clock mode, stronger surviving warships through veterancy, and fully flying MIRV warheads that SAM launchers can intercept.
- Expanded Ranked with a separate 2v2 ladder, safer match cancellation when players fail to join, live queue feedback, and more reliable reconnection while preserving OpenBack's 3v3, 4v4, and friend-party play.
- Added verified account usernames, shareable profiles, richer game statistics, graphics presets, terrain color controls, and expanded cosmetic effects while retaining OpenBack's email-first accounts.
- Integrated major simulation, renderer, memory, map-loading, pathfinding, matchmaking, and anti-cheat improvements from the OpenFront v0.33 engine update without removing OpenBack's aircraft, tanks, disasters, social systems, persistent accounts, or custom maps.
- Kept the imported menus and translations consistently branded as OpenBack, without outdated alpha labels.

Created by **frootz jhklphy**.

## OpenBack v0.34.79 - Social Request Alerts

- Added a live pulsing Profile alert when an invitation popup goes unanswered, followed by a pulsing Friends tab that guides players to the saved request.
- Made the alert clear immediately when the request is viewed, answered, declined, or canceled.

Created by **frootz jhklphy**.

## OpenBack v0.34.78 - Instant Social Parties and Team Play

- Added shareable friend links that open OpenBack directly to an add-friend confirmation.
- Made friend requests, online status, party invitations, cancellations, and persistent friend and clan chat update live without refreshing.
- Added 2-4 player parties beside Profile, five-second invitation popups, pending request controls, public friend profiles, last-online times, and account blocking.
- Rebuilt team Ranked so party members accept before queueing, partial parties can receive matched teammates, searching can be canceled, and oversized parties cannot enter smaller modes.
- Gave every Ranked teammate a separate allied country and changed team victory to 80% map control.
- Added host-assigned, player-choice, and auto-balanced private-lobby team setup, including a host waitlist and direct team transfers.
- Prevented blocked players from sending requests or invitations and from joining games hosted by the player who blocked them; hosts can block and remove a lobby member in one action.

Created by **frootz jhklphy**.

## OpenBack v0.34.77 - Reliable Ranked Friend Parties

- Matched every Ranked team-choice button to OpenBack's standard sizing and visual style.
- Prevented incomplete friend parties from entering matchmaking and limited party membership to confirmed friends.

Created by **frootz jhklphy**.

## OpenBack v0.34.76 - Restart-Safe Player Data

- Made accounts, profiles, ranked progress, cosmetics, clans, friends, chats, and completed match history survive normal server restarts.
- Kept sign-in sessions stable when OpenBack restarts.
- Saves pending permanent player-data changes before planned maintenance.

Created by **frootz jhklphy**.

## OpenBack v0.34.75 - Ranked Friend Parties

- Fixed Ranked with Friends so it opens a real friend-party lobby instead of entering team matchmaking immediately.
- Added direct friend selection and kept ranked matchmaking locked until every party slot is filled.
- Restyled ranked choices, party controls, and invitations to match the rest of OpenBack.

Created by **frootz jhklphy**.

## OpenBack v0.34.74 - Updated OpenBack Emblem

- Replaced the previous OB emblem across the game, account screens, browser icons, installable-app icons, and shared-link previews with the updated circular design.
- Kept every logo variant sharp and correctly sized for its placement.

Created by **frootz jhklphy**.

## OpenBack v0.34.73 - Player-Focused News

- Rebuilt News as a concise history of features, balance changes, visual improvements, and fixes that matter to players.
- Removed entries that do not describe something players can see or use.

Created by **frootz jhklphy**.

## OpenBack v0.34.72 - Resource Display Polish

- Improved personal resource formatting across the in-game HUD, leaderboard, and player information panel.

Created by **frootz jhklphy**.

## OpenBack v0.34.71 - Fictional Flags and Color Wraps

- Added 150 fictional flags to the shop.
- Added 100 original standalone color-wrap territory skins.
- Kept the expanded catalog lightweight and quick to browse.

Created by **frootz jhklphy**.

## OpenBack v0.34.69 - Matching Legal Typography

- Matched the Privacy Policy and Source and Terms typography to the Tutorials and Blog panels.

Created by **frootz jhklphy**.

## OpenBack v0.34.68 - Easier Service Requests

- Made the Service Request button open a prepared browser-based support message.
- Kept clear reminders never to share passwords or verification codes.

Created by **frootz jhklphy**.

## OpenBack v0.34.67 - Stable Starts and Unified Pages

- Fixed match-start problems that could move an established nation or corrupt a lobby listing.
- Reduced home-screen startup work so closed panels no longer slow initial loading.
- Unified the Privacy Policy and Source and Terms pages with OpenBack's normal layout and back navigation.

Created by **frootz jhklphy**.

## OpenBack v0.34.66 - Consistent Legal Navigation

- Replaced stale Return to OpenBack links with the same compact back arrow used throughout the game.
- Made the current Privacy and Terms pages appear reliably after updates.

Created by **frootz jhklphy**.

## OpenBack v0.34.65 - Reliable Page Switching

- Fixed navigation between Privacy, Source and Terms, Tutorials, and Blog.
- Kept outside links from replacing OpenBack's page interface.

Created by **frootz jhklphy**.

## OpenBack v0.34.64 - Focused Home and Legal Pages

- Removed the rotating warning strip from the home screen.
- Restyled Privacy and Terms as clean, responsive OpenBack panels.

Created by **frootz jhklphy**.

## OpenBack v0.34.63 - Unobstructed Home Screen

- Removed the browser-performance warning banner from the home screen.

Created by **frootz jhklphy**.

## OpenBack v0.34.62 - Cleaner Main Navigation

- Removed duplicated page links from the main menu while keeping them available in the footer.
- Kept the main navigation focused on playing, social features, settings, News, and accounts.

Created by **frootz jhklphy**.

## OpenBack v0.34.57 - Service Requests

- Added a Service Request contact beside the footer links for general problems, questions, and account help.
- Prepared a useful support message while warning players not to share private sign-in information.

Created by **frootz jhklphy**.

## OpenBack v0.34.55 - Giant-Match Stability

- Improved long 400-bot matches so territory growth no longer causes severe late-game stalls.
- Kept the same visual quality, game rules, and simulation results.

Created by **frootz jhklphy**.

## OpenBack v0.34.54 - Smoother Long Matches

- Reduced idle CPU use, repeated-match slowdown, reconnect freezes, and natural-disaster frame spikes.
- Reduced initial loading work while preserving gameplay and visual quality.

Created by **frootz jhklphy**.

## OpenBack v0.34.53 - Clearer Combat HUD and Living Disasters

- Restored the compact build bar and cleaner player-unit overview.
- Matched every added unit's placement snapping to established structures.
- Removed duplicated fog reveal blobs.
- Rebuilt tsunamis with moving waves, foam, and ripples, and tornadoes with funnels, wind, and debris.
- Reduced extreme-event overdraw for smoother starts and matches.

Created by **frootz jhklphy**.

## OpenBack v0.34.51 - Compact Player Board and Reliable Cosmetics

- Restored the desktop build bar to a compact single-row layout.
- Made the player board fit more information in less space.
- Fixed collectible flags that failed to load.
- Gave Legendary, Mythic, and Ultra cosmetics distinct premium effects.

Created by **frootz jhklphy**.

## OpenBack v0.34.49 - Minimum Ranked Win Gain

- Guaranteed at least 10 OB for every ranked victory.
- Kept the maximum ranked victory gain at 500 OB.

Created by **frootz jhklphy**.

## OpenBack v0.34.48 - Fair Even-Match OB

- Awarded exactly 50 OB when a 100 OB player defeats another 100 OB player.
- Preserved larger upset rewards and smaller rewards for expected victories.

Created by **frootz jhklphy**.

## OpenBack v0.34.47 - High-Stakes OB Upsets

- Capped one-match ranked gains at 500 OB.
- Made losses grow when a strong favorite loses to a major underdog.
- Kept expected wins and underdog losses small.

Created by **frootz jhklphy**.

## OpenBack v0.34.46 - Nation-Count Reward Rules

- Applied the same minimum nation-count requirement to Solo and multiplayer rewards.
- Awarded 100 caps for finishing and 200 total for winning when the match meets that requirement.

Created by **frootz jhklphy**.

## OpenBack v0.34.45 - Solo Match Rewards

- Added completion and victory cap rewards to qualifying Solo matches.

Created by **frootz jhklphy**.

## OpenBack v0.34.44 - OB Ranked Progression

- Renamed ranked rating to OB and started new ranked players at 0 OB.
- Made upsets award more and expected wins award less.
- Added cap rewards for OB milestones and removed the unused second store currency.

Created by **frootz jhklphy**.

## OpenBack v0.34.43 - Earnable Store Collection

- Added cap rewards for completed matches and victories.
- Added 12 territory skins and 10 collectible flags.
- Added Mythic and Ultra rarities with stronger visual effects.

Created by **frootz jhklphy**.

## OpenBack v0.34.42 - Legal Navigation Tabs

- Added Terms of Service and Privacy Policy beside Tutorials and Blog.
- Opened these pages inside OpenBack instead of separate browser tabs.

Created by **frootz jhklphy**.

## OpenBack v0.34.41 - Clear Browser Title

- Shortened the browser-tab title to OpenBack.

Created by **frootz jhklphy**.

## OpenBack v0.34.40 - Private Anonymous Profiles

- Kept anonymous profile details hidden until the player signs up or logs in.
- Revealed saved identity, cosmetics, clans, currency, and history together after linking the account.

Created by **frootz jhklphy**.

## OpenBack v0.34.39 - Full-Tile Flags

- Made every flag fill its complete tile without an inset preview card.

Created by **frootz jhklphy**.

## OpenBack v0.34.38 - Claim Anonymous Profiles

- Let players link an existing anonymous profile to a new account.
- Preserved the profile's identity, cosmetics, currency, clans, and history.

Created by **frootz jhklphy**.

## OpenBack v0.34.37 - Player-Chosen Teams

- Let players choose teams in team lobbies while keeping automatic balancing available.
- Let party owners arrange lobby teams before the match begins.
- Preserved the chosen teams when the game starts.

Created by **frootz jhklphy**.

## OpenBack v0.34.36 - Compact Two-Row Unit HUD

- Arranged enabled unit controls into two compact rows.
- Remembered dismissal of the end-of-game help popup.

Created by **frootz jhklphy**.

## OpenBack v0.34.35 - Capturable Ready Vehicles

- Made parked planes and tanks transfer to the player who conquers their tile.
- Made bombs destroy parked planes while tanks remain protected from bomb damage.
- Removed parked tanks when their supporting Military Base is destroyed or captured.

Created by **frootz jhklphy**.

## OpenBack v0.34.34 - Unified Stacking Preview

- Made new structures use the same green stacking preview and cursor feedback as established buildings.
- Matched regular structure snapping distance and border behavior.

Created by **frootz jhklphy**.

## OpenBack v0.34.33 - Durable Player Accounts

- Protected profiles, clans, friends, messages, rankings, and match history from disappearing after maintenance or restarts.
- Made account creation and sign-in finish only after progress is safely saved.

Created by **frootz jhklphy**.

## OpenBack v0.34.32 - Clear Hebrew Match Options

- Translated and clarified every Hebrew team format, including duos, trios, quads, and Humans vs Nations.
- Kept Release Notes readable when loading temporarily fails.

Created by **frootz jhklphy**.

## OpenBack v0.34.31 - Social Team Matchmaking

- Added Ranked and With Friends choices for 2v2, 3v3, and 4v4.
- Kept private team lobbies flexible for uneven teams, bots, nations, and shared control.
- Fixed complete flag previews, persistent pending requests, account statistics styling, and match history.

Created by **frootz jhklphy**.

## OpenBack v0.34.30 - Global Friends and Messaging

- Added persistent friend messages, group chats, and clan chat.
- Added friend codes, incoming and outgoing requests, group creation, party entry, and friend removal.
- Added friend requests from signed-in players in leaderboards and clan member lists.

Created by **frootz jhklphy**.

## OpenBack v0.34.29 - Long-Match Runtime Smoothing

- Reduced frame spikes during large attack fronts, border changes, disasters, and sustained conquest.
- Improved late-game stability without changing combat order, outcomes, or active animations.

Created by **frootz jhklphy**.

## OpenBack v0.34.28 - Giant-Map Performance

- Greatly reduced memory use on Grand Earth.
- Reduced large-map startup work and improved 400-bot simulation speed.
- Preserved exact map detail, graphics, gameplay rules, and results.

Created by **frootz jhklphy**.

## OpenBack v0.34.27 - In-App Friend Invitations

- Added persistent friend requests and friend lists.
- Added live invitations from private lobbies and ranked team parties.
- Added clear delivery and acceptance feedback.

Created by **frootz jhklphy**.

## OpenBack v0.34.26 - Long-Match Stability

- Prevented large and long-running matches from consuming excessive browser memory.
- Improved every map size without reducing visual quality or changing map content.

Created by **frootz jhklphy**.

## OpenBack v0.34.25 - Ranked Parties

- Added real 2v2, 3v3, and 4v4 ranked parties with shareable codes and visible teammate slots.
- Let party leaders choose bots and nations before searching.
- Let teammates command one shared country with divided resources.
- Added friend requests from signed-in leaderboard players.

Created by **frootz jhklphy**.

## OpenBack v0.34.24 - Unlimited Naval Routes and Restored Starts

- Let transport ships cross the complete connected ocean without a distance ceiling.
- Restored the cancellable three-second private-lobby start countdown.
- Shortened the transition from countdown to gameplay.

Created by **frootz jhklphy**.

## OpenBack v0.34.23 - Frootz Maps and Global Naval Reach

- Added the Frootz map category.
- Removed short boat and inland-targeting distance limits on connected oceans.
- Kept protection against crossing land or disconnected lakes.

Created by **frootz jhklphy**.

## OpenBack v0.34.22 - Grand Earth and Reliable Starts

- Fixed menus covering a loaded match and improved reconnect behavior.
- Added Grand Earth with 239 named nations.
- Expanded Shattered Expanse to 120 named nations.
- Unified account screens, profile organization, exit dialogs, store skins, and OpenBack branding.

Created by **frootz jhklphy**.

## OpenBack v0.34.21 - Integrated Learning and Clean Map Starts

- Moved Tutorials and Blog into native home-screen panels.
- Fixed selected maps rendering behind the Solo setup screen.

Created by **frootz jhklphy**.

## OpenBack v0.34.20 - Handcrafted Shattered Expanse

- Rebuilt Shattered Expanse from Open Map One with native terrain, continents, inland seas, rivers, peninsulas, and islands.
- Expanded it to 8,192 by 4,608 tiles.

Created by **frootz jhklphy**.

## OpenBack v0.34.19 - Continental Shattered Expanse

- Rebuilt Shattered Expanse for matches approaching 1,000 players.
- Added 15 dominant continents, irregular coastlines, large islands, and broad oceans.

Created by **frootz jhklphy**.

## OpenBack v0.34.18 - Fictional Worlds and Shattered Expanse

- Added 15 playable Fictional maps with nations, spawn locations, previews, and multiplayer support.
- Added the first Shattered Expanse layout for huge island campaigns.

Created by **frootz jhklphy**.

## OpenBack v0.34.17 - Saved Accounts and Public Profiles

- Added separate Sign Up and Log In flows with verification and recovery actions.
- Restored saved names, descriptions, banners, flags, skins, ranked progress, currency, clans, and history.
- Added clear Log Out and double-confirmed Delete My Account actions.
- Added Tutorials and Blog to desktop and mobile navigation.

Created by **frootz jhklphy**.

## OpenBack v0.34.16 - Menu Logo Fix

- Restored the correct OpenBack wordmark and an undistorted B.

Created by **frootz jhklphy**.

## OpenBack v0.34.15 - Unified Identity

- Unified the favicon, app icons, navigation mark, and social preview around the circular OpenBack emblem.
- Removed obsolete community promotions and legacy branding.

Created by **frootz jhklphy**.

## OpenBack v0.34.14 - Cleaner Branding

- Simplified the navigation logo to the OB emblem and OpenBack wordmark.
- Removed visible build numbers, tiny subtitles, alpha labels, and optional promotions.

Created by **frootz jhklphy**.

## OpenBack v0.34.12 - Strategic World Mechanics

- Added encirclement, war exhaustion, strategic objectives, logistics cargo, shared control, fog of war, and natural-disaster modifiers.
- Added earthquakes, tsunamis, tornadoes, radiation storms, economic events, rebellions, and resource discoveries.
- Included optional modifiers in randomized ranked matches.

Created by **frootz jhklphy**.

## OpenBack v0.34.11 - Large-Match Performance

- Reduced work for inactive units, off-screen effects, stale trajectories, labels, and previews.
- Reduced bot-match frame spikes and long-match memory pressure without lowering quality.
- Hid unrelated transports and stale paths, improved high-refresh displays, and synchronized displayed prices.

Created by **frootz jhklphy**.

## OpenBack v0.34.10 - Ranked Multiplayer

- Added ranked matchmaking for multiple simultaneous player pairs.
- Matched each player with the closest available rating.
- Prevented ranked search from closing when the background is clicked.
- Added randomized maps, nations, bots, teams, gold settings, and optional modifiers.

Created by **frootz jhklphy**.

## OpenBack v0.34.9 - Military Logistics Trains

- Added camouflaged fuel trains and rails between nearby Military Bases and Runways.
- Added animated smoke, missile-shaped fronts, cargo movement, and logistics income.

Created by **frootz jhklphy**.

## OpenBack v0.34.8 - Vehicle Effects and Placement

- Added familiar green stacking previews and fixed aircraft and tank placement cursors.
- Added source range previews and improved launch, crash, muzzle, projectile, and explosion effects.
- Differentiated aircraft and tank destination markers.

Created by **frootz jhklphy**.

## OpenBack v0.34.7 - Aircraft Beachheads and Destruction

- Made aircraft crash, create a blast, and deploy surviving troops.
- Added a protected landing window and MANPAD interceptions.
- Improved aircraft movement and added a complete tank self-destruction sequence.

Created by **frootz jhklphy**.

## OpenBack v0.34.6 - Assault Balance and AI

- Taught nations to use all added air and ground units.
- Improved tank navigation, retaliation, and stacked military ranges.
- Fixed impact crashes on owned territory.

Created by **frootz jhklphy**.

## OpenBack v0.34.5 - Tanks, Bases, and Mines

- Added Military Bases, Tanks, and Tank Mines with custom models, sounds, ranges, prices, stacking, and nation support.
- Added armored ground assaults and self-consuming anti-tank mines.

Created by **frootz jhklphy**.

## OpenBack v0.34.4 - Aircraft Refinement

- Made parked Aircraft visible while loading and ready on Runways.
- Improved travel direction, trajectories, silhouettes, outlines, stacking, range, and prices.

Created by **frootz jhklphy**.

## OpenBack v0.34.3 - Aircraft, Runways, and MANPADs

- Added Runways, Aircraft, and MANPADs with placement rules, art, sounds, ranges, and progressive prices.
- Added troop-carrying aircraft, crash deployment, interception, blast effects, and visible trajectories.

Created by **frootz jhklphy**.

## OpenBack v0.34.2 - Accounts, Profiles, and Clans

- Added optional account access with verification codes and recovery flows.
- Added persistent profiles, names, flags, skins, banners, currency, and clans.
- Replaced browser popups with consistent in-game confirmation dialogs.

Created by **frootz jhklphy**.

## OpenBack v0.34.1 - Internet Multiplayer

- Added public multiplayer, lobby IDs, Join Multiplayer, shareable invite links, and ranked play.
- Removed duplicate multiplayer choices and clarified the Solo, Host, Join, and Ranked paths.

Created by **frootz jhklphy**.

## OpenBack v0.34.0 - First OpenBack Release

- Established the OpenBack identity and circular logo system.
- Included maps, nations, bots, economy, diplomacy, structures, railroads, ships, weapons, match setup, and multiplayer.

Created by **frootz jhklphy**.

# OpenFront Gameplay Foundation

OpenBack continues from OpenFront's player-facing gameplay foundation, including:

- WebGL rendering and graphics settings.
- Territory skins, patterns, flags, themes, and colorblind options.
- Public, private, Solo, team, ranked, and replay modes.
- Nations, bots, alliances, clans, friends, and team spawning.
- Cities, ports, factories, defense posts, silos, SAMs, trains, railroads, ships, and nuclear weapons.
- Favorites, map search, many world and regional maps, translations, hotkeys, alerts, and accessibility improvements.
- Balance, performance, security, and stability fixes that affect live matches.
