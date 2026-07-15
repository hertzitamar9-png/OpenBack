import type { Request, Response } from "express";
import { describe, expect, it } from "vitest";
import {
  handleOpenBackContent,
  OPENBACK_CONTENT_PATHS,
} from "../../src/server/OpenBackContent";

function renderPath(
  path: string,
  options: { protocol?: string; forwardedProto?: string } = {},
): {
  body: string;
  status: number;
  type: string;
} {
  const result = { body: "", status: 200, type: "" };
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
  } as Response;

  handleOpenBackContent(request, response);
  return result;
}

describe("OpenBack learning content", () => {
  it("publishes unique tutorial and blog URLs", () => {
    expect(OPENBACK_CONTENT_PATHS).toHaveLength(19);
    expect(new Set(OPENBACK_CONTENT_PATHS).size).toBe(
      OPENBACK_CONTENT_PATHS.length,
    );
    expect(OPENBACK_CONTENT_PATHS).toContain("/guides");
    expect(OPENBACK_CONTENT_PATHS).toContain("/blog");
  });

  it.each(OPENBACK_CONTENT_PATHS)("renders indexable HTML for %s", (path) => {
    const result = renderPath(path);

    expect(result.status).toBe(200);
    expect(result.type).toBe("html");
    expect(result.body).toContain("<title>");
    expect(result.body).toContain('name="description"');
    expect(result.body).toContain('name="robots" content="index, follow"');
    expect(result.body).toContain(
      `rel="canonical" href="https://openback.example${path}"`,
    );
    expect(result.body).toContain('href="/guides"');
    expect(result.body).toContain('href="/blog"');
    expect(result.body).toContain("OpenBack");
  });

  it("uses the public HTTPS protocol supplied by a reverse proxy", () => {
    const result = renderPath("/guides", {
      protocol: "http",
      forwardedProto: "https",
    });

    expect(result.body).toContain(
      'rel="canonical" href="https://openback.example/guides"',
    );
    expect(result.body).toContain(
      'property="og:url" content="https://openback.example/guides"',
    );
    expect(result.body).not.toContain("http://openback.example");
  });
});
