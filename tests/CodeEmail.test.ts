/**
 * The login code email. It previously went out as plain text on the SMTP path,
 * so the code rendered in whatever small default font the mail client used.
 */
import { describe, expect, it } from "vitest";
import {
  buildCodeEmail,
  CODE_EMAIL_LOGO_CID,
} from "../src/server/auth/AuthServer";

describe("the login code email", () => {
  const { subject, text, html } = buildCodeEmail("928291", "sign-up");

  it("leads the subject with the code, which the inbox list shows in bold", () => {
    expect(subject).toBe("‎928291 is your OpenBack sign-up code");
  });

  it("pins the subject left-to-right so the code stays first", () => {
    // Without the mark, a right-to-left interface moves a leading number to
    // the far end of the line, burying the digits.
    expect(subject.startsWith("‎")).toBe(true);
    expect(subject.replace("‎", "").startsWith("928291")).toBe(true);
  });

  it("drops the heading that only repeated the subject", () => {
    // The wording still appears in the hidden preview line; what should be
    // gone is the visible heading above the code.
    const body = html.slice(html.indexOf("<table"));
    expect(body).not.toContain("Your sign-up code");
    expect(body).toContain("Enter this code in OpenBack to continue");
  });

  it("previews the code rather than the boilerplate", () => {
    // Without a preheader the inbox snippet scrapes the body and shows the
    // "if you did not request this" line instead of the code.
    const preheader = html.slice(0, html.indexOf("<table"));
    expect(preheader).toContain("928291");
    expect(preheader).toContain("Enter this code in OpenBack to continue");
    expect(preheader).toContain("10 minutes");
    expect(preheader).toContain("display:none");
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

  it("can embed the logo instead of linking it", () => {
    // Several clients block remote images, and Gmail blocks them outright on
    // anything it filed as spam, so the SMTP path attaches its own copy.
    const embedded = buildCodeEmail(
      "928291",
      "login",
      `cid:${CODE_EMAIL_LOGO_CID}`,
    );
    expect(embedded.html).toContain(`src="cid:${CODE_EMAIL_LOGO_CID}"`);
    expect(embedded.html).not.toContain("https://openback.dedyn.io/icons");
  });

  it("styles inline, since clients strip style blocks", () => {
    expect(html).not.toMatch(/<style[\s>]/);
  });

  it("keeps a plain-text alternative for clients that refuse HTML", () => {
    expect(text.startsWith("928291")).toBe(true);
    expect(text).toContain("928291");
    expect(text).toContain("10 minutes");
    expect(text).not.toContain("<");
  });

  it("says when the code expires", () => {
    expect(html).toContain("10 minutes");
  });

  it("uses the same wording for login", () => {
    expect(buildCodeEmail("111111", "login").subject).toBe(
      "‎111111 is your OpenBack login code",
    );
  });

  it("sends no attachment, which the inbox would show as a file chip", () => {
    expect(html).toContain(
      "https://openback.dedyn.io/icons/icon512_rounded.png",
    );
    expect(html).not.toContain("cid:");
  });
});
