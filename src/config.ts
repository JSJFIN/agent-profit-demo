import "dotenv/config";
import { z } from "zod";
const schema = z.object({
  PROFIT_API_BASE_URL: z.string().url().default("https://x402.ailabra.org"),
  X402_BUYER_PRIVATE_KEY: z
    .string()
    .regex(/^0x[0-9a-fA-F]{64}$/)
    .optional(),
  X402_EXPECTED_NETWORK: z.string().default("eip155:84532"),
  X402_EXPECTED_ASSET: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .default("0x036cbd53842c5426634e7929541ec2318f3dcf7e"),
  X402_EXPECTED_PAY_TO: z
    .string()
    .regex(/^0x[0-9a-fA-F]{40}$/)
    .optional(),
  X402_EXPECTED_SYMBOL: z.string().default("USDC"),
  X402_EXPECTED_DECIMALS: z.coerce.number().int().min(0).max(255).default(6),
  X402_EXPECTED_EIP712_NAME: z.string().optional(),
  X402_EXPECTED_EIP712_VERSION: z.string().default("2"),
  X402_MAX_PAYMENT: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .default("0.25"),
  X402_MAX_TOTAL_SPEND: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .default("0.31"),
  X402_MAX_ATTEMPTS: z.coerce.number().int().positive().default(1),
  LEDGER_PATH: z.string().default("ledger.json"),
  REPORT_OUTPUT_PATH: z.string().default("artifacts/autonomous-agent-profit-report.html"),
  LOG_LEVEL: z.string().default("info"),
});
export type Config = {
  baseUrl: string;
  privateKey?: `0x${string}`;
  expectedNetwork: string;
  expectedAsset: string;
  expectedPayTo?: string;
  maxPayment: string;
  maxTotalSpend: string;
  ledgerPath: string;
  reportPath: string;
  expectedAssetSymbol: string;
  expectedDecimals: number;
  expectedEip712Name: string;
  expectedEip712Version: string;
  maxAttempts: number;
  signer?: EvmSigner;
};
export type EvmSigner = {
  address: `0x${string}`;
  signTypedData: (parameters: unknown) => Promise<`0x${string}`>;
};
export type Environment = Record<string, string | undefined>;

export function loadConfig(env: Environment = process.env): Config {
  const v = schema.parse(env);
  return {
    baseUrl: v.PROFIT_API_BASE_URL.replace(/\/$/, ""),
    ...(v.X402_BUYER_PRIVATE_KEY ? { privateKey: v.X402_BUYER_PRIVATE_KEY as `0x${string}` } : {}),
    expectedNetwork: v.X402_EXPECTED_NETWORK,
    expectedAsset: v.X402_EXPECTED_ASSET.toLowerCase(),
    ...(v.X402_EXPECTED_PAY_TO ? { expectedPayTo: v.X402_EXPECTED_PAY_TO.toLowerCase() } : {}),
    maxPayment: v.X402_MAX_PAYMENT,
    maxTotalSpend: v.X402_MAX_TOTAL_SPEND,
    ledgerPath: v.LEDGER_PATH,
    reportPath: v.REPORT_OUTPUT_PATH,
    expectedAssetSymbol: v.X402_EXPECTED_SYMBOL,
    expectedDecimals: v.X402_EXPECTED_DECIMALS,
    expectedEip712Name:
      v.X402_EXPECTED_EIP712_NAME ??
      (v.X402_EXPECTED_NETWORK === "eip155:8453" ? "USD Coin" : "USDC"),
    expectedEip712Version: v.X402_EXPECTED_EIP712_VERSION,
    maxAttempts: v.X402_MAX_ATTEMPTS,
  };
}
