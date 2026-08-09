import { readFileSync } from "node:fs";
import { resolve } from "node:path";
import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

class FakeWebSocket {
  static readonly CONNECTING = 0;
  static readonly OPEN = 1;
  static readonly CLOSED = 3;
  static instances: FakeWebSocket[] = [];

  readyState = FakeWebSocket.CONNECTING;
  onopen: (() => void) | null = null;
  onmessage: ((event: MessageEvent) => void) | null = null;
  onclose: (() => void) | null = null;

  constructor(public readonly url: string | URL) {
    FakeWebSocket.instances.push(this);
  }

  close(): void {
    this.readyState = FakeWebSocket.CLOSED;
  }

  send(): void {}
}

describe("social WebSocket connection", () => {
  beforeEach(() => {
    vi.useFakeTimers();
    vi.resetModules();
    FakeWebSocket.instances = [];
    vi.stubGlobal("WebSocket", FakeWebSocket);
    window.BOOTSTRAP_CONFIG = {
      gameEnv: "dev",
      numWorkers: 2,
      turnstileSiteKey: "test",
      jwtAudience: "localhost",
      instanceId: "test",
      gitCommit: "test",
    };
  });

  afterEach(() => {
    window.BOOTSTRAP_CONFIG = undefined;
    vi.unstubAllGlobals();
    vi.useRealTimers();
  });

  it("proxies the local social WebSocket through Vite", () => {
    const config = readFileSync(
      resolve(process.cwd(), "vite.config.ts"),
      "utf8",
    );

    expect(config).toMatch(
      /["']\/social["']\s*:\s*\{[\s\S]*?target:\s*["']ws:\/\/localhost:3000["'][\s\S]*?ws:\s*true/,
    );
  });

  it("does not reconnect an intentionally replaced socket", async () => {
    const { socialClient } = await import("../../src/client/SocialClient");
    socialClient.start();
    expect(FakeWebSocket.instances).toHaveLength(1);

    const replaced = FakeWebSocket.instances[0];
    document.dispatchEvent(new Event("userMeResponse"));
    expect(FakeWebSocket.instances).toHaveLength(2);

    replaced.onclose?.();
    expect(vi.getTimerCount()).toBe(0);
  });
});
