## OpenBack v0.33.39 - Full-Tile Flags

- Made every flag fill its entire flag tile edge-to-edge without the extra white inset card or preview padding.
- Kept the full flag artwork visible by stretching the source image to the tile instead of cropping it.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.38 - Claim Anonymous Profiles on Login

- Let players attach an unregistered email to their existing anonymous browser account during login verification.
- Preserve the player’s saved name, description, banner, cosmetics, currency, clans, and match history when the anonymous profile becomes an email account.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.37 - Player-Chosen Teams

- Let every player choose their own team in team-game lobbies, with automatic balanced assignment still available as the default.
- Let the party owner move any lobby player between teams to explicitly decide who plays together and who plays against whom.
- Saved lobby team choices on the server and carried them into the real match so the displayed teams no longer change when the game starts.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.36 - Compact Two-Row Unit HUD

- Made the desktop HUD substantially narrower and arranged all enabled unit controls into two compact rows instead of one long row.
- Remembered dismissal of the end-of-game help/result popup so it no longer reappears after every win or death on the same browser.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.35 - Capturable Ready Vehicles

- Made parked, ready planes and tanks transfer to the player who conquers their tile, including the new owner's color and full usability.
- Made bombs destroy planes caught in their blast while tanks remain protected from bomb damage.
- Made ready tanks depend on the military base beneath them, so destroying or losing that base removes its parked tank while launched tanks continue their mission normally.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.34 - Unified Stacking Preview

- Made the green stacking preview for runways, MANPADs, military bases, and tank mines use the exact same highlight and cursor-ghost rendering path as existing city, factory, and structure upgrades.
- Removed the separate snapped-unit visual path so added units now match the established placement feedback exactly.
- Matched regular structure snapping distance and border behavior, so hovering close enough to an owned stack automatically selects it even when the cursor is just outside owned territory.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.33 - Durable Player Accounts

- Protected accounts, sessions, profiles, clans, friends, messages, rankings, and match history from disappearing during Render deploys or service restarts.
- Production now requires durable PostgreSQL storage and refuses to start with the temporary `/tmp` fallback that Render deletes.
- Added a clear startup error for a missing database connection so a bad deployment cannot silently replace persistent player data with an empty temporary store.
- Account creation and sign-in now wait for the session to reach durable storage before reporting success.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.32 - Clear Hebrew Match Options

- Translated and clarified every Hebrew team-format choice, including duos, trios, quads, and Humans vs Nations.
- Kept Release Notes readable when a cached or missing CDN asset returns the app shell, with an automatic same-origin fallback instead of displaying raw HTML.
- Published the changelog at a stable public URL as well as its cache-busted asset URL for reliable in-game loading.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.31 - Social Team Matchmaking

- Added separate Ranked and With Friends choices for 2v2, 3v3, and 4v4, including real solo teammate matching and the existing invite-code party flow.
- Kept private team lobbies flexible for uneven player arrangements such as 3v1 or 4v2, with configurable bots, nations, teams, and shared-country control.
- Fixed flag previews so the complete flag remains visible instead of being cropped to its center.
- Made pending friend requests permanently visible in the Friends tab, including a clear empty state.
- Replaced the account statistics emoji with a consistent OpenBack chart icon, made new accounts show an empty history instead of an availability error, and added durable match summaries plus full finished-game records for future history entries.
- Hardened the public robots response against stale blocking caches so search crawlers receive explicit index permission.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.30 - Global Friends and Messaging

- Added persistent direct messages between friends, persistent friend-group chats, and a global clan chat shared by every clan member.
- Expanded the Friends tab with player friend codes, incoming and outgoing requests, chat, group creation, party entry, and friend removal.
- Added friend requests by double-clicking signed-in players in both leaderboards and by double-clicking players in clan member lists.
- Kept ranked-party invitations and accept flows connected to the existing live social service, so friends can form 2v2, 3v3, or 4v4 parties from the same social system.
- Stored social relationships and conversations in OpenBack's production account database so they remain available across devices and sessions.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.29 - Long-Match Runtime Smoothing

- Reduced the CPU cost of large simultaneous attack fronts, border changes, territory clusters, and the main execution scheduler without changing combat order or outcomes.
- Reused compact typed storage for live territory updates, reducing temporary garbage and memory pressure during sustained conquest.
- Removed idle per-frame allocations from natural-disaster effects, attack indicators, nuclear trajectory markers, and player status tracking while preserving every active animation.
- Improved late-game stability across giant custom maps and regular maps with the same deterministic simulation and client-state results.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.28 - Giant-Map Performance

- Removed enormous per-tile coordinate lookup tables while preserving exact map coordinates, cutting Grand Earth simulation memory by more than one gigabyte.
- Stopped the browser renderer from downloading and decoding a second pathfinding map that only the simulation worker uses.
- Reused live trail and railroad buffers instead of keeping redundant full-map renderer copies.
- Reduced territory and attack hot-path overhead while preserving the deterministic simulation result, graphics, gameplay rules, and map detail.
- Improved the measured 400-bot Grand Earth simulation from roughly 55 to 78 ticks per second, with the same final game-state hash.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.27 - In-App Friend Invitations

- Added persistent friend requests and friend lists to OpenBack accounts.
- Added live in-app invitations from private multiplayer lobbies, with a clear accept or cancel confirmation for the invited friend.
- Added friend invitations inside ranked 2v2, 3v3, and 4v4 parties; accepting opens the correct party and joins it automatically.
- Added visible delivery feedback so party and lobby hosts know whether an online friend received the invitation.

Contributed by **frootz jhklphy**.

## OpenBack v0.33.26 - Long-Match Stability

- Replaced per-tile boxed territory ownership with a compact sparse tile store, preventing large and long-running matches from growing into multi-gigabyte browser heaps.
- Halved the permanent territory-cluster traversal memory used by every map while preserving encirclement and annexation behavior.
- Removed full territory copies from player tile reads so late-game mechanics no longer duplicate entire countries in memory.
- Improved simulation stability for every map size, including high-player-count custom maps, without reducing visual quality or changing map content.

Contributed by **frootz jhklphy**.

# OpenBack v0.33.25 - Ranked Parties and Grand Map Performance

**Created by frootz jhklphy**

## Ranked Parties

- Added real 2v2, 3v3, and 4v4 ranked parties with shareable party codes, visible teammate slots, party leadership, and full-team matchmaking.
- Party leaders can choose the bot and nation counts before searching, and matchmaking pairs parties using the same team size and match settings.
- Teammates command one shared country, with gold and troops divided equally between its two, three, or four controllers.
- Ranked team results now update every winner and loser using the opposing team's average ELO.

## Friends

- Right-clicking another signed-in human in either the in-game leaderboard or the global ranked leaderboard now offers a real friend request action.
- Guest players and private anonymized identities remain protected instead of exposing an unusable account action.

## Large-Map Performance

- Grand Earth now stores terrain as one exact indexed texture shared by terrain and railway rendering instead of several expanded copies.
- Border rendering uses only the two channels it actually reads, cutting its large-map allocation in half with no visual downgrade.
- Fallout history and railway build-preview textures now allocate only when those effects are first used, substantially reducing startup RAM and GPU pressure.

---

# OpenBack v0.33.24 - Unlimited Naval Routes and Restored Starts

**Created by frootz jhklphy**

## Naval Movement

- Transport ships can now use the complete connected ocean even when the fast large-map route graph misses a complicated coastline.
- Added an exhaustive route fallback with no distance ceiling, while still preventing ships from crossing land or entering disconnected lakes and seas.

## Match Start

- Restored the original three-second private-lobby start countdown when no custom delay is selected.
- Pressing the start button again during those three seconds still cancels the countdown.
- Removed 1.75 seconds of artificial pre-start waiting, so the required OpenBack contributor and AGPL notice no longer holds players after their map is ready.

---

# OpenBack v0.33.23 - Frootz Maps and Global Naval Reach

**Created by frootz jhklphy**

## Maps

- Added the **Frootz** category and placed every OpenBack-created map in it, including Grand Earth, Shattered Expanse, and all 15 converted fictional worlds.
- Kept each map in its useful geographic or fictional categories as well, so the Frootz category acts as one complete OpenBack collection without removing existing filters.

## Naval Movement

