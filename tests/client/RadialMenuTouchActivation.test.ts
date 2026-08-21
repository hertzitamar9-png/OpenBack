import { afterEach, describe, expect, it, vi } from "vitest";
import { RadialMenu } from "../../src/client/hud/layers/RadialMenu";
import type {
  CenterButtonElement,
  MenuElement,
  MenuElementParams,
} from "../../src/client/hud/layers/RadialMenuElements";
import { EventBus } from "../../src/core/EventBus";

describe("RadialMenu touch activation", () => {
  afterEach(() => document.body.replaceChildren());

  it("runs a touched action only once when the synthetic click follows", () => {
    const action = vi.fn();
    const item: MenuElement = {
      id: "boat-test",
      name: "boat-test",
      text: "Boat",
      disabled: () => false,
      action,
    };
    const root: MenuElement = {
      id: "root-test",
      name: "root-test",
      disabled: () => false,
      subMenu: () => [item],
    };
    const center: CenterButtonElement = {
      disabled: () => true,
      action: vi.fn(),
    };
    const menu = new RadialMenu(new EventBus(), root, center, {
      menuTransitionDuration: 0,
    });

    menu.init();
    menu.setParams({
      game: { inSpawnPhase: () => false },
    } as MenuElementParams);
    menu.showRadialMenu(120, 120);

    const path = document.querySelector(
      'path[data-id="boat-test"]',
    ) as SVGPathElement;
    path.dispatchEvent(
      new Event("touchstart", { bubbles: true, cancelable: true }),
    );
    path.dispatchEvent(new MouseEvent("click", { bubbles: true }));

    expect(action).toHaveBeenCalledTimes(1);
  });
});
