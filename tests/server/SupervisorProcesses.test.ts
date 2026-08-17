import fs from "node:fs";
import path from "node:path";
import { describe, expect, test } from "vitest";

// supervisord runs nginx and the node server inside the container. If a managed
// process runs as a different user, supervisord cannot signal it on shutdown
// and the container has to be killed instead of stopping cleanly, which turns
// a quick restart into a hung one.
describe("supervised processes", () => {
  test("supervisor can stop every managed process during a restart", () => {
    const supervisor = fs.readFileSync(
      path.resolve("supervisord.conf"),
      "utf8",
    );
    const managedUsers = [...supervisor.matchAll(/^user=(.+)$/gm)].map(
      (match) => match[1].trim(),
    );

    expect(new Set(managedUsers)).toEqual(new Set(["root"]));
  });
});