- Removed the short automatic-boat distance limit so transport ships can be ordered across the full connected ocean on maps of every size.
- Removed the 50-tile inland targeting limit: selecting territory deep inside a huge continent now resolves to its nearest coast that the attacker can actually reach.
- Preserved water-component validation, preventing boats from crossing land or launching into disconnected inland lakes.

---

# OpenBack v0.33.22 - Grand Earth and Reliable Starts

**Created by frootz jhklphy**

## Match Reliability

- Restored OpenBack's established match-start flow and fixed the client lifecycle crash that could leave the home menu covering a fully loaded map.
- Home controls now finish rendering before they are connected, removing the missing language, flag, username, token-login, and game-mode initialization failures.
- Public-lobby connections now rotate to another game worker when one worker is restarting instead of retrying the same unavailable connection.

## Maps

- Added **Grand Earth**, a 12,288 by 6,144-tile real-world map built from Natural Earth's public-domain 1:10m coastline and country data.
- Grand Earth is 50% wider and twice the total tile area of Shattered Expanse, with 239 named nations whose spawn points were validated against the final terrain.
- Kept every Grand Earth nation label within the in-game name limit so labels display cleanly in matches and rankings.
- Expanded Shattered Expanse from 48 to 120 named nations with spawn positions distributed across its enormous playable land area.

## Accounts and Interface

- Made Sign Up and Log In use the same OpenBack card style, and made Log Out use the same primary action color while keeping permanent deletion clearly separate.
- Reorganized profiles around one Player Name, an optional About Me field, and a clearly labeled public Profile Card Color.
- Replaced the red generic exit confirmation with the standard OpenBack blue action style.
- Removed expected account-flow 404 noise, prevented duplicate Turnstile execution, and stopped verification tokens from being printed to the console.

## Store and Branding

- Added Air Command, Armored Column, Nuclear Dawn, Naval Grid, Rail Corps, and Storm Front territory skins.
- Fixed inline shop skins so their artwork also loads on the actual territory renderer, not only in the store preview.
- Locked the document title and app metadata to OpenBack so language changes cannot restore an old Alpha title.

---

# OpenBack v0.33.21 - Integrated Learning and Clean Map Starts

**Created by frootz jhklphy**

## Interface

- Moved Tutorials and Blog into native home-screen panels that keep players on the OpenBack game page.
- Kept the public tutorial and blog URLs available for search engines while using the same content inside the game.

## Maps

- Fixed large selected maps beginning to render behind the Solo setup screen.
- The Solo setup now closes before a selected map is handed to the game renderer.

---

# OpenBack v0.33.20 - Handcrafted Shattered Expanse

**Created by frootz jhklphy**

## Maps

- Replaced Shattered Expanse's generated continent shapes with the coastlines of Darklighter Designs' published Open Map One.
- Expanded the playable conversion to 8,192 by 4,608 tiles while preserving the source map's continents, inland seas, rivers, peninsulas, and island chains.
- Converted the CC-BY 3.0 source artwork into native OpenBack terrain and added its required attribution to the project credits.

---

# OpenBack v0.33.19 - Continental Shattered Expanse

**Created by frootz jhklphy**

## Maps

- Rebuilt Shattered Expanse as a massive 8,192 by 3,584-tile world designed for matches approaching 1,000 players.
- Replaced the tiny-island layout with 15 dominant, widely separated continents containing more than 10 million playable land tiles.
- Added irregular coastlines, large peninsulas, substantial offshore islands, and broad oceans for long land, naval, and air campaigns.

---

# OpenBack v0.33.18 - Fictional Worlds and Shattered Expanse

**Created by frootz jhklphy**

## Maps

- Added 15 new playable maps to the Fictional category, rebuilt from the supplied world silhouettes with native OpenBack terrain, nations, spawn locations, previews, and multiplayer support.
- Added Shattered Expanse, the widest and largest map in OpenBack at 6,144 by 1,664 tiles.
- Designed Shattered Expanse around ten long archipelago bands, hundreds of disconnected islands, and 48 named nations instead of one giant block of land.
- Kept the record-size map selectable without forcing it into the normal public-map rotation.

---

# OpenBack v0.33.17 — Saved Accounts and Public Profiles

**Created by frootz jhklphy**

## Accounts and identity

- Split email access into a first-time Sign Up flow and a returning Log In flow, with verification codes and clear recovery actions when the wrong path is selected.
- Added durable email-account restoration for in-game name, public description, banner color, flag, map cosmetic, ranked Elo, currency, clan membership, and other saved account data.
- Added explicit Log Out confirmation that preserves the account and a double-confirmed Delete My Account flow that permanently removes its saved identity.
- Reworked the profile editor around one in-game name and a live public-card preview, and made ranked leaderboard rows open real public profiles without exposing email data.

## Navigation, guides, and publishing notices

- Added Tutorials and Blog to the desktop and mobile navigation.
- Added current account-security, world-mechanics, natural-disaster, logistics, fog, shared-control, and living-game guides.
- Updated the privacy and source notices with the exact license, source, modification, asset-credit, privacy, and contributor-attribution items required for published copies.
- Added the OpenBack attribution notice for **frootz jhklphy** while preserving all upstream AGPL, copyright, contributor, and asset-license obligations.

---

# OpenBack v0.33.16 — Menu Logo Fix

**Created by frootz jhklphy**

## Branding

- Fixed the desktop menu logo being squeezed into the old logo's aspect ratio, restoring the correct OpenBack wordmark and an undistorted B.

---

# OpenBack v0.33.15 — Unified Identity

**Created by frootz jhklphy**

## Unified branding and cleanup

- Replaced the final hexagonal badge in the public preview artwork with the circular OpenBack OB emblem.
- Unified the favicon, installable-app icons, structured-data logo, navigation mark, and social preview around the same circular identity.
- Removed obsolete Discord, Wiki, upstream API, tutorial, repository-owner, and legacy app-icon leftovers that were not required by the game or its licenses.
- Removed product-facing upstream promotion while preserving required AGPL source access, license notices, asset credits, and contributor attribution.
- Updated crash reports to use a neutral bug-report instruction instead of directing players to Discord.

---

# OpenBack v0.33.14

**Created by frootz jhklphy**

## Brand and release identity

- Replaced the old badge with a circular OB emblem across the game and installable app.
- Simplified the navigation logo to the OB emblem and OPENBACK wordmark only.
- Removed the visible build number, tiny subtitle, alpha labels, and optional third-party community promotions.
- Added a complete OpenBack release history so each major iteration is documented in the in-game Release Notes page.
- Kept the required license, corresponding-source link, copyright notice, and contributor attribution.

---

# OpenBack v0.33.13

**Created by frootz jhklphy**

## Search and public identity

- Added a branded social preview, circular search icon, canonical URLs, sitemap, and crawler metadata.
- Added searchable tutorials, development articles, strategy guides, and a 120-term territorial strategy glossary.
- Improved OpenBack naming across search metadata and removed alpha positioning from every supported language.
- Added Google site verification and corrected public HTTPS URLs behind the hosted service.

---

# OpenBack v0.33.12

**Created by frootz jhklphy**

## Strategic world mechanics

- Added encirclement pressure so fully surrounded territory weakens over time.
- Added war exhaustion that reduces income and troop growth during prolonged wars.
- Added optional strategic objectives that reward control with gold, troops, radar coverage, or victory progress.
- Added logistics cargo whose fuel and gold benefits depend on active transport routes.
- Added shared-control games where multiple players can command the same nation with divided resources.
- Added optional fog-of-war and natural-disaster match modifiers.
- Added earthquakes, tsunamis, tornadoes, radiation storms, economic events, rebellions, and resource discoveries.
- Included the new modifiers in randomized ranked match configurations while still allowing matches with no modifier.

---

# OpenBack v0.33.11

**Created by frootz jhklphy**

## Large-match performance

- Reduced simulation and rendering work for inactive units, off-screen effects, stale trajectories, labels, and previews.
- Kept full visual quality while scaling expensive work to the current game state and visible action.
- Reduced bot-match frame spikes and long-match memory pressure.
- Hid unrelated transport ships and old trajectories that the local player did not need to render.
- Kept high-refresh displays uncapped and improved HUD fitting on smaller widths.
- Synchronized displayed prices with the prices actually charged by the simulation.

---

# OpenBack v0.33.10

**Created by frootz jhklphy**

## Ranked multiplayer

