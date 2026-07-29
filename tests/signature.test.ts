import { createHash, generateKeyPairSync, sign } from "node:crypto";
import { describe, expect, it } from "vitest";
import { signedManifest, verifySignedReport } from "../src/reports/signature-verifier.js";
import type { SignedReport } from "../src/types.js";
function stable(v: any): any {
  return Array.isArray(v)
    ? v.map(stable)
    : v && typeof v === "object"
      ? Object.fromEntries(
          Object.keys(v)
            .sort()
            .map((k) => [k, stable(v[k])]),
        )
      : v;
}
function fixture() {
  const { privateKey, publicKey } = generateKeyPairSync("ed25519");
  const report: any = {
    schemaVersion: "2",
    calculationVersion: "1.0.0",
    reportId: "rpt_test",
    reportTimestamp: "2026-07-29T00:00:00Z",
    workspaceId: null,
    coveredPeriod: null,
    calculation: { net: "10" },
    evidenceStatement: "synthetic",
    publicKeyId: "test-key",
    signatureAlgorithm: "Ed25519",
    visibility: "private",
  };
  const bytes = Buffer.from(JSON.stringify(stable(signedManifest(report))));
  report.resultHash = createHash("sha256").update(bytes).digest("hex");
  report.signature = sign(null, bytes, privateKey).toString("base64url");
  return {
    report: report as SignedReport,
    keys: [
      {
        id: "test-key",
        algorithm: "Ed25519",
        publicKeyPem: publicKey.export({ type: "spki", format: "pem" }).toString(),
        active: true,
      },
    ],
  };
}
describe("independent signature verification", () => {
  it("verifies valid schema 2", () => {
    const f = fixture();
    expect(verifySignedReport(f.report, f.keys).valid).toBe(true);
  });
  it("rejects a modified signed value", () => {
    const f = fixture();
    (f.report.calculation as any).net = "11";
    expect(verifySignedReport(f.report, f.keys).valid).toBe(false);
  });
  it("rejects unknown keys and hashes", () => {
    const f = fixture();
    expect(() => verifySignedReport(f.report, [])).toThrow(/Unknown/);
    f.report.resultHash = "0".repeat(64);
    expect(verifySignedReport(f.report, f.keys).valid).toBe(false);
  });
  it("recognizes historical schema 1", () => {
    const f = fixture();
    f.report.schemaVersion = "1";
    expect(() => verifySignedReport(f.report, f.keys)).not.toThrow();
  });
});
