# OpenBack Clean URL Routing Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every player-facing hash modal URL with a clean, reload-safe page or nested-tab path while preserving existing OpenBack screens, shared links, live-match protection, search content, and lobby routes.

**Architecture:** A pure route codec maps URLs to normalized page targets and back. A stateful `AppRouter` owns browser history and drives existing pages through `showPage` and their current `open(args)` APIs. Addressable full pages register with `AppRouter`; transient overlays remain URL-free. Production renders route-aware application shells for Tutorials and Blog so search metadata and the in-app experience share canonical URLs.

**Tech Stack:** TypeScript 6, Lit 3, browser History API, Vitest/jsdom, Express 5, EJS, Vite 8.

**Spec:** `docs/superpowers/specs/2026-08-20-clean-url-routing-design.md`

## Global Constraints

- Every addressable page and every existing selectable page tab receives a clean path.
- `/game/:lobbyId`, `/wN/game/:lobbyId`, replay-host, authentication, Steam-link, purchase-callback, API, asset, WebSocket, robots, sitemap, and health routes retain priority.
- User navigation uses `history.pushState`; canonicalization and legacy migration use `history.replaceState`.
- Temporary dialogs do not change the URL.
- Direct load, refresh, copied links, Back, and Forward restore the same page and tab.
- Existing leave-match confirmation remains authoritative; cancelling it restores the match and URL.
- The OB circle stays inert; only the OPENBACK wordmark text navigates home.
- Release as OpenBack v0.36.186 and credit **frootz jhklphy**.
- Preserve AGPL, corresponding-source availability, copyright, asset-license notices, and contributor attribution.
- Do not add optional OpenFront promotional links.

## File Structure

- `src/client/AppRoutes.ts`: pure route types, parsing, generation, validation, defaults, and legacy conversion.
- `src/client/AppRouter.ts`: history, registrations, component opening, synchronization, close, and popstate.
- `src/client/Navigation.ts`: URL-neutral page visibility plus delegated router navigation.
- `src/client/components/BaseModal.ts`: addressable lifecycle synchronization; transient overlays remain URL-free.
- `src/client/Main.ts`: special-route priority, addressable registrations, initial routing, and guarded popstate.
- Existing navigation/profile/clan/stat components: use `AppRouter` rather than hashes.
- `src/client/OpenBackContentModal.ts` plus server content/render files: clean article paths and route-aware shells.
- Delete `src/client/ModalRouter.ts` after migration.
- Add `tests/client/AppRoutes.test.ts`, `tests/client/AppRouter.test.ts`, `tests/client/CleanPathNavigation.test.ts`, `tests/client/OpenBackContentRoutes.test.ts`, `tests/client/AppRouterSpecialRoutes.test.ts`, `tests/client/MainCleanUrlHandling.test.ts`, and `tests/server/AppShellRoutes.test.ts`; migrate the named hash-navigation tests in Tasks 3-4.
- Update `resources/changelog.md` for v0.36.186.

---

### Task 1: Build the pure clean-route codec

**Files:**

- Create: `src/client/AppRoutes.ts`
- Create: `tests/client/AppRoutes.test.ts`

**Interfaces:**

- Produces: `AppPageId`, `AppRouteTarget`, `RouteResolution`, `parseAppUrl(url: URL): RouteResolution`, `pathForTarget(target: AppRouteTarget): string`, and `legacyHashTarget(url: URL): AppRouteTarget | null`.
- Consumes: existing game-ID rules and exact component tab keys.

- [ ] **Step 1: Write the failing route-table tests**

```ts
it.each([
  ["/news", { pageId: "page-news" }],
  [
    "/store/cosmetics/flags",
    { pageId: "page-item-store", tab: "cosmetics", subtab: "flags" },
  ],
  ["/leaderboard/3v3", { pageId: "page-leaderboard", tab: "players3v3" }],
  [
    "/profile/a%2Bb/games",
    { pageId: "page-profile", publicID: "a+b", tab: "games" },
  ],
  [
    "/clans/T%26T/members",
    { pageId: "page-clan", clan: "T&T", tab: "members" },
  ],
])("parses %s", (path, target) => {
  expect(parseAppUrl(new URL(path, "https://openback.test"))).toMatchObject({
    kind: "app",
    target,
  });
});

it("round-trips canonical targets", () => {
  const target = {
    pageId: "page-profile",
    publicID: "a+b",
    tab: "clans",
  } as const;
  expect(
    parseAppUrl(new URL(pathForTarget(target), "https://openback.test")),
  ).toMatchObject({ target });
});

it("keeps lobby paths reserved", () => {
  expect(
    parseAppUrl(new URL("/game/AbCd1234", "https://openback.test")),
  ).toEqual({ kind: "reserved" });
});
```

