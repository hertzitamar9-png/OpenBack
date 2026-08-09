import { afterEach, describe, expect, it } from "vitest";
import "../../../src/client/components/PlayerAvatar";
import type { PlayerAvatar } from "../../../src/client/components/PlayerAvatar";

describe("player-avatar", () => {
  afterEach(() => document.body.replaceChildren());

  it("uses the canonical OB logo when no custom picture exists", async () => {
    const avatar = document.createElement("player-avatar") as PlayerAvatar;
    avatar.label = "Player";
    document.body.append(avatar);
    await avatar.updateComplete;
    expect(avatar.querySelector("img")?.src).toContain(
      "/images/OpenBackMark512.png",
    );
  });

  it("shows a custom picture and falls back to OB if it fails", async () => {
    const avatar = document.createElement("player-avatar") as PlayerAvatar;
    avatar.src = "/profile-images/p1?v=4";
    avatar.label = "Player";
    document.body.append(avatar);
    await avatar.updateComplete;
    const image = avatar.querySelector("img")!;
    expect(image.src).toContain("/profile-images/p1?v=4");
    image.dispatchEvent(new Event("error"));
    expect(image.src).toContain("/images/OpenBackMark512.png");
  });
});
