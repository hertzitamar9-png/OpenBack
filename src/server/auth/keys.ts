import { exportJWK, generateKeyPair, importJWK, JWK } from "jose";

// Standalone Ed25519 key management for the local auth issuer. Kept separate
// from AuthServer so ServerEnv can import the public key without a cycle.

let privateKey: CryptoKey | null = null;
let publicJwk: JWK | null = null;

export async function ensureKeys(): Promise<void> {
  if (privateKey && publicJwk) return;
  const envJwk = process.env.AUTH_PRIVATE_JWK;
  if (envJwk) {
    const privateJwk = JSON.parse(envJwk) as JWK;
    privateJwk.alg = "EdDSA";
    privateKey = (await importJWK(privateJwk, "EdDSA")) as CryptoKey;
    // Never return the private `d` parameter from the public JWKS endpoint.
    const safePublicJwk = { ...privateJwk };
    delete safePublicJwk.d;
    publicJwk = { ...safePublicJwk, alg: "EdDSA", use: "sig" };
  } else {
    const kp = await generateKeyPair("EdDSA", {
      crv: "Ed25519",
      extractable: true,
    });
    const privJwk = await exportJWK(kp.privateKey);
    privJwk.alg = "EdDSA";
    const pubJwk = await exportJWK(kp.publicKey);
    privateKey = kp.privateKey as CryptoKey;
    publicJwk = { ...pubJwk, alg: "EdDSA", use: "sig" };
    // Do not print private key material into hosting logs.
    console.log("[auth] Generated an ephemeral Ed25519 signing key");
  }
}

export function getPrivateKey(): CryptoKey {
  if (!privateKey) throw new Error("auth keys not initialized");
  return privateKey;
}

export function getPublicJwk(): JWK {
  if (!publicJwk) throw new Error("auth keys not initialized");
  return publicJwk;
}
