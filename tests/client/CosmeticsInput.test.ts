import { describe, expect, it } from "vitest";
import { CosmeticsInput } from "../../src/client/CosmeticsInput";

describe("CosmeticsInput empty state", () => {
  it("shows the selection label when only a territory color is stored", () => {
    const input = new CosmeticsInput();
    input.showSelectLabel = true;
    input.selectedColor = "#31c56d";

    const shouldShow = (
      input as unknown as { shouldShowSelectLabel(): boolean }
    ).shouldShowSelectLabel();

    expect(shouldShow).toBe(true);
  });

  it("treats legacy empty-string cosmetics as an empty state", () => {
    const input = new CosmeticsInput();
    input.showSelectLabel = true;
    input.pattern = "" as never;

    const shouldShow = (
      input as unknown as { shouldShowSelectLabel(): boolean }
    ).shouldShowSelectLabel();

    expect(shouldShow).toBe(true);
  });
});
