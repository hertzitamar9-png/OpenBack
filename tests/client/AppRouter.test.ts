import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { AppRouter } from "../../src/client/AppRouter";

class TestRoutablePage extends HTMLElement {
  open = vi.fn<(args?: Record<string, unknown>) => void>();
  close = vi.fn<() => void>();
}

if (!customElements.get("test-news-page")) {
  customElements.define("test-news-page", class extends TestRoutablePage {});
}
if (!customElements.get("test-settings-page")) {
  customElements.define(
    "test-settings-page",
    class extends TestRoutablePage {},
  );
}

describe("AppRouter", () => {
  let router: AppRouter;
  let news: TestRoutablePage;
  let settings: TestRoutablePage;

  beforeEach(() => {
    history.replaceState(null, "", "/");
    document.body.innerHTML = `
      <test-news-page id="page-news"></test-news-page>
      <test-settings-page id="page-settings"></test-settings-page>
      <div id="page-play"></div>
    `;
    news = document.querySelector("test-news-page") as TestRoutablePage;
    settings = document.querySelector("test-settings-page") as TestRoutablePage;

    window.showPage = vi.fn(
      (pageId: string, args?: Record<string, unknown>) => {
        const page = document.getElementById(pageId) as
          | TestRoutablePage
          | undefined;
        page?.open?.(args);
      },
    );

    router = new AppRouter();
    router.register("news", { tag: "test-news-page", pageId: "page-news" });
    router.register("settings", {
      tag: "test-settings-page",
      pageId: "page-settings",
    });
  });

  afterEach(() => {
    router.stop();
    delete window.showPage;
    document.body.innerHTML = "";
  });

  it("pushes user navigation and opens the registered page once", async () => {
    await router.navigate({ pageId: "page-news" });

    expect(location.pathname).toBe("/");
    expect(window.showPage).toHaveBeenCalledOnce();
    expect(window.showPage).toHaveBeenCalledWith("page-news", {});
    expect(news.open).toHaveBeenCalledOnce();
  });

  it("restores a nested tab when browser history changes", async () => {
    await router.start();
    history.pushState(null, "", "/settings/keybinds");

    dispatchEvent(new PopStateEvent("popstate"));
    await vi.waitFor(() => {
      expect(settings.open).toHaveBeenCalledWith({ tab: "keybinds" });
    });

    expect(location.pathname).toBe("/");
    expect(window.showPage).toHaveBeenLastCalledWith("page-settings", {
      tab: "keybinds",
    });
  });

  it("replaces a legacy hash with its canonical clean path", async () => {
    history.replaceState(null, "", "/#modal=news");

    expect(await router.start()).toBe(true);

    expect(location.pathname).toBe("/");
    expect(location.hash).toBe("");
    expect(news.open).toHaveBeenCalledOnce();
  });

  it("replaces a parent path with its canonical default tab", async () => {
    history.replaceState(null, "", "/settings");

    expect(await router.start()).toBe(true);

    expect(location.pathname).toBe("/");
    expect(settings.open).toHaveBeenCalledWith({ tab: "basic" });
  });

  it("does not claim a lobby URL", async () => {
    history.replaceState(null, "", "/game/AbCd1234");

    expect(await router.start()).toBe(false);
    expect(window.showPage).not.toHaveBeenCalled();
  });

  it("synchronizes a registered tab change without reopening the page", async () => {
    await router.navigate({ pageId: "page-settings", tab: "basic" });
    vi.mocked(window.showPage!).mockClear();
    settings.open.mockClear();

    router.syncTab("settings", "keybinds");

    expect(location.pathname).toBe("/");
    expect(window.showPage).not.toHaveBeenCalled();
    expect(settings.open).not.toHaveBeenCalled();
  });

  it("ignores synchronization from unregistered transient overlays", () => {
    router.syncOpened("change-username");
    router.syncTab("change-username", "anything");
    router.syncClosed("change-username");

    expect(location.pathname).toBe("/");
    expect(location.hash).toBe("");
  });

  it("does not publish an incomplete registered entity route", () => {
    router.register("profile", { pageId: "page-profile" });

    expect(() => router.syncOpened("profile")).not.toThrow();
    expect(location.pathname).toBe("/");
  });

  it("opens a registered page directly when navigation is not initialized", async () => {
    delete window.showPage;

    await router.navigate({ pageId: "page-settings", tab: "keybinds" });

    expect(settings.open).toHaveBeenCalledWith({ tab: "keybinds" });
  });
});
