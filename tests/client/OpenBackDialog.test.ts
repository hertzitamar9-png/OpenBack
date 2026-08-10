import fs from "node:fs";
import { afterEach, describe, expect, it } from "vitest";
import {
  showOpenBackAlert,
  type OpenBackDialogKind,
} from "../../src/client/InGameModal";
import type { ConfirmDialog } from "../../src/client/components/ConfirmDialog";

describe("OpenBack dialogs", () => {
  afterEach(() => document.body.replaceChildren());

  for (const kind of ["success", "warning", "error", "info"] as const) {
    it(`renders ${kind} alerts through the custom dialog`, async () => {
      const result = showOpenBackAlert({
        kind: kind as OpenBackDialogKind,
        title: "OpenBack",
        message: `${kind} message`,
      });
      const dialog = document.querySelector("confirm-dialog") as ConfirmDialog;
      expect(dialog).not.toBeNull();
      expect(dialog.heading).toBe("OpenBack");
      expect(dialog.message).toBe(`${kind} message`);
      expect(dialog.buttons).toBe("confirmOnly");
      dialog.dispatchEvent(new CustomEvent("confirm"));
      await expect(result).resolves.toBeUndefined();
    });
  }

  it("contains no native alert calls in visible client sources", () => {
    const files = [
      "src/client/Cosmetics.ts",
      "src/client/components/RewardsPanel.ts",
      "src/client/components/CustomCurrencyCard.ts",
    ];
    const violations = files.filter((file) =>
      /\b(?:window\.)?alert\s*\(/.test(fs.readFileSync(file, "utf8")),
    );
    expect(violations).toEqual([]);
  });
});