- Added self-contained ranked matchmaking for any number of waiting players.
- Matched each player with the closest available rating instead of leaving compatible players waiting indefinitely.
- Prevented ranked search from closing when the background is clicked.
- Added randomized maps, nations, bots, team layouts, gold settings, and optional modifiers.
- Fixed match assignment delivery and verified that multiple ranked pairs can launch at the same time.

---

# OpenBack v0.33.9

**Created by frootz jhklphy**

## Military logistics trains

- Added camouflaged fuel trains between nearby Military Bases and Runways.
- Added military rail connections, animated locomotive smoke, missile-shaped train fronts, and visible cargo movement.
- Made completed fuel deliveries award a reduced logistics income compared with civilian rail trade.
- Limited military train rendering and route updates to active, relevant routes to protect performance.

---

# OpenBack v0.33.8

**Created by frootz jhklphy**

## Vehicle effects and placement

- Added the same green snapped placement feedback used by established structures.
- Fixed stale and flickering white/gray aircraft and tank placement cursors.
- Added source-only range previews that appear when hovering a valid Runway or Military Base.
- Improved aircraft launch smoke, crash fire, tank muzzle flash, round fireball, self-destruction, and explosion effects.
- Differentiated aircraft and tank destination markers and trajectory animations.
- Removed excessive wreck debris while keeping localized crash fire and smoke.

---

# OpenBack v0.33.7

**Created by frootz jhklphy**

## Aircraft beachheads and destruction

- Made aircraft crash into their destination, create a blast, and automatically deploy surviving troops.
- Added a short protected landing window so the new beachhead cannot be annexed instantly.
- Required combat to clear protected aircraft landing territory.
- Added MANPAD interceptions that destroy the aircraft, carried troops, and intercepting launcher together.
- Improved aircraft heading, turning, speed, trajectory visibility, impact effects, and crater capture.
- Added tank turret elevation, visible projectile travel, impact fire, and a complete self-destruction sequence.

---

# OpenBack v0.33.6

**Created by frootz jhklphy**

## Assault balance and AI

- Taught nation AI to build Runways, Aircraft, MANPADs, Military Bases, Tanks, and Tank Mines.
- Improved tank land navigation, diagonal movement, border targeting, and destruction of hostile territory.
- Increased stacked Runway aircraft range by 35% per level.
- Increased stacked Military Base tank range by 40% per level.
- Added stack-scaled MANPAD and Tank Mine coverage.
- Fixed fallout crashes when impacts reached already-owned tiles.
- Improved nation retaliation without slowing down MIRV decisions.

---

# OpenBack v0.33.5

**Created by frootz jhklphy**

## Tanks, Military Bases, and Tank Mines

- Added Military Bases that produce Tanks in the same direct placement flow used by Runways and Aircraft.
- Added slow armored Tanks that drive toward a selected target and convert hostile ground along their route.
- Added Tank Mines that destroy an entering Tank and consume themselves without damaging their owner.
- Added visible Tank Mine coverage and stacking for Bases, Mines, and MANPADs.
- Added custom map models, build-menu art, sounds, ranges, prices, and AI support for every ground unit.
- Tuned Tank pricing through 500K, 750K, and a 1M maximum tier.
- Retuned Tank Mine pricing and later lowered military infrastructure costs for more usable matches.

---

# OpenBack v0.33.4

**Created by frootz jhklphy**

## Aircraft refinement

- Made parked Aircraft visible on their Runway after construction finishes.
- Added a loading state before Aircraft become ready to launch.
- Made aircraft face their live travel direction and follow a clear red dashed trajectory.
- Reduced the on-map aircraft size, sharpened its silhouette, strengthened black outlines, and removed unwanted transparency.
- Added Runway stacking with familiar structure snapping and expanding deployment range.
- Reduced the Aircraft price from 2M to 1M and corrected later affordability and displayed-price mismatches.

---

# OpenBack v0.33.3

**Created by frootz jhklphy**

## Aircraft, Runways, and MANPADs

- Added Runways, Aircraft, and MANPAD launchers as complete buildable units.
- Added build-menu entries, keyboard shortcuts, placement rules, custom atlas art, sounds, and visible defense ranges.
- Aircraft carry the exact selected troop amount and deploy survivors at the crash site.
- MANPADs defend a wider area than a Defense Post and intercept hostile aircraft.
- Added aircraft blast damage, fallout-style landing ground, launch warnings, and public trajectory visibility.
- Added initial Runway, Aircraft, and MANPAD pricing with progressive structure costs.

---

# OpenBack v0.33.2

**Created by frootz jhklphy**

## Accounts, profiles, and clans

- Replaced the previous external login dependency with self-contained email-code and Google authentication.
- Added transactional email delivery, secure signed sessions, recovery flows, and six-box verification-code entry.
- Added persistent profiles, custom player names, flags, skins, banners, currency, and profile editing.
- Added persistent clans with tags, ownership, membership, and worldwide joining.
- Made login optional and kept the main game available until a player chooses to sign in.
- Replaced browser confirmation popups with in-game dialogs and explicit buttons.

---

# OpenBack v0.33.1

**Created by frootz jhklphy**

## Internet multiplayer

- Added public hosted multiplayer using the authoritative game server and deterministic turn relay.
- Added lobby IDs, Join Multiplayer entry, and shareable game URLs that connect invited players automatically.
- Added copyable invite URLs and visible game IDs after the lobby is ready.
- Added production WebSocket, hosted-port, authentication-origin, and multiplayer smoke-test support.
- Removed duplicate multiplayer choices and clarified Solo, Host, Join, and Ranked flows.

---

# OpenBack v0.33.0

**Created by frootz jhklphy**

## First OpenBack release

- Established OpenBack as its own territorial strategy game identity.
- Added the original OpenBack name, logo system, hosted game service, and private repository workflow.
- Preserved the complete deterministic simulation, maps, nations, economy, diplomacy, structures, ships, railroads, and weapons used by the game.
- Removed optional third-party advertising and analytics startup scripts.
- Preserved the required AGPL license, corresponding source availability, copyright notices, asset licenses, and contributor credits.

---

# OpenFront upstream release history

The entries below are retained as the official release history that OpenBack continues from.

# v0.32.9

_July 10, 2026_

- Update Crazygames ads

# v0.32.8

_July 9, 2026_

- Crazygames account integration
- highlight small players with a pulsing glow — Zixer1
- feat(alliances): custom alliance duration lobby control — Zixer1
- Rebalance Doomsday Clock: late-game stalemate-breaker (10min grace + wave squeeze), slower troop drain, gentler-but-steeper warship attrition — Zixer1
- fix(crazygames): guest username on logout, hide fullscreen, in-game pop-ups
- fix(client): prevent Google CCPA button from shifting layout — blontd6

# v0.32.7

_July 3, 2026_

- fix: keep bottom rail below the in-game HUD so it can't cover the control panel
- feat(doomsday-clock): battle-royale style zone gamemode — Zixer1

# v0.32.6

_July 1, 2026_

- Remove ports-disabled modifier from public games
- translation update — Aotomuri
- Fix anonymize-names desync: seed cluster-recalc offset from id() not name() — Evan
- Fix: prevent client from bypassing random spawn selection 🛡️ — FloPinguin
- Fix lobby status bar scrolling out of view when many players join 🎯 — FloPinguin
- Fix nations always attacking nuked territory instead of waiting for the correct strategy 🤖 — FloPinguin

# v0.32.5

_June 27, 2026_

- OFM tournament - log final standings and per kill eliminations — Zixer1
- fix: don't re-challenge Turnstile on lobby reconnect
- feat: allow AdminBot to update name reveal by publicid — Zixer1

# v0.32.4

_June 25, 2026_

- speed up teammate spawn-phase ring pulse for better visibility
- kick_player can target a disconnected account by publicId — Zixer1
- Fixed rail network path length limit — TKTK123456
- feat: include publicID in admin-bot live stats players — Zixer1
- Add live game stats endpoint to the admin bot API
- feat: kick_player can target a publicId (admin bot) — Zixer1
- Add private lobby set to anonymize names — Zixer1
- Add admin bot HTTP API for managing private games
- Mint game ids on the server, randomly route create-game across workers

# v0.32.3

