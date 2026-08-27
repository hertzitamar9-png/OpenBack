import { describe, expect, it } from "vitest";

/**
 * A request for a file the server does not have must be answered with 404.
 *
 * The SPA fallback used to answer every unmatched path with 200 and the app
 * shell. That meant /setup.exe, /openback.apk, /download/game.exe and
 * /files/crack.zip all came back 200 with a 208 KB body -- the server
 * confirming that any download anyone cared to name existed on this domain.
 * Google Safe Browsing flagged the site for hosting harmful downloads, which
 * makes Chrome warn every player before they can reach the game.
 *
 * The rule under test: only the final path segment is examined, and only for
 * a file extension. Application routes never name a file, so they are
 * untouched.
 */
const FILENAME_SEGMENT = /\.[A-Za-z0-9]{1,10}$/;

function looksLikeAMissingFile(pathname: string): boolean {
  const lastSegment = pathname.split("/").filter(Boolean).pop();
  return lastSegment !== undefined && FILENAME_SEGMENT.test(lastSegment);
}

describe("requests for files the server does not have", () => {
  it.each([
    "/setup.exe",
    "/install.exe",
    "/openback.apk",
    "/update.dmg",
    "/app.msi",
    "/download/game.exe",
    "/files/crack.zip",
    "/payload.jar",
    "/script.bat",
    "/image.scr",
  ])("refuses %s", (path) => {
    expect(looksLikeAMissingFile(path)).toBe(true);
  });

  it.each([
    "/",
    "/settings",
    "/store",
    "/leaderboard",
    "/blog/living-game-updates",
    "/tutorials/getting-started",
    "/clans/TST/overview",
    "/profile/abc123/stats",
    "/stats/game-1",
    "/multiplayer/host",
  ])("still serves the app for the route %s", (path) => {
    expect(looksLikeAMissingFile(path)).toBe(false);
  });

  it("only inspects the last segment, so an id with a dot still routes", () => {
    // A publicID or clan tag may contain a dot; the route that follows it does
    // not, and that is what decides.
    expect(looksLikeAMissingFile("/profile/some.id/stats")).toBe(false);
    expect(looksLikeAMissingFile("/clans/a.b/members")).toBe(false);
  });

  it("does not mistake a long trailing word for an extension", () => {
    // Guards the {1,10} bound: this is a route, not a file.
    expect(looksLikeAMissingFile("/blog/openback.developmentupdate")).toBe(
      false,
    );
  });
});
