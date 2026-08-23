import { afterEach, describe, expect, it } from "vitest";
import { parseAppUrl, pathForTarget } from "../../src/client/AppRoutes";
import {
  experienceContext,
  experienceFromRoute,
} from "../../src/client/ExperienceContext";

const url = (path: string) => new URL(path, "https://openback.test");

describe("Twin World experience navigation", () => {
  afterEach(() => localStorage.clear());

  // The experience is remembered state, not an address. An old /play/3d link
  // still selects the 3D world; it just does not leave "3d" in the bar.
  it("keeps the experience out of the URL while still honouring old links", () => {
    expect(parseAppUrl(url("/play/3d"))).toMatchObject({
      kind: "app",
      target: { pageId: "page-play", experienceMode: "3d" },
      canonicalPath: "/",
    });
    expect(parseAppUrl(url("/solo"))).toMatchObject({
      target: { pageId: "page-single-player", experienceMode: "2d" },
      canonicalPath: "/",
    });
    expect(pathForTarget({ pageId: "page-ranked", experienceMode: "3d" })).toBe(
      "/",
    );
    expect(pathForTarget({ pageId: "page-play", experienceMode: "2d" })).toBe(
      "/",
    );
  });

  it("remembers a user selection without initializing a renderer", () => {
    experienceContext.select("3d", "user");
    expect(experienceContext.get()).toBe("3d");
    expect(localStorage.getItem("openback-experience")).toBe("3d");
    experienceContext.select("2d", "user");
  });

  it("lets an explicit route override the remembered world", () => {
    localStorage.setItem("openback-experience", "2d");
    expect(experienceFromRoute({ experienceMode: "3d" }, "2d")).toBe("3d");
    expect(experienceFromRoute({}, "3d")).toBe("3d");
  });
});