- Train tracks now stay more visible when zoomed out
- Structure dots toggle — new graphics setting to control whether structures collapse into small dots when zoomed out
- Yellow start button during countdown — the host lobby start button turns yellow while the countdown runs
- Alliance renewal & rejection alerts — "X wants to renew your alliance" and "X rejected your alliance" now appear prominently in the important-events panel instead of being buried
- Dynamic coastline color — shoreline water color now scales with your custom ocean color instead of staying a hardcoded bright blue — berkelmali
- Transport troop count fix — transport ships now correctly update their displayed troop count when hit by a hydrogen bomb — AmanorsElliot
- Local-player structure borders — your own structures' icon borders now use your territory color instead of grey — jrouillard
- Private lobby allowlist (OFM) — lobbies can optionally restrict joiners to an allowlist of public IDs (host-gated, off by default) — Zixer1
- Updated graphics modal so it's easier to preview changes — jrouillard
- Nuke fallout color option — new graphics setting to recolor the fallout after a nuke
- Alliance icon outline — added a black outline to the alliance icon so it stands out against similarly-colored terrain (e.g. irradiated land)
- Scrollable important-events panel — the important-events panel is now height-capped and scrolls (with auto-scroll to newest) instead of growing unbounded
- Factory ghost radius fix: factory/station placement now uses euclidean distance for its proximity radius check — TKTK123456

# v0.32.2

- Add trade ship captured event
- Fix anonymous-names setting not hiding names on the map
- Fix ocean color change reverting nuke-created water to land
- Fix nuke preview showing teammate SAMs as threats
- Hide clan tag input on CrazyGames
- Cap renderer device-pixel-ratio at 2 (better performance for mobile)

# v0.32.1

- bugfix: spawn highlight sometimes not showing up

# v32 Release Notes

## Major Changes

- **New WebGL renderer** — The entire game now renders on WebGL, which is faster and smoother (especially on big maps with lots of activity). It also comes with a new **Graphics Settings modal** with a dozen+ options so you can tweak how the game looks to your taste.
- **Higher trade-ship cap** — Ports now spawn more trade ships before tapering off, so naval trade scales up further with more ports.
- **Reserved clan tags** — You must now be a member of a clan in order to use its clan tag.
- **Clan tags hidden in FFA** — Clan tags are now hidden in FFA to help prevent clan teaming.
- **No spawn timer in singleplayer** — Singleplayer games now start immediately when you choose your spawn.

## Renderer & Graphics

- Migrated the entire renderer from canvas2D/Pixi to WebGL and made it the sole renderer — ldlework
- Added a Graphics Settings modal — allowing for a dozen+ different graphics options — Evan
- Added territory image-based skins — Evan
- Added colorblind mode — noahschmal
- Moved the theme system from core to a client-side ThemeProvider — noahschmal
- Returned factory/defence-post radii and railroad highlighting when placing a city/port on top — VariableVince
- Showed the alliance request + duration icon and ally/teammate targets, with optimization — VariableVince
- Moved status icons closer above names with emoji on top — VariableVince
- Displayed player flags next to names again and restored territory skins — VariableVince
- Restored rendering on WebGL context loss — VariableVince
- Improved coordinate grid — FrederikJA
- Stopped trade-friendly ships from rendering as angry red warships — Berk
- Fixed the SAM/factory radius ghost upgrade and added a railroad ghost for factories, syncing factory effective distance and railroad max length — TKTK123456

## Performance

- Numerous WebGL renderer performance improvements — Evan
- Major CPU and memory optimizations in the map generator — Alex Jurkiewicz
- Migrated AttackExecution hot loops to `forEachNeighbor` — Mike Zaugg
- Fixed AStar overflowing the priority queue on twisted paths — Arkadiusz Sygulski

## Maps

### 🗺️ New Maps

- Mississippi River 🇺🇸 — Extremely long vertical river-based meme map (by @RickD004)
- Caribbean 🏖️ — Island-based map with tons of naval trade/warfare (by @RickD004)
- Danish Straits 🇩🇰 — Two landmasses and many islands on a relatively small map (by @RickD004)
- Venice 🛶 — Urban map with a multitude of canals (by @RickD004)
- Juan De Fuca Strait 🐋 — 3-team map based on the strait between Washington and Canada (by @RickD004)
- Northwest Passage 🧊 — Island-based map based on the historic sea route cutting through the Canadian Archipelago (by @RickD004)
- Indian Subcontinent 🇮🇳 — Highly requested map with lots of Indian/Pakistani states as NPCs and rivers (by @RickD004)
- Balkans — Land-based European map with countries as NPCs and additional nations (by @RickD004)
- Middle East 🌴 — Massive highland-based map focused on the most volatile region on earth (by @RickD004)
- Onion 🧅 — Tiny meme map with onion outlines as water and mountainous terrain as the background (by @TKTK123456)
- Yellow Sea 🇨🇳 — Medium-sized sea map with two peninsulas, located between China and Korea (by @crunchybbb2)
- Taiwan Strait 🇹🇼 — 2-team map with two equally sized landmasses (by @crunchybbb2 and @RickD004)
- Korea 🇰🇷 — Peninsula map with Korean provinces as nations (by @crunchybbb2)
- Southeast Asia 🏝️ — Large subcontinental map with islands, landmasses and archipelagos (by @RickD004)
- Hong Kong 🇭🇰 — Large and dense city-themed map with harbors, islands, and 71 district-themed NPCs (by @crunchybbb2)
- Titan 🪐 — Cosmic lake and river system based on Saturn's largest moon (by @RickD004)
- World Inverted 🌎 — Massive map with Earth's oceans becoming land and land becoming sea; filled with tectonic plate boundaries as "rivers" and shipwrecks as NPCs (by @PatrickPlaysBadly)
- Labyrinth 🌀 — Confusing symmetrical maze pattern with water channels and white cross marks (by @PatrickPlaysBadly)
- Chopping Block 🔪 — Unusual pattern inspired by The Box and an inversion of the Sierpinski map (by @PatrickPlaysBadly)
- Warship Warship ⚓ — Meme map with two warship-shaped islands; inspired by Ultimus Rex's memed quote "Warship Warship" (by @crunchybbb2)

### Map Improvements & Fixes

- Team Maps Expansion (new team spawnzones), a huge terrain re-make of multiple maps, and new/updated map categories — RickD004
- Rebalanced the Taiwan Strait map — RickD004
- Fixed a river in Balkans not connecting to the sea and the Bosphorus map; QoL for Strait of Malacca — RickD004
- Formatted the map lists in Main and MapPlaylist; standardized map names across info/manifest JSONs — RickD004
- Added flags to nations on Lemnos/Hormuz/Two Lakes; fixed the disconnected Yalu River and a Warship Warship pathfinding bug — crunchybbb
- Updated maps: Dyslexdria and LUNA — Patrick Plays Badly
- Added a Favourite maps tab — bijx
- Added map search — FloPinguin
- Improved MapPlaylist — FloPinguin
- Fixed map land-tile lookup broken by the asset URL migration — FloPinguin
- Code refactor: removed lake tile type from the game — FloPinguin
- Added the Giant World Map to the multiplayer queue after performance improvements — Evan

## Nations & Bots

- Allowed mappers to define `additionalNations` and to omit nation coordinates for random spawn — FloPinguin
- Better troop management for nations, with follow-up fixes and improvements — FloPinguin
- Fixed nations being blocked by PVP immunity and not spawning with random spawn enabled — FloPinguin
- Fixed nation city farming, reactive defense posts, and nuked-territory capture — FloPinguin
- Fixed nation names with special characters — Katokoda
- Fixed nations not spawning in singleplayer when the player picks spawn too fast — Evan
- Prevented bots from invading/attacking themselves — Berk

## Alliances

- Improved alliance extension handling — babyboucher
- Fixed the alliance renewal prompt staying open and the expiration window persisting after expiration — Katokoda

## Nukes & Combat

- Rendered nukes smoothly per frame — Evan
- Removed a double `x()` dereference in the MIRV separation point calc — Berk
- Destroyed defense posts on tile capture instead of downgrading/transferring ownership — Berk
- Fixed warships freezing with no path — Katokoda

## Store & Account

- Showed full store item names instead of truncating them — Aotumuri

## Clans

- Added clan game history, a clan stats breakdown, and clantag part 1 — ryanbarlow97
- Disabled game buttons for clan tag + username; fixed the clans-UI border and a streamer-mode bug — ryanbarlow97
- Hid clan tags in public FFA games to prevent teaming and hid the clan tab on crazy games — Evan
- Added support for direct clan detail links and made the clan-tag warning clickable — Aotumuri
- Corrected the clan-tag length error message — Berk

## Friends & Social

