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

  it("offers separate Classic 2D and Immersive 3D tutorials", async () => {
    const tutorial = await mount();
    tutorial.querySelector<HTMLButtonElement>("[data-tutorial-start]")!.click();
    await tutorial.updateComplete;

    expect(tutorial.querySelector('[data-tutorial-mode="2d"]')).toBeTruthy();
    expect(tutorial.querySelector('[data-tutorial-mode="3d"]')).toBeTruthy();
    expect(tutorial.querySelector("[data-tutorial-skip]")).toBeTruthy();
  });

  it("advances through mode-specific steps and remembers completion", async () => {
    const tutorial = await mount();
    tutorial.querySelector<HTMLButtonElement>("[data-tutorial-start]")!.click();
    await tutorial.updateComplete;
    tutorial
      .querySelector<HTMLButtonElement>('[data-tutorial-mode="3d"]')!
      .click();
    await tutorial.updateComplete;

    expect(tutorial.querySelector("[data-tutorial-step]")).toBeTruthy();
    expect(
      tutorial.querySelector("[data-tutorial-progress]")?.textContent,
    ).toContain("1 / 5");
    expect(tutorial.querySelector("[data-tutorial-previous]")).toBeNull();

    for (let index = 0; index < 4; index += 1) {
      tutorial
        .querySelector<HTMLButtonElement>("[data-tutorial-next]")!
        .click();
      await tutorial.updateComplete;
    }

    expect(tutorial.querySelector("[data-tutorial-finish]")).toBeTruthy();
    tutorial
      .querySelector<HTMLButtonElement>("[data-tutorial-finish]")!
      .click();
    await tutorial.updateComplete;

    expect(localStorage.getItem(PLAYER_TUTORIAL_STORAGE_KEY)).toBe("complete");
    expect(tutorial.querySelector("[data-tutorial-overlay]")).toBeNull();
  });

  it("can be reopened from any global tutorial entry point", async () => {
    localStorage.setItem(PLAYER_TUTORIAL_STORAGE_KEY, "complete");
    const tutorial = await mount();

    document.dispatchEvent(new CustomEvent("open-player-tutorial"));
    await tutorial.updateComplete;

    expect(tutorial.querySelector('[data-tutorial-mode="2d"]')).toBeTruthy();
    expect(tutorial.querySelector('[data-tutorial-mode="3d"]')).toBeTruthy();
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
