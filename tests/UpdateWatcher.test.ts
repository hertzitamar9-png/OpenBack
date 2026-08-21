/**
 * The update window is a promise to the player: one minute, always, with the
 * last few seconds spent saying it is done. These pin both ends of that.
 */
import { beforeEach, describe, expect, it, vi } from "vitest";
import { EventBus } from "../src/core/EventBus";

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
  // The in-game marker is a body class, so it has to be cleared between cases
  // or one test's match state decides the next test's wording.
  document.body.className = "";
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

  it("promises the game will resume when the player is mid-match", async () => {
    // Main marks the body while a match is running, and the HUD keys its own
    // layout off the same class.
    document.body.classList.add("in-game");
    vi.stubGlobal("fetch", statusFeed("updating"));
    const { startUpdateWatcher } = await freshWatcher();

    atSecond(0);
    startUpdateWatcher();
    await vi.advanceTimersByTimeAsync(0);

    atSecond(10);
    await vi.advanceTimersByTimeAsync(300);
    expect(screen().note).toBe(
      "A new version is being installed. Your game is paused until it's ready.",
    );
  });

  it("talks about reloading when the player is only on the menu", async () => {
    vi.stubGlobal("fetch", statusFeed("updating"));
    const { startUpdateWatcher } = await freshWatcher();

    atSecond(0);
    startUpdateWatcher();
    await vi.advanceTimersByTimeAsync(0);

    atSecond(10);
    await vi.advanceTimersByTimeAsync(300);
    expect(screen().note).toContain("This page will reload");
  });
});

describe("active match update suspension", () => {
  it("pauses once and resumes after a ready-state five-second countdown", async () => {
    document.body.classList.add("in-game");
    const feed = vi
      .fn()
      .mockResolvedValueOnce({
        ok: true,
        json: async () => ({ state: "updating", startedAt: STARTED_AT }),
      })
      .mockResolvedValue({
        ok: true,
        json: async () => ({ state: "ready", startedAt: STARTED_AT }),
      });
    vi.stubGlobal("fetch", feed);
    const { startUpdateWatcher, UpdateSuspensionEvent } = await freshWatcher();
    const bus = new EventBus();
    const suspensions: boolean[] = [];
    bus.on(UpdateSuspensionEvent, (event) => suspensions.push(event.suspended));

    atSecond(0);
    startUpdateWatcher(bus);
    await vi.advanceTimersByTimeAsync(0);
    expect(suspensions).toEqual([true]);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(screen().note).toBe("Resuming in");
    expect(screen().eta).toBe("5");

    await vi.advanceTimersByTimeAsync(4_000);
    expect(screen().eta).toBe("1");
    expect(suspensions).toEqual([true]);

    await vi.advanceTimersByTimeAsync(1_000);
    expect(suspensions).toEqual([true, false]);
    expect(document.querySelector("#openback-update-overlay")).toBeNull();
    expect(reload).not.toHaveBeenCalled();
  });

  it("stays suspended while the deploy status is unreachable", async () => {
    document.body.classList.add("in-game");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ state: "updating", startedAt: STARTED_AT }),
        })
        .mockRejectedValue(new Error("server restarting")),
    );
    const { startUpdateWatcher, UpdateSuspensionEvent, isUpdating } =
      await freshWatcher();
    const bus = new EventBus();
    const suspensions: boolean[] = [];
    bus.on(UpdateSuspensionEvent, (event) => suspensions.push(event.suspended));

    atSecond(0);
    startUpdateWatcher(bus);
    await vi.advanceTimersByTimeAsync(8_000);

    expect(suspensions).toEqual([true]);
    expect(isUpdating()).toBe(true);
    expect(document.querySelector("#openback-update-overlay")).not.toBeNull();
  });

  it("reloads the ready build only after the protected match ends", async () => {
    document.body.classList.add("in-game");
    vi.stubGlobal(
      "fetch",
      vi
        .fn()
        .mockResolvedValueOnce({
          ok: true,
          json: async () => ({ state: "updating", startedAt: STARTED_AT }),
        })
        .mockResolvedValue({
          ok: true,
          json: async () => ({ state: "ready", startedAt: STARTED_AT }),
        }),
    );
    const { startUpdateWatcher } = await freshWatcher();

    atSecond(0);
    startUpdateWatcher();
    await vi.advanceTimersByTimeAsync(6_100);
    expect(reload).not.toHaveBeenCalled();

    document.body.classList.remove("in-game");
    await vi.advanceTimersByTimeAsync(1_100);
    expect(reload).toHaveBeenCalledTimes(1);
  });
});
