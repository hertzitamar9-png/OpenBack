import { exportJWK, generateKeyPair, importJWK, JWK } from "jose";

// Standalone Ed25519 key management for the local auth issuer. Kept separate
// from AuthServer so ServerEnv can import the public key without a cycle.

let privateKey: CryptoKey | null = null;
let publicJwk: JWK | null = null;

export async function createPrivateJwk(): Promise<JWK> {
  const keyPair = await generateKeyPair("EdDSA", {
    crv: "Ed25519",
    extractable: true,
  });
  const privateJwk = await exportJWK(keyPair.privateKey);
  return { ...privateJwk, alg: "EdDSA" };
}

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
    const generatedPrivateJwk = await createPrivateJwk();
    privateKey = (await importJWK(generatedPrivateJwk, "EdDSA")) as CryptoKey;
    const safePublicJwk = { ...generatedPrivateJwk };
    delete safePublicJwk.d;
    publicJwk = { ...safePublicJwk, alg: "EdDSA", use: "sig" };
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
