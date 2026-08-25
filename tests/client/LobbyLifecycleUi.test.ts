import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("private lobby lifecycle UI", () => {
  const main = readFileSync("src/client/Main.ts", "utf8");
  const host = readFileSync("src/client/HostLobbyModal.ts", "utf8");

  it("opens social invite recipients in the read-only guest lobby", () => {
    expect(main).toMatch(
      /lobby\.source === "invite"[\s\S]*?joinModal\?\.open\([\s\S]*?alreadyJoining: true/,
    );
  });

  it("creates a clean lobby for a normal host press and starts only on click", () => {
    expect(host).toContain('detail: { cause: "new-host-lobby" }');
    expect(host).toContain("@click=${this.toggleGameStartTimer}");
    expect(host).not.toMatch(
      /handleLobbyInfo[\s\S]{0,500}toggleGameStartTimer/,
    );
  });
});