- Added a friends panel with team-grouping hints (extended to the lobby team preview) and put friends on the same team — Evan
- Added FFA collusion warning — a-happy-goose

## UI, Events & Notifications

- Added a help notification system to the control panel — FloPinguin
- Filtered actionable events to remove dead requestors — Katokoda
- Added boat ETA calculation and display in AttacksDisplay — a-happy-goose
- Fixed the missing boat sprite icon in the attacks panel — Cameron Clark
- Fixed a malformed flag SVG URL in playerRow — Blake Girardet
- Fixed mobile logo spacing — Aotumuri
- Removed emoji from user settings — Aotumuri
- Added a "go to player on spawn" setting (default on) — FrederikJA
- Added a retaliate keybind — Sky Elder
- Fixed rebound keys — TKTK123456
- Disabled build hotkeys after death — Aotumuri
- Blocked Safari page-level pinch-zoom — Vansh
- Added a per-recipient cooldown to QuickChatExecution — Josh Harris

## Lobby & Matchmaking

- Added a spawn phase countdown timer — tnhnblgl
- Added a delayed lobby start timer — FrederikJA
- Removed the spawn timer on singleplayer (kept a static one elsewhere) — Aotumuri / Evan
- Fixed ranked 1v1 requeue opening matchmaking — Aotumuri

## Security & Server Stability

- Fixed a critical XSS in NewsModal (GHSA-rpr9-rxv7-x643) — Mehmet KOZAN
- Patched a Desync DoS vulnerability with strict majority consensus — Berk
- Removed duplicate `express.json()` middleware (SEC-04) — Berk
- Guarded all `ws.send()` calls with readyState checks and prevented `sendStartGameMsg` from crashing the server on disconnect — Berk
- Added stale-if-error to the app-shell Cache-Control — Josh Harris

## Tooling, CI & Repo

- Fixed the GitHub translation key category and restored the dev-only localStorage pattern override — Aotumuri
- Fixed CI test failures from an over-long test — VariableVince
- Silenced a noisy LangSelector "not found" console warning; fixed a websocket error-log typo — Berk

## Meta & Misc

- Meta tuning: nuke speed 8 → 10 tiles per tick, trade-ship sigmoid midpoint 200 → 400 — Evan
- Replaced hardcoded defaults and fixed an off-by-one error — babyboucher
- Updated and removed dependencies; removed a leftover optional chain — VariableVince
- Dropped the unused disposer return from `installSafariPinchZoomBlocker` — Vansh

## Translators

- Arabic🇸🇦: N0ur, Moha & SyntaxPM
- Bengali🇧🇩: sheikh
- Brazilian Portuguese🇧🇷: theskeleton4393 & juliosilvaqwerty5
- Bulgarian🇧🇬: Nikola123 & NewHappyRabbit
- Chinese Simplified🇨🇳: Moki
- Chinese Traditional🇨🇳: SkiRhino
- Czech🇨🇿: Xaelor, erinthegirl & Matoada
- Danish🇩🇰: NiclasWK
- Dutch🇳🇱: cldprv, tryout33 & Zjefken
- Esperanto: r3ms & Katokoda
- Estonian🇪🇪: ramon.o
- Finnish🇫🇮: Tanepro193
- French🇫🇷: cldprv, gx21, r3ms & Eiwalis
- Galician: toldinsound
- German🇩🇪: Pilkey, jacks0n, floriankilian, Fibig & TNB
- German🇨🇭: originaloha
- Greek🇬🇷: pantelispantelidis
- Hungarian🇭🇺: ap.ms
- Hebrew🇮🇱: Goblinon
- Hindi🇮🇳: sheikh
- Italian🇮🇹: frappa10 & Lollosean
- Indonesian🇮🇩: tronsar
- Japanese🇯🇵: Aotumuri, daimyo_panda2, gafunuko, kaywb & aki**san**
- Korean🇰🇷: Jinyoon
- Macedonian🇲🇰: Perdiccas
- Polish🇵🇱: zibi, RinkyDinky, Rulfam & krissutonieja
- Persian🇮🇷: nobodyiran
- Russian🇷🇺: Rulfam & Redincon
- Serbo-Croatian🇷🇸🇭🇷🇧🇦🇲🇪: Vekser
- Slovak🇸🇰: extraextra
- Slovenian🇸🇮: MotivatedMonkey
- Spanish🇪🇸: 6uzm4n
- Swedish🇸🇪: Moha, theangel2 & Keevee
- Toki Pona: Makonede
- Turkish🇹🇷: Toyatak & grassified
- Ukrainian🇺🇦: Rulfam

---

# Earlier OpenFront release history

- This is a sample changelog based off of v0.24.0.
- This file will be replaced with real release notes during the release build process.
  - Indented bullets look like this

📦 **OpenFront v24 Changelog**

⚖️ **Balance Changes**

- Trade ships are now capped at 150 (Evan)
  → Each port you own now increases the gold per trade, counterbalancing the cap.
- MIRVs have been nerfed
  → Expect less devastating multi-warhead nukes. Land in-between the fallout can be more quickly conquered.
- Warships prioritize enemy transport ships over warships. Reload instantly after shooting a transport ship. (Evan)
- Building discounts can only be used one time.
- AI nukes now avoid SAM launchers

🚅 **Major Features**