- [ ] **Step 2: Run the test and verify RED**

Run: `npx vitest run tests/client/AppRoutes.test.ts`

Expected: FAIL because `AppRoutes.ts` does not exist.

- [ ] **Step 3: Implement typed parsing and generation**

```ts
export type AppRouteTarget = {
  pageId: AppPageId;
  tab?: string;
  subtab?: string;
  publicID?: string;
  gameID?: string;
  clan?: string;
  article?: string;
  query?: URLSearchParams;
};

export type RouteResolution =
  | { kind: "app"; target: AppRouteTarget; canonicalPath: string }
  | { kind: "reserved" }
  | { kind: "invalid"; fallback: AppRouteTarget };
```

Define immutable mappings for all spec paths and internal tab keys. Decode dynamic segments with a guarded helper. Check special/reserved path prefixes before ordinary page matching. Canonicalize parent paths to their specified default tabs. Convert every recognized legacy `#modal=` URL to the matching target while leaving authentication and callback hashes untouched.

- [ ] **Step 4: Run route tests and verify GREEN**

Run: `npx vitest run tests/client/AppRoutes.test.ts`

Expected: parsing, generation, defaults, validation, reserved paths, and legacy conversion pass.

- [ ] **Step 5: Commit**

```powershell
git add src/client/AppRoutes.ts tests/client/AppRoutes.test.ts
git commit -m "Add clean application route codec"
```

---

### Task 2: Add the History API application router

**Files:**

- Create: `src/client/AppRouter.ts`
- Create: `tests/client/AppRouter.test.ts`
- Modify: `src/client/Navigation.ts`

**Interfaces:**

- Consumes: Task 1 route types/functions.
- Produces: singleton `appRouter`; `register(name, entry): void`; `start(): Promise<boolean>`; `navigate(target, options): Promise<boolean>`; `navigatePage(pageId): Promise<boolean>`; `syncOpened`; `syncTab`; `syncArgs`; and `syncClosed`.

- [ ] **Step 1: Write failing history/lifecycle tests**

```ts
it("pushes navigation and restores popstate", async () => {
  appRouter.register("news", { tag: "news-modal", pageId: "page-news" });
  await appRouter.navigate({ pageId: "page-news" });
  expect(location.pathname).toBe("/news");
  expect(showPage).toHaveBeenCalledWith("page-news");
  history.pushState(null, "", "/settings/keybinds");
  dispatchEvent(new PopStateEvent("popstate"));
  await nextTask();
  expect(settings.open).toHaveBeenCalledWith({ tab: "keybinds" });
});

it("replaces a legacy hash", async () => {
  history.replaceState(null, "", "/#modal=news");
  await appRouter.start();
  expect(location.href).toBe("https://openback.test/news");
});
```

- [ ] **Step 2: Run tests and verify RED**

Run: `npx vitest run tests/client/AppRouter.test.ts`

Expected: FAIL because the runtime router is missing.

- [ ] **Step 3: Implement the router and keep `showPage` low-level**

```ts
export interface AppRouteRegistration {
  tag?: string;
  pageId: AppPageId;
}

async navigate(target: AppRouteTarget, options: { replace?: boolean } = {}) {
  const path = pathForTarget(target);
  history[options.replace ? "replaceState" : "pushState"](history.state, "", path);
  await this.apply(target);
}
```

`apply` waits for the custom element, calls `showPage`, then calls its existing `open(args)` once. `start` migrates legacy links and applies the current path. Install one idempotent `popstate` listener. Change delegated `.nav-menu-item[data-page]` clicks to call `appRouter.navigatePage` while `showPage` remains URL-neutral.

- [ ] **Step 4: Run focused tests and verify GREEN**

Run: `npx vitest run tests/client/AppRouter.test.ts tests/client/Navigation.test.ts`

Expected: push, replace, direct routing, and Back/Forward pass without duplicate opens.

- [ ] **Step 5: Commit**

```powershell
git add src/client/AppRouter.ts src/client/Navigation.ts tests/client/AppRouter.test.ts tests/client/Navigation.test.ts
git commit -m "Route OpenBack pages through browser history"
```

---

### Task 3: Migrate addressable page and tab lifecycle

**Files:**

