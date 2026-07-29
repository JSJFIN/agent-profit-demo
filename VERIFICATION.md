# Black-box verification record

Verified on 2026-07-29 against `https://test-x402.ailabra.org` using Base Sepolia (`eip155:84532`) native USDC. No private key, payment authorization header, or capability token is recorded here.

## v1.0.1 paid operations

| Operation |     Price | Settlement                                                                                                                                                                 |
| --------- | --------: | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| Calculate | 0.01 USDC | [`0x646da0d2d591be4b6e47b6f46c7c79e4602b4a434f1ff75f3d1c61e328c4c411`](https://sepolia.basescan.org/tx/0x646da0d2d591be4b6e47b6f46c7c79e4602b4a434f1ff75f3d1c61e328c4c411) |
| Analyze   | 0.05 USDC | [`0x0b668ff07e4d3ab2cf680f9a51a98c87d30afb1d4266c77200d4f6095b52cb67`](https://sepolia.basescan.org/tx/0x0b668ff07e4d3ab2cf680f9a51a98c87d30afb1d4266c77200d4f6095b52cb67) |
| Attest    | 0.25 USDC | [`0x869a079e1bfa4bbbdc6d8077cfea67c9396580a2e718af8c385cbe08639dc612`](https://sepolia.basescan.org/tx/0x869a079e1bfa4bbbdc6d8077cfea67c9396580a2e718af8c385cbe08639dc612) |

The preflight-authorized total was exactly 0.31 USDC. Independent Base Sepolia RPC receipts reported success in blocks 44771626 and 44771627.

The calculation accepted all 15 events: 11 affected profit and 4 were excluded. Gross revenue was 58 USDC, refunds 4 USDC, net revenue 54 USDC, total costs 45.6 USDC, operating profit 8.4 USDC, margin 15.555556%, and net cash flow 100.4 USDC.

Direct outreach returned 48 gross revenue, 4 refunds, 44 net revenue, 7.65 attributed costs, 36.35 net contribution, and 475.163399% return on spend. Paid advertising returned 10 net revenue, 21.6 costs, -11.6 contribution, and -53.703704%. Unattributed costs were 16.35 USDC.

Signed-report schema 3 report `rpt_16589b0f-55b7-4ee7-95c3-c610e8e0c4e1` was independently verified with key `ailabra-profit-report-2026-01`. Its recomputed SHA-256 result hash was `ee28345a6516789d39b46ebfbf62c0231a8b8315f462cae9522e9d361cb43e59`. Automated tests confirm modified signed values fail verification.

No Base-mainnet funds were spent.
