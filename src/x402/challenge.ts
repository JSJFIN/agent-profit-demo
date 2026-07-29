import { Decimal } from "decimal.js";
import { parseAtomicUsdc, parseUsdcPrice } from "../money.js";
import type { Config } from "../config.js";
import type { PaymentPolicy } from "./policy.js";
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
type GuardrailConfig = Pick<
  Config,
  | "expectedNetwork"
  | "expectedAsset"
  | "expectedPayTo"
  | "maxPayment"
  | "expectedDecimals"
  | "expectedEip712Name"
  | "expectedEip712Version"
>;

export function approveRequirement(
  challenge: PaymentRequired,
  config: GuardrailConfig | PaymentPolicy,
): PaymentRequirement {
  const r = challenge.accepts.find(
    (x) => x.scheme === "exact" && x.network === config.expectedNetwork,
  );
  if (!r) throw new Error("Unsupported payment scheme or unexpected network");
  if (
    !/^0x[0-9a-fA-F]{40}$/.test(r.asset) ||
    r.asset.toLowerCase() !== config.expectedAsset.toLowerCase()
  )
    throw new Error("Unexpected payment asset");
  if (!/^0x[0-9a-fA-F]{40}$/.test(r.payTo)) throw new Error("Malformed payment recipient");
  if (config.expectedPayTo && r.payTo.toLowerCase() !== config.expectedPayTo.toLowerCase())
    throw new Error("Unexpected payment recipient");
  if (
    !/^\d+$/.test(r.amount) ||
    new Decimal(parseAtomicUsdc(r.amount, config.expectedDecimals).amount).gt(
      parseUsdcPrice(config.maxPayment).amount,
    )
  )
    throw new Error("Payment exceeds configured maximum");
  if (!r.extra || r.extra.name !== config.expectedEip712Name)
    throw new Error("Unexpected EIP-712 token name");
  if (r.extra.version !== config.expectedEip712Version)
    throw new Error("Unexpected EIP-712 token version");
  return r;
}
export function assertSameOrigin(baseUrl: string, target: string) {
  if (new URL(target, baseUrl).origin !== new URL(baseUrl).origin)
    throw new Error("Redirect or resource uses unexpected origin");
}
