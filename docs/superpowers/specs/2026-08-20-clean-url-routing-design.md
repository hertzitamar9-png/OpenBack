# OpenBack Clean URL Routing Design

Date: 2026-08-20  
Status: Approved architecture, awaiting specification review  
Owner: frootz jhklphy

## Goal

Replace player-facing `#modal=...` addresses with readable, reload-safe paths for every addressable OpenBack page and selectable page tab. Navigation must remain a single-page experience, direct links must restore the exact screen, and browser Back and Forward must work without breaking live matches or lobby invite URLs.

## Routing model

OpenBack will have one client-side route table that owns conversion in both directions:

- URL to page, entity, and selected tab.
- Page or tab selection to a canonical URL.

The route table is the only code allowed to translate between page IDs and paths. Components continue to open existing page elements and modal components; the router coordinates them instead of duplicating their UI or data-loading logic.

Player navigation uses `history.pushState` so Back and Forward are meaningful. Canonicalization, legacy-link migration, invalid-tab correction, and other non-user transitions use `history.replaceState` so they do not add misleading history entries. Routing never reloads the page unless an existing authentication or deployment flow explicitly requires it.

## Canonical paths

### Main pages

| Screen           | Canonical path          |
| ---------------- | ----------------------- |
| Play             | `/`                     |
| News             | `/news`                 |
| Help             | `/help`                 |
| Troubleshooting  | `/help/troubleshooting` |
| Tutorials        | `/tutorials`            |
| Blog             | `/blog`                 |
| Terms            | `/terms`                |
| Privacy          | `/privacy`              |
| Language         | `/language`             |
| Solo setup       | `/solo`                 |
| Ranked setup     | `/ranked`               |
| Host multiplayer | `/multiplayer/host`     |
| Join multiplayer | `/multiplayer/join`     |

The existing shareable lobby route `/game/:lobbyId` remains authoritative and continues to join that lobby automatically. Worker-prefixed lobby routes such as `/w1/game/:lobbyId`, replay-host paths, authentication callbacks, and purchase callbacks keep their existing special handling and take priority over ordinary page routing.

### Store

`/store` canonicalizes to the first available Store tab. Existing tabs receive:

- `/store/packs`
- `/store/subscriptions`
- `/store/cosmetics`
- `/store/effects`
- `/store/tribes`
- `/store/merch`

Store cosmetic subcategories use a second path segment under `/store/cosmetics/:category`. The accepted category values come from the Store component's existing category definition rather than a second hard-coded list. Affiliate state remains a query parameter on the relevant Store path because it modifies a page rather than identifying a tab.

The current cosmetic categories therefore receive:

- `/store/cosmetics/patterns`
- `/store/cosmetics/flags`
- `/store/cosmetics/crowns`

### Inventory

`/inventory` canonicalizes to `/inventory/skins`. Existing tabs receive:

- `/inventory/skins`
- `/inventory/flags`
- `/inventory/crowns`
- `/inventory/effects`

### Leaderboard

`/leaderboard` canonicalizes to `/leaderboard/1v1`. Existing tabs receive readable public names while mapping to the component's existing internal keys:

- `/leaderboard/1v1`
- `/leaderboard/2v2`
- `/leaderboard/3v3`
- `/leaderboard/4v4`
- `/leaderboard/clans`
- `/leaderboard/tribes`

Existing filters such as a date range remain query parameters because they are filters, not tabs.

### Account and public profiles

`/account` opens the appropriate initial signed-in or signed-out Account state. For a linked account, the existing tabs receive readable public names while mapping to the component's existing internal keys:

- `/account/profile`
- `/account/stats`
- `/account/games`
- `/account/friends`

Signed-out sign-in and sign-up states remain under `/account`; temporary verification and destructive-action confirmations do not receive routes.

Public profiles use `/profile/:publicId` and their existing tabs use:

- `/profile/:publicId/stats`
- `/profile/:publicId/games`
- `/profile/:publicId/clans`

Game statistics use `/stats/:gameId`.

### Clans

The Clan list uses:

- `/clans/my-clans`
- `/clans/browse`

A selected clan uses an encoded tag and its existing detail tabs:

- `/clans/:tag/overview`
- `/clans/:tag/members`
- `/clans/:tag/game-history`

`/clans` canonicalizes to the existing initial list tab. Clan tags, public IDs, and game IDs are encoded and validated before they are passed to components.

### Settings

Settings uses:

- `/settings/basic`
- `/settings/keybinds`

`/settings` canonicalizes to `/settings/basic`.

### Tutorials and blog articles

The content hubs and every article become first-class application routes:

- `/tutorials`
- `/tutorials/:slug`
- `/blog`
- `/blog/:slug`

The existing `/guides` and `/guides/:slug` search URLs permanently redirect to their equivalent `/tutorials` route. Existing `/blog` search URLs keep the same address. The production server renders route-specific title, description, canonical metadata, and crawlable article content into the OpenBack application shell, rather than returning a separate website. This preserves search indexing while direct visits, refreshes, the in-app Back button, and browser Back/Forward all remain inside the same OpenBack interface.

