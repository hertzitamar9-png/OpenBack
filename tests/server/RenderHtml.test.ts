import fs from "fs/promises";
import os from "os";
import path from "path";
import { afterEach, beforeEach, describe, expect, test, vi } from "vitest";
import {
  clearAppShellContentCache,
  getAppShellContent,
  setAppShellCacheHeaders,
} from "../../src/server/RenderHtml";

describe("RenderHtml", () => {
  const originalGitCommit = process.env.GIT_COMMIT;
  let tempDir: string | null = null;

  beforeEach(() => {
    vi.stubEnv("NUM_WORKERS", "1");
    vi.stubEnv("TURNSTILE_SITE_KEY", "test-key");
    vi.stubEnv("DOMAIN", "localhost");
  });

  afterEach(async () => {
    vi.unstubAllEnvs();
    process.env.GIT_COMMIT = originalGitCommit;
    clearAppShellContentCache();

    if (tempDir) {
      await fs.rm(tempDir, { recursive: true, force: true });
      tempDir = null;
    }
  });

  test("reuses cached app shell content", async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "render-html-"));
    const htmlPath = path.join(tempDir, "index.html");
    await fs.writeFile(
      htmlPath,
      "<script>window.GIT_COMMIT = <%- gitCommit %>;</script>",
      "utf8",
    );

    process.env.GIT_COMMIT = "first";
    const first = await getAppShellContent(htmlPath);

    process.env.GIT_COMMIT = "second";
    const second = await getAppShellContent(htmlPath);

    expect(first).toContain('"first"');
    expect(second).toBe(first);
    expect(second).not.toContain('"second"');
  });

  test("renders and separately caches route-aware SEO values", async () => {
    process.env.GIT_COMMIT = "seo-test";
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), "render-html-seo-"));
    const htmlPath = path.join(tempDir, "index.html");
    await fs.writeFile(
      htmlPath,
      '<title><%= seoTitle %></title><link href="<%- seoCanonical %>"><main><%- seoCrawlableHtml %></main>',
      "utf8",
    );
    const tutorial = await getAppShellContent(htmlPath, {
      path: "/tutorials/start",
      title: "Start | OpenBack",
      description: "Start playing OpenBack.",
      schemaJson: "{}",
      crawlableHtml: "<article>Start</article>",
    });
    const blog = await getAppShellContent(htmlPath, {
      path: "/blog/design",
      title: "Design | OpenBack",
      description: "OpenBack design.",
      schemaJson: "{}",
      crawlableHtml: "<article>Design</article>",
    });

    expect(tutorial).toContain("Start | OpenBack");
    expect(tutorial).toContain("/tutorials/start");
    expect(tutorial).toContain("<article>Start</article>");
    expect(blog).toContain("Design | OpenBack");
    expect(blog).not.toBe(tutorial);
  });

  test("sets shared-cache headers for the app shell", () => {
    const headers = new Map<string, string>();
    const response = {
      setHeader(name: string, value: string) {
        headers.set(name, value);
      },
    } as any;

    setAppShellCacheHeaders(response);

    expect(headers.get("Cache-Control")).toBe(
      "public, max-age=0, s-maxage=300, stale-while-revalidate=86400, stale-if-error=86400",
    );
    expect(headers.get("Content-Type")).toBe("text/html");
  });
});
