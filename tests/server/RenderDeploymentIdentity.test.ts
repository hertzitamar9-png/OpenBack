import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

describe("Render deployment identity", () => {
  test("does not pin the public service to a manually maintained commit", () => {
    const blueprint = readFileSync(
      resolve(process.cwd(), "render.yaml"),
      "utf8",
    );
    expect(blueprint).not.toMatch(/- key: GIT_COMMIT/);
  });

  test("records Render's source commit in the built site", () => {
    const dockerfile = readFileSync(
      resolve(process.cwd(), "Dockerfile"),
      "utf8",
    );
    expect(dockerfile).toContain("ARG RENDER_GIT_COMMIT=");
    expect(dockerfile).toContain(
      'echo "${RENDER_GIT_COMMIT:-$GIT_COMMIT}" > static/commit.txt',
    );
  });
});