- Modify: `src/client/components/BaseModal.ts`
- Modify: `src/client/Main.ts`
- Modify: `src/client/Store.ts`
- Modify: `src/client/InventoryModal.ts`
- Modify: `src/client/LeaderboardModal.ts`
- Modify: `src/client/AccountModal.ts`
- Modify: `src/client/PlayerProfileModal.ts`
- Modify: `src/client/GameStatsModal.ts`
- Modify: `src/client/ClanModal.ts`
- Modify: `src/client/UserSettingModal.ts`
- Modify: `src/client/HelpModal.ts`
- Modify: `src/client/TroubleshootingModal.ts`
- Modify: `src/client/LanguageModal.ts`
- Modify: `src/client/SinglePlayerModal.ts`
- Modify: `src/client/NewsModal.ts`
- Modify: `src/client/components/RankedModal.ts`
- Delete: `src/client/ModalRouter.ts`
- Modify: `tests/client/InventoryNavigation.test.ts`
- Modify: `tests/client/GameStatsModal.test.ts`
- Modify: `tests/client/PlayerProfileModal.test.ts`
- Modify: `tests/client/ProfileGameStatsNavigation.test.ts`
- Modify: `tests/client/AccountGameStatsNavigation.test.ts`
- Modify: `tests/client/ClanGameStatsNavigation.test.ts`
- Modify: `tests/client/CosmeticLockerIntegration.test.ts`
- Modify: `tests/client/PlayerProfileClansTab.test.ts`

**Interfaces:**

- Consumes: Task 2 `appRouter` lifecycle methods.
- Produces: all registered full pages and tabs synchronize clean paths; transient components write no URL.

- [ ] **Step 1: Change tests to failing path expectations**

```ts
expect(location.pathname).toBe("/inventory/effects");
expect(location.pathname).toBe("/profile/player-1/games");
expect(location.pathname).toBe("/stats/game-1");
expect(location.pathname).toBe("/clans/TST/game-history");
```

Add tests that Change Username, Account Settings, Subscription, Territory Pattern, Flag Input, and Detailed Game View leave `pathname`, `search`, and `hash` unchanged.

- [ ] **Step 2: Run migrated tests and verify RED**

Run: `npx vitest run tests/client/InventoryNavigation.test.ts tests/client/GameStatsModal.test.ts tests/client/PlayerProfileModal.test.ts tests/client/ProfileGameStatsNavigation.test.ts tests/client/AccountGameStatsNavigation.test.ts tests/client/ClanGameStatsNavigation.test.ts tests/client/CosmeticLockerIntegration.test.ts tests/client/PlayerProfileClansTab.test.ts`

Expected: failures still contain `#modal=` and `ModalRouter` imports.

- [ ] **Step 3: Replace lifecycle synchronization**

In `BaseModal`, replace `modalRouter` calls with `appRouter` calls and retain `routerName` as the declarative route key. Register only addressable full pages in `Main`. Add Store cosmetic-subtab synchronization. Update Clan/profile/stat handoffs without discarding their existing preserved scroll and Back state. Remove route names from transient overlays so opening them cannot alter the URL.

Delete `ModalRouter.ts` after this audit is empty:

```powershell
rg -n "ModalRouter|modalRouter" src tests
```

- [ ] **Step 4: Run migrated tests and verify GREEN**

Run the focused Vitest command from Step 2.

Expected: page lifecycle, tabs, entity handoffs, and transient URL assertions pass.

- [ ] **Step 5: Commit**

```powershell
git add src/client tests/client
git commit -m "Migrate page tabs to clean routes"
```

---

### Task 4: Route every navigation control and generated share URL

**Files:**

- Modify: `src/client/components/DesktopNavBar.ts`
- Modify: `src/client/components/MobileNavBar.ts`
- Modify: `src/client/components/MobileTopBar.ts`
- Modify: `src/client/components/NavUtilityIcons.ts`
- Modify: `src/client/components/Footer.ts`
- Modify: `src/client/components/NavAccountMenu.ts`
- Modify: `src/client/components/ui/OpenBackWordmark.ts`
- Modify: `src/client/utilities/PlayerProfileUrl.ts`
- Modify: `src/client/components/FriendsList.ts`
- Modify: `src/client/components/InsufficientCurrencyDialog.ts`
- Modify: `src/client/components/SubscriptionPanel.ts`
- Modify: `src/client/SubscriptionModal.ts`
- Modify: `src/client/SteamLinkModal.ts`
- Modify: `src/client/UsernameInput.ts`
- Modify: `src/client/UsernamePanel.ts`
- Modify: `src/client/Matchmaking.ts`
- Create: `tests/client/CleanPathNavigation.test.ts`
- Modify: `tests/client/HeaderWordmarkNavigation.test.ts`
- Modify: `tests/client/NavUtilityIcons.test.ts`
- Modify: `tests/client/components/FriendsListPublicIdInput.test.ts`
- Modify: `tests/client/SubscriptionPanel.test.ts`
- Modify: `tests/client/SteamLinkModal.test.ts`
- Modify: `tests/client/UsernameVerifiedRoute.test.ts`

