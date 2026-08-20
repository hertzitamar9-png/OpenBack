import {
  AppPageId,
  AppRouteTarget,
  legacyHashTarget,
  parseAppUrl,
  pathForTarget,
} from "./AppRoutes";
import { experienceContext, experienceFromRoute } from "./ExperienceContext";

export interface AppRouteRegistration {
  tag?: string;
  pageId: AppPageId;
}

type RouteArgs = Record<string, unknown>;
export type AppNavigationGuard = (
  target: AppRouteTarget,
  fromUrl: string,
) => boolean | Promise<boolean>;

const ROUTE_ARG_KEYS = [
  "experienceMode",
  "tab",
  "subtab",
  "publicID",
  "gameID",
  "clan",
  "article",
] as const;

export class AppRouter {
  private registrations = new Map<string, AppRouteRegistration>();
  private registrationsByPage = new Map<AppPageId, AppRouteRegistration>();
  private activeName: string | null = null;
  private currentTarget: AppRouteTarget = { pageId: "page-play" };
  private applyingLocation = false;
  private listening = false;
  private navigationGuard: AppNavigationGuard | null = null;
  private lastAcceptedUrl = "/";

  private readonly onPopState = () => {
    void this.applyPopState();
  };

  register(name: string, entry: AppRouteRegistration): void {
    this.registrations.set(name, entry);
    this.registrationsByPage.set(entry.pageId, entry);
  }

  setNavigationGuard(guard: AppNavigationGuard | null): void {
    this.navigationGuard = guard;
  }

  /** Adopt a URL written by a non-page flow such as joining a live lobby. */
  acceptCurrentLocation(): void {
    this.lastAcceptedUrl = this.currentAddress();
  }

  stop(): void {
    if (!this.listening) return;
    window.removeEventListener("popstate", this.onPopState);
    this.listening = false;
  }

  /** Test seam and hot-reload cleanup: drop registrations and route state. */
  reset(): void {
    this.stop();
    this.registrations.clear();
    this.registrationsByPage.clear();
    this.activeName = null;
    this.currentTarget = { pageId: "page-play" };
    this.applyingLocation = false;
    this.navigationGuard = null;
    this.lastAcceptedUrl = this.currentAddress();
  }

  async start(): Promise<boolean> {
    if (!this.listening) {
      window.addEventListener("popstate", this.onPopState);
      this.listening = true;
    }

    this.lastAcceptedUrl = this.currentAddress();
    const url = new URL(window.location.href);
    const legacyTarget = legacyHashTarget(url);
    if (legacyTarget) {
      this.replaceUrl(pathForTarget(legacyTarget));
      await this.apply(legacyTarget);
      this.lastAcceptedUrl = this.currentAddress();
      return true;
    }

    // Non-modal hashes are owned by authentication, account-linking and
    // purchase callback flows in Main.handleUrl().
    if (url.hash) return false;
    const handled = await this.applyResolution(url);
    if (handled) this.lastAcceptedUrl = this.currentAddress();
    return handled;
  }

  async navigate(
    target: AppRouteTarget,
    options: { replace?: boolean } = {},
  ): Promise<boolean> {
    const path = pathForTarget(target);
    if (
      this.currentUrl() !== path &&
      this.navigationGuard &&
      !(await this.navigationGuard(target, this.currentAddress()))
    ) {
      return false;
    }
    if (options.replace) {
      this.replaceUrl(path);
    } else if (this.currentUrl() !== path) {
      history.pushState(history.state, "", path);
    }
    await this.apply(target);
    this.lastAcceptedUrl = this.currentAddress();
    return true;
  }

  navigatePage(pageId: AppPageId): Promise<boolean> {
    return this.navigate({ pageId });
  }

  syncOpened(name: string, args?: RouteArgs): void {
    if (this.applyingLocation) return;
    const entry = this.registrations.get(name);
    if (!entry) return;
    const target = this.targetFromArgs(entry.pageId, args);
    if (!this.pushTarget(target)) return;
    this.activeName = name;
    this.currentTarget = target;
  }

  syncClosed(name: string): void {
    if (this.applyingLocation || this.activeName !== name) return;
    const entry = this.registrations.get(name);
    if (!entry || this.currentTarget.pageId !== entry.pageId) return;
    this.activeName = null;
    this.currentTarget = { pageId: "page-play" };
    const home = pathForTarget(this.currentTarget);
    if (this.currentUrl() !== home) history.pushState(history.state, "", home);
  }

