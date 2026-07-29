import { describe, expect, it } from "vitest";
import {
  approveRequirement,
  assertSameOrigin,
  parsePaymentRequired,
  type PaymentRequired,
} from "../src/x402/challenge.js";
import type { Config } from "../src/config.js";
import { assertPaymentBudget, operationsToPay } from "../src/x402/budget.js";
import { PaymentBudget, paymentPolicies } from "../src/x402/policy.js";
import { AgentProfitClient } from "../src/client.js";
const config: Config = {
  baseUrl: "https://test-x402.ailabra.org",
  expectedNetwork: "eip155:84532",
  expectedAsset: "0x036cbd53842c5426634e7929541ec2318f3dcf7e",
  expectedPayTo: "0x2d6cee86466807de531a9d3010f06f53b060ab84",
  maxPayment: "0.05",
  maxTotalSpend: "0.31",
  ledgerPath: "ledger.json",
  reportPath: "report.html",
  expectedAssetSymbol: "USDC",
  expectedDecimals: 6,
  expectedEip712Name: "USDC",
  expectedEip712Version: "2",
  maxAttempts: 1,
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
      extra: { name: "USDC", version: "2" },
    },
  ],
};
describe("payment guardrails", () => {
  it("accepts an allowed requirement", () =>
    expect(approveRequirement(good, config).amount).toBe("10000"));
  it("enforces the independently configured Base mainnet EIP-712 domain", () => {
    const policy = paymentPolicies.baseMainnetUsdc({
      expectedPayTo: "0x2d6Cee86466807De531a9D3010f06f53b060ab84",
      maxPayment: "0.01",
      maxTotalSpend: "0.01",
    });
    const mainnet = structuredClone(good);
    Object.assign(mainnet.accepts[0]!, {
      network: policy.expectedNetwork,
      asset: policy.expectedAsset,
      payTo: policy.expectedPayTo,
      extra: { name: "USD Coin", version: "2" },
    });
    expect(approveRequirement(mainnet, policy).extra?.name).toBe("USD Coin");
    mainnet.accepts[0]!.extra = { name: "USDC", version: "2" };
    expect(() => approveRequirement(mainnet, policy)).toThrow(/EIP-712 token name/);
  });
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
        expectedAsset: "bad",
      });
    } catch (e) {
      expect(String(e)).not.toContain(secret);
    }
  });
  it("accepts a cumulative run within budget", () => {
    expect(
      assertPaymentBudget(
        [
          { operation: "calculate", endpoint: "/calculate", price: "0.01" },
          { operation: "analyze", endpoint: "/analyze", price: "0.05" },
          { operation: "attest", endpoint: "/attest", price: "0.25" },
        ],
        "0.25",
        "0.31",
      ).toFixed(),
    ).toBe("0.31");
  });
  it("rejects cumulative spend before payment and preserves per-request limit", () => {
    expect(() =>
      assertPaymentBudget(
        [{ operation: "attest", endpoint: "/attest", price: "0.25" }],
        "0.24",
        "1",
      ),
    ).toThrow(/X402_MAX_PAYMENT/);
    expect(() =>
      assertPaymentBudget(
        [
          { operation: "calculate", endpoint: "/calculate", price: "0.01" },
          { operation: "analyze", endpoint: "/analyze", price: "0.05" },
        ],
        "0.25",
        "0.05",
      ),
    ).toThrow(/no payment was made/);
  });
  it("reuses matching completed artifacts unless repayment is forced", () => {
    const selected = ["calculate", "analyze", "attest"];
    const reusable = new Set(["calculate", "analyze", "attest"]);
    expect(operationsToPay(selected, reusable, true, false)).toEqual([]);
    expect(operationsToPay(selected, reusable, true, true)).toEqual(selected);
    expect(operationsToPay(selected, reusable, false, false)).toEqual(selected);
  });
  it("enforces total budget and attempt count before a second authorization", () => {
    const budget = new PaymentBudget({
      expectedDecimals: 6,
      maxPayment: "0.01",
      maxTotalSpend: "0.01",
      maxAttempts: 1,
    });
    expect(budget.authorize("10000").toFixed()).toBe("0.01");
    expect(() => budget.authorize("10000")).toThrow(/attempts/);
  });
  it("keeps SDK payments disabled by default", async () => {
    const client = new AgentProfitClient({ baseUrl: "https://x402.ailabra.org" });
    await expect(client.calculate({ events: [] })).rejects.toThrow(/Payment disabled/);
  });
});
