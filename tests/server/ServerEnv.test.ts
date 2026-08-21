import { afterEach, describe, expect, test, vi } from "vitest";
import { GameEnv } from "../../src/core/configuration/Config";
import {
  productionHostnames,
  resolveServerGameEnv,
  ServerEnv,
} from "../../src/server/ServerEnv";

describe("ServerEnv.gitCommit", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  test("uses the commit baked in at build time", () => {
    vi.stubEnv("GIT_COMMIT", "built-commit");
    expect(ServerEnv.gitCommit()).toBe("built-commit");
  });
});

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

  test("uses the configured CDN origin when one is set", () => {
    vi.stubEnv("CDN_BASE", "https://cdn.example.com");
    expect(ServerEnv.cdnBase()).toBe("https://cdn.example.com");
  });

  test("falls back to the site origin, which must stay absolute", () => {
    // The game worker is inlined as a same-origin Blob and cannot resolve
    // root-relative URLs, so map binaries need a full origin to load.
    vi.stubEnv("CDN_BASE", "");
    vi.stubEnv("PUBLIC_ORIGIN", "");
    vi.stubEnv("AUTH_ORIGIN", "");
    vi.stubEnv("DOMAIN", "openback.dedyn.io");
    expect(ServerEnv.cdnBase()).toBe("https://openback.dedyn.io");
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

describe("resolveServerGameEnv", () => {
  test("treats the branded public site as production", () => {
    expect(
      resolveServerGameEnv(
        "dev",
        "openback.servegame.com",
        "https://openback.servegame.com",
      ),
    ).toBe(GameEnv.Prod);
  });

  // The list carried only servegame.com long after play had moved to
  // dedyn.io, so the live box could resolve itself as dev.
  test("treats the current live host as production", () => {
    expect(
      resolveServerGameEnv(
        "dev",
        "openback.dedyn.io",
        "https://openback.dedyn.io",
      ),
    ).toBe(GameEnv.Prod);
  });

  test("recognises a production host given only by public origin", () => {
    expect(
      resolveServerGameEnv("dev", undefined, "https://openback.dedyn.io"),
    ).toBe(GameEnv.Prod);
  });

  test("takes extra production hosts from the environment", () => {
    // The next move should be a deploy variable, not a code change.
    expect(
      resolveServerGameEnv("dev", "openback.io", "https://openback.io", [
        ...productionHostnames(),
        "openback.io",
      ]),
    ).toBe(GameEnv.Prod);
  });

  test("does not promote an unknown host", () => {
    expect(
      resolveServerGameEnv("dev", "example.invalid", "https://example.invalid"),
    ).toBe(GameEnv.Dev);
  });

  test("keeps localhost development mode", () => {
    expect(
      resolveServerGameEnv("dev", "localhost", "http://localhost:9000"),
    ).toBe(GameEnv.Dev);
  });

  test("preserves explicit staging and production modes", () => {
    expect(resolveServerGameEnv("staging", undefined, undefined)).toBe(
      GameEnv.Preprod,
    );
    expect(resolveServerGameEnv("prod", undefined, undefined)).toBe(
      GameEnv.Prod,
    );
  });
});
