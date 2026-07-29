# Ailabra Profit Loop

The Ailabra Profit Loop is a deterministic operating routine for answering one
question: **is this autonomous agent actually making money?** Wallet balance is
not profit.

1. Record revenue when customers pay.
2. Record model, API, hosting, marketing, and blockchain costs.
3. Record owner funding as capital, not revenue.
4. Record owner payouts as withdrawals, not expenses.
5. Record internal wallet movements as transfers.
6. Calculate profit daily or after a meaningful batch of events.
7. Compare ventures and experiments.
8. Flag negative net contribution for review.
9. Track data-quality and evidence coverage.
10. Create a signed report when external sharing is useful.

Copyable agent instruction:

> You are responsible for tracking the operating profitability of this agent.
> Record revenue, refunds, expenses, fees, capital, withdrawals and transfers
> using the Ailabra Economic Event schema. Do not treat wallet balance as profit.
> Run a deterministic profit calculation after each meaningful batch of activity
> and flag experiments with negative net contribution.

This instruction does not authorize payment. SDK payments remain disabled unless
the caller supplies an explicit signer, policy, limits, and `pay: true`.

Run the example:

```bash
agent-profit quote calculate examples/profit-loop-events.json --profile testnet
agent-profit calculate examples/profit-loop-events.json \
  --profile testnet --pay \
  --max-payment 0.01 --max-total-spend 0.01 --max-attempts 1
```

The data is synthetic. Results are operational calculations, not an independent
audit, tax filing, or financial advice.
