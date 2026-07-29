import { describe, expect, it } from "vitest";
import { renderHtml } from "../src/reports/html-renderer.js";
import { autonomousBusinessScenario } from "../src/scenarios/autonomous-business.js";
const calculation: any = {
  calculationEngineVersion: "1.0.0",
  inputEventCount: 14,
  acceptedEventCount: 14,
  rejectedEventCount: 0,
  duplicateEventCount: 0,
  profitAffectingEventCount: 11,
  profitExcludedEventCount: 3,
  totals: {
    USDC: {
      grossRevenue: "58",
      netRevenue: "54",
      totalCosts: "45.60",
      netOperatingProfit: "8.40",
      profitMargin: { value: "15.55" },
      netCashFlow: "70.40",
      ownerCapital: "100",
      ownerWithdrawals: "8",
    },
  },
  breakdowns: {
    revenueByCustomer: { customer_alpha: "20" },
    revenueByVenture: { venture_research_briefs: "54" },
    spendByExperiment: { experiment_paid_advertising: "21.6" },
    experimentReturnOnSpend: { experiment_paid_advertising: { value: "-53.7" } },
  },
  dataCoverage: {
    revenueByEvidencePercent: { self_reported: "17.2" },
    expensesByEvidencePercent: { receipt_verified: "50" },
    missingCostCategories: [],
  },
  warnings: [],
  profitExcludedEvents: [
    { externalId: "capital_001", reason: "excluded_capital" },
    { externalId: "transfer_001", reason: "excluded_transfer" },
    { externalId: "withdrawal_001", reason: "excluded_withdrawal" },
  ],
  rejectedEvents: [],
};
const receipt: any = {
  endpoint: "https://test-x402.ailabra.org/api/v1/x402/profit/calculate",
  price: "0.01 USDC",
  amount: "10000",
  asset: "0xtest",
  network: "eip155:84532",
  scheme: "exact",
  payTo: "0x1234567890123456789012345678901234567890",
  payer: "0xabcdefabcdefabcdefabcdefabcdefabcdefabcd",
  transaction: "0xtransaction",
  explorerUrl: "https://sepolia.basescan.org/tx/0xtransaction",
  success: true,
};
describe("standalone report", () => {
  it("contains required sections, transaction, warning, and parseable embedded JSON", () => {
    const html = renderHtml({
      events: autonomousBusinessScenario(),
      calculation,
      receipt,
      baseUrl: "https://test-x402.ailabra.org",
    });
    for (const s of [
      "Executive summary",
      "Wallet balance ≠ profit",
      "Event accounting",
      "Data coverage and trust",
      "x402 purchase evidence",
      "Signature verification",
      "SYNTHETIC DEMONSTRATION DATA",
      "0xtransaction",
    ])
      expect(html).toContain(s);
    expect(html).not.toContain("<script src=");
    const json = html.match(
      /<script type="application\/json" id="profit-result">(.*?)<\/script>/s,
    )![1]!;
    expect(JSON.parse(json).inputEventCount).toBe(14);
  });
  it("escapes untrusted event fields", () => {
    const events = autonomousBusinessScenario();
    events[0]!.category = '<img src=x onerror="bad">';
    const html = renderHtml({
      events,
      calculation,
      receipt,
      baseUrl: "https://test-x402.ailabra.org",
    });
    expect(html).not.toContain('<img src=x onerror="bad">');
    expect(html).toContain("&lt;img");
  });
});
