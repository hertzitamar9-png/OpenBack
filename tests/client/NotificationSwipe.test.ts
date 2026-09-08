import { describe, expect, it } from "vitest";
import {
  notificationSwipeAxis,
  shouldDismissNotificationSwipe,
} from "../../src/client/hud/layers/EventsDisplay";

describe("informational notification swipes", () => {
  it("claims a deliberate horizontal gesture but leaves vertical scrolling alone", () => {
    expect(notificationSwipeAxis(8, 2)).toBe("horizontal");
    expect(notificationSwipeAxis(-12, 3)).toBe("horizontal");
    expect(notificationSwipeAxis(3, 12)).toBe("vertical");
    expect(notificationSwipeAxis(3, 2)).toBe("pending");
  });

  it("dismisses a short phone swipe in either direction", () => {
    expect(shouldDismissNotificationSwipe(47)).toBe(false);
    expect(shouldDismissNotificationSwipe(48)).toBe(true);
    expect(shouldDismissNotificationSwipe(-48)).toBe(true);
  });
});
