import type { Request, Response } from "express";
import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { describe, expect, it } from "vitest";
import {
  getOpenBackContentSeo,
  handleLegacyOpenBackContent,
  LEGACY_GUIDE_PATHS,
  OPENBACK_CONTENT_PATHS,
} from "../../src/server/OpenBackContent";

function renderPath(
  path: string,
  options: { protocol?: string; forwardedProto?: string } = {},
): {
  body: string;
  location: string;
  status: number;
  type: string;
} {
  const result = { body: "", location: "", status: 200, type: "" };
  const request = {
    path,
    protocol: options.protocol ?? "https",
    headers: options.forwardedProto
      ? { "x-forwarded-proto": options.forwardedProto }
      : {},
    get: (name: string) =>
      name.toLowerCase() === "host" ? "openback.example" : undefined,
  } as Request;
  const response = {
    type(value: string) {
      result.type = value;
      return this;
    },
    status(value: number) {
      result.status = value;
      return this;
    },
    send(value: string) {
      result.body = value;
      return this;
    },
    redirect(status: number, location: string) {
      result.status = status;
      result.location = location;
      return this;
    },
  } as unknown as Response;

  handleLegacyOpenBackContent(request, response);
  return result;
}

describe("OpenBack learning content", () => {
  it("publishes tutorials as the canonical discovery hub", () => {
    const index = readFileSync(resolve(process.cwd(), "index.html"), "utf8");
    const master = readFileSync(
      resolve(process.cwd(), "src/server/Master.ts"),
      "utf8",
    );
    expect(index).toContain('<a href="<%- siteOrigin %>/tutorials">');
    expect(index).not.toContain('<a href="<%- siteOrigin %>/guides">');
    expect(master).toContain('contentPath === "/tutorials"');
    expect(master).not.toContain('contentPath === "/guides"');
  });

  it("publishes unique tutorial and blog URLs", () => {
    expect(OPENBACK_CONTENT_PATHS).toHaveLength(24);
    expect(new Set(OPENBACK_CONTENT_PATHS).size).toBe(
      OPENBACK_CONTENT_PATHS.length,
    );
    expect(OPENBACK_CONTENT_PATHS).toContain("/tutorials");
    expect(OPENBACK_CONTENT_PATHS).toContain("/blog");
    expect(OPENBACK_CONTENT_PATHS).not.toContain("/guides");
  });

  it.each(OPENBACK_CONTENT_PATHS)("builds app-shell SEO for %s", (path) => {
    const seo = getOpenBackContentSeo(path, "https://openback.example");
    expect(seo).not.toBeNull();
    expect(seo?.path).toBe(path);
    expect(seo?.title).toContain("OpenBack");
    expect(seo?.description.length).toBeGreaterThan(30);
    expect(seo?.crawlableHtml).toContain("OpenBack");
  });

  it("publishes 120 defined territorial strategy terms", () => {
    const seo = getOpenBackContentSeo(
      "/tutorials/territorial-strategy-glossary",
      "https://openback.example",
    );

    expect(seo?.crawlableHtml).toContain("120 RTS Terms");
    expect(seo?.crawlableHtml.match(/<li>/g)).toHaveLength(120);
  });

  it.each(LEGACY_GUIDE_PATHS)("redirects legacy path %s", (path) => {
    const result = renderPath(path);
    expect(result.status).toBe(301);
    expect(result.location).toBe(path.replace(/^\/guides/, "/tutorials"));
  });
});
