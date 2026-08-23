import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { appRouter } from "../../src/client/AppRouter";
import { initNavigation } from "../../src/client/Navigation";
import "../../src/client/OpenBackContentModal";
import type { OpenBackContentModal } from "../../src/client/OpenBackContentModal";

const content = {
  tutorials: [
    {
      path: "/tutorials/getting-started",
      type: "Tutorial",
      title: "Getting Started",
      description: "Learn the opening.",
      sections: [{ title: "Spawn", text: "Choose land." }],
    },
  ],
  blogs: [],
};

describe("OpenBack content routes", () => {
  let modal: OpenBackContentModal;

  beforeEach(async () => {
    history.replaceState(null, "", "/");
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => content })),
    );
    const play = document.createElement("div");
    play.id = "page-play";
    document.body.appendChild(play);
    modal = document.createElement(
      "openback-content-modal",
    ) as OpenBackContentModal;
    modal.id = "page-tutorials";
    modal.setAttribute("content-kind", "guides");
    modal.setAttribute("inline", "");
    modal.className = "page-content hidden";
    document.body.appendChild(modal);
    await modal.updateComplete;
    initNavigation();
    appRouter.register("tutorials", {
      tag: "openback-content-modal",
      pageId: "page-tutorials",
    });
  });

  afterEach(() => {
    appRouter.reset();
    vi.unstubAllGlobals();
    document.body.replaceChildren();
    history.replaceState(null, "", "/");
  });

  it("restores a tutorial article from a direct clean path", async () => {
    history.replaceState(null, "", "/tutorials/getting-started");

    expect(await appRouter.start()).toBe(true);

    await vi.waitFor(async () => {
      await modal.updateComplete;
      expect(modal.textContent).toContain("Getting Started");
      expect(modal.textContent).toContain("Choose land.");
      expect(modal.selectedArticlePath()).toBe("/tutorials/getting-started");
    });
    expect(location.pathname).toBe("/tutorials/getting-started");
  });

  it("routes article cards and their Back button without reloads", async () => {
    await appRouter.navigate({ pageId: "page-tutorials" });
    await vi.waitFor(async () => {
      await modal.updateComplete;
      expect(modal.querySelector("article")).toBeNull();
      expect(modal.textContent).toContain("Learn the opening.");
    });

    const card = [...modal.querySelectorAll<HTMLButtonElement>("button")].find(
      (button) => button.textContent?.includes("Getting Started"),
    )!;
    card.click();
    await vi.waitFor(() =>
      expect(location.pathname).toBe("/tutorials/getting-started"),
    );

    const back = modal.querySelector<HTMLButtonElement>("[data-modal-back]")!;
    back.click();
    await vi.waitFor(() => expect(location.pathname).toBe("/"));
  });
});
