import { afterEach, describe, expect, test, vi } from "vitest";
import { ServerEnv } from "../../src/server/ServerEnv";

describe("ServerEnv.numWorkers", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("returns parsed value when valid", () => {
    vi.stubEnv("NUM_WORKERS", "4");
    expect(ServerEnv.numWorkers()).toBe(4);
  });

  test("throws when unset", () => {
    vi.stubEnv("NUM_WORKERS", "");
    expect(() => ServerEnv.numWorkers()).toThrow(/NUM_WORKERS not set/);
  });

  test("throws on non-numeric", () => {
    vi.stubEnv("NUM_WORKERS", "abc");
    expect(() => ServerEnv.numWorkers()).toThrow(/Invalid NUM_WORKERS/);
  });

  test("throws on zero", () => {
    vi.stubEnv("NUM_WORKERS", "0");
    expect(() => ServerEnv.numWorkers()).toThrow(/Invalid NUM_WORKERS/);
  });

  test("throws on negative", () => {
    vi.stubEnv("NUM_WORKERS", "-2");
    expect(() => ServerEnv.numWorkers()).toThrow(/Invalid NUM_WORKERS/);
  });
});

describe("ServerEnv.turnstileSiteKey", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("returns value when set", () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "site-key");
    expect(ServerEnv.turnstileSiteKey()).toBe("site-key");
  });

  test("throws when unset", () => {
    vi.stubEnv("TURNSTILE_SITE_KEY", "");
    expect(() => ServerEnv.turnstileSiteKey()).toThrow(
      /TURNSTILE_SITE_KEY not set/,
    );
  });
});

describe("ServerEnv.jwtAudience", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("returns AUTH_ORIGIN when set", () => {
    vi.stubEnv("AUTH_ORIGIN", "https://myapp.com");
    expect(ServerEnv.jwtAudience()).toBe("https://myapp.com");
  });

  test("falls back to DOMAIN-based origin when AUTH_ORIGIN unset and DOMAIN set", () => {
    vi.stubEnv("AUTH_ORIGIN", "");
    vi.stubEnv("DOMAIN", "myapp.com");
    expect(ServerEnv.jwtAudience()).toBe("https://myapp.com");
  });

  test("uses localhost only when no public domain is configured", () => {
    vi.stubEnv("AUTH_ORIGIN", "");
    vi.stubEnv("DOMAIN", "");
    expect(ServerEnv.jwtAudience()).toBe("http://localhost:9000");
  });

  test("does not expose Render's generated hostname as the public origin", () => {
    vi.stubEnv("PUBLIC_ORIGIN", "");
    vi.stubEnv("AUTH_ORIGIN", "");
    vi.stubEnv("DOMAIN", "openback-cbe3.onrender.com");
    expect(ServerEnv.jwtAudience()).toBe("https://openback.servegame.com");
  });
});

describe("ServerEnv.jwtIssuer", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("returns AUTH_ORIGIN when set", () => {
    vi.stubEnv("AUTH_ORIGIN", "https://myapp.com");
    expect(ServerEnv.jwtIssuer()).toBe("https://myapp.com");
  });

  test("uses AUTH_ORIGIN even when DOMAIN differs", () => {
    vi.stubEnv("AUTH_ORIGIN", "https://custom-auth.com");
    vi.stubEnv("DOMAIN", "other.com");
    expect(ServerEnv.jwtIssuer()).toBe("https://custom-auth.com");
  });
});

describe("ServerEnv.cdnBase", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("uses the branded origin when a stale Render hostname is configured", () => {
    vi.stubEnv("CDN_BASE", "");
    vi.stubEnv("PUBLIC_ORIGIN", "");
    vi.stubEnv("AUTH_ORIGIN", "");
    vi.stubEnv("DOMAIN", "openback-cbe3.onrender.com");
    expect(ServerEnv.cdnBase()).toBe("https://openback.servegame.com");
  });
});

describe("ServerEnv.allowedFlares", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("returns undefined when unset", () => {
    vi.stubEnv("ALLOWED_FLARES", "");
    expect(ServerEnv.allowedFlares()).toBeUndefined();
  });

  test("parses a single value", () => {
    vi.stubEnv("ALLOWED_FLARES", "admin");
    expect(ServerEnv.allowedFlares()).toEqual(["admin"]);
  });

  test("parses CSV", () => {
    vi.stubEnv("ALLOWED_FLARES", "admin,beta,internal");
    expect(ServerEnv.allowedFlares()).toEqual(["admin", "beta", "internal"]);
  });

  test("trims whitespace and drops empties", () => {
    vi.stubEnv("ALLOWED_FLARES", " admin , , beta ");
    expect(ServerEnv.allowedFlares()).toEqual(["admin", "beta"]);
  });
});
