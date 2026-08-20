import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "../../src/client/AppRouter";
import { initNavigation } from "../../src/client/Navigation";

const CASES = [
  ["page-play", "/play/2d"],
  ["page-item-store", "/store/packs"],
  ["page-inventory", "/inventory/skins"],
  ["page-leaderboard", "/leaderboard/1v1"],
  ["page-clan", "/clans/my-clans"],
  ["page-account", "/account"],
  ["page-news", "/news"],
  ["page-settings", "/settings/basic"],
  ["page-help", "/help"],
  ["page-tutorials", "/tutorials"],
  ["page-blog", "/blog"],
  ["page-terms", "/terms"],
  ["page-privacy", "/privacy"],
] as const;

describe("clean path navigation controls", () => {
  afterEach(() => {
    appRouter.reset();
    document.body.replaceChildren();
    history.replaceState(null, "", "/");
    window.currentPageId = undefined;
    delete window.showPage;
  });

  it("routes every main page control without a reload or hash", async () => {
    for (const [pageId] of CASES) {
      const page = document.createElement("div");
      page.id = pageId;
      if (pageId !== "page-play") page.className = "page-content hidden";
      document.body.appendChild(page);

      const button = document.createElement("button");
      button.className = "nav-menu-item";
      button.dataset.page = pageId;
      document.body.appendChild(button);
    }
    initNavigation();

    for (const [pageId, path] of CASES) {
      document
        .querySelector<HTMLButtonElement>(`button[data-page="${pageId}"]`)!
        .click();
      await Promise.resolve();
      expect(location.pathname).toBe(path);
      expect(location.hash).toBe("");
    }
  });
});
