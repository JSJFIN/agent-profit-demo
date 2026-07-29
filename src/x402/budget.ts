import { Decimal } from "decimal.js";

export type PlannedOperation = {
  operation: "calculate" | "analyze" | "attest";
  endpoint: string;
  price: string;
};

export function assertPaymentBudget(
  operations: PlannedOperation[],
  maximumPayment: string,
  maximumTotal: string,
) {
  for (const operation of operations) {
    if (new Decimal(operation.price).gt(maximumPayment))
      throw new Error(
        `${operation.operation} price ${operation.price} USDC exceeds X402_MAX_PAYMENT ${maximumPayment} USDC`,
      );
  }
  const total = operations.reduce((sum, operation) => sum.plus(operation.price), new Decimal(0));
  if (total.gt(maximumTotal))
    throw new Error(
      `Planned total ${total.toFixed()} USDC exceeds X402_MAX_TOTAL_SPEND ${maximumTotal} USDC; no payment was made`,
    );
  return total;
}

export function operationsToPay<T extends string>(
  selected: T[],
  reusable: Set<T>,
  requestMatches: boolean,
  forcePayment: boolean,
) {
  if (forcePayment || !requestMatches) return [...selected];
  return selected.filter((operation) => !reusable.has(operation));
}
