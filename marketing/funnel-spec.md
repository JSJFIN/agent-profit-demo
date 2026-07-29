# Privacy-conscious acquisition funnel

Events: `landing_view`, `npm_install_proxy`, `doctor_success`,
`discover_success`, `quote_requested`, `calculation_paid`, `analysis_paid`,
`attestation_paid`, `workspace_created`, and `repeat_payer`.

Store only timestamp bucket, endpoint/operation, declared discovery source,
environment, internal-test flag, accepted-event count band, and a rotating keyed
hash when identity deduplication is operationally and legally justified. Do not
store raw financial events, payment headers, full addresses, private reports,
raw IP addresses, or user-agent strings for marketing.

Definitions:

- `npm_install_proxy`: official aggregate registry download count; not a person.
- `quote_requested`: unpaid 402 returned; not a customer or settled payment.
- `repeat_payer`: permitted pseudonymous identity with two settled calculations
  in seven days, excluding internal tests.
- North star: identity completes at least two valid calculations with at least ten
  accepted events within seven days.

Retention: aggregate weekly counts indefinitely; delete or rotate identity hashes
after 30 days unless a documented abuse/security purpose requires less or more.
Internal tests are always separate.
