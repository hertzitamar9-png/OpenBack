export type AppPageId =
  | "page-play"
  | "page-news"
  | "page-help"
  | "page-troubleshooting"
  | "page-tutorials"
  | "page-blog"
  | "page-terms"
  | "page-privacy"
  | "page-language"
  | "page-single-player"
  | "page-ranked"
  | "page-host-lobby"
  | "page-join-lobby"
  | "page-item-store"
  | "page-inventory"
  | "page-leaderboard"
  | "page-clan"
  | "page-account"
  | "page-profile"
  | "page-stats"
  | "page-settings"
  | "page-analytics";

export interface AppRouteTarget {
  pageId: AppPageId;
  experienceMode?: "2d" | "3d";
  tab?: string;
  subtab?: string;
  publicID?: string;
  gameID?: string;
  clan?: string;
  article?: string;
  query?: URLSearchParams;
}

export type RouteResolution =
  | { kind: "app"; target: AppRouteTarget; canonicalPath: string }
  | { kind: "reserved" }
  | { kind: "invalid"; fallback: AppRouteTarget };

const PLAY: AppRouteTarget = { pageId: "page-play", experienceMode: "2d" };

const STORE_TABS = new Set([
  "packs",
  "subscriptions",
  "cosmetics",
  "effects",
  "tribes",
]);
const STORE_COSMETIC_TABS = new Set(["patterns", "flags", "crowns"]);
const INVENTORY_TABS = new Set(["skins", "flags", "crowns", "effects"]);
const LEADERBOARD_PATH_TO_TAB = new Map([
  ["1v1", "players"],
  ["2v2", "players2v2"],
  ["3v3", "players3v3"],
  ["4v4", "players4v4"],
  ["clans", "clans"],
  ["tribes", "tribes"],
]);
const LEADERBOARD_TAB_TO_PATH = new Map(
  [...LEADERBOARD_PATH_TO_TAB].map(([path, tab]) => [tab, path]),
);
const ACCOUNT_TABS = new Set(["account", "stats", "games", "friends"]);
const PROFILE_TABS = new Set(["stats", "games", "clans"]);
const CLAN_LIST_TABS = new Set(["my-clans", "browse"]);
const CLAN_DETAIL_TABS = new Set(["overview", "members", "game-history"]);
const SETTINGS_TABS = new Set(["basic", "keybinds"]);

const SIMPLE_PATHS = new Map<string, AppRouteTarget>([
  ["/news", { pageId: "page-news" }],
  ["/help", { pageId: "page-help" }],
  ["/help/troubleshooting", { pageId: "page-troubleshooting" }],
  ["/tutorials", { pageId: "page-tutorials" }],
  ["/blog", { pageId: "page-blog" }],
  ["/terms", { pageId: "page-terms" }],
  ["/privacy", { pageId: "page-privacy" }],
  ["/language", { pageId: "page-language" }],
  ["/analytics", { pageId: "page-analytics" }],
  ["/solo", { pageId: "page-single-player", experienceMode: "2d" }],
  ["/ranked", { pageId: "page-ranked", experienceMode: "2d" }],
  ["/multiplayer/host", { pageId: "page-host-lobby", experienceMode: "2d" }],
  ["/multiplayer/join", { pageId: "page-join-lobby", experienceMode: "2d" }],
]);

function decodeSegment(segment: string | undefined): string | null {
  if (!segment) return null;
  try {
    const decoded = decodeURIComponent(segment);
    return decoded.length > 0 && decoded.length <= 256 ? decoded : null;
  } catch {
    return null;
  }
}

function isReserved(url: URL): boolean {
  const path = url.pathname;
  return (
    /^\/w\d+\/game\/[^/]+/.test(path) ||
    /^\/game\/[^/]+/.test(path) ||
    /^\/(?:api|auth)(?:\/|$)/.test(path) ||
    /^\/(?:_?assets)(?:\/|$)/.test(path) ||
    /^\/(?:favicon(?:\.[^/]+)?|robots\.txt|sitemap\.xml)$/.test(path) ||
    /^\/(?:terms-of-service|privacy-policy)\.html$/.test(path) ||
    path === "/link" ||
    path === "/link/" ||
    url.hostname.startsWith("replay.")
  );
}

