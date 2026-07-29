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
  endpoint: string;
  price: string;
  amount: string;
  asset: string;
  network: string;
  scheme: string;
  payTo: string;
  payer?: string;
  transaction?: string;
  paymentId?: string;
  success: boolean;
  explorerUrl?: string;
};
export type CalculationResult = Record<string, unknown> & {
  calculationEngineVersion: string;
  inputEventCount: number;
  acceptedEventCount: number;
  rejectedEventCount: number;
  duplicateEventCount: number;
  profitAffectingEventCount: number;
  profitExcludedEventCount: number;
  totals: Record<string, Record<string, string>>;
  breakdowns: Record<string, Record<string, Record<string, string>>>;
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
