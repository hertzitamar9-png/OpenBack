import { describe, expect, it } from "vitest";
import {
  AppRouteTarget,
  legacyHashTarget,
  parseAppUrl,
  pathForTarget,
} from "../../src/client/AppRoutes";

const url = (path: string) => new URL(path, "https://openback.test");

describe("AppRoutes", () => {
  // Every page that is not a link to something in particular now lives at the
  // base URL. Old paths still resolve -- a bookmark or a shared link keeps
  // working -- they just canonicalise to "/" instead of staying in the bar.
  it.each<[string, AppRouteTarget]>([
    ["/play/2d", { pageId: "page-play", experienceMode: "2d" }],
    ["/news", { pageId: "page-news" }],
    ["/help", { pageId: "page-help" }],
    ["/help/troubleshooting", { pageId: "page-troubleshooting" }],
    ["/tutorials", { pageId: "page-tutorials" }],
    ["/blog", { pageId: "page-blog" }],
    ["/terms", { pageId: "page-terms" }],
    ["/privacy", { pageId: "page-privacy" }],
    ["/language", { pageId: "page-language" }],
    ["/solo/2d", { pageId: "page-single-player", experienceMode: "2d" }],
    ["/ranked/2d", { pageId: "page-ranked", experienceMode: "2d" }],
    [
      "/multiplayer/host/2d",
      { pageId: "page-host-lobby", experienceMode: "2d" },
    ],
    [
      "/multiplayer/join/2d",
      { pageId: "page-join-lobby", experienceMode: "2d" },
    ],
    [
      "/store/cosmetics/flags",
      { pageId: "page-item-store", tab: "cosmetics", subtab: "flags" },
    ],
    ["/inventory/effects", { pageId: "page-inventory", tab: "effects" }],
    ["/leaderboard/3v3", { pageId: "page-leaderboard", tab: "players3v3" }],
    ["/account/friends", { pageId: "page-account", tab: "friends" }],
    ["/account/profile", { pageId: "page-account", tab: "account" }],
    ["/settings/keybinds", { pageId: "page-settings", tab: "keybinds" }],
    ["/", { pageId: "page-play", experienceMode: "2d" }],
    ["/solo", { pageId: "page-single-player", experienceMode: "2d" }],
    ["/ranked", { pageId: "page-ranked", experienceMode: "2d" }],
    ["/multiplayer/host", { pageId: "page-host-lobby", experienceMode: "2d" }],
    ["/multiplayer/join", { pageId: "page-join-lobby", experienceMode: "2d" }],
    ["/store", { pageId: "page-item-store", tab: "packs" }],
    ["/inventory", { pageId: "page-inventory", tab: "skins" }],
    ["/leaderboard", { pageId: "page-leaderboard", tab: "players" }],
    ["/settings", { pageId: "page-settings", tab: "basic" }],
    ["/clans", { pageId: "page-clan", tab: "my-clans" }],
  ])("resolves %s and canonicalises it to the base URL", (path, target) => {
    expect(parseAppUrl(url(path))).toEqual({
      kind: "app",
      target,
      canonicalPath: "/",
    });
  });

  // A link that names something another person could open keeps its path.
  it.each<[string, AppRouteTarget]>([
    [
      "/tutorials/getting-started",
      { pageId: "page-tutorials", article: "getting-started" },
    ],
    [
      "/blog/living-game-updates",
      { pageId: "page-blog", article: "living-game-updates" },
    ],
    [
      "/profile/a%2Bb/games",
      { pageId: "page-profile", publicID: "a+b", tab: "games" },
    ],
    ["/stats/game-1", { pageId: "page-stats", gameID: "game-1" }],
    [
      "/clans/T%26T/members",
      { pageId: "page-clan", clan: "T&T", tab: "members" },
    ],
  ])("keeps the shareable path %s", (path, target) => {
    expect(parseAppUrl(url(path))).toEqual({
      kind: "app",
      target,
      canonicalPath: path,
    });
  });

  it.each<AppRouteTarget>([
    { pageId: "page-play", experienceMode: "2d" },
    { pageId: "page-play", experienceMode: "3d" },
    { pageId: "page-news" },
    { pageId: "page-single-player", experienceMode: "3d" },
    { pageId: "page-host-lobby", experienceMode: "3d" },
    { pageId: "page-item-store", tab: "subscriptions" },
    { pageId: "page-item-store", tab: "cosmetics", subtab: "crowns" },
    { pageId: "page-inventory", tab: "crowns" },
    { pageId: "page-leaderboard", tab: "players4v4" },
    { pageId: "page-account", tab: "stats" },
    { pageId: "page-settings", tab: "keybinds" },
    { pageId: "page-clan", tab: "my-clans" },
  ])("writes no path for page %#", (target) => {
    // Neither the app's internal page names nor the rendering mode belong in
    // the address bar.
    expect(pathForTarget(target)).toBe("/");
  });

  it("keeps a query string on the base URL", () => {
    expect(
      pathForTarget({
        pageId: "page-play",
        experienceMode: "3d",
        query: new URLSearchParams("join=AbCd1234"),
      }),
    ).toBe("/?join=AbCd1234");
  });

  it.each<AppRouteTarget>([
    { pageId: "page-profile", publicID: "a+b", tab: "clans" },
    { pageId: "page-clan", clan: "T&T", tab: "game-history" },
    { pageId: "page-blog", article: "dynamic-world-mechanics" },
    { pageId: "page-tutorials", article: "getting-started" },
    { pageId: "page-stats", gameID: "game-1" },
  ])("round-trips the shareable target %#", (target) => {
    expect(parseAppUrl(url(pathForTarget(target)))).toMatchObject({
      kind: "app",
      target,
    });
  });

  it("still rejects a tab that does not exist", () => {
    // The tab is no longer in the URL, but it is still validated -- a typo in
    // calling code should fail loudly rather than silently open the default.
    expect(() =>
      pathForTarget({ pageId: "page-item-store", tab: "not-a-tab" }),
    ).toThrow();
    expect(() =>
      pathForTarget({ pageId: "page-settings", tab: "not-a-tab" }),
    ).toThrow();
  });

  it.each([
    "/game/AbCd1234",
    "/w1/game/AbCd1234",
    "/api/health",
    "/robots.txt",
    "/sitemap.xml",
    "/assets/index.js",
    "/_assets/maps/world.bin",
    "/favicon.svg",
    "/auth/request-code",
  ])("keeps %s outside page routing", (path) => {
    expect(parseAppUrl(url(path))).toEqual({ kind: "reserved" });
  });

  it.each([
    "/store/not-a-tab",
    "/inventory/not-a-tab",
    "/leaderboard/not-a-tab",
    "/profile/%E0%A4%A/stats",
    "/clans/TST/not-a-tab",
    "/unknown-page",
  ])("rejects malformed or unknown route %s", (path) => {
    expect(parseAppUrl(url(path))).toEqual({
      kind: "invalid",
      fallback: { pageId: "page-play", experienceMode: "2d" },
    });
  });

  it.each<[string, AppRouteTarget]>([
    ["/#modal=news", { pageId: "page-news" }],
    [
      "/#modal=store&tab=cosmetics&subtab=crowns",
      { pageId: "page-item-store", tab: "cosmetics", subtab: "crowns" },
    ],
    [
      "/#modal=profile&publicID=a%2Bb&tab=games",
      { pageId: "page-profile", publicID: "a+b", tab: "games" },
    ],
    [
      "/#modal=clan&clan=T%26T&tab=game-history",
      { pageId: "page-clan", clan: "T&T", tab: "game-history" },
    ],
    ["/#modal=stats&gameID=game-1", { pageId: "page-stats", gameID: "game-1" }],
  ])("converts legacy route %s", (path, target) => {
    expect(legacyHashTarget(url(path))).toEqual(target);
  });

  it.each([
    "/#token-login?token-login=abc",
    "/#purchase-completed?status=true",
    "/#steam-link",
    "/#modal=change-username",
    "/#modal=not-real",
  ])("does not claim special or transient hash %s", (path) => {
    expect(legacyHashTarget(url(path))).toBeNull();
  });
});
