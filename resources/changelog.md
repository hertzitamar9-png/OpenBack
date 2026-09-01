## OpenBack v0.36.275 - Clear Edges, Clear Signals

- Mobile water now breaks its moving shine into much smaller, softly connected shapes instead of broad block-like patches.
- Every gameplay control now clears phone notches and rounded corners with a real safe gutter, even when an Android browser reports no inset. The battlefield still fills the screen; only the upper controls, player panel, floating messages, and bottom build bar move into the usable area.
- Informational game messages can be swiped away. Game Settings now offers one master notification switch plus Combat and requests, Bombs and missiles, Alliances, Donations, Chat and emojis, and World events. Accept-or-reject prompts always remain visible.
- Missile Silos and SAM Launchers keep their familiar structure markers. What they fire is now unmistakable: Immersive 3D draws nuclear weapons and intercepting SAM missiles as distinct flying rockets with connected ignition and exhaust, with the SAM smaller than the bombs; Classic 2D keeps its existing projectile sprites.
- Keeping play open after a win now triggers only the sun detonation animation in Immersive 3D. The plaster banner and explosion text are gone everywhere, and Classic 2D does not run the sky blast.
- Private invite lobbies now survive a host briefly backgrounding or leaving the app to share the link. Friends can still join during a five-minute reconnection window, the same host cancels cleanup by returning, and only an abandoned lobby is removed after the grace period.

Created by **frootz jhklphy**.

## OpenBack v0.36.274 - Profile Opens Your Account

- Pressing your name and picture opens your account page, with the account, stats, games and friends tabs. It opened the small shortcut menu before, and the last release sent it to the public profile view instead, which is not what the button means. The little arrow beside your picture still opens the shortcut menu.
- The Profile button in the menu bar, next to Clans, opens the same page.

Created by **frootz jhklphy**.

## OpenBack v0.36.273 - One Marker, Clean Water

- Stacked structures in Immersive 3D keep their level number attached to the same raised-terrain marker, matching the single icon-and-count presentation players already see in Classic 2D.
- Tapping an already selected build unit now clears its battlefield highlight together with placement mode. The matching structures stay highlighted only while that unit remains selected.
- Mobile water no longer carries large moving square patches. Classic 2D and Immersive 3D now bend and rotate the moving shine field into smooth organic water without adding another expensive noise layer.

Created by **frootz jhklphy**.

## OpenBack v0.36.272 - Field Training at Hand

- Tutorial now has a permanent place in the upper navigation and a matching question-mark control during a match, so 2D and 3D guidance stays within reach before and during play.
- A player's first visit now pauses at one clear choice: open Tutorial or skip it. Opening it offers separate Classic 2D and Immersive 3D field training, with five short steps for each view and Skip available throughout. Completing or skipping remembers the choice on that device, while the Tutorial button remains available whenever it is needed again.

Created by **frootz jhklphy**.

## OpenBack v0.36.271 - An Email Column

- The owner dashboard gives the email address its own column in the player table, beside the name rather than tucked underneath it. Players who never signed up read as Guest there, and every row still shows its id under the name.

Created by **frootz jhklphy**.

## OpenBack v0.36.270 - Your Record, and a Way to See It

- Your stats now count the games you played. Only ranked games ever reached the stats panel, so the All view had nothing to read and showed no games, no victories and no losses however much you had played. Every game you finish is counted now, and the win rate with it. The per-game averages underneath still need their own work.
- There is a Profile button in the menu bar, next to Clans, and pressing your picture opens your profile. The picture only opened the account menu before, and there was no way to reach your own profile at all. The little arrow beside your picture still opens the menu.
- Games now record the difficulty they were played at, so the stats can be broken down by it.

Created by **frootz jhklphy**.

## OpenBack v0.36.269 - A Bar That Fits, and a Guest List That Ends

- The build bar now measures the part of the screen you can actually see. Android hides its navigation bar for a fullscreen game and slides it back over the page on a swipe, which the game was not told about, so the bottom row of buttons sat underneath it. On a narrow phone the buttons also spread into one fewer row than before, which leaves more of the map visible.
- Accounts given to people who only opened the site are now forgotten after an hour. Everyone gets one so the game has someone to talk to, and they were kept forever; the owner dashboard listed dozens of them beside real players. Anything a person actually did -- a game, a name, a flag, a sign-up -- keeps their account.
- Sign-ups are shown on the owner dashboard by the address they signed up with.

Created by **frootz jhklphy**.

## OpenBack v0.36.268 - Who Actually Played

- The owner dashboard no longer lists everyone who merely opened the site as a player. Every visitor is given an account so the game can talk to them, so a search engine, a private window, or a second browser each added a row; of the accounts on the server, three had signed up and six had ever played. The rest are still counted, behind a button, because how many people looked is worth knowing.
- A name the game invents for a player who has none is no longer filed on their account as if they had chosen it. The invented name is kept in the browser, so several accounts ended up sharing one.

Created by **frootz jhklphy**.

## OpenBack v0.36.267 - A Calm Sea on a Phone

- The sea no longer crawls with square specks on a phone. Zoomed out to the whole map, a single screen pixel covers about twenty tiles, and the map was being drawn by picking one of those twenty at random; which one changed as the view drifted, so the water shimmered in blocks. Those tiles are now averaged together. A desktop, where a pixel covers less than one tile, is untouched and stays as sharp as before.
- Fixed the development server failing to start a page after the previous release.

Created by **frootz jhklphy**.

## OpenBack v0.36.266 - Every Map Accounted For

- Audited all 135 shipped maps and added a machine-readable provenance record with origin, creator, licence, generator, stable seed where applicable, and hashes tied to the shipped files.
- Recovered and reverse-searched the fifteen pictures used by the old fictional-map converter. They matched Reddit and DeviantArt artwork, a commercial Mappa Animalia print, Anima: Beyond Fantasy, Nintendo/Hyrule material, and other sources that did not grant OpenBack reuse rights.
- Replaced all fifteen affected coastlines with deterministic original OpenBack terrain while preserving map names, dimensions, categories, nation names, nation counts, and gameplay availability.
- Added tests that reject unverified maps, verify all map records and hashes, reproduce the procedural generator, and ensure committed terrain matches deterministic output.

Created by **frootz jhklphy**.

## OpenBack v0.36.265 - Credits That Match the Evidence

- Corrected the fictional-map credits: fifteen terrain silhouettes were extracted from temporary reference pictures, not generated from nothing, and their original source pages and licences were never recorded. They are now marked unverified instead of falsely described as wholly procedural.
- Separated inherited OpenFront assets, OpenBack's original shop artwork, individually licensed Wikimedia flags and 3D models, music, fonts, and map data so one blanket licence no longer misattributes everything in the resources folder.
- Documented that all 100 wrap skins and the other shop items marked as OpenBack artwork are original SVG work by OpenBack, while every imported Wikimedia flag keeps its own creator, source page, and licence.
- Removed fictional shop flags whose Wikimedia file pages no longer provide verifiable licence metadata. The importer now follows the currently licensed catalog instead of preserving a stale requirement that exactly 150 files must exist forever.
- Added automated credit checks so future shop imports and 3D-model changes cannot silently remove required attribution.

Created by **frootz jhklphy**.

## OpenBack v0.36.264 - Where the Maps Came From

- The credits now say plainly that OpenBack's fictional maps have procedurally generated coastlines rather than traced ones. The wording before suggested pictures had been copied from somewhere, which was not what happened and was unfair to the game.

Created by **frootz jhklphy**.

## OpenBack v0.36.263 - Credit Where It Is Due

- The background music is now credited to the person who made it. The asset licence claimed everything in the game's resources as OpenFront's work under Creative Commons, which meant OpenBack's own music was being offered to the world in OpenFront's name.
- The Overpass typeface is now credited to Red Hat under the Open Font Licence, as that licence asks of anyone who passes the files on.
- OpenBack states its licence, AGPL-3.0-or-later, in its package description as well as its licence file.

Created by **frootz jhklphy**.

## OpenBack v0.36.262 - One Address for the Whole Game

- OpenBack now answers at a single address. The tutorials and the blog were pages inside the app already, but their articles still had addresses of their own, so a search for the game came back with several entries for it. Those addresses now lead to the game itself, and opening an article changes what is on screen rather than where you are. Old links still work and still open the article they named.

Created by **frootz jhklphy**.

## OpenBack v0.36.261 - One Result for the Game

- A search for OpenBack now answers with the game, once. The tutorial and blog pages were each offered as their own result, so a search came back with several entries for the same game stacked together. They are still there to read and still followed for their links; they are no longer separate answers, and the sitemap no longer asks for them to be.

Created by **frootz jhklphy**.

## OpenBack v0.36.260 - The Score Ships With the Game

- The music now travels with the game itself instead of being kept on the server. Nothing about the recordings changed: they are stored split into pieces, because a three-hour track at full quality is larger than a single file is allowed to be, and are joined back into exactly the original bytes when the game is built.

Created by **frootz jhklphy**.

## OpenBack v0.36.259 - The Score, Uncompressed

- The music now plays at the quality it was made in, untouched. Both tracks are served straight from the game server rather than bundled into the app, because three hours of full-quality audio is far past the size a code repository accepts. Nothing about the recordings was changed.
- The updating screen shown while OpenBack is being deployed now tells search engines it is temporary. It used to answer as though it were the page itself, so a crawler arriving mid-update recorded a blank, nameless site in place of the real pages.

Created by **frootz jhklphy**.

## OpenBack v0.36.258 - Music, and a Dashboard That Tells the Truth

- OpenBack has its own music. "The War Machine" plays in 2D and "Tile by Tile" in 3D, three hours each, and neither stops when you die -- the score runs until the game itself is over. The tracks stream, so only the part you actually hear is downloaded.
- Your flag and crown now reach your account. Choosing one saved it in your browser and nowhere else, and the server was never told, so nothing outside that one device knew what you had picked. The dashboard showed no flag for anybody because nobody had ever sent one.
- The name you play under is now remembered on your account, so you are listed by it instead of by an internal code.
- The dashboard's player table fits an ordinary window on a desktop, and can be dragged sideways with a finger or the mouse instead of needing a scrollbar.
- Every page is titled OpenBack. The page's own subject moved into the description underneath, where a search result still shows it.

Created by **frootz jhklphy**.

## OpenBack v0.36.257 - Article Addresses That Exist

- A blog or tutorial address that does not exist is now refused instead of answered with the home page. Any mistyped or stale article link came back as a working page that claimed to be a copy of the home page, which invites search engines to index addresses the site does not have.

Created by **frootz jhklphy**.

## OpenBack v0.36.256 - Players Listed by Name

- The owner dashboard lists players by the name they play under instead of an internal code. It was showing the account's rename-flow name, which almost nobody sets, and falling back to a random id -- so the list read as though it were full of strangers. The name typed on the main menu is now used, taken from the most recent game it was recorded in.
- A player the server has no name for is now said to have none, rather than having an internal id presented as though it were their name. The id is shown separately and says whether the entry is a signed-up account or a guest.

Created by **frootz jhklphy**.

## OpenBack v0.36.255 - No Advertising, and Tables You Can Reach

- Removed the advertising code inherited from upstream: the gutter and rail units, the in-game break, the ad gatekeeper, and the third-party SDK hooks that went with them. None of it was ever loaded, and none of it is coming back.
- Wide tables can be scrolled sideways again. Styling the scrollbar set its width but never its height, and leaving one of the two out collapses every horizontal scrollbar to nothing, so on the owner dashboard the last columns of the player table could not be reached. The bar is drawn again, and the wheel now moves that table sideways for anyone on a mouse without a tilt wheel.
- Old addresses for the legal pages now lead to the current ones. /terms-of-service and /privacy-policy answered with the home page, which search engines read as the page not existing.

Created by **frootz jhklphy**.

## OpenBack v0.36.254 - Aim, Type, Hold

- Sending a boat no longer depends on how far the map is zoomed in. A tap now finds land within a fingertip of where it landed, so a distant or narrow coast can be invaded at any zoom, the way it always worked with a mouse. A boat still only ever goes to land you aimed at.
- On a phone, tapping the attack percentage next to the sword lets you type the exact figure you want, from 1 to 100. Press enter or tap anywhere else and it goes back to plain text, so nothing extra is on screen unless you are using it.
- Holding a finger down to inspect a player or offer an alliance is no longer sometimes taken as an attack. The hold was recognised by a timer that a busy moment could delay past the moment you lifted your finger, and the press then counted as a tap.
- The map no longer comes up blank the first time the installed app is opened. The canvas could be measured before the window had finished laying out and was then given no height, with nothing afterwards to correct it.

Created by **frootz jhklphy**.

## OpenBack v0.36.253 - Matching Seas and Boats That Need a Shore

- The ocean now looks the same on a phone as on a desktop. The moving glints were being trimmed to a maximum size that only ever affected phones, where they came out around 60% too thin, so the sea read differently there. Desktops are unchanged.
- Sending a boat to open water is now refused. Tapping empty ocean used to be accepted and the boat would sail to whichever coast happened to be nearest the tap, which could be most of a map away. A boat now needs somewhere it can actually land.

Created by **frootz jhklphy**.

## OpenBack v0.36.252 - Link Previews Show the Game

- Sharing an OpenBack link on Discord, Twitter or Facebook now shows the game's preview image. The address of that image was being given to those services as a site-relative path, which they cannot resolve, so shared links appeared as an empty card.

Created by **frootz jhklphy**.

## OpenBack v0.36.251 - Faster Fronts

- Multiplayer game and lobby traffic now uses OpenFront v0.33.12's binary protocol, sharply reducing bandwidth while keeping the authoritative simulation unchanged.
- Added optional Overtime: after its configured start, the territory required to win falls gradually so stalled wars reach a result. It can appear as a public FFA modifier.
- Fixed long and merged railway networks disconnecting stations and preventing trains from spawning.
- Inline pages now keep their scrolling inside the page while the Play screen retains OpenBack's fitted, non-scrolling layout.
- Generated asset URLs now tell search engines not to index them as separate pages, removing stale deSEC-labeled asset results while leaving the real OpenBack pages crawlable.
- Updated OpenBack to the published OpenFront v0.33.12 gameplay baseline while preserving OpenBack units, modes, mobile controls, accounts, social systems, maps, and 2D/3D experiences.

Created by **frootz jhklphy**.

## OpenBack v0.36.250 - Missing Files Are No Longer Answered

- The server used to answer a request for any file it did not have with the game itself, which meant made-up download links such as openback.dedyn.io/setup.exe came back as though the file really was there. Google flagged the site for hosting harmful downloads on that basis, which makes Chrome warn players before they reach the game. Requests for files that do not exist are now properly refused, and every real page and address is unaffected.

Created by **frootz jhklphy**.

