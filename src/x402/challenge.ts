import { Decimal } from "decimal.js";
import type { Config } from "../config.js";
export type PaymentRequirement = {
  scheme: string;
  network: string;
  asset: string;
  amount: string;
  payTo: string;
  resource?: string;
  maxTimeoutSeconds?: number;
  extra?: Record<string, unknown>;
};
export type PaymentRequired = {
  x402Version: number;
  accepts: PaymentRequirement[];
  extensions?: Record<string, unknown>;
};
export function parsePaymentRequired(headers: Headers): PaymentRequired {
  const encoded = headers.get("payment-required");
  if (!encoded) throw new Error("Malformed payment requirements: PAYMENT-REQUIRED missing");
  let value: unknown;
  try {
    value = JSON.parse(Buffer.from(encoded, "base64").toString("utf8"));
  } catch {
    throw new Error("Malformed payment requirements: invalid base64 JSON");
  }
  if (
    !value ||
    typeof value !== "object" ||
    !Array.isArray((value as any).accepts) ||
    (value as any).x402Version !== 2
  )
    throw new Error("Malformed payment requirements");
  return value as PaymentRequired;
}
export function approveRequirement(challenge: PaymentRequired, config: Config): PaymentRequirement {
  const r = challenge.accepts.find(
    (x) => x.scheme === "exact" && x.network === config.expectedNetwork,
  );
  if (!r) throw new Error("Unsupported payment scheme or unexpected network");
  if (!/^0x[0-9a-fA-F]{40}$/.test(r.asset) || r.asset.toLowerCase() !== config.expectedAsset)
    throw new Error("Unexpected payment asset");
  if (!/^0x[0-9a-fA-F]{40}$/.test(r.payTo)) throw new Error("Malformed payment recipient");
  if (config.expectedPayTo && r.payTo.toLowerCase() !== config.expectedPayTo)
    throw new Error("Unexpected payment recipient");
  if (!/^\d+$/.test(r.amount) || new Decimal(r.amount).div(1_000_000).gt(config.maxPayment))
    throw new Error("Payment exceeds configured maximum");
  return r;
}
export function assertSameOrigin(baseUrl: string, target: string) {
  if (new URL(target, baseUrl).origin !== new URL(baseUrl).origin)
    throw new Error("Redirect or resource uses unexpected origin");
}
