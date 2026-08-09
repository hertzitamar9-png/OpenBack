import { beforeEach, describe, expect, it, vi } from "vitest";

vi.mock("../../src/client/ClientEnv", () => ({
  ClientEnv: { jwtAudience: () => "localhost" },
}));
vi.mock("../../src/client/Auth", () => ({
  getAuthHeader: vi.fn(async () => ""),
  getPlayToken: vi.fn(async () => null),
  logOut: vi.fn(async () => {}),
  userAuth: vi.fn(async () => ({ jwt: "token" })),
}));

import {
  deleteMyProfilePicture,
  uploadMyProfilePicture,
} from "../../src/client/Api";

const response = {
  user: { email: "p@example.com", profilePictureUrl: "/profile-images/p?v=1" },
  player: {
    publicId: "p",
    adfree: false,
    unlimitedRanked: true,
    canCreatePublicLobbies: true,
    achievements: { singleplayerMap: [] },
    friends: [],
    subscription: null,
  },
};

describe("profile picture API", () => {
  beforeEach(() => {
    process.env.API_DOMAIN = "api.test";
    vi.stubGlobal(
      "fetch",
      vi.fn(async () => ({ ok: true, json: async () => response })),
    );
  });

  it("uploads processed WebP data to the signed-in account", async () => {
    const result = await uploadMyProfilePicture(
      "data:image/webp;base64,V0VCUA==",
    );
    expect(result).not.toBe(false);
    const [url, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(String(url)).toContain("/users/@me/profile-picture");
    expect(init).toMatchObject({ method: "PUT" });
  });

  it("deletes the custom picture from the signed-in account", async () => {
    await deleteMyProfilePicture();
    const [, init] = (fetch as ReturnType<typeof vi.fn>).mock.calls[0];
    expect(init).toMatchObject({ method: "DELETE" });
  });
});
