// @vitest-environment node

import { describe, expect, it } from "vitest";
import {
  MAX_PROFILE_IMAGE_BYTES,
  createMemoryProfileImageStore,
  validateProfileImageDataUrl,
} from "../../src/server/auth/ProfileImageStore";

const webp = (payload: number[] = [0x56, 0x50, 0x38, 0x20]) =>
  Buffer.from([
    0x52,
    0x49,
    0x46,
    0x46,
    0x08,
    0x00,
    0x00,
    0x00,
    0x57,
    0x45,
    0x42,
    0x50,
    ...payload,
  ]);

const dataUrl = (bytes: Buffer) =>
  `data:image/webp;base64,${bytes.toString("base64")}`;

describe("profile image validation", () => {
  it("accepts a real WebP container and returns its decoded bytes", () => {
    const bytes = webp();
    expect(validateProfileImageDataUrl(dataUrl(bytes))).toEqual({
      mimeType: "image/webp",
      bytes,
    });
  });

  it("rejects profile images larger than 128 KiB", () => {
    const bytes = Buffer.concat([
      webp(),
      Buffer.alloc(MAX_PROFILE_IMAGE_BYTES - webp().length + 1),
    ]);
    expect(() => validateProfileImageDataUrl(dataUrl(bytes))).toThrow(
      "profile_image_too_large",
    );
  });

  it("rejects base64 bytes that claim to be WebP without a WebP header", () => {
    expect(() =>
      validateProfileImageDataUrl(dataUrl(Buffer.from("not a webp"))),
    ).toThrow("invalid_profile_image");
  });
});

describe("memory profile image storage", () => {
  it("increments the revision when an image is replaced", async () => {
    const store = createMemoryProfileImageStore();
    expect((await store.put("p1", webp([1]))).revision).toBe(1);
    expect((await store.put("p1", webp([2]))).revision).toBe(2);
    expect((await store.get("p1"))?.bytes).toEqual(webp([2]));
  });

  it("removes the stored image without reusing its previous revision", async () => {
    const store = createMemoryProfileImageStore();
    await store.put("p1", webp([1]));
    await store.delete("p1");
    expect(await store.get("p1")).toBeNull();
    expect((await store.put("p1", webp([2]))).revision).toBe(2);
  });

  it("builds an encoded same-origin revision URL", () => {
    const store = createMemoryProfileImageStore();
    expect(store.url("player / one", 7)).toBe(
      "/profile-images/player%20%2F%20one?v=7",
    );
  });
});
