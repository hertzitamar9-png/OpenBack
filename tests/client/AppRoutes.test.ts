import { describe, expect, it } from "vitest";
import {
  AppRouteTarget,
  legacyHashTarget,
  parseAppUrl,
  pathForTarget,
} from "../../src/client/AppRoutes";

const url = (path: string) => new URL(path, "https://openback.test");

describe("AppRoutes", () => {
  it.each<[string, AppRouteTarget]>([
    ["/play/2d", { pageId: "page-play", experienceMode: "2d" }],
    ["/news", { pageId: "page-news" }],
    ["/help", { pageId: "page-help" }],
    ["/help/troubleshooting", { pageId: "page-troubleshooting" }],
    ["/tutorials", { pageId: "page-tutorials" }],
    [
      "/tutorials/getting-started",
      { pageId: "page-tutorials", article: "getting-started" },
    ],
    ["/blog", { pageId: "page-blog" }],
    [
      "/blog/living-game-updates",
      { pageId: "page-blog", article: "living-game-updates" },
    ],
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
      {
        pageId: "page-item-store",
        tab: "cosmetics",
        subtab: "flags",
      },
    ],
    ["/inventory/effects", { pageId: "page-inventory", tab: "effects" }],
    ["/leaderboard/3v3", { pageId: "page-leaderboard", tab: "players3v3" }],
    ["/account/friends", { pageId: "page-account", tab: "friends" }],
    ["/account/profile", { pageId: "page-account", tab: "account" }],
    [
      "/profile/a%2Bb/games",
      { pageId: "page-profile", publicID: "a+b", tab: "games" },
    ],
    ["/stats/game-1", { pageId: "page-stats", gameID: "game-1" }],
    [
      "/clans/T%26T/members",
      { pageId: "page-clan", clan: "T&T", tab: "members" },
    ],
    ["/settings/keybinds", { pageId: "page-settings", tab: "keybinds" }],
  ])("parses %s", (path, target) => {
    expect(parseAppUrl(url(path))).toEqual({
      kind: "app",
      target,
      canonicalPath: path,
    });
  });

  it.each([
    ["/", "/play/2d", { pageId: "page-play", experienceMode: "2d" }],
    [
      "/solo",
      "/solo/2d",
      { pageId: "page-single-player", experienceMode: "2d" },
    ],
    ["/ranked", "/ranked/2d", { pageId: "page-ranked", experienceMode: "2d" }],
    [
      "/multiplayer/host",
      "/multiplayer/host/2d",
      { pageId: "page-host-lobby", experienceMode: "2d" },
    ],
    [
      "/multiplayer/join",
      "/multiplayer/join/2d",
      { pageId: "page-join-lobby", experienceMode: "2d" },
    ],
    ["/store", "/store/packs", { pageId: "page-item-store", tab: "packs" }],
    [
      "/inventory",
      "/inventory/skins",
      { pageId: "page-inventory", tab: "skins" },
    ],
    [
      "/leaderboard",
      "/leaderboard/1v1",
      { pageId: "page-leaderboard", tab: "players" },
    ],
    ["/settings", "/settings/basic", { pageId: "page-settings", tab: "basic" }],
    ["/clans", "/clans/my-clans", { pageId: "page-clan", tab: "my-clans" }],
  ])("canonicalizes %s to %s", (path, canonicalPath, target) => {
    expect(parseAppUrl(url(path))).toEqual({
      kind: "app",
      target,
      canonicalPath,
    });
  });

  it.each<AppRouteTarget>([
    { pageId: "page-item-store", tab: "subscriptions" },
    { pageId: "page-inventory", tab: "crowns" },
    { pageId: "page-leaderboard", tab: "players4v4" },
    { pageId: "page-account", tab: "stats" },
    { pageId: "page-profile", publicID: "a+b", tab: "clans" },
    { pageId: "page-clan", clan: "T&T", tab: "game-history" },
    { pageId: "page-blog", article: "dynamic-world-mechanics" },
  ])("round-trips %#", (target) => {
    expect(parseAppUrl(url(pathForTarget(target)))).toMatchObject({
      kind: "app",
      target,
    });
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
