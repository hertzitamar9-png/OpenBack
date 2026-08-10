// @vitest-environment node

import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

const root = path.resolve(import.meta.dirname, "../..");
const read = (file: string) => fs.readFileSync(path.join(root, file), "utf8");

describe("visible OpenBack feature contract", () => {
  test("never invokes browser-generated alert, confirm, or prompt UI", () => {
    const clientFiles = fs
      .readdirSync(path.join(root, "src/client"), { recursive: true })
      .map(String)
      .filter((entry) => entry.endsWith(".ts"));
    const offenders = clientFiles.filter((entry) => {
      const source = read(path.join("src/client", entry))
        .replace(/\/\*[\s\S]*?\*\//g, "")
        .replace(/\/\/.*$/gm, "");
      return /(?:window|globalThis)\.(?:alert|confirm|prompt)\s*\(|^\s*(?:alert|confirm|prompt)\s*\(/m.test(
        source,
      );
    });
    expect(offenders).toEqual([]);
  });

  test("does not expose payment panels without a working product catalog", () => {
    expect(read("src/client/Cosmetics.ts")).toContain(
      "export const SUBSCRIPTIONS_ENABLED = false",
    );
    const catalog = JSON.parse(read("resources/cosmetics.json")) as {
      currencyPacks?: unknown;
      subscriptions?: unknown;
      tribeNames?: unknown;
    };
    expect(catalog.currencyPacks).toEqual({});
    expect(catalog.subscriptions).toEqual({});
    expect(catalog.tribeNames).toBeTruthy();
  });

  test("backs every visible account, store, and leaderboard service locally", () => {
    const server = read("src/server/auth/AuthServer.ts");
    for (const route of [
      "/users/@me",
      "/users/@me/profile-picture",
      "/auth/account",
      "/friends",
      "/social/conversations",
      "/clans",
      "/leaderboard/ranked",
      "/shop/purchase",
      "/users/@me/tribe_names",
      "/public/tribe/:name",
      "/leaderboard/tribes",
      "/custom_tribes",
    ]) {
      expect(server, `missing local route ${route}`).toContain(route);
    }
  });
});
