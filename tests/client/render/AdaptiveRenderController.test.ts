import { describe, expect, it } from "vitest";
import { AdaptiveRenderController } from "../../../src/client/render/AdaptiveRenderController";

describe("AdaptiveRenderController", () => {
  it("renders every frame while the client has headroom", () => {
    const controller = new AdaptiveRenderController();
    for (let frame = 0; frame < 120; frame++) {
      expect(controller.shouldRender(frame * (1000 / 60))).toBe(true);
      controller.recordRenderDuration(3);
    }
    expect(controller.isLoadShedding()).toBe(false);
  });

  it("halves render work after sustained expensive frames", () => {
    const controller = new AdaptiveRenderController();
    let rendered = 0;

    for (let frame = 0; frame < 40; frame++) {
      if (controller.shouldRender(frame * (1000 / 60))) {
        rendered++;
        controller.recordRenderDuration(12);
      }
    }

    expect(controller.isLoadShedding()).toBe(true);
    expect(rendered).toBeLessThan(30);
    expect(rendered).toBeGreaterThan(15);
  });

  it("recovers full-rate rendering after sustained healthy frames", () => {
    const controller = new AdaptiveRenderController();
    for (let frame = 0; frame < 20; frame++) {
      controller.shouldRender(frame * (1000 / 60));
      controller.recordRenderDuration(12);
    }
    expect(controller.isLoadShedding()).toBe(true);

    for (let frame = 20; frame < 100; frame++) {
      if (controller.shouldRender(frame * (1000 / 60))) {
        controller.recordRenderDuration(2);
      }
    }
    expect(controller.isLoadShedding()).toBe(false);
  });

  it("ignores long gaps caused by a background tab", () => {
    const controller = new AdaptiveRenderController();
    controller.shouldRender(0);
    controller.shouldRender(10_000);
    controller.recordRenderDuration(2);
    expect(controller.isLoadShedding()).toBe(false);
  });
});
