export type EconomicEvent = {
  schemaVersion: "1";
  externalId: string;
  occurredAt: string;
  kind:
    | "revenue"
    | "expense"
    | "refund"
    | "fee"
    | "transfer"
    | "capital"
    | "withdrawal"
    | "asset_purchase"
    | "asset_sale"
    | "adjustment";
  direction: "inflow" | "outflow";
  amount: string;
  currency: string;
  category: string;
  source: {
    name: string;
    type: string;
    verification:
      | "self_reported"
      | "receipt_supplied"
      | "receipt_verified"
      | "onchain_verified"
      | "system_observed";
    reference?: string;
  };
  agentId?: string;
  ventureId?: string;
  experimentId?: string;
  customerId?: string;
  relatedEventId?: string;
  transactionHash?: string;
  x402PaymentId?: string;
  metadata?: Record<string, string | number | boolean | null>;
};
export type PaymentReceipt = {
  operation: "calculate" | "analyze" | "attest";
  endpoint: string;
  advertisedPrice: string;
  atomicAmount: string;
  asset: string;
  assetSymbol: string;
  network: string;
  scheme: string;
  maskedSeller: string;
  maskedPayer?: string;
  transactionHash: string;
  paymentIdentifier?: string;
  settlementStatus: "settled";
  timestamp: string;
  explorerUrl?: string;
};
export type RevenueEconomics = {
  grossRevenue: string;
  refunds: string;
  netRevenue: string;
  revenueEventCount: number;
  refundEventCount: number;
};
export type ExperimentEconomics = RevenueEconomics & {
  attributedCosts: string;
  netContribution: string;
  returnOnSpend: { value: string | null; status: string; unit?: string; missing?: string[] };
  costEventCount: number;
  status: string;
};
export type CalculationResult = Record<string, unknown> & {
  schemaVersion: "2";
  calculationEngineVersion: string;
  inputEventCount: number;
  acceptedEventCount: number;
  rejectedEventCount: number;
  duplicateEventCount: number;
  profitAffectingEventCount: number;
  profitExcludedEventCount: number;
  totals: Record<string, Record<string, string>>;
  currentCashBalances: Record<string, string>;
  breakdowns: {
    spendByCategory: Record<string, Record<string, string>>;
    customerEconomics: Record<string, Record<string, RevenueEconomics>>;
    experimentEconomics: Record<string, Record<string, ExperimentEconomics>>;
    unattributedCosts: Record<string, string>;
    [key: string]: unknown;
  };
  dataCoverage: Record<string, unknown>;
  warnings: unknown[];
};
export type SignedReport = Record<string, unknown> & {
  schemaVersion: string;
  calculationVersion: string;
  reportId: string;
  reportTimestamp: string;
  calculation: CalculationResult;
  publicKeyId: string;
  resultHash: string;
  signature: string;
  signatureAlgorithm: string;
};