## OpenBack v0.36.249 - Named OpenBack in Search Results

- Google was showing the game's web address above its search results instead of OpenBack. The previous release listed that address as a permitted fallback name for the site, intending to stop results being credited to the DNS provider; the address is a name Google may choose to display, so it displayed it. Only OpenBack is offered as a name now, while everything that ties the address to the site is unchanged.

Created by **frootz jhklphy**.

## OpenBack v0.36.248 - Precise Mobile Command

- Rebuilt mobile touch handling so taps, holds, drags, and two-finger gestures are mutually exclusive. Closing an alliance or player menu can no longer trigger an accidental attack.
- Transport ships now use the exact land tile touched by the player. Water taps are rejected and nearby islands can no longer redirect ships across the world.
- Every build cancellation now clears the selected unit, description, transparent models, range and trajectory overlays, and pending placement state together while supported successful builds remain ready for repeat placement.
- Made portrait and landscape HUDs adapt to usable screen space and safe areas across phone sizes. Build units stay reachable, player counters balance automatically, and global controls remain visible while inspecting another country.
- Expanded the private owner analytics dashboard with account identity, selected flag, approximate country, clans, cosmetics, detailed playtime, maps, modes, and 2D/3D usage without storing IP addresses or exposing private fields to players.

Created by **frootz jhklphy**.

## OpenBack v0.36.247 - Correct Search Identity

- Strengthened the homepage site-name metadata so Google receives OpenBack as the preferred name and `openback.dedyn.io` as the final domain fallback instead of inheriting the deSEC dynamic-DNS provider label.
- Kept the page title, application name, web manifest, Open Graph site name, organization, game identity, logo, and visible homepage branding consistently named OpenBack.

Created by **frootz jhklphy**.

## OpenBack v0.36.246 - Live Player Insights

- Every account now keeps a durable last-online timestamp. Public profiles, friend and pending-request rows, and clan member and join-request lists show either Online now or a localized last-online time.
- Added a private owner-only OpenBack Analytics dashboard with live online players, registered players, completed games, combined playtime, active and new-player windows, returning-player counts, average session length, and searchable per-player engagement.
- The dashboard breaks usage down by game mode, public/private/solo game type, and Classic 2D versus Immersive 3D so future gameplay updates can be based on real player behavior.
- Dashboard figures are rebuilt from authoritative persisted accounts and completed match records, exclude the owner account, refresh automatically while visible, and never expose player emails or authentication data.

Created by **frootz jhklphy**.

## OpenBack v0.36.245 - Mobile Control and Instant Resume

- Returned the mobile header to one clean row. Subpages now compact the menu/back controls just enough to keep the largest OpenBack wordmark that fits, without the oversized second logo row.
- Landscape games keep all sixteen build units on one line. Portrait games use two balanced rows and apply curved-screen padding to the real HUD container, fixing the previous inset rule that had no effect because its target used `display: contents`.
- Returning to OpenBack from another app now forces a camera-synchronised battlefield frame immediately and again on the next paint. Android `visibilitychange`, focus, and back-forward-cache restores all use the same fast resume path.
- Mobile long-press actions such as alliance requests now consume their complete pointer sequence, including small finger drift, so closing the action menu cannot trigger an accidental attack.
- Tapping water, enemy land, or another invalid placement now unequips the selected build unit consistently, including Aircraft and Tank previews.
- Transport ships can only target land. Water presses are rejected instead of resolving to an unrelated distant shore, while valid reachable coastal invasions no longer have an extra 100-tile click limit that made normal launches appear to require a Port.
- Verified the annexation implementation against the latest OpenFront source: genuinely enclosed territory is annexed immediately, while the enclosure validation prevents crater, enclave, and inverse-annexation mistakes.
- Added a privacy-safe live platform statistics endpoint reporting online players, total players, completed matches, and the same player totals excluding the OpenBack owner account.

Created by **frootz jhklphy**.

## OpenBack v0.36.244 - Reliable Lobbies and Mobile Building

- Friends accepting a private-lobby invite now enter the complete live lobby screen immediately. They can see the host's map, rules, roster, and countdown without being able to edit them, and the match still starts only when the host presses Start.
- Leaving a match now clears stale game handles and URLs even when the connection already ended. A normal Host Multiplayer press always creates a fresh lobby, while an intentional successor-lobby link reconnects its host to that exact lobby.
- Mobile building now moves the selected placement preview and pans the map together after a deliberate drag, while small finger movement remains a stable placement tap. Build descriptions disappear as soon as a unit is unselected.
- Added a Build unit descriptions setting for every device. Players can hide the name, purpose, and price panel without hiding or disabling the build bar.
- The mobile build bar now uses device-width breakpoints, larger two-line labels, and adaptive curved-screen insets instead of assuming every phone has a rectangular usable viewport.
- Restored immediate OpenFront-style annexation for genuinely enclosed territory. Plane beachhead protection and the safety checks that prevent inverse or false annexation remain intact.
- Profile saves now require a valid in-game name in both the interface and server validation. Bio, banner color, and profile picture remain optional.
- On narrow subpages, the OpenBack wordmark receives its own full-size row so opening Account, Store, News, or another tab no longer crushes the logo between navigation controls.

Created by **frootz jhklphy**.

## OpenBack v0.36.243 - Connected Friends and Adaptive Mobile Lobbies

- Friend requests now show the player's in-game name instead of exposing a raw friend code. Friend and request lists update immediately while the page is open, and every friend row opens their complete public profile or a persistent live chat without requiring a refresh.
- Public profiles now expose real ranked wins, losses, games played, ladder position, clan membership, cosmetics, and match history. The ranked leaderboard keeps all of its useful columns while fitting narrow phone screens instead of forcing important stats off-screen.
- Private-lobby guests now remain in the visible read-only lobby with the host's live settings and roster until the host manually starts the match. Lobby codes and invite URLs share one responsive copy panel instead of scattering across compact headers.
- The in-game build bar now adapts from sixteen to twelve or eight columns according to the actual usable screen width and curved-screen safe areas. Lobby panels, status controls, friend requests, and chat controls also reflow at narrow widths instead of clipping.
- Every shop card now receives a deterministic item-specific presentation accent in addition to its own artwork, palette, rarity treatment, and equipped state, making visually related wraps and effects easier to distinguish.
- Local-development profile, leaderboard, game-history, and replay requests now reach the OpenBack server instead of falling through to an HTML page. This removes the false JSON errors that appeared after opening or refreshing lobby links during development.

Created by **frootz jhklphy**.

## OpenBack v0.36.242 - Persistent Blast Scars and Mobile Landscape

- Repeated nuclear explosions now permanently devastate the exact affected terrain in four stages. Overlapping Atom Bombs, Hydrogen Bombs, and MIRV warheads progressively darken ground toward near-black in Classic 2D, including after another player claims it.
- Devastation is authoritative gameplay state, not a visual filter: each darker stage increases the troop losses and time required to capture that specific tile. The four stages are packed into previously unused synchronized tile bits, so multiplayer clients and replays receive them without another map-sized buffer.
- OpenBack no longer declares portrait-only orientation. Mobile players can rotate into landscape normally, including installed Android/PWA mode, and a portrait-only in-game landscape control enters fullscreen before requesting the browser's landscape lock. Unsupported Xiaomi/Android browsers receive an OpenBack UI hint to enable Auto-rotate.

Created by **frootz jhklphy**.

## OpenBack v0.36.241 - Tiny Shimmers throughout Every Ocean

- Distributed the subtle Classic 2D pale-blue shimmer throughout the entire ocean instead of spawning only four fragments that could all appear near land. Every broad ocean region now owns an independent tiny shimmer with its own position, direction, speed, curve, and fade cycle.
- Preserved the corrected pixel-sized dimensions and low brightness from the previous release. Coverage scales from at least 32 independent regions on compact maps to more than 100 on the World map without looping over every shimmer per pixel.
- Immersive 3D remains unchanged with the glow restricted to coastlines.

Created by **frootz jhklphy**.

## OpenBack v0.36.240 - Tiny Open-Water Shimmers

- Corrected the new Classic 2D water flow to match the actual reference: tiny pale-blue pixel shimmers instead of long white curves. Their dimensions now adapt to camera zoom, remaining about eight screen pixels long and less than one pixel thick at both world overview and close coastline zoom. They are also less curved and less than one-third of the previous brightness.
- The fragments still appear, drift, fade, and respawn with changing positions, directions, and speeds. The original shoreline glow and Immersive 3D coast-only behavior remain unchanged.

Created by **frootz jhklphy**.

## OpenBack v0.36.239 - Calm Coastal Flow across the 2D Sea

- Classic 2D now uses the actual calm coastal-glow color and threshold in localized flows across open water instead of approximating it with a different wave or glint effect. Four independent flows appear and fade in changing places, each receiving a new random direction, speed, curve, and position.
- The original coastline glow remains unchanged. Immersive 3D keeps the effect attached only to shoreline water, as requested; its raised waves and other water lighting remain untouched.
- The flow is deterministic for replays and multiplayer visuals, uses no map-sized distance texture, and calculates its randomized paths once per frame instead of running random-noise fields on every water pixel.

Created by **frootz jhklphy**.

## OpenBack v0.36.238 - A Gentler Glow on the Open Sea

- Toned down the shoreline glow where it runs across open water. Coastlines keep exactly the glow they had, lighting up and fading as the wave passes; out at sea the same glow is now soft rather than the hard bright stripes of the previous release. The two need different strengths because a coast only ever shows a thin sliver of the wave, while open water shows the whole of it.

Created by **frootz jhklphy**.

## OpenBack v0.36.237 - The Shoreline Glow, on All the Water

- The glow that runs along the border between water and land now runs across every stretch of water, not just the tiles touching a coast. It is the same glow, unchanged: the same bands, the same brightness, the same drift, simply no longer restricted to the shoreline. Applied in both Classic 2D and Immersive 3D.

Created by **frootz jhklphy**.

## OpenBack v0.36.236 - Take the Pale Bands Back Off the Sea

- Removed the broad pale bands that appeared across the ocean in the previous release. Turning the open-water glint up to the brightness used along coastlines did not spread the coastal glow, it painted wide washes over the water, because those crests are three to four times wider than the shoreline's. The glint is faint again in both Classic 2D and Immersive 3D.
- Kept from the previous release: the glints travel in four directions at their own pace, speeding up and easing off, and appear in patches that drift around the map.

Created by **frootz jhklphy**.

## OpenBack v0.36.235 - Glints Right Across the Ocean

- The bright glint on the water now happens all over the open sea instead of only near coastlines. It was being drawn at a seventh of the strength used along the shore, which left it invisible out in deep water; open water now gets the same strength as the coast. Roughly an eighth of the open sea is catching the light at any moment.
- The glints travel in every direction rather than one. There are four sets of crests, one heading right, one left, one up and one down, each at its own pace, and each speeds up and eases off as it goes instead of marching at a fixed rate.
- Where they appear now drifts about the map in both directions, so patches of light come and go in different parts of the sea over time rather than the same band sliding past forever.
- The same change is applied to Immersive 3D, so the sea looks the same whichever mode you play in.

Created by **frootz jhklphy**.

## OpenBack v0.36.234 - Cheaper Water, Same Water

- The map draws noticeably faster with no change to how it looks. Almost half the cost of drawing the terrain went on a bright glint on the open sea that is invisible at most moments, and the game was paying for it on every pixel of ocean whether it showed or not. It is now worked out only where it can actually appear. Measured on a desktop graphics card, drawing the terrain got about 21% cheaper, which matters most on phones.

Created by **frootz jhklphy**.

## OpenBack v0.36.233 - The Same Sea on Every Screen

- The ocean now looks exactly the same on a phone as on a desktop. It was being dimmed twice on small screens, once by a fade tied to screen size and once by a mobile quality setting, and neither of them made the game any faster: nothing in the water drawing was ever skipped, so a phone paid the full cost for a fainter sea. Both are gone.
- Fixed the speckling introduced on phones in the previous release. Terrain relief and ground grain are far smaller than a single pixel on a handset, so they are once again smoothed away there rather than drawn as noise. Desktops are unaffected.

Created by **frootz jhklphy**.

## OpenBack v0.36.232 - The Sea Looks Right on a Phone

- The ocean on a phone was left dark and flat, and the shading on land was switched off entirely, while the same map looked correct on a desktop. The detail was being faded out by a rule that measured the screen rather than how far you had zoomed, so a small screen was permanently treated as though the map were zoomed all the way out. Phones and tablets now get their waves, glare and terrain shading; desktops are unchanged.

Created by **frootz jhklphy**.

## OpenBack v0.36.231 - Every Page Is Just the Address

- Moving around the site no longer writes a path into the address bar. The play screen, the store, your inventory, the leaderboard, clans, settings, news, help and the legal pages all sit on the plain address instead of things like /play/2d or /store/packs, and the rendering mode is no longer part of the URL.
- Links that name something a person can open still keep their address, so sharing a profile, a game's stats, a clan or a written article works exactly as before. Older bookmarks and shared links still open the right page.

Created by **frootz jhklphy**.

## OpenBack v0.36.230 - Continuous MIRV Split, Unit Bulk Stacks, and Real Sea Glare

- MIRVs now remain visible through separation: the first warhead crown appears on the exact split tick, then the remaining warheads peel away in staggered groups instead of the missile disappearing and reappearing near impact.
- Tapping Shift now enables a five-second temporary added-unit number layer, refreshed by each 1-6 selection, so sequences such as Shift, 3, 1 work without holding Shift. Held Shift+number remains supported.
- Runways, MANPADs, Military Bases, and Tank Mines now support the same 1x/5x stacking workflow and cumulative bulk pricing as original upgradeable structures.
- Extended the exact pale blue-white shoreline ribbon highlighted in the reference screenshot across open water as sparse moving glare, travelling from four headings at different speeds in both Classic 2D and Immersive 3D without covering the sea in stripes.

Created by **frootz jhklphy**.

## OpenBack v0.36.229 - Purpose-Built Aircraft, Tank, and MIRV Reticles

- Replaced the shared heavy plus cursor with three clean targeting designs: corner brackets for Aircraft, a compact circular ground lock for Tanks, and a segmented red strike ring for MIRVs.
- Preserved Aircraft and Tank white/grey placement validity, but reduced the outline weight and kept each reticle compact so it reads clearly without covering the unit or destination.

Created by **frootz jhklphy**.

## OpenBack v0.36.228 - Reliable Vehicle Cursor, Radius, and Shift Prefix

