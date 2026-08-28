import { describe, expect, it } from "vitest";
import { toAbsoluteAssetUrl } from "../src/core/AssetUrls";

/**
 * Link-preview crawlers fetch og:image and twitter:image with no page to
 * resolve a relative path against, so a site-relative URL is dropped and the
 * card renders with no image at all.
 *
 * Asset URLs are relative whenever no CDN is configured, which is how this
 * site is deployed, so og:image was going out as
 * "/images/OpenBackSocialPreview.png?v=..." and every Discord, Twitter and
 * Facebook share of the game showed a blank card. twitter:card is
 * summary_large_image, so the image is the whole point of the card.
 */
describe("the social preview image URL", () => {
  it("gets the site origin put in front of a relative asset path", () => {
    expect(
      toAbsoluteAssetUrl(
        "/images/OpenBackSocialPreview.png?v=abc",
        "https://openback.dedyn.io",
      ),
    ).toBe("https://openback.dedyn.io/images/OpenBackSocialPreview.png?v=abc");
  });

  it("leaves an asset already served from a CDN alone", () => {
    // With CDN_BASE set, buildAssetUrl already returns an absolute URL and
    // prefixing the origin again would corrupt it.
    const cdn = "https://cdn.example.com/images/OpenBackSocialPreview.png";
    expect(toAbsoluteAssetUrl(cdn, "https://openback.dedyn.io")).toBe(cdn);
  });

  it("does not double the slash when the origin has a trailing one", () => {
    expect(
      toAbsoluteAssetUrl("/images/a.png", "https://openback.dedyn.io/"),
    ).toBe("https://openback.dedyn.io/images/a.png");
  });

  it("still joins correctly when the path has no leading slash", () => {
    expect(
      toAbsoluteAssetUrl("images/a.png", "https://openback.dedyn.io"),
    ).toBe("https://openback.dedyn.io/images/a.png");
  });

  it("produces a URL a crawler can actually fetch", () => {
    const url = toAbsoluteAssetUrl(
      "/images/OpenBackSocialPreview.png",
      "https://openback.dedyn.io",
    );
    expect(() => new URL(url)).not.toThrow();
    expect(new URL(url).protocol).toBe("https:");
  });
});
