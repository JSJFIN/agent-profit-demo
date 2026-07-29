import { z } from "zod";
import type { EconomicEvent } from "./types.js";

const decimal = z.string().regex(/^\d+(?:\.\d+)?$/, "Amount must be a positive decimal string");

export const economicEventSchema = z
  .object({
    schemaVersion: z.literal("1"),
    externalId: z.string().min(1),
    occurredAt: z.string().datetime(),
    kind: z.enum([
      "revenue",
      "expense",
      "refund",
      "fee",
      "transfer",
      "capital",
      "withdrawal",
      "asset_purchase",
      "asset_sale",
      "adjustment",
    ]),
    direction: z.enum(["inflow", "outflow"]),
    amount: decimal.refine((value) => value !== "0" && !/^0(?:\.0+)?$/.test(value), {
      message: "Amount must be greater than zero",
    }),
    currency: z.string().regex(/^[A-Z][A-Z0-9]{1,11}$/),
    category: z.string().min(1),
    source: z.object({
      name: z.string().min(1),
      type: z.string().min(1),
      verification: z.enum([
        "self_reported",
        "receipt_supplied",
        "receipt_verified",
        "onchain_verified",
        "system_observed",
      ]),
      reference: z.string().min(1).optional(),
    }),
    agentId: z.string().min(1).optional(),
    ventureId: z.string().min(1).optional(),
    experimentId: z.string().min(1).optional(),
    customerId: z.string().min(1).optional(),
    relatedEventId: z.string().min(1).optional(),
    transactionHash: z.string().min(1).optional(),
    x402PaymentId: z.string().min(1).optional(),
    metadata: z
      .record(z.string(), z.union([z.string(), z.number(), z.boolean(), z.null()]))
      .optional(),
  })
  .strict();

export function createEconomicEvent(input: EconomicEvent): EconomicEvent {
  return economicEventSchema.parse(input) as EconomicEvent;
}

export function validateEconomicEvents(input: unknown): EconomicEvent[] {
  return z.array(economicEventSchema).parse(input) as EconomicEvent[];
}