function withQuery(target: AppRouteTarget, search: string): AppRouteTarget {
  if (!search) return target;
  return { ...target, query: new URLSearchParams(search) };
}

function app(target: AppRouteTarget, canonicalPath?: string): RouteResolution {
  return {
    kind: "app",
    target,
    canonicalPath: canonicalPath ?? pathForTarget(target),
  };
}

function invalid(): RouteResolution {
  return { kind: "invalid", fallback: PLAY };
}

export function parseAppUrl(url: URL): RouteResolution {
  if (isReserved(url)) return { kind: "reserved" };

  if (url.pathname === "/") return app(withQuery({ ...PLAY }, url.search));

  const simple = SIMPLE_PATHS.get(url.pathname);
  if (simple) return app(withQuery({ ...simple }, url.search));

  const segments = url.pathname.split("/").filter(Boolean);
  const [section, second, third] = segments;
  const experience = second === "3d" ? "3d" : second === "2d" ? "2d" : null;

  if (section === "play" && segments.length === 2 && experience) {
    return app(
      withQuery(
        { pageId: "page-play", experienceMode: experience },
        url.search,
      ),
    );
  }
  if (
    (section === "solo" || section === "ranked") &&
    segments.length === 2 &&
    experience
  ) {
    return app(
      withQuery(
        {
          pageId: section === "solo" ? "page-single-player" : "page-ranked",
          experienceMode: experience,
        },
        url.search,
      ),
    );
  }
  const multiplayerExperience =
    third === "3d" ? "3d" : third === "2d" ? "2d" : null;
  if (
    section === "multiplayer" &&
    (second === "host" || second === "join") &&
    segments.length === 3 &&
    multiplayerExperience
  ) {
    return app(
      withQuery(
        {
          pageId: second === "host" ? "page-host-lobby" : "page-join-lobby",
          experienceMode: multiplayerExperience,
        },
        url.search,
      ),
    );
  }

  if (section === "tutorials" && segments.length === 2) {
    const article = decodeSegment(second);
    return article
      ? app(withQuery({ pageId: "page-tutorials", article }, url.search))
      : invalid();
  }
  if (section === "blog" && segments.length === 2) {
    const article = decodeSegment(second);
    return article
      ? app(withQuery({ pageId: "page-blog", article }, url.search))
      : invalid();
  }

  if (section === "store") {
    if (segments.length === 1) {
      return app(
        withQuery({ pageId: "page-item-store", tab: "packs" }, url.search),
      );
    }
    if (!second || !STORE_TABS.has(second)) return invalid();
    if (second !== "cosmetics") {
      return segments.length === 2
        ? app(withQuery({ pageId: "page-item-store", tab: second }, url.search))
        : invalid();
    }
    if (segments.length === 2) {
      return app(
        withQuery(
          {
            pageId: "page-item-store",
            tab: "cosmetics",
            subtab: "patterns",
          },
          url.search,
        ),
      );
    }
    return segments.length === 3 && third && STORE_COSMETIC_TABS.has(third)
      ? app(
          withQuery(
            { pageId: "page-item-store", tab: "cosmetics", subtab: third },
            url.search,
          ),
        )
      : invalid();
  }

  if (section === "inventory") {
    if (segments.length === 1) {
      return app(
        withQuery({ pageId: "page-inventory", tab: "skins" }, url.search),
      );
    }
    return segments.length === 2 && second && INVENTORY_TABS.has(second)
      ? app(withQuery({ pageId: "page-inventory", tab: second }, url.search))
      : invalid();
  }

  if (section === "leaderboard") {
    if (segments.length === 1) {
      return app(
        withQuery({ pageId: "page-leaderboard", tab: "players" }, url.search),
      );
    }
    const tab = second ? LEADERBOARD_PATH_TO_TAB.get(second) : undefined;
    return segments.length === 2 && tab
      ? app(withQuery({ pageId: "page-leaderboard", tab }, url.search))
      : invalid();
  }

  if (section === "account") {
    if (segments.length === 1) {
      return app(withQuery({ pageId: "page-account" }, url.search));
    }
    const tab = second === "profile" ? "account" : second;
    return segments.length === 2 && tab && ACCOUNT_TABS.has(tab)
      ? app(withQuery({ pageId: "page-account", tab }, url.search))
      : invalid();
  }

  if (section === "profile") {
    const publicID = decodeSegment(second);
    if (!publicID || segments.length > 3) return invalid();
    const tab = third ?? "stats";
    if (!PROFILE_TABS.has(tab)) return invalid();
    return app(
      withQuery({ pageId: "page-profile", publicID, tab }, url.search),
      segments.length === 2
        ? `/profile/${encodeURIComponent(publicID)}/stats${url.search}`
        : undefined,
    );
  }

  if (section === "stats") {
    const gameID = decodeSegment(second);
    return segments.length === 2 && gameID
      ? app(withQuery({ pageId: "page-stats", gameID }, url.search))
      : invalid();
  }

  if (section === "clans") {
    if (segments.length === 1) {
      return app(
        withQuery({ pageId: "page-clan", tab: "my-clans" }, url.search),
      );
    }
    if (segments.length === 2 && second && CLAN_LIST_TABS.has(second)) {
      return app(withQuery({ pageId: "page-clan", tab: second }, url.search));
    }
    const clan = decodeSegment(second);
    const tab = third ?? "overview";
    if (!clan || !CLAN_DETAIL_TABS.has(tab) || segments.length > 3) {
      return invalid();
    }
    return app(
      withQuery({ pageId: "page-clan", clan, tab }, url.search),
      segments.length === 2
        ? `/clans/${encodeURIComponent(clan)}/overview${url.search}`
        : undefined,
    );
  }

  if (section === "settings") {
    if (segments.length === 1) {
      return app(
        withQuery({ pageId: "page-settings", tab: "basic" }, url.search),
      );
    }
    return segments.length === 2 && second && SETTINGS_TABS.has(second)
      ? app(withQuery({ pageId: "page-settings", tab: second }, url.search))
      : invalid();
  }

  return invalid();
}