- Trains added for new movement mechanics (experimental for private lobbies and single player) (DevelopingTom)
- Factories spawn trains and railroads (choose Factory as unit in private lobby or for single player, to use trains)
- Railroads can form loops
- Added Trios and Quads. Add them to public lobby rotation together with Duos. (FakeNeo)
- Upgradable structures: Cities, Ports, SAMs, and Silos can now be improved
- Multi-level radial menu with dynamic build options
- Creative Commons License added to non-commercial resources
- Factories added for private lobbies and single player games
- Hash-based routing implemented
- Flares system implemented
- GitHub Releases with release notes are now supported (click the What's New button/megaphone icon)

🔧 **Game Improvements**

- Improved territory drawing performance
- SAMs now only target nukes threatening nearby areas
- Nukes are now faster (speed increased from 4 → 6)
- Better color mixing for small player counts (Ble4Ch)
- Unique player colors to avoid confusion (Ble4Ch)
- Better and optimized bot behaviour and spawn logic (tryout33 & FakeNeo)
- Boat build discounts now scale with unit ownership
- Improved username censoring and management
- Updated East Asia map (formerly "Japan and Neighbors")
- Reworked and optimized leaderboard UI
- Improved visual clarity for alliances and stacked buildings

🔧 **Game Improvements (continued)**

- Better handling for betrayal alerts and radial menu behavior
- Red alert frame when betrayed (devalnor)
- Attack hotkeys added (Engla)
- Boat hotkey added
- Nations can spawn cities without a port
- Team sizes now equalized
- MIRV warhead intercepted stats are now recorded
- Text FX added
- Terrain manipulation for attack advantage
- New logo added
- Fix Duo partner (Nation) always same in Single player (tryout33)
- Rename Replay Speed to Game Speed for Single player (tryout33)
- Fix Nations building more than allowed (tryout33)

🧪 **UI & Quality of Life**

- Fixed text overflow in UI (Diessel)
- Fixed websocket and join bugs
- Fixed boat-on-land issues
- Fixed modal errors and null pointer warnings
- Fixed input handler edge cases on Mac (proper modifier and emoji key detection) (Ble4Ch)
- Fixed scrollbar appearing unnecessarily in small boxes on Chromium browsers
- Fixed giant world map key
- Leaderboards, alerts, and modals now support translation & dark mode
- New custom flag support and pattern icons
- Various patterns available (Sword, Shells, White Rabbit, Goat, Cats, Hand, Radiation, Cursor, QR)
- Patterned territory support
- More responsive scrollbar and player info panels
- Top bar redesign (Diessel)
- More responsive design for in-game elements
- New icon layer/sprites for structures
- Building/loading/HP bars improved
- Proper alliance timer naming
- Logout button added
- Handle not spawned player fixes
- Multiple patterns support
- Fix: anonymized name isn't displayed in chat message (tryout33)
- Fix Leaderboard: show 0% instead of NaN when all terrain is nuked (tryout33)
- Some fixes to the new Radial menu (tryout33)
- Fix bug/performance improvements for trade ships (tryout33)
- News Notification Badge for new release notes (floriankilian)
- Translation improvements

🛠️ **Backend & Technical**

- Stats endpoints are now available
- Added CORS origin headers
- Added support for mobile apps native login
- Discord user and guild member caching
- Improved session error handling
- Changed server logging
- Improved data loading and fixed various bugs

🔒 **Security & Bug Fixes**

- Fixed naval attack spam exploit
- Fixed gold donation validation exploit
- Fixed pot issue
- Various stability improvements and bug fixes

🌐 **Translations**

- Bulgarian🇧🇬: Nikola123 & NewHappyRabbit
- Japanese🇯🇵: Aotumuri, daimyo_panda2 & gafunuko
- French🇫🇷: cldprv, gx21 & r3ms
- Dutch🇳🇱: cldprv & tryout33
- German🇩🇪: Pilkey, jacks0n, floriankilian, Fibig & Texxter
- Spanish🇪🇸: 6uzm4n
- Russian🇷🇺: Rulfam
- Ukrainian🇺🇦: Rulfam
- Polish🇵🇱: zibi, RinkyDinky & Rulfam
- Serbo-Croatian🇷🇸🇭🇷🇧🇦🇲🇪: Vekser
- Italian🇮🇹: frappa10 & Lollosean
- Brazilian Portuguese🇧🇷: theskeleton4393 & juliosilvaqwerty5
- Turkish🇹🇷: Toyatak
- Arabic🇸🇦: N0ur, Moha & SyntaxPM
- Swedish🇸🇪: Moha, theangel2 & Keevee
- Hindi🇮🇳: sheikh
- Bengali🇧🇩: sheikh
- Esperanto: r3ms
- Toki Pona: Makonede
- Slovak🇸🇰: extraextra
- Czech🇨🇿: Xaelor & erinthegirl
- Hebrew🇮🇱: Goblinon
- Finnish🇫🇮: Tanepro193
- Korean🇰🇷: Jinyoon
- Danish🇩🇰: NiclasWK
- Chinese Simplified🇨🇳: Moki
- Galician: toldinsound

## What's Changed

- Bugfix: don't allow other players to move warships by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/879
- Proper alliance timer naming by @tnhnblgl in https://github.com/openfrontio/OpenFrontIO/pull/886
- Add naval combat animations by @DevelopingTom in https://github.com/openfrontio/OpenFrontIO/pull/858
- Use array index access instead of .at by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/889
- mls by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/888
- Revert "add addinplay ads" by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/897
- Fix Toki Pona by @Duwibi in https://github.com/openfrontio/OpenFrontIO/pull/898
- remove player id from Schemas, fix archive bug by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/907
- Unit menu by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/867
- Convert stats to bigints by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/909
- Flag fixes for Europe map and for Brittany in flag menu and Gateway To the Atlantic map by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/910
- Add deploy concurrency configuration by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/911
- Add Github Logo on footer by @LucasLion in https://github.com/openfrontio/OpenFrontIO/pull/875
- Revert "Population visualization (#842)" by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/908
- floor by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/913
- remove known world by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/914
- Main menu UI cleanup by @Demonessica in https://github.com/openfrontio/OpenFrontIO/pull/857
- Improve territory drawing performances by @DevelopingTom in https://github.com/openfrontio/OpenFrontIO/pull/696
- bug: Clicking out of bounds throws uncaught exception by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/920
- Removes CSS rule causing performance issues by @1brucben in https://github.com/openfrontio/OpenFrontIO/pull/925
- Always delete tradeship on pathfinding fail by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/921
- Fix bigint serialization error by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/916
- Revert tradeship path caching by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/927
- Meta Adjustments from [UN] clan test by @1brucben in https://github.com/openfrontio/OpenFrontIO/pull/932
- fix alternate view regression by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/937
- fix warship targeting range by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/938
- Add instructional overlay message during spawn phase by @spicydll in https://github.com/openfrontio/OpenFrontIO/pull/934
- Add test coverage script by @aqw42 in https://github.com/openfrontio/OpenFrontIO/pull/929
- Added two checkboxes to the default pull request template by @aqw42 in https://github.com/openfrontio/OpenFrontIO/pull/930
- Fix slow singleplayer timer by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/943
- improved performance of PseudoRandom by @falcolnic in https://github.com/openfrontio/OpenFrontIO/pull/933
- Change deploy concurrency group by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/944
- Set singleplayer gitCommit in the client by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/945
- Simplify bots retaliation logic by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/946
- Add close label by @drillskibo in https://github.com/openfrontio/OpenFrontIO/pull/949
- Remove ClientID from GameRenderer by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/878
- Resolve code scanning warning about HTML injection by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/953
- Fix invalid username popup being behind public game button by @Demonessica in https://github.com/openfrontio/OpenFrontIO/pull/951
- Server role lookup by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/954
- Flag fixes in several maps by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/957
- Fix map jsons by @Duwibi in https://github.com/openfrontio/OpenFrontIO/pull/960
- change defaults to reflect meta by @1brucben in https://github.com/openfrontio/OpenFrontIO/pull/942
- Even more flag flair by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/959
- Only load tiles when viewed by player by @1brucben in https://github.com/openfrontio/OpenFrontIO/pull/887
- Hide login button by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/965
- Fix discord user schema by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/969
- Balance Adjustment for Attack Mechanism by @1brucben in https://github.com/openfrontio/OpenFrontIO/pull/973
- Prevent Attack Spam by @1brucben in https://github.com/openfrontio/OpenFrontIO/pull/977
- Update HeadsUpMessage.ts to support translations by @spicydll in https://github.com/openfrontio/OpenFrontIO/pull/981
- Cap lobby sizes at 150 by @Duwibi in https://github.com/openfrontio/OpenFrontIO/pull/984
- Fix Translations showing as untranslated keys by @Duwibi in https://github.com/openfrontio/OpenFrontIO/pull/983
- Another Balance Change by @1brucben in https://github.com/openfrontio/OpenFrontIO/pull/987
- make bots weaker by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/985
- Remove shield icon from bots by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/986
- Balance Update by @1brucben in https://github.com/openfrontio/OpenFrontIO/pull/996
- Revert meta by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1002
- Fix text overflow in instructions for longer translations by @ERHash in https://github.com/openfrontio/OpenFrontIO/pull/971
- Add dynamic sorting to leaderboard by tiles, gold, and troops by @ERHash in https://github.com/openfrontio/OpenFrontIO/pull/961
- Fix Player Name Monospaced Text Overflow on PlayerInfo by @ERHash in https://github.com/openfrontio/OpenFrontIO/pull/975
- Scroll bar Behavior on Chromium Browsers, c-modal_content by @andrewNiziolek in https://github.com/openfrontio/OpenFrontIO/pull/976
- Synced the single player and host files together, and fix issue withc… by @shaan150 in https://github.com/openfrontio/OpenFrontIO/pull/991
- Equalize team sizes by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/992
- Added support for dark mode icons for Alliance Request Icon and Embargo Icon by @Vermylion in https://github.com/openfrontio/OpenFrontIO/pull/993
- Use bigint for gold by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1000
- Fix : Donation when max pop already reached by @aqw42 in https://github.com/openfrontio/OpenFrontIO/pull/904
- Validate incoming API data with zod by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/891
- this is a fix for the "possibly null" error. doesn't seem to cause runtime issues but does cause the compiler to throw an error by @Jerryslang in https://github.com/openfrontio/OpenFrontIO/pull/1005
- Fixnukeboatbug by @rldtech in https://github.com/openfrontio/OpenFrontIO/pull/1011
- added ratio controls by @falcolnic in https://github.com/openfrontio/OpenFrontIO/pull/963
- Add a status check for the milestone field by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1029
- Fix discord login issue by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1028
- Changed consolex to console logging by @falcolnic in https://github.com/openfrontio/OpenFrontIO/pull/1036
- Center map on start by @Demonessica in https://github.com/openfrontio/OpenFrontIO/pull/1013
- Rev: Update "Japan and Neighbors" map to "East Asia" by @andrewNiziolek in https://github.com/openfrontio/OpenFrontIO/pull/1007
- Close socket on ClientMessageSchema, improve zod error by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1003
- SAMs should target only nukes aimed at nearby targets by @DevelopingTom in https://github.com/openfrontio/OpenFrontIO/pull/1038
- AI nukes avoid SAM launchers by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1045
- Show alliances on the PlayerPanel by @Maaxion in https://github.com/openfrontio/OpenFrontIO/pull/1053
- Improve readability of alliance acceptation logic for bots and add tests by @Nephty in https://github.com/openfrontio/OpenFrontIO/pull/1049
- [Cleanup] Pass Player into execution constructor instead of PlayerID by @LJoyL in https://github.com/openfrontio/OpenFrontIO/pull/1022
- Monitoring client connections by @aqw42 in https://github.com/openfrontio/OpenFrontIO/pull/941
- have master create tunnels for all workers #780 by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1042
- Add Boat hotkey by @tnhnblgl in https://github.com/openfrontio/OpenFrontIO/pull/1060
- bug: logout by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1073
- fix cloudflare tunnels by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1076
- Duo partner SP always same: randomize players before team assignment by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1051
- Multi-level radial menu by @oleksandr-shysh in https://github.com/openfrontio/OpenFrontIO/pull/1018
- Fix broken flag images by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1078
- kick existing client when duplicate persistent id is found by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1077
- Update PlayerImpl.ts by @E-EE-E in https://github.com/openfrontio/OpenFrontIO/pull/1079
- Add back #646 - trade ship gold by travelled distance by @Maaxion in https://github.com/openfrontio/OpenFrontIO/pull/1085
- #1086 prevent clicking on other structures than your own by @Maaxion in https://github.com/openfrontio/OpenFrontIO/pull/1087
- rename Event interface -> GameEvent by @Maaxion in https://github.com/openfrontio/OpenFrontIO/pull/1094
- refactor radial, fix boat on terra nullius not working fixes by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1095
- Disable donations public ffa matches by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1097
- Nations can spawn cities without a port by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1072
- Ci coverage by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1099
- Revert "Ci coverage" by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1101
- Add filters tabs to EvensDisplay to let users filter events by @Maaxion in https://github.com/openfrontio/OpenFrontIO/pull/1080
- Fix bug in FakeHumanExecution by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1102
- Fix: Hide username validation error in-game by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1110
- cloudflare fixed tunnel name by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1096
- Remove duplicate gold accumulation in team stats calculation by @rldtech in https://github.com/openfrontio/OpenFrontIO/pull/1010
- Optimizations for botbehaviour by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1114
- fix: correct mac modifier and emoji key detection in input handler by @Ble4Ch in https://github.com/openfrontio/OpenFrontIO/pull/1118
- fix duplicate websocket handler by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1124
- Adding unit info modal translation support. by @its-sii in https://github.com/openfrontio/OpenFrontIO/pull/1122
- increase nuke speed from 4 to 6 by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1125
- Avoid using as to cast values by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1115
- Fix Māori flag name by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1133
- use newer attack, delete existing attack by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1134
- counter attack doesn't cancel out attack by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1132
- Move version and changelog to files by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1109
- Fix non valid SafeString flag codes by @ghisloufou in https://github.com/openfrontio/OpenFrontIO/pull/1135
- Add a Replay speed control feature by @ghisloufou in https://github.com/openfrontio/OpenFrontIO/pull/1106
- Add progress bars to show loading time and healthbars by @jrouillard in https://github.com/openfrontio/OpenFrontIO/pull/1107
- feat: assign unique colors for players by @Ble4Ch in https://github.com/openfrontio/OpenFrontIO/pull/1063
- lazy loading and current data var by @falcolnic in https://github.com/openfrontio/OpenFrontIO/pull/988
- fix(client): use the right language-modal selector by @ghisloufou in https://github.com/openfrontio/OpenFrontIO/pull/1136
- Simple Upgradable Structures (Cities, Ports, SAMs and Silos) by @Egraveline in https://github.com/openfrontio/OpenFrontIO/pull/1012
- Rename Replay speed to Game speed in Singleplayer by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1145
- discriminatedUnion by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1130
- Fixed bad translation string bug for unit info modal. by @its-sii in https://github.com/openfrontio/OpenFrontIO/pull/1143
  - fix timer overflow by @DiesselOne in https://github.com/openfrontio/OpenFrontIO/pull/1148
  - optimize leaderboard by @DiesselOne in https://github.com/openfrontio/OpenFrontIO/pull/1151
- Fix regression cooldown bars by @jrouillard in https://github.com/openfrontio/OpenFrontIO/pull/1154
- favor transport ships, no reload penalty by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1153
- dynamic radial menu build options by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1152
- Update building images and adjust border/territory radii for unit configuration by @rldtech in https://github.com/openfrontio/OpenFrontIO/pull/1037
- Fixed quick chat text injection by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/1144
- Rework leaderboard and team stats by @DiesselOne in https://github.com/openfrontio/OpenFrontIO/pull/1164
- Extend token lifetime to 3 days by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1172
- Redraw stacked buildings sprites by @jrouillard in https://github.com/openfrontio/OpenFrontIO/pull/1170
- Fix Nations building more than allowed by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1176
- Set a targetable status for nukes by @jrouillard in https://github.com/openfrontio/OpenFrontIO/pull/1174
- fixed giantworldmap key by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/1188
- Fix Leaderboard: convert NaN into 0% by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1190
- Update pr-description regex by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1181
- discriminatedUnion by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1193
- UsernameSchema, FlagSchema by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1185
- feat: colors are better mixed up when players count is low by @Ble4Ch in https://github.com/openfrontio/OpenFrontIO/pull/1149
- Improve handling of HTTP 401 by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1194
- increase worker connections by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1179
- Fix: Handle not spawned player focus by @tnhnblgl in https://github.com/openfrontio/OpenFrontIO/pull/1186
- Fix Radial menu undefined params error during spawn phase by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1192
- Better handling of bad tokens by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1180
- Hash-based routing by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1198
- cache busting: Import version, changelog by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1201
- REV - Improved Username Censoring by @andrewNiziolek in https://github.com/openfrontio/OpenFrontIO/pull/1119
- Jest v30 by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1206
- Release workflow by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1202
- Fix unnecessary join check by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1209
- fix websocket error by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1208
- add playwire ads by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1128
- Update webpack-dev-server to 5.2.2 by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1207
- Add a 30 minute timeout to actions by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1210
- Update release workflow by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1212
  - update leaderboard align by @DiesselOne in https://github.com/openfrontio/OpenFrontIO/pull/1189
- Fix gutter ads, move in-game add to bottom right corner. by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1214
- have worker send error back to client by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1178
- Fix build menu on water tile by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1216
- Update default version number by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1218
- Schema cleanup by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1219
- ads on death screen by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1223
- Delay win modal by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1224
- Dependency removals and updates by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1215
- add spawn ads by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1228
- upgrade to zod 4 by @omrih4 in https://github.com/openfrontio/OpenFrontIO/pull/1161
- Record MIRV warhead intercepted stats, perf improvements by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1220
- Simplfiy LangSelector by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1226
- Pot issue fix by @tnhnblgl in https://github.com/openfrontio/OpenFrontIO/pull/1233
- Logout Button Fix by @tnhnblgl in https://github.com/openfrontio/OpenFrontIO/pull/1234
- fix bad tile crash by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1237
- fix is valid ref by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1240
- Remove babel-jest from devDependencies by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1247
- Refactor radial menu by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1246
- Simplify ClientMessage handling by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1235
- Add trains by @DevelopingTom in https://github.com/openfrontio/OpenFrontIO/pull/1159
- Add back the trade ship send stat by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1253
- Remove maxTokenAge by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1255
- Patterned territory by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/786
- Discounts can only be used one time by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/892
- Fix singleplayer check by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1260
- Move maps generation out of repo, new map structure by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1256
- Show a red alert frame when the player is betrayed by @devalnor in https://github.com/openfrontio/OpenFrontIO/pull/1195
- Allow boat discount based on number of units owned by @devalnor in https://github.com/openfrontio/OpenFrontIO/pull/1261
- Move map metadata to map manifest by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1262
- Refactor cosmetics.json by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1263
- bug: StatsSchema zod validation error by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1267
- White Rabbit pattern by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1264
- Cleanup log spam in TerritoryPatternsModal by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1269
- Fix pattern locking logic by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1270
- Keybind Ground Attack by @dengh in https://github.com/openfrontio/OpenFrontIO/pull/1258
- UrlEncode patterns in cosmetics.json by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1273
- improve astar perf by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1268
- Log public id by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1278
- clarify license by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1277
- Fix sam targeting everything by @jrouillard in https://github.com/openfrontio/OpenFrontIO/pull/1280
- Add Creative Commons License to resources/non-commercial by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1284
- Sword pattern by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1283
- Display OFM25 ad in WinModal by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1281
- QR code pattern by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1288
- custom flag (1) by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/1257
- Allow railroad loops by @DevelopingTom in https://github.com/openfrontio/OpenFrontIO/pull/1274
- patterns by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1290
- Split build & deploy scripts by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1239
- New icons by @jrouillard in https://github.com/openfrontio/OpenFrontIO/pull/1287
- Add GitHub deployment support by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1291
- bug: Fix version number and changelog by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1293
- Revert "counter attack doesn't cancel out attack (#1132)" by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1301
- Graceful handling of ping before join by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1295
- refactor cosmetics out of PlayerInfo by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1299
- Remove unused MON\_\* credentials by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1304
- Add new patterns by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1294
- Fix error-modal filling up the whole screen by @fraxxio in https://github.com/openfrontio/OpenFrontIO/pull/1298
- Reapply "enable otel logs and metrics for staging environments" by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1310
- Separate prod release environments by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1311
- Change news title to release notes by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1312
- Add localization support for leaderboard and team-related UI elements by @TomaszOleszko in https://github.com/openfrontio/OpenFrontIO/pull/1308
- Better In Game UI by @DiesselOne in https://github.com/openfrontio/OpenFrontIO/pull/1243
- w-320 by @PilkeySEK in https://github.com/openfrontio/OpenFrontIO/pull/1316
- Patterns by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1318
- Show structure levels by @jrouillard in https://github.com/openfrontio/OpenFrontIO/pull/1305
- fix alliance expired message by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1323
- Mark train stations and factories as experimental by @DevelopingTom in https://github.com/openfrontio/OpenFrontIO/pull/1309
- allow alliance extension Fixes #491 by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1314
- Additional patterns and subclass creation by @Sgt-lewis in https://github.com/openfrontio/OpenFrontIO/pull/1327
- fix healthbars not being removed by @jrouillard in https://github.com/openfrontio/OpenFrontIO/pull/1329
- lighten pattern by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1326
- custom flag (2) by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/1303
- Make patterns puchasable with stripe by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1313
- Improve icons readability by @jrouillard in https://github.com/openfrontio/OpenFrontIO/pull/1321
- remove select on hover by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1330
- Fix role lookup by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1335
- Extend winner schema by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1333
- mls 4.0 by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/1336
- upgrade unit when building a unit of same type by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1328
- remove unit menu by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1338
- unit upgrade minor improvements by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1337
- Add gold fx when a tradeship lands by @DevelopingTom in https://github.com/openfrontio/OpenFrontIO/pull/1322
- validate coords in construction execution by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1339
- fix pattern and role bugs by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1343
- Disable trains in public games by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1342
- Add levels on structure sprites by @jrouillard in https://github.com/openfrontio/OpenFrontIO/pull/1346
- Automatic train stations by @DevelopingTom in https://github.com/openfrontio/OpenFrontIO/pull/1353
- Quads by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1347
- Quads fix by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1356
- Revert "enable otel logs and metrics for staging environments" by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1358
- alliance renewal: fix request to renew when ally is dead, fix translation keys by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1359
- Add new icon shapes and filter for filtering icons on the layer by @jrouillard in https://github.com/openfrontio/OpenFrontIO/pull/1348
- upgrades not counting towards building discount bugfix by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1361
- Add strait of Gibraltar and Italia maps by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1363
- Radial menu: remove player info sub-radial by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1362
- move unit display to bottom of screen by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1365
- Move settings to it's own modal by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1366
- update ui by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1368
- Add localization support for game events, settings, and UI text elements by @TomaszOleszko in https://github.com/openfrontio/OpenFrontIO/pull/1372
- Validate incoming parameters by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1371
- Add domain, subdomain to GameRecord by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1370
- bugfix: Crash during replay by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1375
- fix top bar small screens by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1377
- add domain and subdomain for dev env by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1379
- fix pop delta number in TopBar by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1373
- Add expand ratio to bot behavior class by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1376
- bugfix: Crash by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1381
- Don't erase patterns on page load by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1383
- Require login to connect to staging by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1360
- feat(news-button): highlight button when new version is available by @floriankilian in https://github.com/openfrontio/OpenFrontIO/pull/1385
- Fix local development by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1388
- fixed Custom Flags via Path Traversal by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/1384
- fix odd dimension maps by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1389
- Improve unit updates & reloading by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1394
- update meta by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1397
- port execution bugfixes by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1400
- Internationalization: Add i18n support for login/auth messages in main by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/1406
- Update README.md by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1407
- Redraw existing railroads when redrawing the complete layer by @DevelopingTom in https://github.com/openfrontio/OpenFrontIO/pull/1410
- Unit count by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1402
- fix color allocator not selecting distinct colors by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1404
- mls (v4.1) by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/1357
- remove levels player overview panel by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1414
- Remove top bar & revert control panel by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1415
- move player overview higher up by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1418
- have mirv attack enemy units by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1419
- fix team bar by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1422
- fix team bar by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1425
- Leaderboard improvements by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1424
- radial menu attack self bugfix by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1426
- remove radial animation, fix back button by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1427
- Factory spawns trains by @DevelopingTom in https://github.com/openfrontio/OpenFrontIO/pull/1408
- Followup: news-button: blue-glow; simpler localStorage by @floriankilian in https://github.com/openfrontio/OpenFrontIO/pull/1431
- fix unit upgrade not considering cost by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1434
- Enable @typescript eslint/prefer nullish coalescing eslint rule by @g-santos-m in https://github.com/openfrontio/OpenFrontIO/pull/1420
- Eslint by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/998
- Restore nation AI by @scottanderson in https://github.com/openfrontio/OpenFrontIO/pull/1440
- fix number of land tiles fixes #1409 by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1445
- Have radial menu refresh when open by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1437
- make radial menu thicker by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1446
- Fix: anonymized name isn't used in chat message by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1265
- Revert MIRV attacks enemy units by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1452
- Tradeship performance by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1448
- Fix: "Game speed" not "Replay speed" during Single player game by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1457
- Update asset license by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1458
- Fix: attack on ally even with greyed out button by @VariableVince in https://github.com/openfrontio/OpenFrontIO/pull/1460
- Create CLA.md by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1462
- update pr template to have CLA checkbox. by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1465
- Increase trade ship spawn rate by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1455
- Increase traitor punishment by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1456
- fix team leaderboard margin by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1469
- leaderboard bugfix: show by default for medium to large screens. by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1470
- fix control panel & events display scaling on mobile by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1471
- alert on ws 1002 error by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1472
- Fix Regex to allow Umlaute "üÜ" in username by @floriankilian in https://github.com/openfrontio/OpenFrontIO/pull/1466
- Have port destination likelihood scale with level by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1473
- remove spawn ad by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1482
- fix squad allocator color palette by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1483
- bug fix?: Hide UnitDisplay frame when all unit types are disabled by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/1392
- fix pop & gold not showing up on mobile UI by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1484
- meta: reduce port gold multiplier & trade ship frequency by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1486
- Fix language code mismatch during language switching by @Aotumuri in https://github.com/openfrontio/OpenFrontIO/pull/1416
- Add close button to emoji table by @DevelopingTom in https://github.com/openfrontio/OpenFrontIO/pull/1479
- increase MIRV to 35M by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1487
- increase player panel z index so it is on top of spawn timer by @evanpelle in https://github.com/openfrontio/OpenFrontIO/pull/1488

## New Contributors

- @LucasLion made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/875
- @spicydll made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/934
- @falcolnic made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/933
- @drillskibo made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/949
- @ERHash made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/971
- @andrewNiziolek made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/976
- @shaan150 made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/991
- @Vermylion made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/993
- @Jerryslang made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1005
- @rldtech made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1011
- @Maaxion made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1053
- @Nephty made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1049
- @LJoyL made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1022
- @oleksandr-shysh made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1018
- @E-EE-E made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1079
- @Ble4Ch made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1118
- @its-sii made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1122
- @ghisloufou made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1135
- @Egraveline made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1012
- @omrih4 made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1161
- @devalnor made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1195
- @dengh made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1258
- @fraxxio made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1298
- @TomaszOleszko made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1308
- @Sgt-lewis made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1327
- @floriankilian made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1385
- @g-santos-m made their first contribution in https://github.com/openfrontio/OpenFrontIO/pull/1420

**Full Changelog**: https://github.com/openfrontio/OpenFrontIO/compare/v0.23.19...v0.24.0
