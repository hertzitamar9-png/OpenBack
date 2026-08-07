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

- Made accounts, Lifetime Access purchases, profiles, ranked progress, cosmetics, clans, friends, chats, and completed match history survive normal server restarts.
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

## OpenBack v0.34.61 - Reliable Account Images

- Fixed the OpenBack logo on account choice, verification, and Lifetime Access screens.

Created by **frootz jhklphy**.

## OpenBack v0.34.60 - Clear Purchase Sign-In

- Added a clear Log In or Sign Up choice before buying Lifetime Access.
- Added separate Back and Cancel actions and restored the official circular OpenBack logo throughout the flow.
- Fixed first-time account access failures.

Created by **frootz jhklphy**.

## OpenBack v0.34.59 - Guided Lifetime Checkout

- Kept Solo play free of purchase prompts.
- Showed the Lifetime Access explanation only after selecting a locked multiplayer, ranked, party, invite, or Frootz-map feature.
- Continued checkout automatically after successful account verification.

Created by **frootz jhklphy**.

## OpenBack v0.34.58 - Account-Owned Lifetime Access

- Made Lifetime Access follow the signed-in account across devices.
- Restored unlocked features and saved progress whenever the same account signs in again.

Created by **frootz jhklphy**.

## OpenBack v0.34.57 - Service Requests

- Added a Service Request contact beside the footer links for purchase and account problems.
- Prepared the troubleshooting message while warning players not to share private sign-in information.

Created by **frootz jhklphy**.

## OpenBack v0.34.56 - Lifetime Access

- Kept Solo free and available without an account.
- Added a one-time Lifetime Access purchase for Multiplayer, Ranked, parties, invite links, and Frootz maps.
- Added account-based purchase restoration and clear locked-map indicators.

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