  syncTab(name: string, tab: string): void {
    if (this.applyingLocation) return;
    const entry = this.registrations.get(name);
    if (!entry) return;
    const base =
      this.currentTarget.pageId === entry.pageId
        ? this.currentTarget
        : { pageId: entry.pageId };
    const target = { ...base, tab };
    if (!this.pushTarget(target)) return;
    this.activeName = name;
    this.currentTarget = target;
  }

  syncArgs(name: string, args: RouteArgs): void {
    if (this.applyingLocation) return;
    const entry = this.registrations.get(name);
    if (!entry) return;
    const base =
      this.currentTarget.pageId === entry.pageId
        ? this.currentTarget
        : { pageId: entry.pageId };
    const next: AppRouteTarget = { ...base };
    for (const key of ROUTE_ARG_KEYS) {
      if (!(key in args)) continue;
      const value = args[key];
      if (typeof value === "string" && value.length > 0) {
        next[key] = value as never;
      } else {
        delete next[key];
      }
    }
    if (!this.pushTarget(next)) return;
    this.activeName = name;
    this.currentTarget = next;
  }

  private async applyPopState(): Promise<boolean> {
    const url = new URL(window.location.href);
    if (url.hash) return false;
    const resolution = parseAppUrl(url);
    if (resolution.kind === "reserved") {
      this.lastAcceptedUrl = this.currentAddress();
      return false;
    }
    const target =
      resolution.kind === "invalid" ? resolution.fallback : resolution.target;
    if (
      this.navigationGuard &&
      !(await this.navigationGuard(target, this.lastAcceptedUrl))
    ) {
      history.pushState(history.state, "", this.lastAcceptedUrl);
      return false;
    }
    const handled = await this.applyResolution(url);
    if (handled) this.lastAcceptedUrl = this.currentAddress();
    return handled;
  }

  private async applyResolution(url: URL): Promise<boolean> {
    const resolution = parseAppUrl(url);
    if (resolution.kind === "reserved") return false;
    if (resolution.kind === "invalid") {
      const fallbackPath = pathForTarget(resolution.fallback);
      this.replaceUrl(fallbackPath);
      await this.apply(resolution.fallback);
      return true;
    }
    if (this.currentUrl() !== resolution.canonicalPath) {
      this.replaceUrl(resolution.canonicalPath);
    }
    await this.apply(resolution.target);
    return true;
  }

  private async apply(target: AppRouteTarget): Promise<void> {
    experienceContext.select(
      experienceFromRoute(target, experienceContext.get()),
      "route",
    );
    const entry = this.registrationsByPage.get(target.pageId);
    if (entry?.tag) await customElements.whenDefined(entry.tag);

    const args = this.argsForTarget(target);
    this.applyingLocation = true;
    try {
      this.currentTarget = target;
      this.activeName = entry
        ? ([...this.registrations].find(([, value]) => value === entry)?.[0] ??
          null)
        : null;
      if (window.showPage) {
        window.showPage(target.pageId, args);
      } else if (entry?.tag) {
        const element = document.querySelector<
          HTMLElement & { open(routeArgs?: RouteArgs): void }
        >(entry.tag);
        element?.open(args);
      }
    } finally {
      this.applyingLocation = false;
    }
  }

  private argsForTarget(target: AppRouteTarget): RouteArgs {
    const args: RouteArgs = {};
    for (const key of ROUTE_ARG_KEYS) {
      const value = target[key];
      if (value !== undefined) args[key] = value;
    }
    return args;
  }

  private targetFromArgs(pageId: AppPageId, args?: RouteArgs): AppRouteTarget {
    const target: AppRouteTarget = { pageId };
    if (!args) return target;
    for (const key of ROUTE_ARG_KEYS) {
      const value = args[key];
      if (typeof value === "string" && value.length > 0) {
        target[key] = value as never;
      }
    }
    return target;
  }

  private pushTarget(target: AppRouteTarget): boolean {
    try {
      const path = pathForTarget(target);
      if (this.currentUrl() !== path) {
        history.pushState(history.state, "", path);
      }
      this.lastAcceptedUrl = this.currentAddress();
      return true;
    } catch {
      // A component may briefly open before its required entity ID is known.
      // Keep the parent route until it supplies a complete target.
      return false;
    }
  }

  private replaceUrl(path: string): void {
    history.replaceState(history.state, "", path);
  }

  private currentUrl(): string {
    return window.location.pathname + window.location.search;
  }

  private currentAddress(): string {
    return this.currentUrl() + window.location.hash;
  }
}

export const appRouter = new AppRouter();
