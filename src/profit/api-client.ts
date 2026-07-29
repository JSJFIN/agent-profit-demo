import type { Config } from "../config.js";
import type { EconomicEvent, PaymentReceipt, CalculationResult, SignedReport } from "../types.js";
import { PublicContracts } from "./public-contracts.js";
import { paidPost } from "../x402/client.js";
export class ProfitApiClient {
  readonly contracts: PublicContracts;
  constructor(readonly config: Config) {
    this.contracts = new PublicContracts(config.baseUrl);
  }
  async discover() {
    return this.contracts.discover();
  }
  async call(path: string, body: unknown): Promise<{ body: any; receipt: PaymentReceipt }> {
    this.contracts.validateRequest(path, body);
    const result = await paidPost(this.config, path, body);
    this.contracts.validateResponse(path, result.body);
    return result;
  }
  calculate(events: EconomicEvent[]) {
    return this.call("/api/v1/x402/profit/calculate", {
      events,
      currentCashBalances: { USDC: "100.40" },
    }) as Promise<{ body: CalculationResult; receipt: PaymentReceipt }>;
  }
  analyze(events: EconomicEvent[]) {
    return this.call("/api/v1/x402/profit/analyze", {
      events,
      currentCashBalances: { USDC: "100.40" },
    });
  }
  attest(events: EconomicEvent[]) {
    return this.call("/api/v1/x402/profit/attest", {
      events,
      currentCashBalances: { USDC: "100.40" },
      public: false,
    }) as Promise<{
      body: { report: SignedReport; reportUrl: string; jsonUrl: string; evidenceManifest: unknown };
      receipt: PaymentReceipt;
    }>;
  }
}
export function verifyReconciliation(r: CalculationResult) {
  return {
    input:
      r.inputEventCount === r.acceptedEventCount + r.rejectedEventCount + r.duplicateEventCount,
    accepted: r.acceptedEventCount === r.profitAffectingEventCount + r.profitExcludedEventCount,
  };
}
