import { describe, expect, it } from "vitest";
import {
  approveRequirement,
  assertSameOrigin,
  parsePaymentRequired,
  type PaymentRequired,
} from "../src/x402/challenge.js";
import type { Config } from "../src/config.js";
const config: Config = {
  baseUrl: "https://test-x402.ailabra.org",
  expectedNetwork: "eip155:84532",
  expectedAsset: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
  expectedPayTo: "0x2d6cee86466807de531a9d3010f06f53b060ab84",
  maxPayment: "0.05",
  ledgerPath: "ledger.json",
  reportPath: "report.html",
};
const good: PaymentRequired = {
  x402Version: 2,
  accepts: [
    {
      scheme: "exact",
      network: config.expectedNetwork,
      asset: config.expectedAsset,
      amount: "10000",
      payTo: config.expectedPayTo!,
    },
  ],
};
describe("payment guardrails", () => {
  it("accepts an allowed requirement", () =>
    expect(approveRequirement(good, config).amount).toBe("10000"));
  it.each([
    ["network", "eip155:8453", "network"],
    ["asset", "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913", "asset"],
    ["payTo", "0x0000000000000000000000000000000000000001", "recipient"],
    ["scheme", "upto", "scheme"],
  ])("rejects unexpected %s", (field, value, message) => {
    const c = structuredClone(good);
    (c.accepts[0] as any)[field] = value;
    expect(() => approveRequirement(c, config)).toThrow(new RegExp(message as string, "i"));
  });
  it("rejects excessive price", () => {
    const c = structuredClone(good);
    c.accepts[0]!.amount = "50001";
    expect(() => approveRequirement(c, config)).toThrow(/maximum/);
  });
  it("rejects malformed requirements", () =>
    expect(() => parsePaymentRequired(new Headers())).toThrow(/missing/));
  it("rejects redirects to another origin", () =>
    expect(() => assertSameOrigin(config.baseUrl, "https://evil.example/steal")).toThrow(/origin/));
  it("never embeds private keys in errors", () => {
    const secret = `0x${"a".repeat(64)}`;
    try {
      approveRequirement(good, {
        ...config,
        privateKey: secret as `0x${string}`,
        expectedAsset: "bad",
      });
    } catch (e) {
      expect(String(e)).not.toContain(secret);
    }
  });
});
