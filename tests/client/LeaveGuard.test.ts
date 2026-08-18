import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import { shouldConfirmLeaving } from "../../src/client/openback/LeaveGuard";

describe("leaving a match asks first", () => {
  it("asks a living player", () => {
    expect(shouldConfirmLeaving({ isAlive: () => true })).toBe(true);
  });

  it("lets an eliminated player go straight out", () => {
    expect(shouldConfirmLeaving({ isAlive: () => false })).toBe(false);
  });

  it("asks while the local player is still unresolved", () => {
    // The lag case: the client has not resolved myPlayer() yet. Treating that
    // as "already dead" abandoned live matches on a single tap.
    expect(shouldConfirmLeaving(null)).toBe(true);
    expect(shouldConfirmLeaving(undefined)).toBe(true);
  });
});

describe("every exit route uses the guard", () => {
  const read = (rel: string) =>
    readFileSync(resolve(process.cwd(), rel), "utf8");

  it("guards the browser back gesture at its root", () => {
    // popstate leaves through lobbyHandle.stop(), which asks
    // shouldPreventWindowClose(). That used to be !!myPlayer?.isAlive(), so an
    // unresolved player meant "let them go" and back abandoned a live match.
    const src = read("src/client/ClientGameRunner.ts");
    expect(src).toContain("shouldConfirmLeaving");
    expect(src).not.toContain("return !!this.myPlayer?.isAlive();");
  });

  it("treats a missing game runner as a reason to ask", () => {
    // No runner yet means the game is still starting, which is exactly when a
    // stray back gesture should be questioned rather than obeyed.
    const src = read("src/client/ClientGameRunner.ts");
    expect(src).toContain("const preventClose = currentGameRunner");
    expect(src).toContain(": true;");
  });

  it("guards the in-game sidebar exit", () => {
    expect(read("src/client/hud/layers/GameRightSidebar.ts")).toContain(
      "shouldConfirmLeaving",
    );
  });

  it("always asks on the settings exit", () => {
    expect(read("src/client/hud/layers/SettingsModal.ts")).toContain(
      "confirm_leave_game",
    );
  });
});
