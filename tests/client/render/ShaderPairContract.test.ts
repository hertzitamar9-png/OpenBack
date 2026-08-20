/**
 * A fragment shader can only read varyings its vertex shader writes.
 *
 * When the two drift apart — one updated, the other left behind — nothing
 * fails until WebGL compiles the pair at runtime, which happens mid-game and
 * takes the match down with a wall of "undeclared identifier". That is a
 * compile error the type checker, the linter and the unit tests cannot see,
 * so it is checked structurally here instead.
 */
import { readFileSync } from "node:fs";
import path from "node:path";
import { globSync } from "tinyglobby";
import { describe, expect, it } from "vitest";

const SHADER_ROOT = "src/client/render/gl/shaders";

function declarations(source: string, keyword: "in" | "out"): Set<string> {
  const names = new Set<string>();
  // e.g. "flat in vec3 vColor0;" / "out float vAlpha;"
  const qualifier = String.raw`(?:flat\s+|smooth\s+|noperspective\s+)?`;
  const pattern = new RegExp(
    String.raw`^\s*` + qualifier + keyword + String.raw`\s+\w+\s+(\w+)\s*;`,
    "gm",
  );
  for (const match of source.matchAll(pattern)) names.add(match[1]);
  return names;
}

const fragments = globSync(`${SHADER_ROOT}/**/*.frag.glsl`).sort();

describe("shader pairs stay in step", () => {
  it("finds shaders to check", () => {
    expect(fragments.length).toBeGreaterThan(0);
  });

  it("declares exactly one main() per shader", () => {
    const offenders: string[] = [];
    for (const file of globSync(`${SHADER_ROOT}/**/*.glsl`)) {
      const count = (readFileSync(file, "utf8").match(/^void main/gm) ?? [])
        .length;
      if (count !== 1) offenders.push(`${file}: ${count} main() definitions`);
    }
    expect(offenders).toEqual([]);
  });

  it("reads only varyings its vertex shader writes", () => {
    const offenders: string[] = [];
    for (const fragPath of fragments) {
      const vertPath = fragPath.replace(/\.frag\.glsl$/, ".vert.glsl");
      let vertSource: string;
      try {
        vertSource = readFileSync(vertPath, "utf8");
      } catch {
        continue; // Full-screen passes share a generic vertex shader.
      }
      const written = declarations(vertSource, "out");
      for (const name of declarations(readFileSync(fragPath, "utf8"), "in")) {
        if (!written.has(name)) {
          offenders.push(
            `${path.basename(fragPath)} reads ${name}, which ${path.basename(vertPath)} never writes`,
          );
        }
      }
    }
    expect(offenders).toEqual([]);
  });
});