## URL-free transient UI

Temporary UI does not receive a path merely because it uses a modal component. This includes alerts, confirmations, flag and cosmetic pickers, username changes, purchase confirmations, insufficient-currency messages, matchmaking request prompts, and other short-lived overlays. Their parent page remains in the address bar.

Live matchmaking progress is session state, not a reloadable page. Starting it may update the Ranked screen state, but refreshing must not claim that an in-memory queue survived.

## Navigation behavior

1. Clicking a page navigation control asks the router to navigate to the canonical path.
2. The router pushes one history entry and activates the existing page component.
3. Clicking a tab pushes or replaces only the tab path while preserving valid entity and filter state.
4. `popstate` parses the current path and restores the matching page and tab without adding another entry.
5. Direct initial loading waits for the relevant custom element, then opens the exact route.
6. Closing a full page navigates to the previous same-origin OpenBack history entry when it is safe; otherwise it replaces the URL with `/` and opens Play.
7. Clicking the OPENBACK wordmark text navigates to `/` through the same router. The circular OB mark remains inert.

Navigation to a different page while an active match is protected by the existing leave-game confirmation. A cancelled leave restores both the visible game and its current URL. Accepted navigation stops the match once and then completes the route transition.

## Legacy compatibility

Existing shared links must continue to work. On initial load, recognized legacy hashes are translated once with `replaceState`:

- `#modal=news` to `/news`
- `#modal=help` to `/help`
- `#modal=store&tab=...` to the matching Store route
- `#modal=inventory&tab=...` to the matching Inventory route
- `#modal=leaderboard&tab=...` to the matching Leaderboard route
- `#modal=account&tab=...` to the matching Account route
- `#modal=profile&publicID=...&tab=...` to the matching public-profile route
- `#modal=stats&gameID=...` to the matching statistics route
- `#modal=clan&clan=...&tab=...` to the matching Clan route
- Other recognized full-page legacy modal hashes to their canonical route.

Special hashes used by authentication, Steam account linking, purchase completion, affiliate handling, and refresh flows retain priority and are not interpreted as page routes. Unknown or malformed page routes fall back to `/` without throwing or exposing raw values in the UI.

## Server and hosting behavior

Production already has an SPA fallback capable of serving the application shell for unknown GET paths. The implementation will explicitly verify that all canonical routes return the OpenBack shell in production-server tests and Vite development. The existing separately rendered `/guides` and `/blog` content routes are folded into route-aware application-shell rendering as described above. Static assets, APIs, sitemap, robots, WebSockets, health checks, authentication endpoints, and game routes must continue to bypass the page router.

The sitemap moves tutorial entries from `/guides` to `/tutorials`, retains Blog entries, and uses the clean canonical paths. Private account/profile state and transient application screens remain excluded from the sitemap.

## Component integration

- A focused `AppRouter` module owns route definitions, parsing, URL generation, navigation, legacy migration, and `popstate` handling.
- `Navigation.showPage` remains the low-level page visibility function and no longer owns URL semantics.
- `BaseModal` delegates addressable tab changes and closes to `AppRouter`; unregistered transient modals perform no URL writes.
- Desktop navigation, mobile navigation, utility icons, footer links, account links, profile links, Clan links, and the wordmark all call the router through one public navigation API.
- Tutorial and Blog article cards route through the same API and restore the selected article from its slug.
- Existing component `open(args)` methods remain the source of truth for loading data and selecting tabs.
- The old `ModalRouter` is removed after every supported legacy hash has a migration test and every former addressable registration is represented by `AppRouter`.

## Validation and error handling

Route parameters are decoded once and validated using the same domain rules used by their destination components. Invalid page names, tabs, IDs, or malformed percent encoding never reach a component; the router replaces the URL with the nearest safe canonical parent or `/`.

If a required custom element or target page is unexpectedly absent, the router logs one actionable error, restores Play, and canonicalizes to `/`. Repeated `popstate` or component callbacks must be idempotent and must not open a page twice, duplicate data requests, or create history loops.

## Testing

Implementation follows test-driven development and includes:

- Unit tests for every canonical route's parse and generate directions.
- Tests for every currently defined tab key and default canonicalization.
- Legacy-hash migration tests, including encoded profile IDs and Clan tags.
- Navigation tests proving click, tab selection, close, Back, and Forward behavior.
- Tests proving transient dialogs do not alter the URL.
- Tests proving `/game/:lobbyId`, worker-prefixed games, replay hosts, authentication callbacks, and purchase callbacks retain priority.
- Server and Vite checks proving direct loads and refreshes return the application shell.
- Desktop and mobile browser verification of page links, nested tabs, direct refresh, copied links, Back/Forward, and the wordmark.
- Full TypeScript, ESLint, Prettier, build, generated-map, and test suites before push.
- GitHub Actions verification on the pushed `main` commit.

## Release

The player-facing implementation is released as OpenBack v0.36.186. Its changelog entry explains clean shareable page and tab addresses, reliable refresh behavior, and browser Back/Forward support, and credits **frootz jhklphy**. The design document itself does not alter player behavior and therefore does not create a release entry before implementation.
