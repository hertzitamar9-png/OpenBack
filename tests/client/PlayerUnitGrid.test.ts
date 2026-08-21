import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const css = readFileSync(
  resolve(process.cwd(), "src/client/styles/openback.css"),
  "utf8",
);

/**
 * The base rule, i.e. the one outside every media query.
 *
 * The grid originally had rules only inside two narrow media queries, so an
 * ordinary desktop window matched neither and the element never became a grid
 * at all -- its twelve counters stacked into one tall column.
 */
function baseRule(selector: string): string | null {
  let depth = 0;
  const lines = css.split("\n");
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    if (depth === 0 && line.trimStart().startsWith(`${selector} {`)) {
      const body: string[] = [];
      for (let j = i + 1; j < lines.length && !lines[j].startsWith("}"); j++) {
        body.push(lines[j]);
      }
      return body.join("\n");
    }
    depth += (line.match(/\{/g) ?? []).length;
    depth -= (line.match(/\}/g) ?? []).length;
  }
  return null;
}

describe("player panel unit counters", () => {
  it("is a grid outside any media query", () => {
    const rule = baseRule(".player-info-unit-grid");
    expect(rule).not.toBeNull();
    expect(rule).toContain("display: grid");
  });

  it("spreads its columns across the whole panel", () => {
    // Fixed 2.25rem columns pinned to the left left two short rows of counters
    // against a wide empty half. Measured in a browser at a 600px panel: six
    // columns of ~96.7px filling 100% of the width, two rows of six.
    const rule = baseRule(".player-info-unit-grid")!;
    expect(rule).toContain("minmax(0, 1fr)");
    expect(rule).not.toContain("minmax(0, 2.25rem)");
    expect(rule).not.toContain("justify-content: start");

    // Counters carry a fixed utility width for the narrow layouts, so they
    // have to be told to stretch or the columns grow while they do not.
    expect(baseRule(".player-info-unit-grid > *")).toContain("width: 100%");
  });

  // The first attempt at this only fixed the base rule, and the base rule only
  // applies above 1024px. The @media (max-width: 1023px) override still pinned
  // 2.25rem columns to the left, so any window narrower than that -- including
  // a desktop window that simply is not maximised -- looked untouched.
  // Measured at an 800px viewport, 740px panel: counters went from 36px at 31%
  // fill to 122px at 100%. At 1400px the base rule gives 120px, also 100%.
  it("fills the panel at every width, not just the widest", () => {
    // No rule anywhere may pin the columns narrow or shove them left.
    const gridRules = [
      ...css.matchAll(/\.player-info-unit-grid\s*\{([^}]*)\}/g),
    ].map((m) => m[1]);
    expect(gridRules.length).toBeGreaterThanOrEqual(2);

    for (const rule of gridRules) {
      expect(rule).not.toContain("minmax(0, 2.25rem)");
      expect(rule).not.toContain("justify-content: start");
    }

    // Every stretching rule needs its children told to stretch as well.
    const stretchRules = [
      ...css.matchAll(/\.player-info-unit-grid > \*\s*\{([^}]*)\}/g),
    ];
    expect(stretchRules.length).toBeGreaterThanOrEqual(2);
  });

  it("keeps a fallback in the column count", () => {
    // An unset custom property inside repeat() invalidates the whole
    // declaration, and the result looks exactly like a single column.
    expect(baseRule(".player-info-unit-grid")).toContain(
      "var(--player-unit-columns, 6)",
    );
  });
});
