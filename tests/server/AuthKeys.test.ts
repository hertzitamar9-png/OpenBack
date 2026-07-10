import { describe, expect, it } from "vitest";
import { ensureKeys, getPublicJwk } from "../../src/server/auth/keys";

describe("auth signing keys", () => {
  it("generates an exportable Ed25519 key pair for JWKS", async () => {
    await ensureKeys();

    expect(getPublicJwk()).toMatchObject({
      alg: "EdDSA",
      crv: "Ed25519",
      kty: "OKP",
    });
    expect(getPublicJwk().x).toEqual(expect.any(String));
    expect(getPublicJwk().d).toBeUndefined();
  });
});