function querySuffix(target: AppRouteTarget): string {
  const query = target.query?.toString();
  return query ? `?${query}` : "";
}

function requireValue(value: string | undefined, name: string): string {
  if (!value) throw new Error(`${name} is required for this route`);
  return encodeURIComponent(value);
}

/**
 * Pages that carry no identity of their own live at the base URL.
 *
 * Navigating used to write a path for the page you were on -- /play/2d,
 * /store/packs, /settings/basic -- which put the app's internal page names and
 * the rendering mode in the address bar for no one's benefit. Only a link that
 * names something another person could open keeps a path: a player's profile,
 * one game's stats, a clan, a written article. Everything else is the base URL.
 */
export function pathForTarget(target: AppRouteTarget): string {
  const suffix = querySuffix(target);
  switch (target.pageId) {
    case "page-play":
      return `/${suffix}`;
    case "page-news":
      return `/${suffix}`;
    case "page-help":
      return `/${suffix}`;
    case "page-troubleshooting":
      return `/${suffix}`;
    case "page-tutorials":
      return target.article
        ? `/tutorials/${encodeURIComponent(target.article)}${suffix}`
        : `/${suffix}`;
    case "page-blog":
      return target.article
        ? `/blog/${encodeURIComponent(target.article)}${suffix}`
        : `/${suffix}`;
    case "page-terms":
      return `/${suffix}`;
    case "page-privacy":
      return `/${suffix}`;
    case "page-language":
      return `/${suffix}`;
    case "page-single-player":
      return `/${suffix}`;
    case "page-ranked":
      return `/${suffix}`;
    case "page-host-lobby":
      return `/${suffix}`;
    case "page-join-lobby":
      return `/${suffix}`;
    case "page-item-store": {
      const tab = target.tab ?? "packs";
      if (!STORE_TABS.has(tab)) throw new Error(`Unknown Store tab: ${tab}`);
      if (tab === "cosmetics") {
        const subtab = target.subtab ?? "patterns";
        if (!STORE_COSMETIC_TABS.has(subtab)) {
          throw new Error(`Unknown Store cosmetic tab: ${subtab}`);
        }
      }
      return `/${suffix}`;
    }
    case "page-inventory": {
      const tab = target.tab ?? "skins";
      if (!INVENTORY_TABS.has(tab)) {
        throw new Error(`Unknown Inventory tab: ${tab}`);
      }
      return `/${suffix}`;
    }
    case "page-leaderboard": {
      const tab = target.tab ?? "players";
      if (!LEADERBOARD_TAB_TO_PATH.has(tab)) {
        throw new Error(`Unknown Leaderboard tab: ${tab}`);
      }
      return `/${suffix}`;
    }
    case "page-account": {
      if (target.tab) {
        const tab = target.tab === "profile" ? "account" : target.tab;
        if (!ACCOUNT_TABS.has(tab)) {
          throw new Error(`Unknown Account tab: ${tab}`);
        }
      }
      return `/${suffix}`;
    }
    case "page-profile": {
      const publicID = requireValue(target.publicID, "publicID");
      const tab = target.tab ?? "stats";
      if (!PROFILE_TABS.has(tab))
        throw new Error(`Unknown Profile tab: ${tab}`);
      return `/profile/${publicID}/${tab}${suffix}`;
    }
    case "page-stats":
      return `/stats/${requireValue(target.gameID, "gameID")}${suffix}`;
    case "page-clan": {
      if (!target.clan) {
        const tab = target.tab ?? "my-clans";
        if (!CLAN_LIST_TABS.has(tab))
          throw new Error(`Unknown Clan tab: ${tab}`);
        return `/${suffix}`;
      }
      const tab = target.tab ?? "overview";
      if (!CLAN_DETAIL_TABS.has(tab)) {
        throw new Error(`Unknown Clan detail tab: ${tab}`);
      }
      return `/clans/${encodeURIComponent(target.clan)}/${tab}${suffix}`;
    }
    case "page-settings": {
      const tab = target.tab ?? "basic";
      if (!SETTINGS_TABS.has(tab))
        throw new Error(`Unknown Settings tab: ${tab}`);
      return `/${suffix}`;
    }
    case "page-analytics":
      return `/analytics${suffix}`;
  }
}

