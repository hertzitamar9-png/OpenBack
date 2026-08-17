import en from "../resources/lang/en.json";
import { applyOpenBackBrand } from "../src/client/Utils";

// The UI rebrands upstream product references, but some strings exist to
// satisfy a licence. Section 7(b) of the licence's additional terms obliges
// modified versions to preserve "© OpenFront and Contributors", and the asset
// licence requires crediting OpenFront Inc. Rewriting either to "OpenBack"
// would be a licence breach, so those strings must survive verbatim.
describe("OpenBack rebranding leaves required licence notices alone", () => {
  it("rebrands ordinary product references", () => {
    expect(applyOpenBackBrand("main.play", "Play OpenFront now")).toBe(
      "Play OpenBack now",
    );
    expect(applyOpenBackBrand("main.play", "Visit OpenFront.io")).toBe(
      "Visit OpenBack",
    );
  });

  it("preserves the upstream copyright notice verbatim", () => {
    const notice = en.main.copyright;
    expect(notice).toContain("© OpenFront and Contributors");
    expect(applyOpenBackBrand("main.copyright", notice)).toBe(notice);
  });

  it("keeps the notice intact even for an unlisted key", () => {
    const notice = "© OpenFront and Contributors";
    expect(applyOpenBackBrand("some.future.key", notice)).toBe(notice);
  });

  it("keeps the asset-licence credit to OpenFront Inc. intact", () => {
    const credit = "Artwork by OpenFront Inc., CC BY-SA 4.0";
    expect(applyOpenBackBrand("some.future.key", credit)).toBe(credit);
  });

  it("ships a copyright string that still credits upstream", () => {
    // Guards against the notice being edited back to OpenBack-only wording.
    expect(en.main.copyright).toMatch(/OpenFront and Contributors/);
  });
});
