import { describe, expect, it } from "vitest";
import { detectInputCapabilities } from "../../src/client/InputCapabilities";

function media(matches: string[]) {
  return ((query: string) => ({
    matches: matches.includes(query),
  })) as typeof window.matchMedia;
}

describe("detectInputCapabilities", () => {
  it("classifies a coarse non-hovering phone as touch-only", () => {
    expect(detectInputCapabilities(media(["(pointer: coarse)"]))).toEqual({
      touchPrimary: true,
      hover: false,
      keyboardLikely: false,
    });
  });

  it("keeps keyboard controls on a hybrid touch device", () => {
    expect(
      detectInputCapabilities(
        media(["(pointer: coarse)", "(any-pointer: fine)", "(hover: hover)"]),
      ),
    ).toEqual({
      touchPrimary: true,
      hover: true,
      keyboardLikely: true,
    });
  });

  it("classifies a fine hovering pointer as desktop input", () => {
    expect(
      detectInputCapabilities(media(["(pointer: fine)", "(hover: hover)"])),
    ).toEqual({
      touchPrimary: false,
      hover: true,
      keyboardLikely: true,
    });
  });
});
