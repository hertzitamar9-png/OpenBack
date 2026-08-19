/**
 * The update window is a promise to the player: one minute, always, with the
 * last few seconds spent saying it is done. These pin both ends of that.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";

const STARTED_AT = 1_700_000_000;

function statusFeed(state: string) {
  return vi.fn().mockResolvedValue({
    ok: true,
    json: async () => ({
      state,
      phase: "restarting",
      progress: 0.3,
      eta: 60,
      startedAt: STARTED_AT,
    }),
  });
}

/** Load a fresh copy so the module's latched window start is reset. */
async function freshWatcher() {
  vi.resetModules();
  return await import("../src/client/openback/UpdateWatcher");
}

function atSecond(second: number) {
  vi.setSystemTime((STARTED_AT + second) * 1000);
}

const reload = vi.fn();

beforeEach(() => {
  vi.useFakeTimers();
  reload.mockClear();
  Object.defineProperty(window, "location", {
    configurable: true,
    value: { reload },
  });
  document.body.innerHTML = "";
});

function screen() {
  const title = document.querySelector("#openback-update-title");
  const note = document.querySelector("#openback-update-note");
  const eta = document.querySelector("#openback-update-eta");
  const fill = document.querySelector<HTMLElement>("#openback-update-fill");
  return {
    title: title?.textContent?.trim() ?? "",
    note: note?.textContent?.trim() ?? "",
    eta: eta?.textContent?.trim() ?? "",
    width: fill?.style.width ?? "",
  };
}

describe("the update window as the player experiences it", () => {
  it("counts down while the update runs", async () => {
    vi.stubGlobal("fetch", statusFeed("updating"));
    const { startUpdateWatcher, isUpdating } = await freshWatcher();

    atSecond(0);
    startUpdateWatcher();
    await vi.advanceTimersByTimeAsync(0);

    atSecond(10);
    await vi.advanceTimersByTimeAsync(300);

    expect(isUpdating()).toBe(true);
    expect(screen().title).toBe("Updating the game…");
    expect(screen().eta).toBe("50s left");
    expect(reload).not.toHaveBeenCalled();
  });

  it("says it is done at 57 seconds, and holds that before reloading", async () => {
    vi.stubGlobal("fetch", statusFeed("updating"));
    const { startUpdateWatcher } = await freshWatcher();

    atSecond(0);
    startUpdateWatcher();
    await vi.advanceTimersByTimeAsync(0);

    atSecond(56);
    await vi.advanceTimersByTimeAsync(300);
    expect(screen().title).toBe("Updating the game…");
    expect(
      document.querySelector<HTMLElement>("#openback-update-check")?.style
        .display,
    ).toBe("none");

    atSecond(57);
    await vi.advanceTimersByTimeAsync(300);
    expect(screen().title).toBe("Update is done");
    // The finished state has to look finished: green bar and a tick, not a
    // blue bar sitting at the end for three seconds.
    const fill = document.querySelector<HTMLElement>("#openback-update-fill");
    const check = document.querySelector<HTMLElement>("#openback-update-check");
    // jsdom normalises the hex to rgb().
    expect(fill?.style.background).toContain("rgb(22, 163, 74)");
    expect(check?.style.display).toBe("flex");
    expect(screen().note).toBe("Reloading the new version…");
    expect(screen().width).toBe("100%");
    // Still on screen — the message is meant to be read, not flashed.
    expect(reload).not.toHaveBeenCalled();

    atSecond(59);
    await vi.advanceTimersByTimeAsync(300);
    expect(reload).not.toHaveBeenCalled();
  });

  it("reloads at the minute and never later", async () => {
    vi.stubGlobal("fetch", statusFeed("updating"));
    const { startUpdateWatcher } = await freshWatcher();

    atSecond(0);
    startUpdateWatcher();
    await vi.advanceTimersByTimeAsync(0);

    atSecond(60);
    await vi.advanceTimersByTimeAsync(300);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("still reloads at the minute when the deploy fails and the feed dies", async () => {
    // First check succeeds, then the server stops answering entirely.
    const dying = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: "updating", startedAt: STARTED_AT }),
      })
      .mockRejectedValue(new Error("connection refused"));
    vi.stubGlobal("fetch", dying);
    const { startUpdateWatcher } = await freshWatcher();

    atSecond(0);
    startUpdateWatcher();
    await vi.advanceTimersByTimeAsync(0);

    atSecond(60);
    await vi.advanceTimersByTimeAsync(300);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("holds the full minute even when the deploy finishes early", async () => {
    const quick = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: "updating", startedAt: STARTED_AT }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ state: "ready", startedAt: STARTED_AT }),
      });
    vi.stubGlobal("fetch", quick);
    const { startUpdateWatcher } = await freshWatcher();

    atSecond(0);
    startUpdateWatcher();
    await vi.advanceTimersByTimeAsync(0);

    atSecond(30);
    await vi.advanceTimersByTimeAsync(1200);
    expect(reload).not.toHaveBeenCalled();

    atSecond(60);
    await vi.advanceTimersByTimeAsync(300);
    expect(reload).toHaveBeenCalledTimes(1);
  });

  it("does nothing at all when no update is running", async () => {
    vi.stubGlobal("fetch", statusFeed("ready"));
    const { startUpdateWatcher, isUpdating } = await freshWatcher();

    atSecond(0);
    startUpdateWatcher();
    await vi.advanceTimersByTimeAsync(5000);

    expect(isUpdating()).toBe(false);
    expect(document.querySelector("#openback-update-overlay")).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });
});
