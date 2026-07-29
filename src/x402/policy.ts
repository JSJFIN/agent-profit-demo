import { Decimal } from "decimal.js";
import { parseAtomicUsdc, parseUsdcPrice } from "../money.js";

export type PaymentPolicy = {
  expectedNetwork: string;
  expectedAsset: string;
  expectedAssetSymbol: string;
  expectedDecimals: number;
  expectedEip712Name: string;
  expectedEip712Version: string;
  expectedPayTo: string;
  maxPayment: string;
  maxTotalSpend: string;
  maxAttempts: number;
  allowedOrigin: string;
};

type Limits = Pick<PaymentPolicy, "expectedPayTo" | "maxPayment" | "maxTotalSpend"> & {
  maxAttempts?: number;
  allowedOrigin?: string;
};

type FixedPolicy = Omit<
  PaymentPolicy,
  "expectedPayTo" | "maxPayment" | "maxTotalSpend" | "maxAttempts"
>;

const policy = (fixed: FixedPolicy, limits: Limits): PaymentPolicy => ({
  ...fixed,
  ...limits,
  maxAttempts: limits.maxAttempts ?? 1,
  allowedOrigin: new URL(limits.allowedOrigin ?? fixed.allowedOrigin).origin,
});

export const paymentPolicies = {
  baseMainnetUsdc: (limits: Limits): PaymentPolicy =>
    policy(
      {
        expectedNetwork: "eip155:8453",
        expectedAsset: "0x833589fCD6eDb6E08f4c7C32D4f71b54bdA02913",
        expectedAssetSymbol: "USDC",
        expectedDecimals: 6,
        expectedEip712Name: "USD Coin",
        expectedEip712Version: "2",
        allowedOrigin: "https://x402.ailabra.org",
      },
      limits,
    ),
  baseSepoliaUsdc: (limits: Limits): PaymentPolicy =>
    policy(
      {
        expectedNetwork: "eip155:84532",
        expectedAsset: "0x036CbD53842c5426634e7929541eC2318f3dCF7e",
        expectedAssetSymbol: "USDC",
        expectedDecimals: 6,
        expectedEip712Name: "USDC",
        expectedEip712Version: "2",
        allowedOrigin: "https://test-x402.ailabra.org",
      },
      limits,
    ),
};

export class PaymentBudget {
  private spent = new Decimal(0);
  private attempts = 0;

  constructor(
    readonly policy: Pick<
      PaymentPolicy,
      "maxAttempts" | "maxPayment" | "maxTotalSpend" | "expectedDecimals"
    >,
  ) {}

  authorize(amountAtomic: string) {
    if (this.attempts >= this.policy.maxAttempts)
      throw new Error("Maximum payment attempts exceeded");
    const amount = new Decimal(parseAtomicUsdc(amountAtomic, this.policy.expectedDecimals).amount);
    const maximum = new Decimal(parseUsdcPrice(this.policy.maxPayment).amount);
    const totalMaximum = new Decimal(parseUsdcPrice(this.policy.maxTotalSpend).amount);
    if (amount.gt(maximum)) throw new Error("Payment exceeds configured maximum");
    if (this.spent.plus(amount).gt(totalMaximum))
      throw new Error("Payment would exceed configured total spending limit");
    this.attempts += 1;
    this.spent = this.spent.plus(amount);
    return amount;
  }

  get summary() {
    return { attempts: this.attempts, spent: this.spent.toFixed() };
  }
}
