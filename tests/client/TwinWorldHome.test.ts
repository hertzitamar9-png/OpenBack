import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("Twin World home", () => {
  const selector = readFileSync("src/client/GameModeSelector.ts", "utf8");
  const styles = readFileSync("src/client/styles/openback.css", "utf8");
  const solo = readFileSync("src/client/SinglePlayerModal.ts", "utf8");
  const host = readFileSync("src/client/HostLobbyModal.ts", "utf8");

  it("shows one 2D/3D switch and passes its world into every launch path", () => {
    expect(selector).toContain("<experience-switch");
    expect(selector).toContain("lobby.experienceMode === this.experienceMode");
    expect(selector).toContain("setExperienceMode(this.experienceMode)");
    expect(selector).toContain("experienceMode: this.experienceMode");
  });

  it("uses the available desktop canvas instead of a narrow center column", () => {
    expect(styles).toContain("--home-stage-max: 78rem");
    expect(styles).toMatch(
      /body:not\(\.openback-subpage-open\) \.main-layout-scroll\s*\{[^}]*max-width:\s*min\(var\(--home-stage-max\)/s,
    );
  });

  it("centers the Home stage vertically only on tall desktop screens", () => {
    expect(styles).toMatch(
      /@media \(min-width: 1024px\) and \(min-height: 900px\)[\s\S]*?body:not\(\.openback-subpage-open\) \.main-layout-scroll\s*\{[^}]*justify-content:\s*center/s,
    );
    expect(styles).toMatch(
      /@media \(min-width: 1024px\) and \(min-height: 900px\)[\s\S]*?\.home-lobby-grid\s*\{[^}]*height:\s*min\(30rem,\s*38vh\)/s,
    );
    expect(styles).toMatch(
      /@media \(min-width: 1024px\) and \(min-height: 900px\)[\s\S]*?body:not\(\.openback-subpage-open\) #page-play\s*\{[^}]*transform:\s*translateY\(clamp\(-3\.5rem,\s*-4vh,\s*-2rem\)\)/s,
    );
  });

  it("keeps 3D out of the ordinary modifier checklist", () => {
    expect(solo).not.toContain('labelKey: "single_modal.three_d_mode"');
    expect(host).not.toContain('labelKey: "host_modal.three_d_mode"');
  });

  it("does not enlarge low-resolution map previews with forced scaling", () => {
    expect(selector).not.toContain("scale-[1.05]");
  });
});
