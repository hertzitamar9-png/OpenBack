import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

describe("OpenBack inline page scrolling", () => {
  it("locks only inline pages and keeps the Play page free of ad layout", () => {
    const navigation = readFileSync("src/client/Navigation.ts", "utf8");
    const styles = readFileSync("src/client/styles.css", "utf8");
    const html = readFileSync("index.html", "utf8");
    expect(navigation).toContain(
      'document.body.classList.toggle("page-open", pageId !== "page-play")',
    );
    expect(styles).toContain("body.page-open");
    expect(html).not.toContain("AdShield");
    expect(html).not.toContain("pw-oop-flex_container");
  });
});
