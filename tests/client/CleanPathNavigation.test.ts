import { afterEach, describe, expect, it } from "vitest";
import { appRouter } from "../../src/client/AppRouter";
import { initNavigation } from "../../src/client/Navigation";

// Every one of these is a page rather than a link to something, so each must
// leave the address bar at the base URL.
const CASES = [
  "page-play",
  "page-item-store",
  "page-inventory",
  "page-leaderboard",
  "page-clan",
  "page-account",
  "page-news",
  "page-settings",
  "page-help",
  "page-tutorials",
  "page-blog",
  "page-terms",
  "page-privacy",
] as const;

describe("clean path navigation controls", () => {
  afterEach(() => {
    appRouter.reset();
    document.body.replaceChildren();
    history.replaceState(null, "", "/");
    window.currentPageId = undefined;
    delete window.showPage;
  });

  it("routes every main page control without a reload, hash or path", async () => {
    for (const pageId of CASES) {
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

    for (const pageId of CASES) {
      document
        .querySelector<HTMLButtonElement>(`button[data-page="${pageId}"]`)!
        .click();
      await Promise.resolve();
      expect(location.pathname).toBe("/");
      expect(location.hash).toBe("");
    }
  });
});
