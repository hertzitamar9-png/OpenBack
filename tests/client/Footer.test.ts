import { beforeEach, describe, expect, it } from "vitest";
import "../../src/client/components/Footer";

describe("Footer service request", () => {
  beforeEach(() => {
    document.body.innerHTML = "";
  });

  it("opens Gmail compose addressed to OpenBack support", async () => {
    const footer = document.createElement("page-footer") as HTMLElement & {
      updateComplete: Promise<unknown>;
    };
    document.body.appendChild(footer);
    await footer.updateComplete;

    const contact = footer.querySelector(
      '[data-i18n="main.service_request"]',
    ) as HTMLAnchorElement | null;

    expect(contact).not.toBeNull();
    const composeUrl = new URL(contact!.href);
    expect(composeUrl.origin).toBe("https://mail.google.com");
    expect(composeUrl.pathname).toBe("/mail/");
    expect(composeUrl.searchParams.get("view")).toBe("cm");
    expect(composeUrl.searchParams.get("to")).toBe(
      "openback.servegame@gmail.com",
    );
    expect(contact!.target).toBe("_blank");
    expect(contact!.rel).toContain("noopener");
  });
});