**Interfaces:**

- Consumes: `appRouter.navigate`, `appRouter.navigatePage`, and `pathForTarget`.
- Produces: every desktop/mobile/footer/account control and share URL uses clean paths; transient selectors open directly.

- [ ] **Step 1: Write failing control/share-link tests**

```ts
it.each([
  ["page-item-store", "/store/packs"],
  ["page-inventory", "/inventory/skins"],
  ["page-news", "/news"],
  ["page-settings", "/settings/basic"],
  ["page-help", "/help"],
  ["page-tutorials", "/tutorials"],
  ["page-blog", "/blog"],
])("routes %s to %s", async (pageId, path) => {
  click(`[data-page="${pageId}"]`);
  await nextTask();
  expect(location.pathname).toBe(path);
});

expect(playerProfileUrl("a+b")).toBe(
  "https://openback.test/profile/a%2Bb/stats",
);
```

Retain the wordmark `20.8%` hitbox assertion; text navigates to `/`, the OB circle does nothing.

- [ ] **Step 2: Run navigation tests and verify RED**

Run: `npx vitest run tests/client/CleanPathNavigation.test.ts tests/client/HeaderWordmarkNavigation.test.ts tests/client/NavUtilityIcons.test.ts tests/client/components/FriendsListPublicIdInput.test.ts tests/client/SubscriptionPanel.test.ts tests/client/SteamLinkModal.test.ts tests/client/UsernameVerifiedRoute.test.ts`

Expected: old direct `showPage`, hash writes, and hash profile URLs fail.

- [ ] **Step 3: Replace all addressable navigation calls**

Use `navigatePage` for top-level controls and explicit targets for nested destinations. Generate profile links through `pathForTarget`. Accept both new clean profile links and old pasted hash links. Open transient actions such as Change Username directly. Audit production code:

```powershell
rg -n 'window\.location\.hash\s*=.*modal|#modal=' src/client
```

Only legacy-parser documentation or compatibility fixtures may remain.

- [ ] **Step 4: Run navigation tests and verify GREEN**

Run the focused Vitest command from Step 2.

Expected: all navigation surfaces and share URLs are clean on desktop/mobile and transient overlays preserve the parent URL.

- [ ] **Step 5: Commit**

```powershell
git add src/client tests/client
git commit -m "Use clean links across OpenBack navigation"
```

---

### Task 5: Route Tutorials and Blog inside the application shell

**Files:**

- Modify: `src/client/OpenBackContentModal.ts`
- Modify: `src/server/OpenBackContent.ts`
- Modify: `src/server/RenderHtml.ts`
- Modify: `src/server/Master.ts`
- Modify: `index.html`
- Modify: `static/index.html`
- Modify: `tests/server/OpenBackContent.test.ts`
- Create: `tests/client/OpenBackContentRoutes.test.ts`

**Interfaces:**

- Consumes: article targets from `AppRoutes` and `appRouter.navigate`.
- Produces: `/tutorials`, `/tutorials/:slug`, `/blog`, and `/blog/:slug` open in-app with route-specific server metadata; `/guides...` redirects permanently.

- [ ] **Step 1: Write failing article and server-shell tests**

```ts
it("routes and restores a tutorial article", async () => {
  await appRouter.navigate({
    pageId: "page-tutorials",
    article: "getting-started",
  });
  expect(location.pathname).toBe("/tutorials/getting-started");
  expect(contentModal.selectedArticlePath()).toBe("/guides/getting-started");
});
```

```ts
it("serves an article-aware app shell", async () => {
  const response = await request(app).get("/blog/living-game-updates");
  expect(response.status).toBe(200);
  expect(response.text).toContain('id="page-blog"');
  expect(response.text).toContain("Living Game Updates | OpenBack");
});

it("redirects legacy guide URLs", async () => {
  const response = await request(app).get("/guides/getting-started");
  expect(response.status).toBe(301);
  expect(response.headers.location).toBe("/tutorials/getting-started");
});
```

