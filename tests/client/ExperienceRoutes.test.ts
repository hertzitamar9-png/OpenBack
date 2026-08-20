import { afterEach, describe, expect, it } from "vitest";
import { parseAppUrl, pathForTarget } from "../../src/client/AppRoutes";
import {
  experienceContext,
  experienceFromRoute,
} from "../../src/client/ExperienceContext";

const url = (path: string) => new URL(path, "https://openback.test");

describe("Twin World experience navigation", () => {
  afterEach(() => localStorage.clear());

  it("uses clean experience routes and migrates old play paths to 2D", () => {
    expect(parseAppUrl(url("/play/3d"))).toMatchObject({
      kind: "app",
      target: { pageId: "page-play", experienceMode: "3d" },
      canonicalPath: "/play/3d",
    });
    expect(parseAppUrl(url("/solo"))).toMatchObject({
      target: { pageId: "page-single-player", experienceMode: "2d" },
      canonicalPath: "/solo/2d",
    });
    expect(pathForTarget({ pageId: "page-ranked", experienceMode: "3d" })).toBe(
      "/ranked/3d",
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
