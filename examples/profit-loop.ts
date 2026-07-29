import { AgentProfitClient, validateEconomicEvents } from "@jsjfin/agent-profit";
import events from "./profit-loop-events.json" with { type: "json" };

const client = AgentProfitClient.fromProfile("testnet");
const validated = validateEconomicEvents(events);

// Read-only: requests and decodes a quote. No signer is configured and no
// payment can be authorized.
const quote = await client.getPaymentQuote("calculate", { events: validated });
console.log({ paymentAuthorized: false, quote });
