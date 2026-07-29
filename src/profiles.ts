import type { EvmSigner } from "./config.js";
import { paymentPolicies, type PaymentPolicy } from "./x402/policy.js";

export type EnvironmentProfile = "mainnet" | "testnet" | "custom";

export type ProfileOptions = {
  baseUrl?: string;
  expectedNetwork?: string;
  expectedAsset?: string;
  expectedAssetSymbol?: string;
  expectedDecimals?: number;
  expectedEip712Name?: string;
  expectedEip712Version?: string;
  expectedPayTo?: string;
  maxPayment?: string;
  maxTotalSpend?: string;
  maxAttempts?: number;
  signer?: EvmSigner;
};

export type ResolvedProfile = {
  profile: EnvironmentProfile;
  baseUrl: string;
  expectedNetwork: string;
  paymentPolicy?: PaymentPolicy;
  signer?: EvmSigner;
};

const paymentRequested = (options: ProfileOptions) =>
  options.expectedPayTo !== undefined || options.signer !== undefined;

const requirePaymentLimits = (options: ProfileOptions) => {
  if (!options.expectedPayTo || !options.maxPayment || !options.maxTotalSpend)
    throw new Error(
      "Payment profiles require expectedPayTo, maxPayment, and maxTotalSpend; payment remains disabled.",
    );
  return {
    expectedPayTo: options.expectedPayTo,
    maxPayment: options.maxPayment,
    maxTotalSpend: options.maxTotalSpend,
    maxAttempts: options.maxAttempts ?? 1,
  };
};

export function resolveProfile(
  profile: EnvironmentProfile,
  options: ProfileOptions = {},
): ResolvedProfile {
  if (profile === "mainnet") {
    const limits = paymentRequested(options) ? requirePaymentLimits(options) : undefined;
    return {
      profile,
      baseUrl: "https://x402.ailabra.org",
      expectedNetwork: "eip155:8453",
      ...(limits ? { paymentPolicy: paymentPolicies.baseMainnetUsdc(limits) } : {}),
      ...(options.signer ? { signer: options.signer } : {}),
    };
  }
  if (profile === "testnet") {
    const limits = paymentRequested(options) ? requirePaymentLimits(options) : undefined;
    return {
      profile,
      baseUrl: "https://test-x402.ailabra.org",
      expectedNetwork: "eip155:84532",
      ...(limits ? { paymentPolicy: paymentPolicies.baseSepoliaUsdc(limits) } : {}),
      ...(options.signer ? { signer: options.signer } : {}),
    };
  }
  if (!options.baseUrl || !options.expectedNetwork)
    throw new Error("The custom profile requires baseUrl and expectedNetwork.");
  if (paymentRequested(options)) {
    const limits = requirePaymentLimits(options);
    const required = [
      "expectedAsset",
      "expectedAssetSymbol",
      "expectedDecimals",
      "expectedEip712Name",
      "expectedEip712Version",
    ] as const;
    for (const field of required) {
      if (options[field] === undefined)
        throw new Error(`The custom payment profile requires ${field}.`);
    }
    return {
      profile,
      baseUrl: options.baseUrl,
      expectedNetwork: options.expectedNetwork,
      paymentPolicy: {
        expectedNetwork: options.expectedNetwork,
        expectedAsset: options.expectedAsset!,
        expectedAssetSymbol: options.expectedAssetSymbol!,
        expectedDecimals: options.expectedDecimals!,
        expectedEip712Name: options.expectedEip712Name!,
        expectedEip712Version: options.expectedEip712Version!,
        expectedPayTo: limits.expectedPayTo,
        maxPayment: limits.maxPayment,
        maxTotalSpend: limits.maxTotalSpend,
        maxAttempts: limits.maxAttempts,
        allowedOrigin: new URL(options.baseUrl).origin,
      },
      ...(options.signer ? { signer: options.signer } : {}),
    };
  }
  return {
    profile,
    baseUrl: options.baseUrl,
    expectedNetwork: options.expectedNetwork,
  };
}
