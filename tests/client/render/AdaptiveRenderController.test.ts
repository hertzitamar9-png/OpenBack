import { describe, expect, it } from "vitest";
import { AdaptiveRenderController } from "../../../src/client/render/AdaptiveRenderController";

describe("AdaptiveRenderController", () => {
  it("renders every frame while the client has headroom", () => {
    const controller = new AdaptiveRenderController();
    for (let frame = 0; frame < 120; frame++) {
      expect(controller.shouldRender(frame * (1000 / 60))).toBe(true);
    }
    expect(controller.isLoadShedding()).toBe(false);
  });

  it("stays uncapped on a 165 Hz display", () => {
    const controller = new AdaptiveRenderController();
    for (let frame = 0; frame < 330; frame++) {
      expect(controller.shouldRender(frame * (1000 / 165))).toBe(true);
    }
    expect(controller.isLoadShedding()).toBe(false);
  });

  it("halves render work only after sustained missed frames", () => {
    const controller = new AdaptiveRenderController();
    let rendered = 0;

    for (let frame = 0; frame < 40; frame++) {
      if (controller.shouldRender(frame * 30)) rendered++;
    }

    expect(controller.isLoadShedding()).toBe(true);
    expect(rendered).toBeLessThan(30);
    expect(rendered).toBeGreaterThan(15);
  });

  it("recovers full-rate rendering after sustained healthy frames", () => {
    const controller = new AdaptiveRenderController();
    for (let frame = 0; frame < 20; frame++) {
      controller.shouldRender(frame * 30);
    }
    expect(controller.isLoadShedding()).toBe(true);

    const slowPeriodEnd = 19 * 30;
    for (let frame = 20; frame < 100; frame++) {
      controller.shouldRender(slowPeriodEnd + (frame - 19) * (1000 / 60));
    }
    expect(controller.isLoadShedding()).toBe(false);
  });

  it("ignores long gaps caused by a background tab", () => {
    const controller = new AdaptiveRenderController();
    controller.shouldRender(0);
    controller.shouldRender(10_000);
    expect(controller.isLoadShedding()).toBe(false);
  });
});