- [ ] **Step 2: Run content tests and verify RED**

Run: `npx vitest run tests/client/OpenBackContentRoutes.test.ts tests/server/OpenBackContent.test.ts`

Expected: cards only change local state and `/blog...` returns the separate static page.

- [ ] **Step 3: Implement routed content and route-aware EJS values**

```ts
export interface AppShellSeo {
  path: string;
  title: string;
  description: string;
  schemaJson?: string;
  crawlableHtml?: string;
}

export async function renderAppShell(
  res: Response,
  htmlPath: string,
  seo?: AppShellSeo,
): Promise<void>;
```

Include the canonical route in the shell cache key. Render escaped title, description, canonical/Open Graph fields, schema JSON, and crawlable content via EJS variables in both index templates. Serve canonical content paths through the application shell. Redirect `/guides` and `/guides/:slug` with 301. Make article card and article Back actions navigate through `AppRouter`, and select routed articles only after content loads.

- [ ] **Step 4: Run content tests and verify GREEN**

Run: `npx vitest run tests/client/OpenBackContentRoutes.test.ts tests/server/OpenBackContent.test.ts`

Expected: hubs/articles restore in-app, metadata is canonical and escaped, and old guides redirect.

- [ ] **Step 5: Commit**

```powershell
git add src/client/OpenBackContentModal.ts src/server/OpenBackContent.ts src/server/RenderHtml.ts src/server/Master.ts index.html static/index.html tests/client/OpenBackContentRoutes.test.ts tests/server/OpenBackContent.test.ts
git commit -m "Route tutorials and blog inside OpenBack"
```

---

### Task 6: Preserve special routes and active-match guards

**Files:**

- Modify: `src/client/Main.ts`
- Modify: `src/client/AppRouter.ts`
- Modify: `vite.config.ts`
- Create: `tests/client/AppRouterSpecialRoutes.test.ts`
- Create: `tests/client/MainCleanUrlHandling.test.ts`
- Create: `tests/server/AppShellRoutes.test.ts`

**Interfaces:**

- Consumes: route resolution and runtime navigation from Tasks 1-2.
- Produces: callbacks/lobbies claim URLs before page routing; page navigation and popstate share the existing leave guard.

- [ ] **Step 1: Write failing route-priority and leave tests**

```ts
it.each(["/game/AbCd1234", "/w1/game/AbCd1234"])(
  "does not claim %s as an app page",
  async (path) => {
    history.replaceState(null, "", path);
    expect(await appRouter.start()).toBe(false);
    expect(showPage).not.toHaveBeenCalledWith("page-play");
  },
);

it("restores a game URL when leaving is cancelled", async () => {
  history.replaceState(null, "", "/game/AbCd1234");
  leaveGuard.mockResolvedValue(false);
  await appRouter.navigate({ pageId: "page-news" });
  expect(location.pathname).toBe("/game/AbCd1234");
  expect(stopGame).not.toHaveBeenCalled();
});
```

Add replay-host, token-login, Steam-link, purchase-completed, affiliate, refresh, `/api`, asset, sitemap, robots, health, and malformed-path cases.

- [ ] **Step 2: Run tests and verify RED**

Run: `npx vitest run tests/client/AppRouterSpecialRoutes.test.ts tests/client/MainCleanUrlHandling.test.ts`

Expected: old `handleUrl` and popstate behavior competes with clean routing or resets state.

- [ ] **Step 3: Integrate one guarded transition pipeline**

Keep callback/lobby handling at the top of `Main.handleUrl`; call `appRouter.start()` only when none claims the URL. Inject the existing asynchronous leave confirmation into `AppRouter`. On cancelled popstate, restore the prior canonical entry without recursively reopening or stopping the match. Verify Vite serves clean routes while preserving `/link` and worker-game behavior.

- [ ] **Step 4: Run special-route and lobby tests**

Run: `npx vitest run tests/client/AppRouterSpecialRoutes.test.ts tests/client/MainCleanUrlHandling.test.ts tests/client/JoinLobbyModal.test.ts tests/client/HostPrivateLobbyModal.test.ts`

Expected: special URLs retain priority, direct page paths load, and match cancellation/acceptance happens once.

- [ ] **Step 5: Commit**

```powershell
git add src/client/Main.ts src/client/AppRouter.ts vite.config.ts tests/client tests/server
git commit -m "Protect game routes during clean navigation"
```

---

### Task 7: Update discovery and release notes

**Files:**