- Aircraft and Tank placement now uses the visible Runway or Military Base icon under the pointer as the authoritative source, so every pixel of the icon validates consistently and a white crosshair always produces the same successful click. Both cursor colours now have a dark outline and render above vehicle artwork, so white cannot disappear against snow, sand, bright terrain, or the vehicle itself.
- Grey vehicle clicks no longer cancel the selected Aircraft or Tank, preventing the crosshair from disappearing while choosing another source or destination.
- Hovering directly over a completed Runway or Military Base now shows its range even while Aircraft or Tank is selected and even when that source already has a parked vehicle.
- Added-unit shortcuts now support a Shift prefix: tap and release Shift, then press 1-6 within three seconds. Existing held Shift+number shortcuts continue to work.

Created by **frootz jhklphy**.

## OpenBack v0.36.227 - Sharp Featured Map Preview

- Fixed the large featured map picture on the home screen loading the same small baseline image as the narrow cards and stretching it across roughly twice the width. The large desktop card and the featured mobile card now start from the double-resolution map artwork, while the smaller cards keep their lighter responsive images.
- Fixed density-suffixed map image addresses being encoded into a route that returned the app shell instead of the picture, so the sharper `@2x` artwork now actually loads in development and production.

Created by **frootz jhklphy**.

## OpenBack v0.36.226 - Aircraft Placement Actually Builds the Aircraft

- Fixed the real mouse and touch placement path showing a valid white aircraft cursor but sending zero troops, which made the simulation cancel the build before a plane appeared. Aircraft now load the troop share selected by the attack-ratio control and visibly park on the runway after the click.
- Kept Aircraft and Tank selected after a successful placement, with their white or grey crosshair ready for another affordable vehicle instead of silently dropping the placement tool.

Created by **frootz jhklphy**.

## OpenBack v0.36.225 - Deploying a Vehicle Means the Base You Clicked

- Ordering a tank or an aircraft now only works from right next to the runway or military base it comes from, instead of anywhere within fifteen tiles. Clicking open ground a long way off no longer launches a vehicle from a base nowhere near the cursor, and with two bases nearby the order goes to the one you are actually pointing at.
- The range ring shown while deploying no longer measures from a runway or base whose vehicle is already out, so it stops promising a reach the click cannot deliver.

Created by **frootz jhklphy**.

## OpenBack v0.36.224 - The Tank and Aircraft Cursor Reads Right Again

- The deployment cursor for tanks and aircraft is white over a spot that will take the vehicle and grey over one that will not, at its full size, instead of the warship's red with no sign of whether the tile was in reach. The white and grey were written once and then lost in a version merge; they are back, and now held in place by tests.

Created by **frootz jhklphy**.

## OpenBack v0.36.223 - Aircraft Fly the Same in Both Modes

- Aircraft in Immersive 3D are no longer blocked from landing on high ground or refused a flight path over it, which could leave them impossible to send at all; they now behave exactly as they do in Classic 2D.

Created by **frootz jhklphy**.

## OpenBack v0.36.222 - Tanks and Aircraft Show Their Target

- Deploying a tank or an aircraft now shows the targeting cursor, so you can see where it will go and whether it is within reach of the base sending it.

Created by **frootz jhklphy**.

## OpenBack v0.36.221 - Safe Front Lines and OpenFront v0.33.8

- Fixed matches crashing when an active attack reached terrain that had become impassable; attacks now skip those tiles safely and continue around them.
- Updated the inherited game systems through OpenFront v0.33.8, including spectator support, stronger team-lobby handling, safer reconnects and older replays, improved Doomsday team behavior, the Yangtze River map, and consistent game-server routing.
- Preserved OpenBack's profiles, friends, hosted 2D and 3D experiences, custom maps, units, and lobby controls while bringing in the upstream fixes.

Created by **frootz jhklphy**.

## OpenBack v0.36.220 - Hosting Works in Immersive 3D

- Fixed hosting a multiplayer game in Immersive 3D failing with a connection error, which left the host unable to enter the lobby they had just created.

Created by **frootz jhklphy**.

## OpenBack v0.36.219 - Visible Warheads

- Nuclear weapons in Immersive 3D now show their real artwork, so an incoming strike is readable again instead of a sliver you could miss entirely.

Created by **frootz jhklphy**.

## OpenBack v0.36.218 - Zoom Works at Every Angle

- Fixed the Immersive 3D camera refusing to zoom when tilted down toward the ground, which left the view stuck far out with the zoom control doing nothing.

Created by **frootz jhklphy**.

## OpenBack v0.36.217 - The Sun Actually Explodes

- The victory sun now detonates properly -- it swells, lets go in a flash, and throws a shockwave of light and debris across the sky -- and it goes off when you choose to keep playing, so you are looking at the sky when it happens instead of at the win screen.
- The bandaged sun shown afterwards is now the game's own sun wearing a plaster, and its message sits on a single slim line instead of a block covering the battlefield.

Created by **frootz jhklphy**.

## OpenBack v0.36.216 - No Outside Store

- Removed the store tab that sent players to an outside merchandise site.

Created by **frootz jhklphy**.

## OpenBack v0.36.215 - The Sun Rises to Detonate

- The victory sun detonation is now visible whenever a game is won; winning after dark used to set it off below the horizon, underneath the map, where nothing could be seen of it.

Created by **frootz jhklphy**.

## OpenBack v0.36.214 - Vessels Stay Above the Night Tide

- Ships in Immersive 3D now sit on the water instead of the seabed, so the night tide and its crests no longer close over them; they rise and fall with the swell.

Created by **frootz jhklphy**.

## OpenBack v0.36.213 - Ships and Trains Keep Their Artwork

- Ships and trains in Immersive 3D now use their real artwork, shown facing you from every angle, instead of models built from boxes and cones -- so train carriages no longer sit as disconnected lumps. Vessels keep their wake and their shadow.

Created by **frootz jhklphy**.

## OpenBack v0.36.212 - Correct Production Hostname

- The server now recognises the address the game is actually served from as its live deployment, instead of only an address it moved away from.

Created by **frootz jhklphy**.

## OpenBack v0.36.211 - Night Sailing Has a Price

- Vessels caught at sea after dark can now be lost to the water, with anything aboard going down with them; the danger rises as the night deepens and is nil in daylight.
- Sharpened the remaining map pictures across the game info, match history and clan history views, which were still showing a half-resolution image on high-density screens.

Created by **frootz jhklphy**.

## OpenBack v0.36.210 - The Sea Takes the Coast

- The night tide now takes coastal ground a row at a time as the night deepens, holds it at its height, and gives it back as dawn approaches, instead of the whole coastline flooding at dusk and draining at sunrise.

Created by **frootz jhklphy**.

## OpenBack v0.36.209 - Sharper Lobby Previews

- Sharpened the map picture on lobby cards, which were showing a half-resolution image stretched to fit on high-density screens, and now use the Immersive 3D rendering of the map when that mode is selected.

Created by **frootz jhklphy**.

## OpenBack v0.36.208 - Ships Ride, Steer and Leave a Wake

- Immersive 3D vessels no longer sit three quarters under water; they float on the swell with the hull clearly above the surface.
- Ships point where they are actually sailing in every direction and swing round to a new course, instead of snapping back to facing north between moves.
- Vessels under way now trail a wake across the water behind them.

Created by **frootz jhklphy**.

## OpenBack v0.36.207 - Counters Fill Every Panel

- The player panel's unit counters now spread across the full panel on narrow and unmaximised windows too, not only on wide ones.

Created by **frootz jhklphy**.

## OpenBack v0.36.206 - Full-Width Unit Counters

- The player panel's unit counters now spread across the whole panel instead of huddling in the left half, keeping two rows of six.

Created by **frootz jhklphy**.

## OpenBack v0.36.205 - Ships That Float and Steer

- Immersive 3D vessels now ride the moving sea instead of sitting at a fixed height the tide and waves rose straight over, so they float on the swell rather than disappearing under it.
- Ships now point where they are actually travelling, in any direction, and swing round to a new course instead of snapping back to facing north between steps.

Created by **frootz jhklphy**.

## OpenBack v0.36.204 - Real Sunrise and Sunset

- The sun and moon now rise and set on opposite sides of the sky instead of both hanging overhead and swapping in place, so dusk and dawn are gradual and only briefly show both, low and faint.

Created by **frootz jhklphy**.

## OpenBack v0.36.203 - Panel, Previews and a Longer Day

- Fixed the player panel stacking its unit counters into one tall column on desktop, which is also why a stack of five cities showed a 5 with a 0 directly beneath it; the counters sit in a proper grid again.
- Sharpened the main menu map previews, which were showing a half-resolution image stretched to fit on high-density screens.
- Day and night now run five minutes each instead of cycling every ninety seconds.
- Widened the Immersive 3D camera so it can drop to a near-ground view and tilt closer to straight down, pulling back as it lowers.
- Removed the unused soundtrack file so it is no longer shipped at all.

Created by **frootz jhklphy**.

## OpenBack v0.36.202 - Sound You Can Point At

- Stopped the added background soundtrack playing; the game now runs on the original OpenFront sound effects alone, which are used unchanged.
- Sound effects in Immersive 3D now play from where they happen, so a strike to your left is heard on your left and one behind the camera is heard behind you, following the view as it turns and zooms.

Created by **frootz jhklphy**.

## OpenBack v0.36.201 - Wandering Sea Light

- Ocean shine now appears in drifting patches instead of fixed repeating bands, so light turns up across different parts of the sea over time rather than always the same places, in both Classic 2D and Immersive 3D.
- Added a deployment drain so an update waits for matches in progress to finish before restarting, instead of ending a game that is being played.

Created by **frootz jhklphy**.

## OpenBack v0.36.200 - Ranked, Profiles and Lobby Repairs

- Fixed Ranked in Immersive 3D refusing every match with a connection error: the queue matched players in 3D but always built the game in 2D, so joining was rejected as an experience mismatch.
- Restored the account settings, change username, subscription, ban notice and Steam link windows, which had no place in the page and so did nothing when opened from the profile menu.
- Restored the profile and match stats pages, so a shared account or game link now opens its content instead of a blank page under the header.
- Fixed the private lobby heading collapsing into a single column of letters on phones by keeping room for the title and wrapping the lobby code and invite link onto their own row.

Created by **frootz jhklphy**.

## OpenBack v0.36.199 - Untangled Phone Header

- Fixed the phone header controls piling on top of the OpenBack wordmark once you sign in, so the notification bell no longer sits over the logo however wide the account button grows.

Created by **frootz jhklphy**.

## OpenBack v0.36.198 - Instant Mobile Sign In

- Fixed the phone top-bar account button spinning forever instead of settling into the Sign In icon or your profile picture, so it is ready as soon as the rest of the Home menu is.

Created by **frootz jhklphy**.

## OpenBack v0.36.197 - Mobile Command

- Rebuilt phone controls so building and weapon previews follow the finger, taps confirm once, invalid structure taps cancel before combat, nuclear holds cancel safely, and two-finger Immersive gestures rotate and zoom without phantom actions.
- Restored dependable touch placement for Aircraft on Runways and Tanks at Military Bases, kept every affordable unit selected for repeated placement or stacking, and cleared unit descriptions immediately on deselection.
- Completed the mobile Home and HUD with full lobby countdowns, persistent account/Menu/Back controls, curved-screen safe areas, and balanced unit counters in portrait and landscape.
- Added touch-specific settings, audible sound defaults, mobile audio unlocking, and the original locally stored OpenBack Command soundtrack.
- Active pause-authorized matches and game audio now stop during deployments on every device, then resume after an update-ready 5-to-1 countdown without reloading an unfinished match.

Created by **frootz jhklphy**.

## OpenBack v0.36.196 - Clean Mobile Footer

- Rebuilt the mobile Home footer into a compact layout without the empty desktop icon row, excessive lower-bar space, or overlapping legal and contributor credits.
- Fixed mobile radial-menu actions firing twice after a single touch, so sending a transport ship now creates exactly one ship.

Created by **frootz jhklphy**.

## OpenBack v0.36.195 - Real 3D Railways

- Rebuilt Immersive 3D railway rendering with a dark ballast bed, visible wooden sleepers, two parallel metallic rails, proper straight and corner orientation, and zoom-stable anti-aliasing while preserving terrain conformance and the established 2D renderer.

Created by **frootz jhklphy**.

## OpenBack v0.36.194 - Natural Home Proportions

- Narrowed the tall desktop Home stage again, moved it slightly upward, and made its map cards substantially taller to remove the remaining stretched horizontal appearance.

Created by **frootz jhklphy**.

## OpenBack v0.36.193 - Balanced Home Stage

- Vertically centered the complete Home stage on tall desktop displays, narrowed the overly stretched wide-screen canvas, and made its map cards taller while leaving fitted 720p and mobile layouts unchanged.

Created by **frootz jhklphy**.

## OpenBack v0.36.192 - Twin Worlds

- Added one clear Classic 2D / Immersive 3D switch to Home and carried the selected world through Solo, hosted and joined multiplayer, public lobbies, parties, and ranked 1v1 through 4v4.
- Expanded Home across wide desktop screens while keeping every primary action visible above the footer at 720p and preserving a fitted, non-scrolling mobile layout.
- Separated scheduled public matches by world and removed 3D from the ordinary Solo and Host modifier checklist.
- Rebuilt all map previews as quality-88 Classic and shaded-relief Immersive variants with density-aware 2x sources, removing the forced image enlargement that made large cards blurry.
- Restored repository and credits icons to their original footer row while centering the language flag against the complete footer.

Created by **frootz jhklphy**.

## OpenBack v0.36.191 - Footer Icons Restored

- Restored the repository and credits icons to their original centered footer bar while keeping every language flag vertically centered inside that same bar.

Created by **frootz jhklphy**.

## OpenBack v0.36.190 - Twin World Compatibility

- Kept Immersive camera controls and living-world tides working through older lightweight game adapters while the new Twin World experience setting rolls out.
- Repaired account responses for players whose new competitive ranking record contains only one experience, preserving sign-in, profile currency, and ranked progress.

Created by **frootz jhklphy**.

## OpenBack v0.36.189 - Twin World Foundations

- Separated Classic 2D and Immersive 3D multiplayer lobbies so invitations and party joins cannot place players into the wrong world.
- Partitioned ranked matchmaking from 1v1 through 4v4 by experience, keeping Classic and Immersive opponents, parties, and assignments independent.
- Added separate persistent Classic and Immersive rating ladders for every ranked team size while safely retaining existing ranked progress in Classic 1v1.
- Added experience-aware competitive records, account ranking data, leaderboard requests, match records, and replay compatibility without breaking older games.
- Moved all existing 3D simulation, input, aircraft, train, tide, and rendering behavior onto one normalized experience setting so future Twin World features share a stable foundation.

Created by **frootz jhklphy**.

## OpenBack v0.36.188 - Centered Language Flag

- Centered every language flag against the full desktop footer bar instead of the shorter icon row, keeping wide, square, and tall flags aligned consistently.

Created by **frootz jhklphy**.

## OpenBack v0.36.187 - One Click To Sign In

