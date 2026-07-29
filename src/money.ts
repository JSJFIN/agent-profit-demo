import { Decimal } from "decimal.js";

export type UsdcAmount = {
  amount: string;
  asset: "USDC";
};

const invalid = (value: string) =>
  new Error(`Invalid payment price "${value}": expected a decimal USDC amount.`);

export function parseUsdcPrice(value: string): UsdcAmount {
  const match = /^(\d+(?:\.\d+)?)(?: USDC)?$/.exec(value);
  if (!match) throw invalid(value);
  try {
    const amount = new Decimal(match[1]!);
    if (amount.isNegative() || !amount.isFinite()) throw invalid(value);
    return { amount: amount.toFixed(), asset: "USDC" };
  } catch (error) {
    if (error instanceof Error && error.message.startsWith("Invalid payment price")) throw error;
    throw invalid(value);
  }
}

export function parseAtomicUsdc(value: string, decimals = 6): UsdcAmount {
  if (!/^\d+$/.test(value) || !Number.isInteger(decimals) || decimals < 0) throw invalid(value);
  return {
    amount: new Decimal(value).div(new Decimal(10).pow(decimals)).toFixed(),
    asset: "USDC",
  };
}

export function formatUsdc(value: string) {
  const parsed = parseUsdcPrice(value);
  return `${parsed.amount} ${parsed.asset}`;
}
