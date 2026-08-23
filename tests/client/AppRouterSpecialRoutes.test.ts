import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRouter } from "../../src/client/AppRouter";

describe("AppRouter special route and leave protection", () => {
  let router: AppRouter;
  let showPage: ReturnType<
    typeof vi.fn<(pageId: string, args?: Record<string, unknown>) => void>
  >;

  beforeEach(() => {
    history.replaceState(null, "", "/game/AbCd1234");
    showPage =
      vi.fn<(pageId: string, args?: Record<string, unknown>) => void>();
    window.showPage = showPage;
    router = new AppRouter();
  });

  afterEach(() => {
    router.reset();
    delete window.showPage;
    history.replaceState(null, "", "/");
  });

  it.each(["/game/AbCd1234", "/w1/game/AbCd1234"])(
    "does not claim %s as an app page",
    async (path) => {
      history.replaceState(null, "", path);
      expect(await router.start()).toBe(false);
      expect(showPage).not.toHaveBeenCalled();
    },
  );

  it("does not change the URL when guarded navigation is cancelled", async () => {
    await router.start();
    const guard = vi.fn(async () => false);
    router.setNavigationGuard(guard);

    expect(await router.navigate({ pageId: "page-news" })).toBe(false);

    expect(guard).toHaveBeenCalledOnce();
    expect(location.pathname).toBe("/game/AbCd1234");
    expect(showPage).not.toHaveBeenCalled();
  });

  it("restores the game URL when a guarded popstate is cancelled", async () => {
    await router.start();
    router.setNavigationGuard(async () => false);
    history.pushState(null, "", "/news");

    dispatchEvent(new PopStateEvent("popstate"));

    await vi.waitFor(() => {
      expect(location.pathname).toBe("/game/AbCd1234");
    });
    expect(showPage).not.toHaveBeenCalled();
  });

  it("applies the requested route after guarded navigation is accepted", async () => {
    await router.start();
    router.setNavigationGuard(async () => true);

    expect(await router.navigate({ pageId: "page-news" })).toBe(true);

    expect(location.pathname).toBe("/");
    expect(showPage).toHaveBeenCalledWith("page-news", {});
  });

  it("can adopt a lobby URL written by the game join flow", async () => {
    history.replaceState(null, "", "/");
    await router.start();
    history.pushState(null, "", "/w1/game/Joined123?live");
    router.acceptCurrentLocation();
    router.setNavigationGuard(async () => false);
    history.pushState(null, "", "/news");

    dispatchEvent(new PopStateEvent("popstate"));

    await vi.waitFor(() => {
      expect(location.pathname).toBe("/w1/game/Joined123");
      expect(location.search).toBe("?live");
    });
  });
});
