import { createHash, createPublicKey, verify } from "node:crypto";
import type { SignedReport } from "../types.js";
type SigningKey = { id: string; algorithm: string; publicKeyPem: string; active: boolean };
function canonical(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(canonical);
  if (value && typeof value === "object")
    return Object.fromEntries(
      Object.keys(value as object)
        .sort()
        .map((k) => [k, canonical((value as Record<string, unknown>)[k])]),
    );
  return value;
}
export function signedManifest(report: SignedReport) {
  const fields = [
    "schemaVersion",
    "calculationVersion",
    "reportId",
    "reportTimestamp",
    "workspaceId",
    "coveredPeriod",
    "calculation",
    "evidenceStatement",
    "publicKeyId",
  ] as const;
  return Object.fromEntries(fields.map((k) => [k, report[k]]));
}
export function verifySignedReport(report: SignedReport, keys: SigningKey[]) {
  if (!["1", "2", "3"].includes(report.schemaVersion))
    throw new Error(`Unsupported report schema: ${report.schemaVersion}`);
  if (report.signatureAlgorithm !== "Ed25519") throw new Error("Unsupported signature algorithm");
  const key = keys.find((k) => k.id === report.publicKeyId);
  if (!key) throw new Error(`Unknown signing key: ${report.publicKeyId}`);
  const bytes = Buffer.from(JSON.stringify(canonical(signedManifest(report))));
  const hash = createHash("sha256").update(bytes).digest("hex");
  const hashValid = hash === report.resultHash;
  const signature = Buffer.from(report.signature.replace(/-/g, "+").replace(/_/g, "/"), "base64");
  const signatureValid =
    hashValid && verify(null, bytes, createPublicKey(key.publicKeyPem), signature);
  return {
    valid: signatureValid,
    hashValid,
    signatureValid,
    keyId: key.id,
    schemaVersion: report.schemaVersion,
    resultHash: hash,
    algorithm: "Ed25519",
    verifiedAt: new Date().toISOString(),
  };
}
export async function fetchSigningKeys(baseUrl: string): Promise<SigningKey[]> {
  const r = await fetch(`${baseUrl}/api/v1/signing-keys`, { redirect: "error" });
  if (!r.ok) throw new Error(`Signing key discovery failed: ${r.status}`);
  return ((await r.json()) as { keys: SigningKey[] }).keys;
}
