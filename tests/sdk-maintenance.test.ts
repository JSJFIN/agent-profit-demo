import { describe, expect, it, vi } from "vitest";
import { AgentProfitClient } from "../src/client.js";
import { economicEvents, withEconomicEventTracking } from "../src/adapters.js";
import { parseAtomicUsdc, parseUsdcPrice } from "../src/money.js";
import { resolveProfile } from "../src/profiles.js";
import type { PaymentReceipt } from "../src/types.js";

const receipt: PaymentReceipt = {
  operation: "calculate",
  endpoint: "https://example.test/calculate",
  advertisedPrice: "0.01 USDC",
  atomicAmount: "10000",
  asset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
  assetSymbol: "USDC",
  network: "eip155:84532",
  scheme: "exact",
  maskedSeller: "0x2d6C…ab84",
  transactionHash: "0xabc",
  settlementStatus: "settled",
  timestamp: "2026-07-29T12:00:00Z",
};

describe("SDK 0.1.1 maintenance contracts", () => {
  it.each([
    ["0.05", "0.05"],
    ["0.05 USDC", "0.05"],
    ["10000", "10000"],
  ])("normalizes %s", (value, expected) => {
    expect(parseUsdcPrice(value)).toEqual({ amount: expected, asset: "USDC" });
  });

  it.each(["0.05 EUR", "-1", "1e-3", "USDC 1", ""])("rejects invalid price %s", (value) => {
    expect(() => parseUsdcPrice(value)).toThrow(
      `Invalid payment price "${value}": expected a decimal USDC amount.`,
    );
  });

  it("converts atomic USDC exactly", () => {
    expect(parseAtomicUsdc("10000", 6)).toEqual({ amount: "0.01", asset: "USDC" });
  });

  it("resolves profiles without URL/network mismatches", () => {
    expect(resolveProfile("mainnet")).toMatchObject({
      baseUrl: "https://x402.ailabra.org",
      expectedNetwork: "eip155:8453",
    });
    expect(resolveProfile("testnet")).toMatchObject({
      baseUrl: "https://test-x402.ailabra.org",
      expectedNetwork: "eip155:84532",
    });
    expect(() => resolveProfile("custom")).toThrow(/baseUrl and expectedNetwork/);
    expect(AgentProfitClient.fromProfile("testnet").baseUrl).toBe("https://test-x402.ailabra.org");
  });

  it("keeps workspace data quality in the eight-operation parity contract", () => {
    expect(AgentProfitClient.operations).toHaveLength(8);
    expect(AgentProfitClient.operations).toContain("workspace_get_data_quality");
  });

  it("creates x402 events without upgrading evidence from a hash alone", () => {
    const event = economicEvents.fromX402Purchase(receipt, {
      externalId: "purchase_1",
      occurredAt: receipt.timestamp,
    });
    expect(event).toMatchObject({
      kind: "expense",
      direction: "outflow",
      amount: "0.01",
      source: { verification: "receipt_supplied" },
    });
    expect(
      economicEvents.fromX402Purchase(receipt, {
        externalId: "purchase_2",
        occurredAt: receipt.timestamp,
        onchainVerified: true,
      }).source.verification,
    ).toBe("onchain_verified");
  });

  it("maps sales and LLM usage deterministically", () => {
    expect(
      economicEvents.fromX402Sale(receipt, {
        externalId: "sale_1",
        occurredAt: receipt.timestamp,
        customerId: "customer_1",
      }),
    ).toMatchObject({ kind: "revenue", direction: "inflow", category: "x402_customer_revenue" });
    expect(
      economicEvents.fromLlmUsage({
        provider: "provider",
        model: "model",
        amount: "0.25",
        currency: "USDC",
        requestId: "request_1",
        occurredAt: receipt.timestamp,
      }),
    ).toMatchObject({ kind: "expense", category: "llm_usage" });
  });

  it("records only settled successful tracked fetches", async () => {
    const record = vi.fn(async () => undefined);
    const settled = vi.fn(async () =>
      economicEvents.fromX402Purchase(receipt, {
        externalId: "tracked_1",
        occurredAt: receipt.timestamp,
      }),
    );
    const paidFetch = withEconomicEventTracking(
      async () => new Response("{}", { status: 200, headers: { "payment-response": "safe" } }),
      { record },
      settled,
    );
    await paidFetch("https://example.test");
    expect(record).toHaveBeenCalledOnce();
    const unpaidFetch = withEconomicEventTracking(
      async () => new Response("{}", { status: 402 }),
      { record },
      settled,
    );
    await unpaidFetch("https://example.test");
    expect(record).toHaveBeenCalledOnce();
  });
});