- Modify: `src/server/Master.ts`
- Modify: `src/server/OpenBackContent.ts`
- Modify: `index.html`
- Modify: `static/index.html`
- Modify: `resources/changelog.md`
- Modify: `tests/server/OpenBackContent.test.ts`

**Interfaces:**

- Consumes: canonical content paths from Tasks 1 and 5.
- Produces: sitemap/canonical discovery uses `/tutorials` and `/blog`; release notes describe v0.36.186.

- [ ] **Step 1: Write failing sitemap and stale-hash audits**

```ts
expect(sitemap).toContain("https://openback.test/tutorials");
expect(sitemap).toContain("https://openback.test/tutorials/getting-started");
expect(sitemap).not.toContain("https://openback.test/guides");
```

```powershell
rg -n 'window\.location\.hash\s*=.*modal|href=.*#modal|canonical.*guides' src index.html static/index.html
```

- [ ] **Step 2: Run discovery tests and verify RED**

Run: `npx vitest run tests/server/OpenBackContent.test.ts tests/client/AppRoutes.test.ts`

Expected: sitemap or discovery still exposes old paths before migration finishes.

- [ ] **Step 3: Update discovery and changelog**

Add to the top of `resources/changelog.md`:

```md
## OpenBack v0.36.186 - Clean Links Everywhere

- Gave every OpenBack page and selectable tab a readable link that can be copied, refreshed, and opened directly.
- Made browser Back and Forward restore the correct page or tab while preserving lobby links and active-match leave protection.
- Kept existing shared hash links working by moving them automatically to their new clean addresses.

Created by **frootz jhklphy**.
```

Update sitemap, hidden discovery links, and canonical fields. Keep `/guides` only in redirect/migration code and tests.

- [ ] **Step 4: Run discovery tests and verify GREEN**

Run: `npx vitest run tests/server/OpenBackContent.test.ts tests/client/AppRoutes.test.ts`

Expected: sitemap, metadata, redirects, and route codec agree.

- [ ] **Step 5: Commit**

```powershell
git add src/server index.html static/index.html resources/changelog.md tests
git commit -m "Release clean OpenBack links"
```

---

### Task 8: Browser verification, full quality gates, push, and CI

**Files:**

- Modify only files required to repair failures found during verification.

**Interfaces:**

- Consumes: complete implementation.
- Produces: browser evidence, clean tree, pushed `main`, and successful GitHub Actions.

- [ ] **Step 1: Run complete local automation**

```powershell
npm test
npm run build-prod
npm run lint
npx prettier --check .
npm run gen-maps
git diff --check
```

Expected: tests, TypeScript, build, lint, formatting, generated maps, and whitespace checks pass. Inspect and discard unrelated generated drift rather than committing it.

- [ ] **Step 2: Run production-like browser verification**

Verify on desktop and mobile:

1. Play, Store, Inventory, Leaderboard, Clans, News, Settings, Help, Tutorials, Blog, Terms, and Privacy.
2. Every Store, Inventory, Leaderboard, Account, Profile, Clan, and Settings tab updates the path.
3. Fresh-tab direct loads and refreshes restore profile/article/tab content.
4. Back and Forward traverse each page/tab exactly once.
5. Wordmark text returns to `/`; OB circle stays inert.
6. `/game/:lobbyId` still joins rather than opening Play.
7. Cancelled leave keeps the active match/URL; accepted leave opens the route.
8. Console contains no routing errors, duplicate loads, stale hashes, or ordinary-navigation reloads.

- [ ] **Step 3: Repair findings test-first**

For each failure, add or tighten a regression test, reproduce RED, apply the smallest fix, and rerun the focused test plus affected build/lint/browser check. Do not weaken validation or remove legacy compatibility.

- [ ] **Step 4: Commit repairs and push `main`**

```powershell
git status --short
git add src/client src/server tests index.html static/index.html resources/changelog.md vite.config.ts
git commit -m "Verify clean OpenBack navigation"
git push origin main
```

If no repair commit is needed, push the completed commits. Confirm pushed SHA equals local `HEAD` and the worktree is clean.

- [ ] **Step 5: Watch CI to completion**

```powershell
$runId = gh run list --branch main --limit 1 --json databaseId --jq '.[0].databaseId'
gh run watch $runId --exit-status
gh run view $runId --json status,conclusion,url,headSha
```

Expected: Build, Test Coverage, Prettier, Lint, and Generated Maps succeed for pushed `HEAD`. Reproduce and repair any failure, then watch the replacement run before reporting completion.
