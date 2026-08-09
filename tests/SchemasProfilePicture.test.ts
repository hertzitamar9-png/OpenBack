import { expect, it } from "vitest";
import { PlayerSchema } from "../src/core/Schemas";

it("keeps profile pictures as presentation-only player metadata", () => {
  const player = PlayerSchema.parse({
    clientID: "client01",
    publicId: "p1",
    username: "Player",
    clanTag: null,
    profilePictureUrl: "/profile-images/p1?v=4",
  });
  expect(player.profilePictureUrl).toBe("/profile-images/p1?v=4");
});
