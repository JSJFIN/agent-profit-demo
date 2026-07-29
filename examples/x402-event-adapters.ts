import {
  economicEvents,
  withEconomicEventTracking,
  type EconomicEvent,
  type PaymentReceipt,
} from "@jsjfin/agent-profit";

const seen = new Set<string>();
const ledger = {
  async record(event: EconomicEvent) {
    const key = `${event.source.name}:${event.externalId}`;
    if (seen.has(key)) return { duplicate: true };
    seen.add(key);
    return { duplicate: false };
  },
};

const trackedFetch = withEconomicEventTracking(fetch, ledger, async (response) => {
  // Decode a safe settlement receipt in the application integration. Never
  // persist PAYMENT-SIGNATURE or authorization headers.
  const receipt = (await response.json()) as PaymentReceipt;
  if (receipt.settlementStatus !== "settled") return undefined;
  return economicEvents.fromX402Purchase(receipt, {
    externalId: receipt.paymentIdentifier ?? receipt.transactionHash,
    occurredAt: receipt.timestamp,
    category: "x402_purchase",
    // Set true only after a trusted RPC verification, not from the hash alone.
    onchainVerified: false,
  });
});

void trackedFetch;
