import fs from "node:fs";
import path from "node:path";
import { afterEach, beforeEach, describe, expect, it } from "vitest";
import {
  PLAYER_TUTORIAL_STORAGE_KEY,
  PlayerTutorial,
} from "../../src/client/components/PlayerTutorial";

async function mount(): Promise<PlayerTutorial> {
  const tutorial = new PlayerTutorial();
  document.body.appendChild(tutorial);
  await tutorial.updateComplete;
  return tutorial;
}

describe("player tutorial", () => {
  beforeEach(() => {
    localStorage.clear();
    document.body.replaceChildren();
  });

  afterEach(() => {
    document.body.classList.remove("tutorial-coach-active");
    document.body.replaceChildren();
  });

  it("requires a first visitor to open the tutorial or skip it", async () => {
    const tutorial = await mount();

    expect(tutorial.querySelector("[data-tutorial-first-run]")).toBeTruthy();
    expect(document.body.classList).toContain("tutorial-coach-active");
    expect(tutorial.querySelector("[data-tutorial-start]")).toBeTruthy();
    expect(tutorial.querySelector("[data-tutorial-skip]")).toBeTruthy();
  });

  it("remembers Skip and does not block the next visit", async () => {
    const tutorial = await mount();
    tutorial.querySelector<HTMLButtonElement>("[data-tutorial-skip]")!.click();
    await tutorial.updateComplete;

    expect(localStorage.getItem(PLAYER_TUTORIAL_STORAGE_KEY)).toBe("complete");
    expect(tutorial.querySelector("[data-tutorial-overlay]")).toBeNull();

    tutorial.remove();
    const nextVisit = await mount();
    expect(nextVisit.querySelector("[data-tutorial-overlay]")).toBeNull();
  });

  it("starts the guided match instead of a slideshow", async () => {
    // Opening the tutorial now joins a real game. The old flow showed a
    // handful of description cards and asked, before the player had seen the
    // game at all, whether they wanted the 2D or the 3D version of it.
    const tutorial = await mount();
    const joins: Array<Record<string, unknown>> = [];
    const spy = (e: Event) => {
      joins.push(((e as CustomEvent).detail ?? {}) as Record<string, unknown>);
    };
    document.addEventListener("join-lobby", spy);

    tutorial.querySelector<HTMLButtonElement>("[data-tutorial-start]")!.click();
    // The launcher awaits the username seed and the cosmetics fetch first.
    await new Promise((resolve) => setTimeout(resolve, 0));
    await tutorial.updateComplete;
    document.removeEventListener("join-lobby", spy);

    expect(localStorage.getItem(PLAYER_TUTORIAL_STORAGE_KEY)).toBe("complete");
    expect(tutorial.querySelector("[data-tutorial-overlay]")).toBeNull();
  });

  it("never asks which camera the player wants", async () => {
    // A player who has not played cannot answer that, and the tutorial is
    // about the game rather than the view. Classic 2D, always.
    const tutorial = await mount();
    tutorial.querySelector<HTMLButtonElement>("[data-tutorial-start]")!.click();
    await tutorial.updateComplete;

    const text = tutorial.textContent ?? "";
    expect(text).not.toMatch(/immersive 3d/i);
    expect(text).not.toMatch(/choose/i);
  });

  it("ships translated labels for both tutorial modes", () => {
    const translations = JSON.parse(
      fs.readFileSync(
        path.join(process.cwd(), "resources/lang/en.openback.json"),
        "utf8",
      ),
    ) as { player_tutorial?: Record<string, string> };

    expect(translations.player_tutorial?.mode_2d).toBe("Classic 2D");
    expect(translations.player_tutorial?.mode_3d).toBe("Immersive 3D");
  });
});