- Turned the signed-out header account control into one direct Sign In / Sign Up button on desktop and mobile, removing the redundant dropdown and chevron now that Settings has its own navigation button.

Created by **frootz jhklphy**.

## OpenBack v0.36.186 - Clean Links Everywhere

- Gave every OpenBack page and selectable tab a readable link that can be copied, refreshed, and opened directly.
- Made browser Back and Forward restore the correct page or tab while preserving lobby links and active-match leave protection.
- Kept existing shared hash links working by moving them automatically to their new clean addresses.

Created by **frootz jhklphy**.

## OpenBack v0.36.185 - The Wordmark Goes Home

- Made only the OPENBACK text in each combined header logo return to the Home screen from any page, without making the circular OB mark clickable or reloading the website.

Created by **frootz jhklphy**.

## OpenBack v0.36.184 - One Matching Header Set

- Matched the Settings gear's resting colour, hover colour, stroke weight, and focus treatment to the neighboring News and Help icons so none appears darker or glows more strongly.

Created by **frootz jhklphy**.

## OpenBack v0.36.183 - Settings Where They Belong

- Moved Game settings out of the account dropdown and into a dedicated white gear matching News and Help on desktop and mobile.
- Replaced the mismatched emoji gears in Help and the leaderboard column picker with one clean OpenBack vector icon matching the surrounding interface.

Created by **frootz jhklphy**.

## OpenBack v0.36.182 - Clean Map Preview And Release Checks

- Refreshed the Grand Earth preview from the current map generator and repaired the formatting drift left by the latest upstream merge so OpenBack releases pass every automated check again.

Created by **frootz jhklphy**.

## OpenBack v0.36.181 - Living Water Without Lost Matches

- Replaced the sharp white ocean scratches with broad, soft shoreline-colour shine moving across all open water in several different directions and speeds, in both 2D and 3D.
- Kept matches running through OpenBack updates instead of forcibly reloading the page and ejecting the player when the update timer finishes.

Created by **frootz jhklphy**.

## OpenBack v0.36.180 - Shine On All The Water

- Spread the soft shine that used to appear only where the sea meets the shore across the whole ocean, on both the flat map and in 3D, so open water catches the light instead of looking dead next to the coast.
- Removed the crossing streaks from the flat map.

Created by **frootz jhklphy**.

## OpenBack v0.36.179 - Your Game Will Resume

- Made the update screen say your game will resume when it is done, rather than talking about reloading the page, when the update catches you mid-match.

Created by **frootz jhklphy**.

## OpenBack v0.36.178 - Water That Travels

- Made the 3D sea move properly. The waves were jumping forward and snapping back ten times a second, so the crests juddered in place instead of rolling; they now travel steadily and their height reads as it should.
- Replaced the flecks on the flat map with long shiny streaks that slide across the water, coming from four different directions at different speeds and breaking up as they go, so no two stretches of sea look alike.
- Removed the duplicate profile button beside Sign In, so there is one account control instead of two.
- Made the end of an update look finished: the bar turns green and a tick appears for the last three seconds, instead of a full bar that just sits there until the page reloads.

Created by **frootz jhklphy**.

## OpenBack v0.36.177 - Shockwaves Stop Breaking Matches

- Fixed the shader error that dropped players out of a match with a connection error the moment a shockwave effect was drawn.

Created by **frootz jhklphy**.

## OpenBack v0.36.176 - Maps That Actually Load

- Fixed every map failing to load. The map data was being stripped out of the server image, so picking a map left the game unable to fetch it.

Created by **frootz jhklphy**.

## OpenBack v0.36.175 - No Version Under The Flag

- Removed the version number that OpenFront's latest update added beneath the language flag at the bottom of the menu.

Created by **frootz jhklphy**.

## OpenBack v0.36.174 - Tidier Map Categories

- Took OpenFront's latest change, which clears the older maps out of the New category so that list only shows what is actually new.

Created by **frootz jhklphy**.

## OpenBack v0.36.173 - Caught Up With OpenFront

- Brought in ninety-three OpenFront changes, including the detailed lobby browser, the Inventory page that gathers flags and cosmetics in one place, clearer verified names with a clan tag picker, cosmetic shockwave effects, and a long list of fixes to nukes, teams, and territory capture.
- Kept everything OpenBack adds: the update screen, one match per account, the leave confirmation, the 3D sea and sky, the mobile menus, and the login-code emails.

Created by **frootz jhklphy**.

## OpenBack v0.36.172 - Said Once

- Stopped the login code email repeating itself in the inbox preview.

Created by **frootz jhklphy**.

## OpenBack v0.36.171 - The Code Comes First

- Made the code appear at the start of the subject line even when the mail app reads right to left, so the digits are the first thing on the row rather than the last.
- Removed the heading inside the email that only repeated the subject.
- Put the full wording in the inbox preview instead, so the code and what it is for are readable without opening anything.

Created by **frootz jhklphy**.

## OpenBack v0.36.170 - Where To Reach Us

- Pointed the Service Request link in the menu at the new OpenBack contact address.

Created by **frootz jhklphy**.

## OpenBack v0.36.169 - The Code Before You Open It

- Put the login code at the front of the email's subject, so it reads straight from the inbox list without opening the message.
- Made the inbox preview show the code and its expiry instead of the "if you did not request this" line.
- Stopped attaching the logo, which made the inbox show a stray file next to the message.

Created by **frootz jhklphy**.

## OpenBack v0.36.168 - The Logo Travels With The Email

- Attached the OpenBack logo to the login code email instead of linking to it, so it shows even in mail apps that refuse to load images from the web.

Created by **frootz jhklphy**.

## OpenBack v0.36.167 - Log In Means Log In

- Stopped Log in from accepting an email address that never signed up. It now says the address is not registered and sends you to Sign up, instead of quietly creating an account.
- Kept guest progress safe: signing up still attaches your email to the account you were already playing on.

Created by **frootz jhklphy**.

## OpenBack v0.36.166 - Knowing The Code Was Sent

- Recorded the mail server's reply whenever a login code goes out, so a code that never arrives can be traced instead of guessed at.

Created by **frootz jhklphy**.

## OpenBack v0.36.165 - A Cleaner Code

- Set the login code in the game's own interface font instead of a typewriter face, so the digits read evenly and clearly.
- Made the OpenBack logo in the email larger and sharper.

Created by **frootz jhklphy**.

## OpenBack v0.36.164 - Names For The New Maps

- Gave the seventeen maps added in the last update their proper display names, so they read as names like "Grand Earth" and "Shattered Expanse" in the map picker instead of their internal ids.

Created by **frootz jhklphy**.

## OpenBack v0.36.163 - A Readable Login Code

- Redesigned the login and sign-up code email: the code now appears large and spaced out against the game's colours, with the OpenBack logo above it, instead of arriving as small plain text.
- Made the email say it comes from OpenBack rather than showing only the raw address.

Created by **frootz jhklphy**.

## OpenBack v0.36.162 - One Match Per Account

- Allowed an account to be signed in on as many devices as you like, while limiting it to one match at a time.
- Made a second device that tries to start or join a different match join the match the account is already playing instead, so two people on one account always end up in the same game.
- Made a finished match release its players immediately, so the next game can be started straight away.

Created by **frootz jhklphy**.

## OpenBack v0.36.161 - Light On The Whole Sea

- Put sunlight glints across the entire ocean on the flat map instead of only where the water meets land, so the open sea sparkles too.
- Made the glints travel in several directions at once, some faster than others, and appear in different places over time rather than repeating the same pattern.

Created by **frootz jhklphy**.

## OpenBack v0.36.160 - A Matching Pair

- Gave the credits link its own icon beside the source-code logo at the bottom of the menu, so the two attribution links sit as a matching pair instead of one being a logo and the other a word in the link row.

Created by **frootz jhklphy**.

## OpenBack v0.36.159 - Finishing On Time

- Brought back the moment at the end of an update where the screen says the update is done and that it is reloading the new version, held for the last three seconds before the page comes back.
- Made the update screen run on its own clock instead of waiting on the server, so it fills steadily, finishes at the same instant for everyone, and never lingers.
- Made an update take one minute even when it fails: a broken push now closes the window on time and reloads players back onto the working version instead of leaving them watching a stalled bar.
- Moved the copyright line into the bottom-left corner as fine print, closing the gap it opened in the middle of the footer.

Created by **frootz jhklphy**.

## OpenBack v0.36.158 - A Quieter Footer

- Shortened the copyright line at the bottom of the menu and set it in fine print, so it stops crowding the footer while still naming OpenFront and stating that OpenBack modifies it.

Created by **frootz jhklphy**.

## OpenBack v0.36.157 - One Shared Minute For Everyone

- Made every player see the same one minute update pause at the same time, counted from when the update actually began, whether they were sitting in the menu or already playing.
- Made the game refuse to start a match while an update is running, so pressing play at the wrong moment no longer drops you into a game the server is about to restart.
- Made the update screen appear immediately for anyone loading the site mid-update instead of after a delay.

Created by **frootz jhklphy**.

## OpenBack v0.36.156 - Big Seas, Clean Oceans

- Removed the diagonal streaks running across every ocean on the flat map, leaving the open sea with only its gradual shimmer and keeping white water at the shoreline where it belongs.
- Made the 3D swells far larger, with the heaviest night waves now standing taller than a hill, and widened the difference between calm stretches of ocean and rough ones.

Created by **frootz jhklphy**.

## OpenBack v0.36.155 - The Updating Screen Reaches Everyone

- Made the updating screen appear for players who already have the game open, instead of only for people who happen to load the page during an update, so an update is never a silent disconnection.
- Made those pages reload themselves onto the new version as soon as the update finishes.

Created by **frootz jhklphy**.

## OpenBack v0.36.154 - Back No Longer Abandons Your Match

- Fixed the browser and phone back gesture leaving a live match without asking, which happened whenever the game was still starting up or running badly.
- Made every way out of a match ask first unless you are already eliminated, including while the game is still loading.

Created by **frootz jhklphy**.

## OpenBack v0.36.153 - Water That Catches The Light

- Lit the sea by the shape of its own surface, the same way the land is lit, so crests catch the light and troughs fall into shade and the water finally reads as moving water rather than a flat blue sheet.
- Shortened the swells so waves rise and fall over a readable distance instead of stretching so far that the surface was almost level.
- Put the white caps on the steep faces of real waves rather than scattering them, removing the pale oval blobs drifting across open water in 3D.

Created by **frootz jhklphy**.

## OpenBack v0.36.152 - Real Moving Sea, No More Dark Patches

- Removed the dark brown patches that appeared all over open water in 3D, caused by the solid board beneath the map surfacing through the deeper wave troughs.
- Doubled the detail of the ocean surface so waves bend the water properly instead of tilting it in wide flat sections.
- Gave the sea varied weather: some stretches of ocean now run heavy while others stay calm, with a shorter chop riding over the long swell so crests are no longer all the same size.

Created by **frootz jhklphy**.

## OpenBack v0.36.151 - Waves You Can Actually See

- Raised the 3D wave crests so the sea visibly rises and falls beside the land instead of reading as a flat sheet, sized against real terrain heights rather than by eye.
- Moved the sun and moon fully into view: they no longer travel to the screen edges or dip into the horizon haze where they could not be seen.

Created by **frootz jhklphy**.

## OpenBack v0.36.150 - Leaving Always Asks, Even While Loading

- Fixed the in-game exit button abandoning a live match with no confirmation whenever the game was still loading or running badly, because an unresolved player was being treated as an eliminated one.
- Made the confirmation wait for its dialog to be ready, so a slow load can no longer swallow the question and leave the button doing nothing.

Created by **frootz jhklphy**.

## OpenBack v0.36.149 - Sun, Moon And A Sky Worth Looking At

- Added a visible sun and moon that travel the sky on the day and night cycle, the sun casting a warm glow and spreading rays, the moon rising as the sun sets.
- Added stars that come out and twinkle at night, and slow drifting clouds during the day.
- Added a setting to hide the sun, moon, stars, and clouds for players who prefer a plain sky. The daylight, the waves, and the night tide keep running either way, so hiding them never changes how the game plays.
- Made the sun rise and detonate when a game is won, whitening the whole sky.
- Added a bandaged sun with a message for anyone who keeps playing after the match is already decided.

Created by **frootz jhklphy**.

## OpenBack v0.36.148 - The Night Tide Takes Ground

- Made the night tide climb inland over low coastal ground instead of stopping at the first row of land, so the rising sea visibly takes territory during the night and hands it back at dawn.
- Roughly doubled the ground the tide covers at its peak while leaving higher ground untouched, so coastlines change overnight without swallowing the map.

Created by **frootz jhklphy**.

## OpenBack v0.36.147 - Living Water Across Every Ocean

- Removed the pale drifting blobs on open water, which came from a wave pattern that peaked in round patches instead of travelling crests.
- Extended the moving glimmer and crest lines across the whole ocean rather than only near coastlines.
- Kept the sea moving when the map is zoomed out, where open water previously went completely still.

Created by **frootz jhklphy**.

## OpenBack v0.36.146 - Leaving A Match Asks First

- Added a confirmation before leaving a match, so a mis-tap on the exit button next to the ordinary settings no longer abandons the game outright.

Created by **frootz jhklphy**.

## OpenBack v0.36.145 - Cleared Out The Old Host

- Removed the leftover configuration, redirects, and environment handling for the previous hosting provider, which the game no longer runs on and which could still have redirected players to a retired address.
- Kept the checks that still matter, so the site continues to record the exact version it is running and to shut down cleanly on restart.

Created by **frootz jhklphy**.

## OpenBack v0.36.144 - Licence Notices Reach The Screen

- Fixed the automatic renaming of upstream product references, which was also rewriting the required "© OpenFront and Contributors" notice into an OpenBack one before it reached the screen, leaving the footer and loading screen showing the wrong credit no matter what the text said.
- Protected every notice that carries a copyright symbol or credits OpenFront Inc. from that renaming, so a notice added later cannot silently lose its required wording.

Created by **frootz jhklphy**.

## OpenBack v0.36.143 - Complete Licence Notices

- Restored the required "© OpenFront and Contributors" notice in the footer alongside the OpenBack modification credit, as the licence's additional terms require that notice to be preserved rather than replaced.
- Restored the same required notice on the game loading screen, which the licence names as one of the places the notice must appear.
- Added the missing attribution for the inherited game artwork, which is shared under Creative Commons BY-SA 4.0 and requires crediting OpenFront Inc., together with a plain statement that OpenBack is a modified version rather than an official release.
- Added a Credits link to the footer so the full attribution and licence notices can be reached from every screen instead of only while a match loads.

Created by **frootz jhklphy**.

## OpenBack v0.36.142 - Phone Controls Sized For Fingers

