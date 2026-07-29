import { x402Client } from "@x402/core/client";
import { registerExactEvmScheme } from "@x402/evm/exact/client";
import { decodePaymentResponseHeader, wrapFetchWithPayment } from "@x402/fetch";
import { privateKeyToAccount } from "viem/accounts";
import { Decimal } from "decimal.js";
import type { Config } from "../config.js";
import type { PaymentReceipt } from "../types.js";
import { approveRequirement, assertSameOrigin, parsePaymentRequired } from "./challenge.js";
export async function paidPost(
  config: Config,
  path: string,
  body: unknown,
): Promise<{ body: any; receipt: PaymentReceipt }> {
  if (!config.privateKey) throw new Error("X402_BUYER_PRIVATE_KEY is required for a real payment");
  const endpoint = new URL(path, config.baseUrl).toString();
  assertSameOrigin(config.baseUrl, endpoint);
  const options = {
    method: "POST",
    headers: { accept: "application/json", "content-type": "application/json" },
    body: JSON.stringify(body),
    redirect: "error" as RequestRedirect,
  };
  const initial = await fetch(endpoint, options);
  if (initial.status !== 402) throw new Error(`Expected HTTP 402, received ${initial.status}`);
  const challenge = parsePaymentRequired(initial.headers);
  const requirement = approveRequirement(challenge, config);
  if (requirement.resource) assertSameOrigin(config.baseUrl, requirement.resource);
  const client = new x402Client();
  registerExactEvmScheme(client, { signer: privateKeyToAccount(config.privateKey) });
  client.registerPolicy((_v, rs) =>
    rs.filter((r) => {
      try {
        approveRequirement({ x402Version: 2, accepts: [r as typeof requirement] }, config);
        return true;
      } catch {
        return false;
      }
    }),
  );
  const guardedFetch: typeof fetch = async (input, init) => {
    const target =
      typeof input === "string" ? input : input instanceof URL ? input.toString() : input.url;
    assertSameOrigin(config.baseUrl, target);
    return fetch(input, { ...init, redirect: "error" });
  };
  const response = await wrapFetchWithPayment(guardedFetch, client)(endpoint, options);
  const text = await response.text();
  if (!response.ok)
    throw new Error(`Paid request failed: ${response.status} ${text.slice(0, 300)}`);
  const settlementHeader = response.headers.get("payment-response");
  const settlement = settlementHeader ? decodePaymentResponseHeader(settlementHeader) : undefined;
  if (!settlement?.success || !settlement.transaction)
    throw new Error("Payment settlement evidence missing");
  const payer = (settlement as any).payer as string | undefined;
  const paymentId = (challenge.extensions as any)?.paymentIdentifier?.id as string | undefined;
  return {
    body: JSON.parse(text),
    receipt: {
      endpoint,
      price: `${new Decimal(requirement.amount).div(1_000_000)} USDC`,
      amount: requirement.amount,
      asset: requirement.asset,
      network: requirement.network,
      scheme: requirement.scheme,
      payTo: requirement.payTo,
      ...(payer ? { payer } : {}),
      transaction: settlement.transaction,
      ...(paymentId ? { paymentId } : {}),
      success: true,
      explorerUrl: `${requirement.network === "eip155:84532" ? "https://sepolia.basescan.org" : "https://basescan.org"}/tx/${settlement.transaction}`,
    },
  };
}
