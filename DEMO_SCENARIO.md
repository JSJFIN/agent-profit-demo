# Synthetic demonstration scenario

The fictional **Autonomous Research Brief Service** receives 100 USDC of owner capital and moves 40 USDC between internal wallets. It spends on LLM usage, hosting, a domain, advertising, an x402 tool, and a blockchain fee. Three fictional customers produce 58 USDC gross revenue and one receives a 4 USDC refund. The owner withdraws 8 USDC.

The 15 events cover two experiments. The internal transfer has matched outflow and inflow legs:

- `experiment_direct_outreach`: 48 USDC gross attributed revenue and 7.65 USDC spend before the attributed refund; profitable in the deterministic result.
- `experiment_paid_advertising`: 10 USDC revenue and 21.60 USDC spend; intentionally unprofitable.

The dataset mixes `self_reported`, `receipt_supplied`, `receipt_verified`, `onchain_verified`, and `system_observed` evidence. Every reference and transaction in the input is explicitly synthetic. Owner capital, the internal transfer, and owner withdrawal affect cash but are excluded from operating profit—demonstrating why wallet balance and profit differ.

The source dataset is [examples/autonomous-business-events.json](examples/autonomous-business-events.json).