const LEGACY_STATIC_TARGETS = new Map<string, AppRouteTarget>([
  ["news", { pageId: "page-news" }],
  ["help", { pageId: "page-help" }],
  ["troubleshooting", { pageId: "page-troubleshooting" }],
  ["language", { pageId: "page-language" }],
  ["single-player", { pageId: "page-single-player" }],
  ["ranked", { pageId: "page-ranked" }],
  ["settings", { pageId: "page-settings", tab: "basic" }],
  ["leaderboard", { pageId: "page-leaderboard", tab: "players" }],
  ["inventory", { pageId: "page-inventory", tab: "skins" }],
  ["store", { pageId: "page-item-store", tab: "packs" }],
  ["account", { pageId: "page-account" }],
]);

export function legacyHashTarget(url: URL): AppRouteTarget | null {
  if (!url.hash.startsWith("#")) return null;
  const params = new URLSearchParams(url.hash.slice(1));
  const name = params.get("modal");
  if (!name) return null;

  if (name === "profile") {
    const publicID = params.get("publicID");
    const tab = params.get("tab") ?? "stats";
    return publicID && PROFILE_TABS.has(tab)
      ? { pageId: "page-profile", publicID, tab }
      : null;
  }
  if (name === "stats") {
    const gameID = params.get("gameID");
    return gameID ? { pageId: "page-stats", gameID } : null;
  }
  if (name === "clan") {
    const clan = params.get("clan") ?? params.get("tag");
    const tab = params.get("tab") ?? (clan ? "overview" : "my-clans");
    if (clan && CLAN_DETAIL_TABS.has(tab)) {
      return { pageId: "page-clan", clan, tab };
    }
    return !clan && CLAN_LIST_TABS.has(tab)
      ? { pageId: "page-clan", tab }
      : null;
  }

  const target = LEGACY_STATIC_TARGETS.get(name);
  if (!target) return null;
  const tab = params.get("tab");
  const subtab = params.get("subtab");
  try {
    const candidate = {
      ...target,
      ...(tab ? { tab: tab === "profile" ? "account" : tab } : {}),
      ...(subtab ? { subtab } : {}),
    };
    pathForTarget(candidate);
    return candidate;
  } catch {
    return null;
  }
}