- Enlarged the settings sliders, which drew an eight pixel tall track that was close to impossible to grab on a phone, to a full finger-sized control without changing how they look.
- Enlarged every settings dropdown, the modal back buttons, the phone menu and back buttons, and the home screen name and clan tag fields to the standard forty-four pixel touch size.
- Confirmed the home screen, settings, and tutorials pages fit a phone with no sideways scrolling after the change.

Created by **frootz jhklphy**.

## OpenBack v0.36.141 - Back Steps Out One Level

- Made the phone back button actually step out one level at a time on every page that has inner views: reading a tutorial or blog post returns to that tab's article list, a clan sub-view returns to the clan, and only a press from a tab's own top level returns to Play.
- Aimed the back button at the page currently on screen instead of the last page the menu recorded, so a page that closes or redirects itself can no longer make one press skip a level.

Created by **frootz jhklphy**.

## OpenBack v0.36.140 - Menu Everywhere and Chosen Frame Rate

- Made the phone menu button stay on screen on every tab instead of only the Play screen, so News, Tutorials, Blog, Clans, Leaderboard, Store, Settings, and account pages can all reach the main menu without returning to Play first.
- Added a phone back button beside the menu button that steps out one level at a time: from a page's own top level it returns to Play, while a page showing an inner view closes that view first.
- Kept every sub-page clear of the persistent top bar so no page begins underneath the menu and back controls.
- Added a frame rate limit setting offering 30, 60, 90, 120, 144, 165, and 180 frames per second, replacing the fixed 60 frames per second cap that phones and tablets were locked to.
- Measured the screen's real refresh rate when the settings screen opens and marked the limits it cannot reach, so a chosen limit never silently does nothing.

Created by **frootz jhklphy**.

## OpenBack v0.36.139 - Restored Classic Battlefield Art

- Restored immediate 2D rendering for Cities, Ports, defenses, trains, ships, Aircraft, Tanks, and every other classic battlefield model by correcting the shared WebGL texture state that silently rejected their draw calls.
- Restored visible Atom Bomb, Hydrogen Bomb, and projectile models together with their established destination markers.
- Restored the complete OpenFront-style ship and nuclear trail renderer at its intended visibility, including player colors and equipped animated trail effects.
- Made both battlefield atlases finish PNG decoding before WebGL uploads them so models are present from the first playable frame instead of appearing late or remaining transparent.

Created by **frootz jhklphy**.

## OpenBack v0.36.138 - Restored Living Seas

- Restored the exact stable 3D wave height from the last good water release, removing the broken dark gaps caused by oversized waves.
- Replaced the repeated pale oval pattern on classic 2D oceans with flowing directional tide shimmer, narrow moving crests, and shoreline foam.
- Kept water animation decorative and readable so ships, borders, territory, and map detail remain clear.

Created by **frootz jhklphy**.

## OpenBack v0.36.137 - Ready Fleet and Living Seas

- Made Cities, Ports, defenses, trains, ships, and the complete classic battlefield model set finish decoding before the first playable frame instead of appearing late.
- Fixed Transport Ships in 3D by keeping their classic visible model on-screen until the real 3D vessel is loaded and ready, eliminating permanently invisible or delayed ships.
- Added moving white wave crests and shoreline foam to classic 2D oceans, and raised the real 3D ocean geometry substantially so waves have clearly visible height.
- Locked the fitted phone homepage against empty rubber-band scrolling while preserving normal scrolling inside Tutorials, Blog, News, account, and other subpages.

Created by **frootz jhklphy**.

## OpenBack v0.36.136 - Touch-Safe Landscape Command

- Rebuilt the short-landscape home composition for phones and tablets so it keeps the mobile controls, uses the complete width, fits live matches cleanly, and no longer needs a homepage scrollbar.
- Fixed real touchscreen building placement by validating the exact release position instead of a stale mouse location, including devices that do not emit hover movement before a tap.
- Made every selected-building tap exclusive to placement: tapping an invalid or enemy tile now cancels the building selection and can never turn into an accidental attack or open a player action menu.

Created by **frootz jhklphy**.

## OpenBack v0.36.135 - Complete Mobile Command Screen

- Fixed mobile building so touches that begin on HUD controls cannot trigger the battlefield, and a selected structure receives the placement tap without opening player, trade, or radial menus.
- Added a viewport-safe mobile unit information card that keeps the complete unit name, description, hint, and current cost visible above the build controls.
- Replaced the clipped homepage match carousel with a balanced three-card layout that uses the phone screen cleanly in portrait, narrow, and landscape layouts.

Created by **frootz jhklphy**.

## OpenBack v0.36.134 - Mobile Battlefield HUD

- Made the upper player-information bar fill the complete phone width, including safe-area handling, instead of leaving an empty strip on the right.
- Added a compact landscape battlefield layout that keeps all 16 build controls immediately available while preserving the map, attack controls, notifications, and every gameplay action.
- Improved mobile HUD sizing, overflow containment, touch behavior, player-name fitting, and short-screen spacing without reducing game or rendering quality.

Created by **frootz jhklphy**.

## OpenBack v0.36.133 - Clean Mobile Building

- Matched Select Cosmetic to the compact, borderless Select Flag control on phones, including the same text size, spacing, and hover treatment.
- Fixed mobile build placement so tapping a valid location places the selected structure instead of opening the player, trade, or build-action menu.

Created by **frootz jhklphy**.

## OpenBack v0.36.132 - Visible Battlefield Models

- Corrected the 2D battlefield layer order so small-territory glow remains behind Cities, defenses, ships, trains, Aircraft, Tanks, and every other visible model instead of painting over them.
- Cleared leftover 3D projection state whenever the classic renderer starts a 2D frame, restoring structures and mobile units after changing modes or starting another match.
- Preserved structure counts, build previews, bars, routes, effects, and established model artwork while restoring their actual on-map visibility.

Created by **frootz jhklphy**.

## OpenBack v0.36.131 - Raised Seas and Reliable Deployments

- Restored the current OpenBack renderer to the public game instead of serving an outdated deployment.
- Increased real 3D ocean displacement to produce clearly raised moving crests instead of surface-only shading.
- Made deployed builds report Render's exact source revision automatically, preventing a stale manual commit value from hiding failed or outdated deployments.

Created by **frootz jhklphy**.

## OpenBack v0.36.130 - Stable 3D Operations

- Rebuilt 3D pointer targeting around the rendered terrain surface so attacks, MIRVs, Aircraft, Tanks, structures, and placement previews remain aligned with the cursor at every camera angle; clicks that miss the board no longer fall back onto an unrelated country.
- Anchored classic unit and structure artwork to the same smoothed raised terrain used by the 3D board, preventing models from floating, sinking, or appearing to slide while the camera moves.
- Kept established 2D-style artwork for normal Tanks and added true 3D only to the raised terminal turret and its round self-destruction projectile.
- Restored immediate Transport Ship deployment on the exact arrival tick instead of leaving ships visibly paused at their destination.
- Preserved raised animated seas, foam, day/night lighting, deterministic tides and currents, terrain-following rails, military-fuel rewards, dark fallout, 3D ship/bomb presentation, and mountain-aware Aircraft routing across every compatible map.

Created by **frootz jhklphy**.

## OpenBack v0.36.129 - Clear Country Labels

- Prevented large country names, flags, and verified badges from covering neighboring countries' labels by fitting each complete name row inside its own usable territory area.
- Preserved large readable labels for countries with enough room instead of globally shrinking every name.

Created by **frootz jhklphy**.

## OpenBack v0.36.128 - Organized 3D Rail and Air Operations

- Restored visible rail lines beneath regular and camouflaged fuel trains in 3D matches by shading the authoritative track layout directly onto raised terrain.
- Increased only the 3D train-car spacing so engines and carriages remain organized and readable in perspective while preserving the established 2D train layout.
- Restored floating train and military-fuel gold rewards in 3D at every playable camera distance.
- Prevented low-flying Aircraft from attempting to land on terrain above their flight clearance in 3D, with a clear rejection message while keeping all 2D Aircraft landing rules unchanged.

Created by **frootz jhklphy**.

## OpenBack v0.36.127 - Classic Models and Living 3D Seas

- Restored the established OpenBack and OpenFront 2D unit and structure artwork across both 2D and 3D matches, including Cities, Ports, Factories, defenses, ships, custom Aircraft, Tanks, Runways, Military Bases, MANPADs, Tank Mines, railways, regular trains, and camouflaged fuel trains.
- Kept nuclear projectiles visually unique as compact sun-like fireballs with animated flame coronas while preventing their sprite geometry from covering the battlefield.
- Rebuilt 3D water with raised moving swells, cyan depth, animated white breaking foam, shoreline masking, and smooth motion that never draws water through inland terrain.
- Added an authoritative day-and-night cycle to 3D matches, with darker night lighting and deterministic high tides that temporarily cover only low ocean-facing coastline before restoring its previous terrain and owner during daylight.
- Added deterministic sea currents to 3D Transport Ships, Trade Ships, and Warships so favorable headings provide a modest speed increase and opposing headings provide a modest slowdown without changing any 2D match movement.
- Made low-flying Aircraft in 3D matches deterministically route around terrain above their flight clearance while preserving the established direct Aircraft path in 2D.
- Batched coastline discovery and tide transitions so large maps do not perform a single blocking full-map rewrite.

Created by **frootz jhklphy**.

## OpenBack v0.36.126 - Living War Table

- Began OpenBack's new 2D Living War Table presentation with stable terrain relief, material detail, coastline depth, and animated world-space water that remains fixed to the map while panning.
- Replaced circular structure markers with distinct grounded top-down miniatures, deterministic construction assembly, owner-color panels, and matching placement previews while preserving counts, levels, readiness, and progress bars.
- Rebuilt ships, trains, aircraft, tanks, shells, and missiles as heading-aware top-down war-table miniatures while retaining curved routes, player visibility, missile smoothing, launch smoke, tank self-destruction, fuel trains, SAM behavior, and established layer order.
- Bounded decorative battlefield effects in a fixed-capacity lifecycle pool so repeated impacts, crashes, sinking ships, dust, smoke, and destruction cannot grow without limit during long matches; reduced-motion players skip optional debris.
- Unified 2D routes, trails, ranges, labels, progress indicators, and nuclear warnings around restrained tactical overlay limits while preserving the established Atom and Hydrogen Bomb radii and all targeting behavior.
- Added a responsive opaque command-console HUD system with compact spacing, tabular resources, semantic ally/enemy/local states, clearer build affordability, keyboard focus, and mobile wrapping without changing any controls.
- Added hysteresis-based adaptive 2D quality tiers that respond only to sustained rendering load, recover slowly, and reduce decorative detail rather than borders, names, targets, units, or gameplay information.
- Closed Antarctica's irregular southern 3D land boundary with terrain-following opaque geometry, removing the hollow black gap without changing 3D cameras, relief, units, input, or overlays.
- Added exhaustive miniature coverage and projection-safety regression gates so every canonical visible unit has a valid rendering path and invalid visual geometry is rejected before reaching the GPU.
- Made hosted restarts and rolling deployments shut down OpenBack cleanly, preventing the game server from being stranded when Render replaces an instance.
- Preserved territory readability, map interaction, simulation, balance, multiplayer synchronization, and the existing 3D presentation.

Created by **frootz jhklphy**.

## OpenBack v0.36.125 - Accurate Nuclear Targeting

- Matched Atom Bomb targeting and explosion presentation to its real 12-tile solid impact area and 30-tile dashed outer radius.
- Matched Hydrogen Bomb targeting and explosion presentation to its real 80-tile solid impact area and 100-tile dashed outer radius.
- Kept MIRV warhead explosion artwork inside its real 18-tile dashed outer radius, preventing any nuclear effect from implying damage beyond the simulation.

Created by **frootz jhklphy**.

## OpenBack v0.36.124 - OpenFront v0.33.4 and Tactical Clarity

- Integrated the complete published OpenFront v0.33.4 release, including stacked structure and nuke actions, same-tick nuke launch protection, Solo match archives, replay privacy fixes, Doomsday territory rot, refreshed statistics, corrected Las Vegas terrain, and improved anonymous names.
- Restored exact OpenFront 2D bomb targeting with the translucent inner blast area, solid inner boundary, and animated dashed outer radius for the entire flight.
- Kept the Hydrogen Bomb's real 80/100-tile gameplay radii independent from renderer scale, preventing presentation changes from altering damage or multiplayer simulation.
- Added safe 3D target projection that retains the same world-space bomb radii while rejecting invalid behind-camera geometry before it can cover or hide the battlefield.
- Unified OpenBack menus, dialogs, actions, warnings, and focus states around a shared navy, cyan, green, amber, and red tactical presentation system with reduced-motion support.
- Regenerated the corrected Las Vegas Strip preview with the release map pipeline so the published map card matches the shipped terrain on every platform.

Created by **frootz jhklphy**.

## OpenBack v0.36.123 - Complete 3D Battlefield Visibility

- Restored country names, flags, troop counts, structures, mobile units, construction bars, and tactical text throughout 3D matches by repairing the classic overlay projection and keeping labels screen-facing.
- Closed raised terrain along every map boundary with an opaque terrain-matched skirt, so Antarctica and other irregular southern edges no longer expose a hollow or transparent gap above the board.
- Limited Runway and Military Base deployment-radius previews to direct pointer contact with their visible structure artwork instead of activating anywhere inside the wider stacking distance.
- Added perspective safety checks for unit, structure, and bar geometry so rapid 3D camera movement cannot expand invalid overlay vertices across or hide the battlefield.

Created by **frootz jhklphy**.

## OpenBack v0.36.122 - Parked Vehicle Readiness and Tank Defenses

- Added a pulsing owner-colored ground glow beneath Tanks waiting at Military Bases and Aircraft loading or waiting at Runways; the glow clears immediately when the vehicle launches or is destroyed in both 2D and 3D mode.
- Made completed hostile Defense Posts slow Tanks inside their coverage by one-third without stacking, giving defenders time to react while Tanks remain able to advance through and destroy the post.
- Preserved Tank Mines as the dedicated instant Tank counter and locked Tank immunity to Atom Bomb, Hydrogen Bomb, and MIRV blast deletion across the deterministic simulation.

Created by **frootz jhklphy**.

## OpenBack v0.36.121 - Stable World Matches and Restored Build Shortcuts

- Fixed the complete simulation freeze that could stop large World matches after several minutes when nation AI evaluated tank routes across extensive borders.
- Replaced repeated full-map tank route searches with one deterministic connectivity pass and a priority-queue pathfinder, preserving the same destinations and multiplayer simulation while making the reproduced 400-bot match complete normally.
- Restored Shift+1 through Shift+6 build shortcuts for Aircraft, MANPAD, Runway, Military Base, Tank, and Tank Mine after the input-handler update dropped the added OpenBack units.

