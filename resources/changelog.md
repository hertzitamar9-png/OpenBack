# OpenBack v0.32.9-openback.16

**Created by frootz jhklphy**

## Unified branding and cleanup

- Replaced the final hexagonal badge in the public preview artwork with the circular OpenBack OB emblem.
- Unified the favicon, installable-app icons, structured-data logo, navigation mark, and social preview around the same circular identity.
- Removed obsolete Discord, Wiki, upstream API, tutorial, repository-owner, and legacy app-icon leftovers that were not required by the game or its licenses.
- Removed product-facing upstream promotion while preserving required AGPL source access, license notices, asset credits, and contributor attribution.
- Updated crash reports to use a neutral bug-report instruction instead of directing players to Discord.

---

# OpenBack v0.32.9-openback.15

**Created by frootz jhklphy**

## Brand and release identity

- Replaced the old badge with a circular OB emblem across the game and installable app.
- Simplified the navigation logo to the OB emblem and OPENBACK wordmark only.
- Removed the visible build number, tiny subtitle, alpha labels, and optional third-party community promotions.
- Added a complete OpenBack release history so each major iteration is documented in the in-game Release Notes page.
- Kept the required license, corresponding-source link, copyright notice, and contributor attribution.

---

# OpenBack v0.32.9-openback.14

**Created by frootz jhklphy**

## Search and public identity

- Added a branded social preview, circular search icon, canonical URLs, sitemap, and crawler metadata.
- Added searchable tutorials, development articles, strategy guides, and a 120-term territorial strategy glossary.
- Improved OpenBack naming across search metadata and removed alpha positioning from every supported language.
- Added Google site verification and corrected public HTTPS URLs behind the hosted service.

---

# OpenBack v0.32.9-openback.13

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

# OpenBack v0.32.9-openback.12

**Created by frootz jhklphy**

## Large-match performance

- Reduced simulation and rendering work for inactive units, off-screen effects, stale trajectories, labels, and previews.
- Kept full visual quality while scaling expensive work to the current game state and visible action.
- Reduced bot-match frame spikes and long-match memory pressure.
- Hid unrelated transport ships and old trajectories that the local player did not need to render.
- Kept high-refresh displays uncapped and improved HUD fitting on smaller widths.
- Synchronized displayed prices with the prices actually charged by the simulation.

---

# OpenBack v0.32.9-openback.11

**Created by frootz jhklphy**

## Ranked multiplayer

- Added self-contained ranked matchmaking for any number of waiting players.
- Matched each player with the closest available rating instead of leaving compatible players waiting indefinitely.
- Prevented ranked search from closing when the background is clicked.
- Added randomized maps, nations, bots, team layouts, gold settings, and optional modifiers.
- Fixed match assignment delivery and verified that multiple ranked pairs can launch at the same time.

---

# OpenBack v0.32.9-openback.10

**Created by frootz jhklphy**

## Military logistics trains

- Added camouflaged fuel trains between nearby Military Bases and Runways.
- Added military rail connections, animated locomotive smoke, missile-shaped train fronts, and visible cargo movement.
- Made completed fuel deliveries award a reduced logistics income compared with civilian rail trade.
- Limited military train rendering and route updates to active, relevant routes to protect performance.

---

# OpenBack v0.32.9-openback.9

**Created by frootz jhklphy**

## Vehicle effects and placement

- Added the same green snapped placement feedback used by established structures.
- Fixed stale and flickering white/gray aircraft and tank placement cursors.
- Added source-only range previews that appear when hovering a valid Runway or Military Base.
- Improved aircraft launch smoke, crash fire, tank muzzle flash, round fireball, self-destruction, and explosion effects.
- Differentiated aircraft and tank destination markers and trajectory animations.
- Removed excessive wreck debris while keeping localized crash fire and smoke.

---

# OpenBack v0.32.9-openback.8

**Created by frootz jhklphy**

## Aircraft beachheads and destruction

- Made aircraft crash into their destination, create a blast, and automatically deploy surviving troops.
- Added a short protected landing window so the new beachhead cannot be annexed instantly.
- Required combat to clear protected aircraft landing territory.
- Added MANPAD interceptions that destroy the aircraft, carried troops, and intercepting launcher together.
- Improved aircraft heading, turning, speed, trajectory visibility, impact effects, and crater capture.
- Added tank turret elevation, visible projectile travel, impact fire, and a complete self-destruction sequence.

---

# OpenBack v0.32.9-openback.7

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

# OpenBack v0.32.9-openback.6

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

# OpenBack v0.32.9-openback.5

**Created by frootz jhklphy**

## Aircraft refinement

- Made parked Aircraft visible on their Runway after construction finishes.
- Added a loading state before Aircraft become ready to launch.
- Made aircraft face their live travel direction and follow a clear red dashed trajectory.
- Reduced the on-map aircraft size, sharpened its silhouette, strengthened black outlines, and removed unwanted transparency.
- Added Runway stacking with familiar structure snapping and expanding deployment range.
- Reduced the Aircraft price from 2M to 1M and corrected later affordability and displayed-price mismatches.

---

# OpenBack v0.32.9-openback.4

**Created by frootz jhklphy**

## Aircraft, Runways, and MANPADs

- Added Runways, Aircraft, and MANPAD launchers as complete buildable units.
- Added build-menu entries, keyboard shortcuts, placement rules, custom atlas art, sounds, and visible defense ranges.
- Aircraft carry the exact selected troop amount and deploy survivors at the crash site.
- MANPADs defend a wider area than a Defense Post and intercept hostile aircraft.
- Added aircraft blast damage, fallout-style landing ground, launch warnings, and public trajectory visibility.
- Added initial Runway, Aircraft, and MANPAD pricing with progressive structure costs.

---

# OpenBack v0.32.9-openback.3

**Created by frootz jhklphy**

## Accounts, profiles, and clans

- Replaced the previous external login dependency with self-contained email-code and Google authentication.
- Added transactional email delivery, secure signed sessions, recovery flows, and six-box verification-code entry.
- Added persistent profiles, custom player names, flags, skins, banners, currency, and profile editing.
- Added persistent clans with tags, ownership, membership, and worldwide joining.
- Made login optional and kept the main game available until a player chooses to sign in.
- Replaced browser confirmation popups with in-game dialogs and explicit buttons.

---

# OpenBack v0.32.9-openback.2

**Created by frootz jhklphy**

## Internet multiplayer

- Added public hosted multiplayer using the authoritative game server and deterministic turn relay.
- Added lobby IDs, Join Multiplayer entry, and shareable game URLs that connect invited players automatically.
- Added copyable invite URLs and visible game IDs after the lobby is ready.
- Added production WebSocket, hosted-port, authentication-origin, and multiplayer smoke-test support.
- Removed duplicate multiplayer choices and clarified Solo, Host, Join, and Ranked flows.

---

# OpenBack v0.32.9-openback.1

**Created by frootz jhklphy**

## First OpenBack release

- Established OpenBack as its own territorial strategy game identity.
- Added the original OpenBack name, logo system, hosted game service, and private repository workflow.
- Preserved the complete deterministic simulation, maps, nations, economy, diplomacy, structures, ships, railroads, and weapons used by the game.
- Removed optional third-party advertising and analytics startup scripts.
- Preserved the required AGPL license, corresponding source availability, copyright notices, asset licenses, and contributor credits.
