import { afterEach, expect, it, vi } from "vitest";
import { startTutorialMatch } from "../../../src/client/tutorial/StartTutorial";
const mocks = vi.hoisted(() => ({ navigate: vi.fn(), cosmetics: vi.fn() }));
vi.mock("../../../src/client/AppRouter", () => ({
  appRouter: { navigatePage: mocks.navigate },
}));
vi.mock("../../../src/client/Cosmetics", () => ({
  getPlayerCosmetics: mocks.cosmetics,
}));

afterEach(() => {
  vi.clearAllMocks();
  sessionStorage.clear();
});
it("does not replace a match or set the tutorial marker after Cancel", async () => {
  mocks.navigate.mockResolvedValue(false);
  const joined = vi.fn();
  document.addEventListener("join-lobby", joined);
  try {
    expect(await startTutorialMatch()).toBe(false);
    expect(joined).not.toHaveBeenCalled();
    expect(sessionStorage.getItem("openback.tutorial.active")).toBeNull();
  } finally {
    document.removeEventListener("join-lobby", joined);
  }
});
it("launches only once when Start is pressed twice", async () => {
  mocks.navigate.mockResolvedValue(true);
  mocks.cosmetics.mockResolvedValue({});
  const joined = vi.fn();
  document.addEventListener("join-lobby", joined);
  try {
    await Promise.all([startTutorialMatch(), startTutorialMatch()]);
    expect(joined).toHaveBeenCalledTimes(1);
    expect(
      joined.mock.calls[0][0].detail.gameStartInfo.config.tutorialMission,
    ).toBe("first-command-v1");
  } finally {
    document.removeEventListener("join-lobby", joined);
  }
});
