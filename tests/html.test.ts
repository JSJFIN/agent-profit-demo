import { describe, expect, it } from "vitest";
import { renderHtml } from "../src/reports/html-renderer.js";
import { autonomousBusinessScenario } from "../src/scenarios/autonomous-business.js";
import type { CalculationResult, PaymentReceipt } from "../src/types.js";

const calculation = {
  schemaVersion: "2",
  calculationEngineVersion: "2.0.0",
  inputEventCount: 15,
  acceptedEventCount: 15,
  rejectedEventCount: 0,
  duplicateEventCount: 0,
  profitAffectingEventCount: 11,
  profitExcludedEventCount: 4,
  currentCashBalances: { USDC: "100.40" },
  totals: {
    USDC: {
      grossRevenue: "58",
      netRevenue: "54",
      totalCosts: "45.6",
      netOperatingProfit: "8.4",
      profitMargin: { value: "15.555556" },
      netCashFlow: "70.4",
    },
  },
  breakdowns: {
    spendByCategory: {
      USDC: {
        llm_usage: "10",
        hosting_compute: "4",
        domain: "12",
        advertising: "18",
        x402_purchase: "1.25",
        blockchain_transaction_fee: "0.35",
      },
    },
    customerEconomics: {
      USDC: {
        customer_alpha: {
          grossRevenue: "24",
          refunds: "4",
          netRevenue: "20",
          revenueEventCount: 1,
          refundEventCount: 1,
        },
      },
    },
    experimentEconomics: {
      USDC: {
        experiment_direct_outreach: {
          grossRevenue: "48",
          refunds: "4",
          netRevenue: "44",
          attributedCosts: "7.65",
          netContribution: "36.35",
          returnOnSpend: { value: "475.163399", status: "available", unit: "percent" },
          revenueEventCount: 2,
          refundEventCount: 1,
          costEventCount: 3,
          status: "complete",
        },
        experiment_paid_advertising: {
          grossRevenue: "10",
          refunds: "0",
          netRevenue: "10",
          attributedCosts: "21.6",
          netContribution: "-11.6",
          returnOnSpend: { value: "-53.703704", status: "available", unit: "percent" },
          revenueEventCount: 1,
          refundEventCount: 0,
          costEventCount: 2,
          status: "complete",
        },
      },
    },
    unattributedCosts: { USDC: "16.35" },
  },
  dataCoverage: { revenueByEvidencePercent: { USDC: { self_reported: "100" } } },
  warnings: [],
  profitExcludedEvents: [{ externalId: "capital_001", reason: "excluded_capital" }],
  rejectedEvents: [],
} as unknown as CalculationResult;

const receipts: PaymentReceipt[] = (["calculate", "analyze", "attest"] as const).map(
  (operation, index) => ({
    operation,
    endpoint: `https://test-x402.ailabra.org/api/v1/x402/profit/${operation}`,
    advertisedPrice: `${["0.01", "0.05", "0.25"][index]} USDC`,
    atomicAmount: ["10000", "50000", "250000"][index]!,
    asset: "0xtest",
    assetSymbol: "USDC",
    network: "eip155:84532",
    scheme: "exact",
    maskedSeller: "0x1234…7890",
    maskedPayer: "0xabcd…abcd",
    transactionHash: `0xtransaction${index}`,
    explorerUrl: `https://sepolia.basescan.org/tx/0xtransaction${index}`,
    settlementStatus: "settled",
    timestamp: "2026-07-29T00:00:00Z",
  }),
);

describe("standalone report", () => {
  it("renders exact server economics, categories, receipts, and parseable JSON", () => {
    const html = renderHtml({
      events: autonomousBusinessScenario(),
      calculation,
      receipts,
      analysis: { findings: [{ code: "UNPROFITABLE_EXPERIMENT", message: "Synthetic." }] },
      baseUrl: "https://test-x402.ailabra.org",
    });
    for (const text of [
      "Wallet balance ≠ profit",
      "Experiment economics",
      "Customer economics",
      "Data coverage and trust",
      "Caller-reported current cash balance",
      "475.16%",
      "-53.70%",
      "16.35 USDC",
      "domain",
      "12.00 USDC",
      "Total demonstration service spend: 0.31 USDC",
      "0xtransaction2",
      "SYNTHETIC DEMONSTRATION DATA",
    ])
      expect(html).toContain(text);
    expect(html).not.toContain("<script src=");
    const json = html.match(
      /<script type="application\/json" id="profit-result">(.*?)<\/script>/s,
    )![1]!;
    expect(
      JSON.parse(json).breakdowns.experimentEconomics.USDC.experiment_direct_outreach,
    ).toMatchObject({ refunds: "4", returnOnSpend: { value: "475.163399" } });
  });

  it("renders multiple currencies independently and escapes untrusted event fields", () => {
    const events = autonomousBusinessScenario();
    events[0]!.category = '<img src=x onerror="bad">';
    const multi = structuredClone(calculation);
    multi.breakdowns.spendByCategory.EUR = { hosting_compute: "5" };
    const html = renderHtml({
      events,
      calculation: multi,
      receipts,
      baseUrl: "https://test-x402.ailabra.org",
    });
    expect(html).toContain("5.00 EUR");
    expect(html).not.toContain('<img src=x onerror="bad">');
    expect(html).toContain("&lt;img");
  });
});