Created by **frootz jhklphy**.

## OpenBack v0.36.120 - Reliable In-Flight Bomb Targets

- Restored the large green OpenFront landing telegraph after an Atom Bomb or Hydrogen Bomb has already been launched.
- Kept the translucent inner blast area, solid inner circle, and animated dashed outer circle visible for the complete flight by isolating OpenFront's original 2D warning renderer from OpenBack's 3D projection path.
- Made each frame preserve a stable active-unit snapshot for bomb destinations in both 2D and 3D while preserving bomb damage, timing, interception, and multiplayer simulation.

Created by **frootz jhklphy**.

## OpenBack v0.36.119 - Restored OpenFront Bomb Flight Preview

- Restored OpenFront's original Atom Bomb and Hydrogen Bomb placement presentation: the curved white dashed path from the active missile silo to the selected target.
- Removed OpenBack's replacement compact target crosshair and restored the real outer blast-radius placement preview.
- Preserved OpenFront's colored moving bomb marker at the head of the flight trail and its original in-flight target circles.
- Kept the same trajectory, projectile, target, and radius behavior in both 2D and 3D mode without changing bomb gameplay or damage.

Created by **frootz jhklphy**.

## OpenBack v0.36.118 - Restored OpenFront Bomb Targets

- Restored OpenFront's original in-flight bomb target visualization: the translucent inner blast area, solid inner boundary, and animated dashed outer radius.
- Own bomb targets are green, allied targets are yellow, and enemy targets are red exactly as in the established OpenFront renderer.
- Applied the same target shader and real gameplay radii to both 2D and 3D mode without changing bomb damage, interception, or multiplayer simulation.
- Preserved the separate aircraft and tank route visuals added by OpenBack.

Created by **frootz jhklphy**.

## OpenBack v0.36.117 - Classic Units in 3D

- Replaced the mismatched 3D unit and structure meshes with OpenBack's established 2D artwork while keeping the battlefield terrain in 3D.
- Restored the classic placement previews, stacking feedback, construction bars, unit counts, missiles, paths, ranges, and combat effects in 3D mode.
- Made ships turn along every segment of a curved route so their bow always faces their current movement direction instead of staring at the final destination.
- Kept ship trails attached to the 3D water and colored with the sending player's color, matching the established 2D presentation.
- Preserved the deterministic simulation, multiplayer results, and classic 2D renderer.

Created by **frootz jhklphy**.

## OpenBack v0.36.116 - Living 3D Battlefield

- Made leaderboard player focus move into a tactical view and pulse that player's complete territory with a bright cyan-white border for three seconds.
- Rebuilt the ocean as a dense, animated 3D wave surface while keeping wave crests below coastlines, and replaced hollow-looking southern map edges with an opaque rock underside.
- Replaced flat disaster particles with animated volumetric 3D geometry for natural disasters, Living World terrain events, disaster warnings, and strategic objectives whenever 3D mode is enabled.
- Preserved the established deterministic modifier simulation, multiplayer results, classic 2D renderer, and gameplay rules.

Created by **frootz jhklphy**.

## OpenBack v0.36.115 - Clear 2D Bomb Targets

- Replaced the enormous Atom Bomb and Hydrogen Bomb placement-radius overlay with a compact green landing reticle that stays readable at every 2D zoom level.
- Kept the landing reticle visible while bombs are in flight without drawing their real damage radius across the map.
- Preserved the established Atom Bomb and Hydrogen Bomb damage, simulation, interception, and multiplayer behavior; this release changes only their 2D targeting visuals.

Created by **frootz jhklphy**.

## OpenBack v0.36.114 - Restored Bomb Destinations

- Restored a compact, clearly visible final-destination reticle for every in-flight Atom Bomb, Hydrogen Bomb, and MIRV warhead.
- Kept real blast radii as readable outlines so large Hydrogen Bomb warnings no longer cover the battlefield with an opaque surface.
- Kept destination colors tied to player relations while preserving the distinct aircraft and tank targeting visuals.

Created by **frootz jhklphy**.

## OpenBack v0.36.113 - Stable Railroad Rendering

- Fixed an invalid railroad terrain-texture connection that could fail every WebGL frame after railroads appeared, causing severe slowdown and eventually leaving the battlefield frozen while match time continued.
- Shared one live terrain texture across railroads and map effects so terrain changes remain synchronized without duplicate GPU uploads.
- Verified sustained live matches keep the battlefield, borders, destination warnings, and HUD rendering after the previous freeze window.

Created by **frootz jhklphy**.

## OpenBack v0.36.112 - Complete Visible Features

- Audited the visible account, profile, friends, chat, clan, Store, Tribe, ranked, game-history, News, Tutorial, Blog, legal, and support surfaces against their local OpenBack implementations.
- Removed dead currency top-up actions that led players to an empty Packs page; insufficient balances now give a clear in-game message and can be earned through play.
- Added an automated release contract that prevents browser-native popups, unfinished payment panels, and missing local routes from returning unnoticed.

Created by **frootz jhklphy**.

## OpenBack v0.36.111 - Complete Tribe Service

- Made purchased Tribe names persist with their owner, moderation status, boosts, and appearance history across server restarts.
- Added unique-name validation and inappropriate-name filtering before Store currency is spent.
- Added working Tribe purchases, 30-day boosts, owned-name management, public statistics pages, and the global Tribe leaderboard.
- Connected purchased names to real multiplayer bot tribes, prioritizing names owned by players in the lobby and applying active boost weighting.
- Made completed matches update Tribe game and player-reach statistics exactly once, with instant Store balance and owned-name refreshes.

Created by **frootz jhklphy**.

## OpenBack v0.36.110 - Native OpenBack Dialogs

- Replaced the remaining browser-generated store and reward popups with consistent OpenBack success, warning, and error dialogs.
- Kept purchase, login-required, checkout, and reward feedback inside the game interface so browser or language settings cannot replace it with mismatched system UI.

Created by **frootz jhklphy**.

## OpenBack v0.36.109 - Stable Nuclear Warnings

- Kept the Hydrogen Bomb's established gameplay damage while changing its in-flight warning to readable outlines instead of a map-covering green surface.
- Prevented invalid effect radii and projection values from creating screen-sized geometry.
- Made failed WebGL frames recover on the next animation frame instead of permanently freezing borders, names, effects, and the battlefield while the match continues.
- Corrected WebGL context-loss recovery so restored games rebuild their live terrain and tactical state rather than losing the renderer a second time.

Created by **frootz jhklphy**.

## OpenBack v0.36.108 - Complete Battle Artwork

- Restored the full OpenBack battlefield artwork with its larger collection of aircraft, ships, tanks, missiles, structures, routes, and explosions while removing the tank that appeared in the water.
- Made the defeat screen preserve the complete artwork instead of cropping its outer edges.

Created by **frootz jhklphy**.

## OpenBack v0.36.107 - Complete 3D Battlefield Parity

- Raised all 3D land relief by 50% through one canonical terrain-height contract shared by terrain interaction and the remaining 3D parity work.
- Added a complete cyan ocean surface with animated world-space waves, removed broad terrain-lighting and chunk-LOD bands, and made radioactive ground remain clearly dark green after a blast.
- Corrected transports, warships, and trade ships so their bows face their movement direction instead of travelling sideways, stay anchored to the water plane, and no longer inherit nearby land height.
- Unified terrain and unit surface smoothing so buildings, previews, shadows, and moving units remain stable instead of jumping or floating across terrain-detail boundaries.
- Locked 3D names, flags, troop counts, structure levels, and world text to the battlefield's real camera scale so zoom limits cannot enlarge UI into screen-covering blocks.
- Removed colored glyph boxes from 3D player labels and culled unsafe behind-camera tactical geometry so blasts, fallout, ranges, paths, and selection effects cannot stretch across the whole screen.
- Made 3D overview fitting account for the full map width, height, terrain relief, camera angle, and screen aspect ratio so partial edges such as Antarctica remain inside the battlefield.

Created by **frootz jhklphy**.

## OpenBack v0.36.106 - Clean Profile Identity

- Replaced raw profile flag text with the player's selected flag in the bottom-right corner of the profile banner.
- Removed the remaining blue selector outlines and browser hover tooltips while preserving the clean flag and cosmetic pop-out response.

Created by **frootz jhklphy**.

## OpenBack v0.36.105 - Reliable Social Connection

- Connected Friends, parties, invitations, presence, and chat through the local OpenBack gateway so those features no longer fail while the rest of the game remains connected.
- Prevented account refreshes from leaving duplicate social reconnect attempts behind.

Created by **frootz jhklphy**.

## OpenBack v0.36.104 - Stable 3D Battlefield

- Stopped the 3D camera from shaking over changing terrain and made left-drag movement use the same direct screen translation as the regular battlefield, rotated only when the player rotates the board.
- Restored the earlier balanced terrain relief, kept complete partial map edges such as Antarctica, removed ocean chunk seams, and retained automatic 3D terrain generation for every map size.
- Fixed 3D perspective projection for fallout, nuclear effects, trajectories, ranges, selection markers, movement indicators, and combat effects so local effects can no longer stretch across the entire screen.
- Kept player names, flags, verification marks, troop counts, structure levels, and world text at readable screen sizes across the complete zoom range.

Created by **frootz jhklphy**.

## OpenBack v0.36.103 - Clean Home Selectors

- Removed the blue focus outline from Select Flag and Select Cosmetic while preserving their matching hover and press feedback.

Created by **frootz jhklphy**.

## OpenBack v0.36.102 - Real 3D Battlefield Models

- Replaced the temporary primitive unit bodies in 3D World with locally bundled low-poly models for every ship, projectile, bomb, building, train, runway, aircraft, launcher, tank, and mine.
- Made placement previews use the same real model that is placed on the battlefield, while keeping white valid and gray blocked placement feedback.
- Added a validated model loader with cached downloads, strict GLB parsing, local hashed assets, and deterministic missing-asset handling instead of silently restoring crude cube-like bodies.
- Preserved owner colors, unit heading, terrain anchoring, construction pulses, plane banking, ship movement, and the existing 2D simulation and multiplayer behavior.

Created by **frootz jhklphy**.

## OpenBack v0.36.101 - Visible 3D Construction

- Restored every structure to the 3D battlefield alongside mobile units, including stacked structure levels and construction or reload progress bars.
- Added the live 3D placement model at the exact validated build tile, using a bright white preview for valid placement and a gray preview where placement is blocked.
- Made structures visibly pulse while they are being assembled instead of appearing as silent transparent placeholders.
- Matched the Select Flag and Select Cosmetic controls with borderless styling, consistent hover lift, and keyboard-visible focus feedback.

Created by **frootz jhklphy**.

## OpenBack v0.36.100 - Precise 3D Control and Territory Locator

- Expanded the 3D tactical zoom range and made the camera follow local terrain height, allowing much closer inspection without clipping peaks or exposing the board underside.
- Stabilized close-range left-drag movement on a fixed camera plane so detailed terrain can no longer shake the camera while panning.
- Removed visible cracks and distant z-fighting bands by keeping neighboring mesh edges compatible and separating the solid board base from the playable terrain, while retaining zoom-adaptive quality.
- Doubled 3D terrain relief while keeping terrain, units, effects, spawn markers, and pointer targeting synchronized to the same height model.
- Restored the established 2D presentation for names, troop counts, flags, status icons, structure levels, and world numbers while keeping every label anchored to its 3D position.
- Preserved the chosen camera position after manual 3D spawning instead of automatically pulling the view elsewhere.
- Made leaderboard selection blink the chosen player's territory outline for three seconds in both 2D and 3D, making the local player and other nations easy to identify.

Created by **frootz jhklphy**.

## OpenBack v0.36.99 - Tabletop Camera Foundation

- Rebuilt the 3D camera around one finite perspective projection shared by pointer picking and world positioning, preventing inverted views and unstable near-plane behavior.
- Kept the camera physically above the highest terrain across the full orbit and zoom range while preserving short right-click menus.
- Made left-dragging follow the picked ground point instead of using angle-dependent screen deltas, so movement stays attached to the tabletop at shallow and steep views.
- Replaced the moving terrain sheet with fixed world-anchored chunks, stable level-of-detail transitions, a solid underside, and protected map edges so terrain no longer flickers, tears, or disappears while moving and zooming.
- Rebuilt the complete unit catalog as reusable stylized 3D geometry matching OpenBack's silhouettes, owner colors, proportions, and animated parts, with cheaper distant versions that preserve gameplay visibility.
- Unified names, flags, troop counts, paths, ranges, spawn markers, fog, nuclear warnings, and world events under the same 3D projection so tactical information stays attached to its real map position.
- Added adaptive 3D rendering that reduces only terrain subdivision, distant model detail, and particle density during heavy frames while retaining full simulation, visibility, labels, paths, ranges, and effects.
- Capped 3D labels, flags, and status icons to a readable screen size and kept them upright through every camera angle without changing the established 2D presentation.

Created by **frootz jhklphy**.

## OpenBack v0.36.98 - Persistent Player Identity

- Added optional account profile pictures with automatic square cropping, persistent storage, and the updated circular OB logo as the reliable default everywhere.
- Showed profile pictures beside player names across the Profile button, public profiles, friends, clans, Ranked ladders, lobbies, and live match leaderboards without affecting deterministic gameplay.
- Made the first recorded death on a signed-in account show the Need Help tutorial once across every device; all later deaths show the OpenBack battle artwork in the same 16:9 frame.
- Made guests see the tutorial once per open page, resetting naturally when OpenBack is closed and reopened.
- Removed the Profile button's permanent loading spinner and kept the profile name visible beside the resolved avatar.

Created by **frootz jhklphy**.

## OpenBack v0.36.97 - Accurate Profile Status

- Removed the stuck loading indicator from the Profile button as soon as account authentication finishes, so signed-in profiles no longer appear to be loading forever.

Created by **frootz jhklphy**.

## OpenBack v0.36.96 - Continuous 3D Zoom

- Kept the current battlefield target locked while zooming in 3D, so scrolling over water, fog, interface panels, or sky can no longer pull the entire map out of view.
- Expanded terrain coverage for every camera rotation and viewport shape, preventing the ground from disappearing at intermediate, close, or distant zoom levels.
- Added full-range zoom and rotated-camera regression coverage for the 3D renderer.

Created by **frootz jhklphy**.

## OpenBack v0.36.95 - Stable 3D Zoom

- Prevented close 3D zoom from clipping the battlefield and leaving only flags or UI markers on a flat background.
- Rebalanced 3D fog particle density, size, and transparency so fog remains visible without merging into an opaque full-screen sheet.
- Synchronized raised terrain height across buildings, units, spawn markers, trajectories, and world-event effects so every layer stays attached to the same surface while zooming.

Created by **frootz jhklphy**.

