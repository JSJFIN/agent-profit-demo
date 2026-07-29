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
  X402_MAX_PAYMENT: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .default("0.25"),
  X402_MAX_TOTAL_SPEND: z
    .string()
    .regex(/^\d+(\.\d+)?$/)
    .default("0.31"),
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
};
export function loadConfig(env = process.env): Config {
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
  };
}
