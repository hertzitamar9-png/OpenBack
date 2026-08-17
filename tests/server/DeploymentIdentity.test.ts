import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, test } from "vitest";

// The client advertises the running revision from static/commit.txt. It has to
// be baked in when the image is built, otherwise a container can report a
// different revision from the code it is actually running.
describe("deployment identity", () => {
  test("records the built commit in the site", () => {
    const dockerfile = readFileSync(
      resolve(process.cwd(), "Dockerfile"),
      "utf8",
    );
    expect(dockerfile).toContain("ARG GIT_COMMIT=");
    expect(dockerfile).toContain('echo "$GIT_COMMIT" > static/commit.txt');
  });

  test("builds the client against the same commit it reports", () => {
    const dockerfile = readFileSync(
      resolve(process.cwd(), "Dockerfile"),
      "utf8",
    );
    expect(dockerfile).toContain('GIT_COMMIT="$GIT_COMMIT" npm run build-prod');
  });
});