## OpenBack v0.36.94 - Clearer 3D Battlefield

- Kept the 3D camera above the battlefield across its full forward and backward tilt range, removing the pole-crossing flip that could turn the map upside down.
- Made 3D country names and troop counts clean, screen-facing labels without the heavy colored blocks around each character.
- Increased visible elevation and restored distinct green lowlands, exposed rocky slopes, and snowy high peaks even inside player territory.
- Added a clear, working **Select Cosmetic** control that opens the Store, so the identity row no longer contains an unexplained blank square.

Created by **frootz jhklphy**.

## OpenBack v0.36.93 - Distinct Store Collection

- Extended the Store uniqueness pass across every catalog section instead of limiting it to wraps.
- Rebuilt all six crowns as separate silhouettes with their own shapes, symbols, gems, detailing, rarity, and wallet price.
- Curated item-specific rarity and pricing across the fictional-flag collection while preserving every flag's original artwork and attribution.
- Verified that every flag, skin, crown, and effect has distinct artwork or behavior and added protection against future recolor-only duplicates.

Created by **frootz jhklphy**.

## OpenBack v0.36.92 - Complete Ranked and Distinct Cosmetics

- Added dedicated 3v3 and 4v4 Ranked leaderboard tabs beside the existing 1v1 and 2v2 ladders, with each mode showing its own ratings and match history.
- Kept the verified blue check visible for exactly as long as its highlighted player name remains visible at distance.
- Replaced the dismissible News-page announcement with a permanent compact header explaining the release notes below it.
- Rebuilt all 100 wrap skins with individually composed geometry, details, orientation, rarity, and matching wallet price instead of repeated recolors of the same design.
- Refocused Service Requests on general problems, questions, expectations, and useful troubleshooting details.
- Removed obsolete locked-map presentation so every map category uses the same direct selection behavior.

Created by **frootz jhklphy**.

## OpenBack v0.36.91 - Clean Production Matches

- Removed the failed custom-tribe network request that ran before every public match when no compatible tribe service was configured, eliminating repeated 404 warnings and unnecessary startup work.
- Corrected production identity so the live OpenBack service, workers, and optional telemetry no longer identify themselves as a development OpenFront server.
- Disabled unused remote telemetry work cleanly when no collector is configured and reduced deployment noise without changing gameplay or visual quality.

Created by **frootz jhklphy**.

## OpenBack v0.36.90 - Reliable Artwork

- Fixed broken flag thumbnails, Help illustrations, icons, map previews, and other bundled images after deployments or in older mobile browser tabs.
- Added stable versioned image delivery while preserving the existing high-performance hashed pipeline for maps, audio, and game data.
- Made every Help illustration load as soon as the Help page opens so images no longer remain blank inside mobile scrolling panels.

Created by **frootz jhklphy**.

## OpenBack v0.36.89 - Clean Fast Mobile

- Removed the remaining homepage, in-game, live-stream, Steam, Discord, tutorial, and upstream store-prompt surfaces so the play screen stays focused entirely on OpenBack.
- Removed the obsolete injected mobile-logo layer that could leave oversized or broken branding over the phone interface.
- Added adaptive phone and tablet render resolution plus stable 60 FPS pacing on high-refresh touch screens, keeping every gameplay system and visual effect while reducing GPU load, heat, and frame spikes.
- Shipped the complete responsive phone layout with compact controls, safe-area support, readable cards, and touch-friendly menus instead of the stale desktop-scaled interface.

Created by **frootz jhklphy**.

## OpenBack v0.36.88 - Mobile Everywhere

- Reworked every menu page and modal for phones and tablets with compact responsive headers, horizontally scrollable tabs, safe-area-aware full-height panels, touch-friendly controls, and smoother contained scrolling.
- Fixed narrow-phone clipping in player names and clan tags, prevented lobby modifiers from colliding with start timers, and made public-game cards easier to read without hiding their details.
- Rebuilt the mobile footer and language placement so legal links and controls wrap cleanly without overlap, and removed the footer from focused setup, account, store, clan, Ranked, and content pages to restore the full usable screen.
- Improved short-screen navigation, iOS keyboard behavior, tap responsiveness, and modal spacing while preserving the existing desktop layout and gameplay quality.

Created by **frootz jhklphy**.

## OpenBack v0.36.87 - Clean Mobile Home

- Removed homepage announcement and warning banners and moved compatibility notices and important announcements into the dedicated News page.
- Removed the oversized decorative OB background that overlapped the home controls during startup and corrected the mobile header to use the real OpenBack logo.
- Rebuilt phone lobby browsing as a compact swipeable carousel, tightened the identity and action controls, and wrapped the compact footer cleanly while preserving access to legal pages and language selection.
- Removed the unrelated mobile store promotion from the OpenBack home screen so the first view stays focused on playing.

Created by **frootz jhklphy**.

## OpenBack v0.36.86 - Anchored 3D Battlefield

- Locked 3D terrain geometry to the world so hills and coastlines no longer reshape or swim when the camera moves.
- Increased mountain and high-ground elevation and strengthened stable terrain shading so relief remains readable from overhead views.
- Kept the camera above the battlefield while allowing vertical orbit to continue past the top-down position instead of stopping there or exposing the underside of the map.
- Rebuilt composite unit grounding so bodies, turrets, chimneys, wings, and other connected parts stay assembled on sloped terrain, with cleaner matte materials for stronger silhouettes.
- Reprojected player names, flags, and status icons as straight screen-facing UI anchored by exact 3D perspective, removing skewed text and uneven spacing while the camera moves.

Created by **frootz jhklphy**.

## OpenBack v0.36.85 - Stable 3D Terrain and Routes

- Rebuilt the 3D terrain as a continuous opaque floor with stable topology, smoother coast transitions, stronger mountain elevation, matte lighting, and the same readable territory colors as classic 2D.
- Removed reflective contour and distance-light effects that caused flashing while moving the camera, while keeping snow, high ground, water depth, and neutral terrain visually distinct.
- Projected live ship trails and aircraft destination routes through the real 3D battlefield so their paths stay on the correct terrain instead of lagging behind or sliding across land.
- Kept player spawn markers circular and anchored them to the actual terrain height, with upright screen-facing player information throughout camera movement.
- Expanded the camera's forward and backward tilt range, corrected vertical orbit direction, and made a short right-click open the normal gameplay menu while a held right-drag continues to move the camera.
  Created by **frootz jhklphy**.

## OpenBack v0.36.84 - Complete 3D Gameplay View

- Restored ship routes, railways, targeting paths, range indicators, build previews, selections, and combat effects in 3D World so tactical information matches the classic 2D game.
- Split the right mouse gesture cleanly: a normal right-click opens the gameplay menu while a deliberate right-drag orbits the 3D camera.
- Reworked the 3D terrain into a cleaner tabletop surface with broader smoothing, restrained ordinary relief, clearly elevated impassable ridges, safer camera angles, and a dark classic-style surround without the detached painted horizon.
- Kept spawn markers as crisp screen-facing circles and synchronized the increased terrain relief across units, structures, world events, and mouse targeting.
- Kept multiplayer, Ranked, parties, invite links, public lobbies, and every Frootz map directly available from their normal game menus.
- Made the blue verified-name mark work for signed-in email accounts, proving that the reserved displayed username belongs to that account.
- Removed the Source and Licenses homepage news banner while retaining the required notices in OpenBack's legal and source pages.
- Corrected the 3D map's vertical camera basis so geography, labels, models, spawn markers, effects, mouse targeting, and drag movement preserve the same orientation as the 2D battlefield.

Created by **frootz jhklphy**.

## OpenBack v0.36.83 - Complete OpenBack Store

- Removed the OpenFront merchandise destination and unsupported empty catalog sections from the Store.
- Made Cosmetics the Store landing section and added six purchasable OpenBack crowns with clear rarity and price progression.
- Filled every effects category with purchasable OpenBack visuals, including ship wakes, nuclear trails, Atom Bomb, Hydrogen Bomb, and MIRV explosions, animated structures, and warship finishes.
- Completed wallet support for crowns and effects and replaced blank effect panels with a clear catalog message if a future category has no available items.
- Corrected the local OpenBack API fallback so Store inventory, profiles, and other self-contained services load through the running game instead of an unused legacy port.

Created by **frootz jhklphy**.

## OpenBack v0.36.82 - Solid 3D Battlefield

- Replaced the 3D renderer's screen-space projection with true perspective depth and near-plane clipping so terrain, player territory, units, and structures no longer stretch into broken triangles while orbiting or zooming.
- Rebuilt aircraft wings as closed solid geometry, doubled the smoothness of round units, closed cylinder and cone bases, replaced faceted projectile balls with smooth spherical meshes, and locked every model part to its parent while turning.
- Raised contiguous impassable terrain into bright, readable wall ridges while smoothing isolated height noise so mountain barriers remain dramatic without needle spikes.
- Integrated the ocean floor with a camera-aware horizon and skybox: the sky appears naturally when the camera is lowered and remains outside the view while looking down from above.
- Corrected the inverted camera basis that made the world resemble a hanging 2D sheet: the battlefield is now a horizontal floor below the camera, distant land converges toward the upper horizon, and elevated terrain rises toward the viewer.
- Rebuilt tabletop navigation so left-drag stays attached to the foreshortened floor, right-drag orbits and tilts above it, and wheel zoom preserves the exact ground point under the cursor.

Created by **frootz jhklphy**.

## OpenBack v0.36.81 - Living 3D World

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

## OpenBack v0.36.80 - Expanded World Update

- Added 22 maps, including Sol, Russia, the United States, Germany, China, France, Vietnam, Scandinavia, the Baltics, Crimea, and new arcade battlefields, while keeping every Frootz map available.
- Added impassable terrain, the Doomsday Clock mode, stronger surviving warships through veterancy, and fully flying MIRV warheads that SAM launchers can intercept.
- Expanded Ranked with a separate 2v2 ladder, safer match cancellation when players fail to join, live queue feedback, and more reliable reconnection while preserving OpenBack's 3v3, 4v4, and friend-party play.
- Added verified account usernames, shareable profiles, richer game statistics, graphics presets, terrain color controls, and expanded cosmetic effects while retaining OpenBack's email-first accounts.
- Integrated major simulation, renderer, memory, map-loading, pathfinding, matchmaking, and anti-cheat improvements from the OpenFront v0.33 engine update without removing OpenBack's aircraft, tanks, disasters, social systems, persistent accounts, or custom maps.
- Kept the imported menus and translations consistently branded as OpenBack, without outdated alpha labels.

Created by **frootz jhklphy**.

## OpenBack v0.36.79 - Social Request Alerts

- Added a live pulsing Profile alert when an invitation popup goes unanswered, followed by a pulsing Friends tab that guides players to the saved request.
- Made the alert clear immediately when the request is viewed, answered, declined, or canceled.

Created by **frootz jhklphy**.

## OpenBack v0.36.78 - Instant Social Parties and Team Play

- Added shareable friend links that open OpenBack directly to an add-friend confirmation.
- Made friend requests, online status, party invitations, cancellations, and persistent friend and clan chat update live without refreshing.
- Added 2-4 player parties beside Profile, five-second invitation popups, pending request controls, public friend profiles, last-online times, and account blocking.
- Rebuilt team Ranked so party members accept before queueing, partial parties can receive matched teammates, searching can be canceled, and oversized parties cannot enter smaller modes.
- Gave every Ranked teammate a separate allied country and changed team victory to 80% map control.
- Added host-assigned, player-choice, and auto-balanced private-lobby team setup, including a host waitlist and direct team transfers.
- Prevented blocked players from sending requests or invitations and from joining games hosted by the player who blocked them; hosts can block and remove a lobby member in one action.

Created by **frootz jhklphy**.

## OpenBack v0.36.77 - Reliable Ranked Friend Parties

- Matched every Ranked team-choice button to OpenBack's standard sizing and visual style.
- Prevented incomplete friend parties from entering matchmaking and limited party membership to confirmed friends.

Created by **frootz jhklphy**.

## OpenBack v0.36.76 - Restart-Safe Player Data

- Made accounts, profiles, ranked progress, cosmetics, clans, friends, chats, and completed match history survive normal server restarts.
- Kept sign-in sessions stable when OpenBack restarts.
- Saves pending permanent player-data changes before planned maintenance.

Created by **frootz jhklphy**.

## OpenBack v0.36.75 - Ranked Friend Parties

- Fixed Ranked with Friends so it opens a real friend-party lobby instead of entering team matchmaking immediately.
- Added direct friend selection and kept ranked matchmaking locked until every party slot is filled.
- Restyled ranked choices, party controls, and invitations to match the rest of OpenBack.

Created by **frootz jhklphy**.

## OpenBack v0.36.74 - Updated OpenBack Emblem

- Replaced the previous OB emblem across the game, account screens, browser icons, installable-app icons, and shared-link previews with the updated circular design.
- Kept every logo variant sharp and correctly sized for its placement.

Created by **frootz jhklphy**.

## OpenBack v0.36.73 - Player-Focused News

- Rebuilt News as a concise history of features, balance changes, visual improvements, and fixes that matter to players.
- Removed entries that do not describe something players can see or use.

Created by **frootz jhklphy**.

## OpenBack v0.36.72 - Resource Display Polish

- Improved personal resource formatting across the in-game HUD, leaderboard, and player information panel.

Created by **frootz jhklphy**.

## OpenBack v0.36.71 - Fictional Flags and Color Wraps

- Added 150 fictional flags to the shop.
- Added 100 original standalone color-wrap territory skins.
- Kept the expanded catalog lightweight and quick to browse.

Created by **frootz jhklphy**.

## OpenBack v0.36.69 - Matching Legal Typography

- Matched the Privacy Policy and Source and Terms typography to the Tutorials and Blog panels.

Created by **frootz jhklphy**.

## OpenBack v0.36.68 - Easier Service Requests

- Made the Service Request button open a prepared browser-based support message.
- Kept clear reminders never to share passwords or verification codes.

Created by **frootz jhklphy**.

## OpenBack v0.36.67 - Stable Starts and Unified Pages

- Fixed match-start problems that could move an established nation or corrupt a lobby listing.
- Reduced home-screen startup work so closed panels no longer slow initial loading.
- Unified the Privacy Policy and Source and Terms pages with OpenBack's normal layout and back navigation.

Created by **frootz jhklphy**.

## OpenBack v0.36.66 - Consistent Legal Navigation

- Replaced stale Return to OpenBack links with the same compact back arrow used throughout the game.
- Made the current Privacy and Terms pages appear reliably after updates.

Created by **frootz jhklphy**.

## OpenBack v0.36.65 - Reliable Page Switching

- Fixed navigation between Privacy, Source and Terms, Tutorials, and Blog.
- Kept outside links from replacing OpenBack's page interface.

Created by **frootz jhklphy**.

