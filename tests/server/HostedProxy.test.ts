import { describe, expect, it } from "vitest";
import { resolveHostedProxyTarget } from "../../src/server/HostedProxy";

describe("hosted single-port proxy routing", () => {
  it("routes ordinary traffic and master WebSockets to the master", () => {
    expect(resolveHostedProxyTarget("/", 2)).toEqual({
      path: "/",
      port: 3000,
    });
    expect(resolveHostedProxyTarget("/social", 2)).toEqual({
      path: "/social",
      port: 3000,
    });
  });

  it("strips worker prefixes and preserves query strings", () => {
    expect(resolveHostedProxyTarget("/w1/game/abc?token=123", 2)).toEqual({
      path: "/game/abc?token=123",
      port: 3002,
    });
  });

  it("balances game creation across workers", () => {
    expect(resolveHostedProxyTarget("/api/create_game", 3, 0).port).toBe(3001);
    expect(resolveHostedProxyTarget("/api/create_game", 3, 1).port).toBe(3002);
    expect(resolveHostedProxyTarget("/api/create_game", 3, 2).port).toBe(3003);
  });

  it("falls back safely when a stale worker path is requested", () => {
    expect(resolveHostedProxyTarget("/w9/game/abc", 2)).toEqual({
      path: "/game/abc",
      port: 3001,
    });
  });
});
