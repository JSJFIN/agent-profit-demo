import { createHash } from "node:crypto";
import { createEconomicEvent } from "./events.js";
import { parseUsdcPrice } from "./money.js";
import type { EconomicEvent, PaymentReceipt } from "./types.js";

type Attribution = {
  externalId: string;
  occurredAt: string;
  agentId?: string;
  ventureId?: string;
  experimentId?: string;
  category?: string;
  onchainVerified?: boolean;
};

const receiptSource = (receipt: PaymentReceipt, verified: boolean) => ({
  name: "x402_settlement_receipt",
  type: "x402_receipt",
  verification: verified ? ("onchain_verified" as const) : ("receipt_supplied" as const),
  reference: receipt.transactionHash,
});

const receiptAmount = (receipt: PaymentReceipt) => parseUsdcPrice(receipt.advertisedPrice).amount;

export const economicEvents = {
  fromX402Purchase(receipt: PaymentReceipt, options: Attribution): EconomicEvent {
    if (receipt.settlementStatus !== "settled")
      throw new Error("Only settled x402 purchases are events");
    return createEconomicEvent({
      schemaVersion: "1",
      externalId: options.externalId,
      occurredAt: options.occurredAt,
      kind: "expense",
      direction: "outflow",
      amount: receiptAmount(receipt),
      currency: receipt.assetSymbol,
      category: options.category ?? "x402_purchase",
      source: receiptSource(receipt, options.onchainVerified === true),
      transactionHash: receipt.transactionHash,
      ...(receipt.paymentIdentifier ? { x402PaymentId: receipt.paymentIdentifier } : {}),
      ...(options.agentId ? { agentId: options.agentId } : {}),
      ...(options.ventureId ? { ventureId: options.ventureId } : {}),
      ...(options.experimentId ? { experimentId: options.experimentId } : {}),
    });
  },

  fromX402Sale(
    receipt: PaymentReceipt,
    options: Attribution & { customerId?: string; productId?: string },
  ): EconomicEvent {
    if (receipt.settlementStatus !== "settled")
      throw new Error("Only settled x402 sales are events");
    return createEconomicEvent({
      schemaVersion: "1",
      externalId: options.externalId,
      occurredAt: options.occurredAt,
      kind: "revenue",
      direction: "inflow",
      amount: receiptAmount(receipt),
      currency: receipt.assetSymbol,
      category: options.category ?? "x402_customer_revenue",
      source: receiptSource(receipt, options.onchainVerified === true),
      transactionHash: receipt.transactionHash,
      ...(receipt.paymentIdentifier ? { x402PaymentId: receipt.paymentIdentifier } : {}),
      ...(options.customerId ? { customerId: options.customerId } : {}),
      ...(options.ventureId ? { ventureId: options.ventureId } : {}),
      ...(options.experimentId ? { experimentId: options.experimentId } : {}),
      ...(options.productId ? { metadata: { product: options.productId } } : {}),
    });
  },

  fromLlmUsage(input: {
    provider: string;
    model: string;
    amount: string;
    currency: string;
    requestId: string;
    occurredAt: string;
    agentId?: string;
    ventureId?: string;
    experimentId?: string;
  }): EconomicEvent {
    return createEconomicEvent({
      schemaVersion: "1",
      externalId: input.requestId,
      occurredAt: input.occurredAt,
      kind: "expense",
      direction: "outflow",
      amount: input.amount,
      currency: input.currency,
      category: "llm_usage",
      source: {
        name: input.provider,
        type: "provider_usage",
        verification: "receipt_supplied",
        reference: createHash("sha256").update(input.requestId).digest("hex"),
      },
      metadata: { provider: input.provider, model: input.model },
      ...(input.agentId ? { agentId: input.agentId } : {}),
      ...(input.ventureId ? { ventureId: input.ventureId } : {}),
      ...(input.experimentId ? { experimentId: input.experimentId } : {}),
    });
  },
};

export type EconomicEventLedger = {
  record(event: EconomicEvent): Promise<unknown>;
};

export function withEconomicEventTracking(
  fetchImplementation: typeof fetch,
  ledger: EconomicEventLedger,
  settledEvent: (response: Response) => Promise<EconomicEvent | undefined>,
): typeof fetch {
  return async (input, init) => {
    const response = await fetchImplementation(input, init);
    if (!response.ok || !response.headers.has("payment-response")) return response;
    const event = await settledEvent(response.clone());
    if (event) await ledger.record(event);
    return response;
  };
}
