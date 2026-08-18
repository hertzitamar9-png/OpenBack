/**
 * The login code email. It previously went out as plain text on the SMTP path,
 * so the code rendered in whatever small default font the mail client used.
 */
import { describe, expect, it } from "vitest";
import { buildCodeEmail } from "../src/server/auth/AuthServer";

describe("the login code email", () => {
  const { subject, text, html } = buildCodeEmail("928291", "sign-up");

  it("names the action in the subject", () => {
    expect(subject).toBe("Your OpenBack sign-up code");
  });

  it("shows the code at a size that can be read at a glance", () => {
    expect(html).toContain("928291");
    const size = html.match(
      /font-size:(\d+)px;line-height:\d+px;font-weight:700/,
    );
    expect(size).not.toBeNull();
    expect(Number(size![1])).toBeGreaterThanOrEqual(36);
  });

  it("carries the OpenBack logo from an absolute URL", () => {
    // Mail clients cannot resolve relative paths.
    expect(html).toContain(
      "https://openback.dedyn.io/icons/icon512_rounded.png",
    );
    expect(html).toContain('alt="OpenBack"');
  });

  it("styles inline, since clients strip style blocks", () => {
    expect(html).not.toMatch(/<style[\s>]/);
  });

  it("keeps a plain-text alternative for clients that refuse HTML", () => {
    expect(text).toContain("928291");
    expect(text).toContain("10 minutes");
    expect(text).not.toContain("<");
  });

  it("says when the code expires", () => {
    expect(html).toContain("10 minutes");
  });

  it("uses the same wording for login", () => {
    expect(buildCodeEmail("111111", "login").subject).toBe(
      "Your OpenBack login code",
    );
  });
});
