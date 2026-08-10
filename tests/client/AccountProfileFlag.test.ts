import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";

describe("account profile banner flag", () => {
  const source = readFileSync(
    resolve(process.cwd(), "src/client/AccountModal.ts"),
    "utf8",
  );

  it("renders the selected flag image in the banner bottom-right corner", () => {
    expect(source).toContain("resolveFlagUrl");
    expect(source).toContain("data-profile-flag");
    expect(source).toContain("bottom-0 right-0");
    expect(source).not.toContain(
      'translateText("account_modal.profile_flag_preview"',
    );
  });
});