## OpenBack v0.36.64 - Focused Home and Legal Pages

- Removed the rotating warning strip from the home screen.
- Restyled Privacy and Terms as clean, responsive OpenBack panels.

Created by **frootz jhklphy**.

## OpenBack v0.36.63 - Unobstructed Home Screen

- Removed the browser-performance warning banner from the home screen.

Created by **frootz jhklphy**.

## OpenBack v0.36.62 - Cleaner Main Navigation

- Removed duplicated page links from the main menu while keeping them available in the footer.
- Kept the main navigation focused on playing, social features, settings, News, and accounts.

Created by **frootz jhklphy**.

## OpenBack v0.36.57 - Service Requests

- Added a Service Request contact beside the footer links for general problems, questions, and account help.
- Prepared a useful support message while warning players not to share private sign-in information.

Created by **frootz jhklphy**.

## OpenBack v0.36.55 - Giant-Match Stability

- Improved long 400-bot matches so territory growth no longer causes severe late-game stalls.
- Kept the same visual quality, game rules, and simulation results.

Created by **frootz jhklphy**.

## OpenBack v0.36.54 - Smoother Long Matches

- Reduced idle CPU use, repeated-match slowdown, reconnect freezes, and natural-disaster frame spikes.
- Reduced initial loading work while preserving gameplay and visual quality.

Created by **frootz jhklphy**.

## OpenBack v0.36.53 - Clearer Combat HUD and Living Disasters

- Restored the compact build bar and cleaner player-unit overview.
- Matched every added unit's placement snapping to established structures.
- Removed duplicated fog reveal blobs.
- Rebuilt tsunamis with moving waves, foam, and ripples, and tornadoes with funnels, wind, and debris.
- Reduced extreme-event overdraw for smoother starts and matches.

Created by **frootz jhklphy**.

## OpenBack v0.36.51 - Compact Player Board and Reliable Cosmetics

- Restored the desktop build bar to a compact single-row layout.
- Made the player board fit more information in less space.
- Fixed collectible flags that failed to load.
- Gave Legendary, Mythic, and Ultra cosmetics distinct premium effects.

Created by **frootz jhklphy**.

## OpenBack v0.36.49 - Minimum Ranked Win Gain

- Guaranteed at least 10 OB for every ranked victory.
- Kept the maximum ranked victory gain at 500 OB.

Created by **frootz jhklphy**.

## OpenBack v0.36.48 - Fair Even-Match OB

- Awarded exactly 50 OB when a 100 OB player defeats another 100 OB player.
- Preserved larger upset rewards and smaller rewards for expected victories.

Created by **frootz jhklphy**.

## OpenBack v0.36.47 - High-Stakes OB Upsets

- Capped one-match ranked gains at 500 OB.
- Made losses grow when a strong favorite loses to a major underdog.
- Kept expected wins and underdog losses small.

Created by **frootz jhklphy**.

## OpenBack v0.36.46 - Nation-Count Reward Rules

- Applied the same minimum nation-count requirement to Solo and multiplayer rewards.
- Awarded 100 caps for finishing and 200 total for winning when the match meets that requirement.

Created by **frootz jhklphy**.

## OpenBack v0.36.45 - Solo Match Rewards

- Added completion and victory cap rewards to qualifying Solo matches.

Created by **frootz jhklphy**.

## OpenBack v0.36.44 - OB Ranked Progression

- Renamed ranked rating to OB and started new ranked players at 0 OB.
- Made upsets award more and expected wins award less.
- Added cap rewards for OB milestones and removed the unused second store currency.

Created by **frootz jhklphy**.

## OpenBack v0.36.43 - Earnable Store Collection

- Added cap rewards for completed matches and victories.
- Added 12 territory skins and 10 collectible flags.
- Added Mythic and Ultra rarities with stronger visual effects.

Created by **frootz jhklphy**.

## OpenBack v0.36.42 - Legal Navigation Tabs

- Added Terms of Service and Privacy Policy beside Tutorials and Blog.
- Opened these pages inside OpenBack instead of separate browser tabs.

Created by **frootz jhklphy**.

## OpenBack v0.36.41 - Clear Browser Title

- Shortened the browser-tab title to OpenBack.

Created by **frootz jhklphy**.

## OpenBack v0.36.40 - Private Anonymous Profiles

- Kept anonymous profile details hidden until the player signs up or logs in.
- Revealed saved identity, cosmetics, clans, currency, and history together after linking the account.

Created by **frootz jhklphy**.

## OpenBack v0.36.39 - Full-Tile Flags

- Made every flag fill its complete tile without an inset preview card.

Created by **frootz jhklphy**.

## OpenBack v0.36.38 - Claim Anonymous Profiles

- Let players link an existing anonymous profile to a new account.
- Preserved the profile's identity, cosmetics, currency, clans, and history.

Created by **frootz jhklphy**.

## OpenBack v0.36.37 - Player-Chosen Teams

- Let players choose teams in team lobbies while keeping automatic balancing available.
- Let party owners arrange lobby teams before the match begins.
- Preserved the chosen teams when the game starts.

Created by **frootz jhklphy**.

## OpenBack v0.36.36 - Compact Two-Row Unit HUD

- Arranged enabled unit controls into two compact rows.
- Remembered dismissal of the end-of-game help popup.

Created by **frootz jhklphy**.

## OpenBack v0.36.35 - Capturable Ready Vehicles

- Made parked planes and tanks transfer to the player who conquers their tile.
- Made bombs destroy parked planes while tanks remain protected from bomb damage.
- Removed parked tanks when their supporting Military Base is destroyed or captured.

Created by **frootz jhklphy**.

## OpenBack v0.36.34 - Unified Stacking Preview

- Made new structures use the same green stacking preview and cursor feedback as established buildings.
- Matched regular structure snapping distance and border behavior.

Created by **frootz jhklphy**.

## OpenBack v0.36.33 - Durable Player Accounts

- Protected profiles, clans, friends, messages, rankings, and match history from disappearing after maintenance or restarts.
- Made account creation and sign-in finish only after progress is safely saved.

Created by **frootz jhklphy**.

## OpenBack v0.36.32 - Clear Hebrew Match Options

- Translated and clarified every Hebrew team format, including duos, trios, quads, and Humans vs Nations.
- Kept Release Notes readable when loading temporarily fails.

Created by **frootz jhklphy**.

## OpenBack v0.36.31 - Social Team Matchmaking

- Added Ranked and With Friends choices for 2v2, 3v3, and 4v4.
- Kept private team lobbies flexible for uneven teams, bots, nations, and shared control.
- Fixed complete flag previews, persistent pending requests, account statistics styling, and match history.

Created by **frootz jhklphy**.

## OpenBack v0.36.30 - Global Friends and Messaging

- Added persistent friend messages, group chats, and clan chat.
- Added friend codes, incoming and outgoing requests, group creation, party entry, and friend removal.
- Added friend requests from signed-in players in leaderboards and clan member lists.

Created by **frootz jhklphy**.

## OpenBack v0.36.29 - Long-Match Runtime Smoothing

- Reduced frame spikes during large attack fronts, border changes, disasters, and sustained conquest.
- Improved late-game stability without changing combat order, outcomes, or active animations.

Created by **frootz jhklphy**.

## OpenBack v0.36.28 - Giant-Map Performance

- Greatly reduced memory use on Grand Earth.
- Reduced large-map startup work and improved 400-bot simulation speed.
- Preserved exact map detail, graphics, gameplay rules, and results.

Created by **frootz jhklphy**.

## OpenBack v0.36.27 - In-App Friend Invitations

- Added persistent friend requests and friend lists.
- Added live invitations from private lobbies and ranked team parties.
- Added clear delivery and acceptance feedback.

Created by **frootz jhklphy**.

## OpenBack v0.36.26 - Long-Match Stability

- Prevented large and long-running matches from consuming excessive browser memory.
- Improved every map size without reducing visual quality or changing map content.

Created by **frootz jhklphy**.

## OpenBack v0.36.25 - Ranked Parties

- Added real 2v2, 3v3, and 4v4 ranked parties with shareable codes and visible teammate slots.
- Let party leaders choose bots and nations before searching.
- Let teammates command one shared country with divided resources.
- Added friend requests from signed-in leaderboard players.

Created by **frootz jhklphy**.

## OpenBack v0.36.24 - Unlimited Naval Routes and Restored Starts

- Let transport ships cross the complete connected ocean without a distance ceiling.
- Restored the cancellable three-second private-lobby start countdown.
- Shortened the transition from countdown to gameplay.

Created by **frootz jhklphy**.

## OpenBack v0.36.23 - Frootz Maps and Global Naval Reach

- Added the Frootz map category.
- Removed short boat and inland-targeting distance limits on connected oceans.
- Kept protection against crossing land or disconnected lakes.

Created by **frootz jhklphy**.

## OpenBack v0.36.22 - Grand Earth and Reliable Starts

- Fixed menus covering a loaded match and improved reconnect behavior.
- Added Grand Earth with 239 named nations.
- Expanded Shattered Expanse to 120 named nations.
- Unified account screens, profile organization, exit dialogs, store skins, and OpenBack branding.

Created by **frootz jhklphy**.

## OpenBack v0.36.21 - Integrated Learning and Clean Map Starts

- Moved Tutorials and Blog into native home-screen panels.
- Fixed selected maps rendering behind the Solo setup screen.

Created by **frootz jhklphy**.

## OpenBack v0.36.20 - Handcrafted Shattered Expanse

- Rebuilt Shattered Expanse from Open Map One with native terrain, continents, inland seas, rivers, peninsulas, and islands.
- Expanded it to 8,192 by 4,608 tiles.

Created by **frootz jhklphy**.

## OpenBack v0.36.19 - Continental Shattered Expanse

- Rebuilt Shattered Expanse for matches approaching 1,000 players.
- Added 15 dominant continents, irregular coastlines, large islands, and broad oceans.

Created by **frootz jhklphy**.

## OpenBack v0.36.18 - Fictional Worlds and Shattered Expanse

- Added 15 playable Fictional maps with nations, spawn locations, previews, and multiplayer support.
- Added the first Shattered Expanse layout for huge island campaigns.

Created by **frootz jhklphy**.

## OpenBack v0.36.17 - Saved Accounts and Public Profiles

- Added separate Sign Up and Log In flows with verification and recovery actions.
- Restored saved names, descriptions, banners, flags, skins, ranked progress, currency, clans, and history.
- Added clear Log Out and double-confirmed Delete My Account actions.
- Added Tutorials and Blog to desktop and mobile navigation.

Created by **frootz jhklphy**.

## OpenBack v0.36.16 - Menu Logo Fix

- Restored the correct OpenBack wordmark and an undistorted B.

Created by **frootz jhklphy**.

## OpenBack v0.36.15 - Unified Identity

- Unified the favicon, app icons, navigation mark, and social preview around the circular OpenBack emblem.
- Removed obsolete community promotions and legacy branding.

Created by **frootz jhklphy**.

## OpenBack v0.36.14 - Cleaner Branding

- Simplified the navigation logo to the OB emblem and OpenBack wordmark.
- Removed visible build numbers, tiny subtitles, alpha labels, and optional promotions.

Created by **frootz jhklphy**.

## OpenBack v0.36.12 - Strategic World Mechanics

- Added encirclement, war exhaustion, strategic objectives, logistics cargo, shared control, fog of war, and natural-disaster modifiers.
- Added earthquakes, tsunamis, tornadoes, radiation storms, economic events, rebellions, and resource discoveries.
- Included optional modifiers in randomized ranked matches.

Created by **frootz jhklphy**.

## OpenBack v0.36.11 - Large-Match Performance

- Reduced work for inactive units, off-screen effects, stale trajectories, labels, and previews.
- Reduced bot-match frame spikes and long-match memory pressure without lowering quality.
- Hid unrelated transports and stale paths, improved high-refresh displays, and synchronized displayed prices.

Created by **frootz jhklphy**.

## OpenBack v0.36.10 - Ranked Multiplayer

- Added ranked matchmaking for multiple simultaneous player pairs.
- Matched each player with the closest available rating.
- Prevented ranked search from closing when the background is clicked.
- Added randomized maps, nations, bots, teams, gold settings, and optional modifiers.

Created by **frootz jhklphy**.

## OpenBack v0.36.9 - Military Logistics Trains

- Added camouflaged fuel trains and rails between nearby Military Bases and Runways.
- Added animated smoke, missile-shaped fronts, cargo movement, and logistics income.

Created by **frootz jhklphy**.

## OpenBack v0.36.8 - Vehicle Effects and Placement

- Added familiar green stacking previews and fixed aircraft and tank placement cursors.
- Added source range previews and improved launch, crash, muzzle, projectile, and explosion effects.
- Differentiated aircraft and tank destination markers.

Created by **frootz jhklphy**.

## OpenBack v0.36.7 - Aircraft Beachheads and Destruction

- Made aircraft crash, create a blast, and deploy surviving troops.
- Added a protected landing window and MANPAD interceptions.
- Improved aircraft movement and added a complete tank self-destruction sequence.

Created by **frootz jhklphy**.

## OpenBack v0.36.6 - Assault Balance and AI

- Taught nations to use all added air and ground units.
- Improved tank navigation, retaliation, and stacked military ranges.
- Fixed impact crashes on owned territory.

Created by **frootz jhklphy**.

## OpenBack v0.36.5 - Tanks, Bases, and Mines

- Added Military Bases, Tanks, and Tank Mines with custom models, sounds, ranges, prices, stacking, and nation support.
- Added armored ground assaults and self-consuming anti-tank mines.

Created by **frootz jhklphy**.

## OpenBack v0.36.4 - Aircraft Refinement

- Made parked Aircraft visible while loading and ready on Runways.
- Improved travel direction, trajectories, silhouettes, outlines, stacking, range, and prices.

Created by **frootz jhklphy**.

## OpenBack v0.36.3 - Aircraft, Runways, and MANPADs

- Added Runways, Aircraft, and MANPADs with placement rules, art, sounds, ranges, and progressive prices.
- Added troop-carrying aircraft, crash deployment, interception, blast effects, and visible trajectories.

Created by **frootz jhklphy**.

## OpenBack v0.36.2 - Accounts, Profiles, and Clans

- Added optional account access with verification codes and recovery flows.
- Added persistent profiles, names, flags, skins, banners, currency, and clans.
- Replaced browser popups with consistent in-game confirmation dialogs.

Created by **frootz jhklphy**.

## OpenBack v0.36.1 - Internet Multiplayer

- Added public multiplayer, lobby IDs, Join Multiplayer, shareable invite links, and ranked play.
- Removed duplicate multiplayer choices and clarified the Solo, Host, Join, and Ranked paths.

Created by **frootz jhklphy**.

## OpenBack v0.36.0 - First OpenBack Release

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
