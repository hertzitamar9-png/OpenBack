import { afterEach, describe, expect, it, vi } from "vitest";

describe("profile image preparation", () => {
  afterEach(() => vi.restoreAllMocks());

  it("center-crops a wide source and encodes a 256px WebP", async () => {
    const close = vi.fn();
    vi.stubGlobal(
      "createImageBitmap",
      vi.fn(async () => ({ width: 800, height: 400, close })),
    );
    const drawImage = vi.fn();
    vi.spyOn(HTMLCanvasElement.prototype, "getContext").mockReturnValue({
      drawImage,
    } as unknown as CanvasRenderingContext2D);
    vi.spyOn(HTMLCanvasElement.prototype, "toDataURL").mockReturnValue(
      `data:image/webp;base64,${btoa("small-webp")}`,
    );
    const { prepareProfileImage } =
      await import("../../src/client/ProfileImage");

    const result = await prepareProfileImage(
      new File(["image"], "wide.png", { type: "image/png" }),
    );

    expect(result).toMatch(/^data:image\/webp;base64,/);
    expect(drawImage).toHaveBeenCalledWith(
      expect.anything(),
      200,
      0,
      400,
      400,
      0,
      0,
      256,
      256,
    );
    expect(close).toHaveBeenCalledOnce();
  });

  it("rejects file types that are not PNG JPEG or WebP before decoding", async () => {
    const decode = vi.fn();
    vi.stubGlobal("createImageBitmap", decode);
    const { prepareProfileImage } =
      await import("../../src/client/ProfileImage");
    await expect(
      prepareProfileImage(
        new File(["bad"], "bad.svg", { type: "image/svg+xml" }),
      ),
    ).rejects.toThrow("unsupported_profile_image");
    expect(decode).not.toHaveBeenCalled();
  });
});
