import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

const source = (file: string) =>
  readFileSync(resolve(process.cwd(), "src/client", file), "utf8");

describe("home selector input styling", () => {
  it("keeps flag and cosmetic selectors borderless at rest", () => {
    const flag = source("FlagInput.ts");
    const cosmetic = source("CosmeticsInput.ts");

    expect(flag).toContain("border-0");
    expect(cosmetic).toContain("border-0");
    expect(cosmetic).not.toContain("border-blue");
  });

  it("gives both selectors the same visible hover lift", () => {
    const flag = source("FlagInput.ts");
    const cosmetic = source("CosmeticsInput.ts");

    for (const selector of [flag, cosmetic]) {
      expect(selector).toContain("hover:-translate-y-0.5");
      expect(selector).toContain("hover:scale-110");
    }
  });

  it("never draws a focus ring or blue outline around either selector", () => {
    const flag = source("FlagInput.ts");
    const cosmetic = source("CosmeticsInput.ts");

    for (const selector of [flag, cosmetic]) {
      expect(selector).not.toContain("focus-visible:ring");
      expect(selector).not.toContain("focus-visible:outline");
      expect(selector).not.toContain(
        "hover:shadow-[var(--shadow-action-card-hover)]",
      );
    }
  });

  it("uses accessible labels without native hover tooltips", () => {
    const flag = source("FlagInput.ts");
    const cosmetic = source("CosmeticsInput.ts");

    for (const selector of [flag, cosmetic]) {
      expect(selector).toContain("aria-label=${");
      expect(selector).not.toContain("title=${buttonTitle}");
    }
  });
});
