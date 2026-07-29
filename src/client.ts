import type { Config, EvmSigner } from "./config.js";
import { PublicContracts } from "./profit/public-contracts.js";
import { fetchSigningKeys, verifySignedReport } from "./reports/signature-verifier.js";
import type { EconomicEvent, SignedReport } from "./types.js";
import { parsePaymentRequired, approveRequirement, assertSameOrigin } from "./x402/challenge.js";
import { paidPost } from "./x402/client.js";
import { PaymentBudget, type PaymentPolicy } from "./x402/policy.js";
import { resolveProfile, type EnvironmentProfile, type ProfileOptions } from "./profiles.js";

export type AgentProfitClientOptions = {
  baseUrl: string;
  paymentPolicy?: PaymentPolicy;
  signer?: EvmSigner;
  supportedServiceMajor?: number;
};

export type PaidCallOptions = { pay?: boolean };
export type CalculationRequest = {
  events: EconomicEvent[];
  baseCurrency?: string;
  exchangeRates?: unknown[];
  currentCashBalances?: Record<string, string>;
};

const operationPaths = {
  calculate: "/api/v1/x402/profit/calculate",
  analyze: "/api/v1/x402/profit/analyze",
  attest: "/api/v1/x402/profit/attest",
} as const;

export class AgentProfitClient {
  readonly baseUrl: string;
  readonly contracts: PublicContracts;
  private readonly budget?: PaymentBudget;

  constructor(readonly options: AgentProfitClientOptions) {
    this.baseUrl = options.baseUrl.replace(/\/$/, "");
    this.contracts = new PublicContracts(this.baseUrl);
    if (options.paymentPolicy) {
      if (new URL(this.baseUrl).origin !== options.paymentPolicy.allowedOrigin)
        throw new Error("Service origin is not permitted by payment policy");
      this.budget = new PaymentBudget(options.paymentPolicy);
    }
  }

  static fromProfile(profile: EnvironmentProfile, options: ProfileOptions = {}) {
    const resolved = resolveProfile(profile, options);
    return new AgentProfitClient({
      baseUrl: resolved.baseUrl,
      ...(resolved.paymentPolicy ? { paymentPolicy: resolved.paymentPolicy } : {}),
      ...(resolved.signer ? { signer: resolved.signer } : {}),
    });
  }

  async discover() {
    const [openapi, capabilities, pricing, paymentInfo] = await Promise.all([
      this.contracts.discover(),
      this.getCapabilities(),
      this.getPricing(),
      this.getJson("/api/v1/payment-info"),
    ]);
    const version = String((paymentInfo as { serviceVersion?: string }).serviceVersion ?? "");
    const major = Number(version.split(".")[0]);
    if (major !== (this.options.supportedServiceMajor ?? 1))
      throw new Error(`Unsupported service version: ${version}`);
    return { openapi, capabilities, pricing, paymentInfo };
  }

  getPricing() {
    return this.getJson("/api/v1/pricing");
  }

  getCapabilities() {
    return this.getJson("/api/v1/capabilities");
  }

  async getPaymentQuote(operation: keyof typeof operationPaths, request: CalculationRequest) {
    const endpoint = new URL(operationPaths[operation], this.baseUrl).toString();
    assertSameOrigin(this.baseUrl, endpoint);
    const response = await fetch(endpoint, {
      method: "POST",
      headers: { accept: "application/json", "content-type": "application/json" },
      body: JSON.stringify(request),
      redirect: "error",
    });
    if (response.status !== 402) throw new Error(`Expected HTTP 402, received ${response.status}`);
    const challenge = parsePaymentRequired(response.headers);
    if (this.options.paymentPolicy) {
      const info = (await this.getJson("/api/v1/payment-info")) as Record<string, unknown>;
      this.assertMetadata(info, this.options.paymentPolicy);
      approveRequirement(challenge, this.options.paymentPolicy);
    }
    return challenge;
  }

  calculate(request: CalculationRequest, options: PaidCallOptions = {}) {
    return this.paidCall("calculate", request, options);
  }

  analyze(request: CalculationRequest, options: PaidCallOptions = {}) {
    return this.paidCall("analyze", request, options);
  }

  attest(request: CalculationRequest, options: PaidCallOptions = {}) {
    return this.paidCall("attest", { ...request, public: false }, options);
  }

  async verifyReport(report: SignedReport) {
    return verifySignedReport(report, await fetchSigningKeys(this.baseUrl));
  }

  async getWorkspaceDataQuality(workspaceId: string, capabilityToken: string) {
    if (!workspaceId || !capabilityToken)
      throw new Error("Workspace ID and read capability are required");
    const response = await fetch(
      new URL(`/api/v1/workspaces/${encodeURIComponent(workspaceId)}/data-quality`, this.baseUrl),
      {
        headers: { accept: "application/json", authorization: `Bearer ${capabilityToken}` },
        redirect: "error",
      },
    );
    if (!response.ok) throw new Error(`Workspace data quality failed: ${response.status}`);
    return response.json();
  }

  static readonly operations = [
    "profit_calculate",
    "profit_analyze",
    "profit_attest",
    "workspace_create",
    "workspace_record_events",
    "workspace_get_profit",
    "workspace_get_data_quality",
    "report_verify",
  ] as const;

  private async paidCall(
    operation: keyof typeof operationPaths,
    request: Record<string, unknown>,
    options: PaidCallOptions,
  ) {
    if (options.pay !== true) throw new Error("Payment disabled: pass { pay: true } explicitly");
    if (!this.options.paymentPolicy) throw new Error("A payment policy is required");
    if (!this.options.signer) throw new Error("An explicit signer is required");
    await this.getPaymentQuote(operation, request as CalculationRequest);
    const config: Config = {
      baseUrl: this.baseUrl,
      signer: this.options.signer,
      expectedNetwork: this.options.paymentPolicy.expectedNetwork,
      expectedAsset: this.options.paymentPolicy.expectedAsset.toLowerCase(),
      expectedPayTo: this.options.paymentPolicy.expectedPayTo.toLowerCase(),
      maxPayment: this.options.paymentPolicy.maxPayment,
      maxTotalSpend: this.options.paymentPolicy.maxTotalSpend,
      expectedAssetSymbol: this.options.paymentPolicy.expectedAssetSymbol,
      expectedDecimals: this.options.paymentPolicy.expectedDecimals,
      expectedEip712Name: this.options.paymentPolicy.expectedEip712Name,
      expectedEip712Version: this.options.paymentPolicy.expectedEip712Version,
      maxAttempts: this.options.paymentPolicy.maxAttempts,
      ledgerPath: "",
      reportPath: "",
      logLevel: "silent",
    } as Config;
    return paidPost(config, operationPaths[operation], request, this.budget);
  }

  private async getJson(path: string): Promise<unknown> {
    const response = await fetch(new URL(path, this.baseUrl), {
      headers: { accept: "application/json" },
      redirect: "error",
    });
    if (!response.ok) throw new Error(`${path} failed: ${response.status}`);
    return response.json();
  }

  private assertMetadata(info: Record<string, unknown>, policy: PaymentPolicy) {
    const expected: Array<[string, unknown]> = [
      ["network", policy.expectedNetwork],
      ["asset", policy.expectedAsset],
      ["assetSymbol", policy.expectedAssetSymbol],
      ["assetDecimals", policy.expectedDecimals],
      ["eip712Name", policy.expectedEip712Name],
      ["eip712Version", policy.expectedEip712Version],
    ];
    for (const [field, value] of expected) {
      const actual = field === "asset" ? String(info[field]).toLowerCase() : info[field];
      const wanted = field === "asset" ? String(value).toLowerCase() : value;
      if (actual !== wanted) throw new Error(`Unexpected payment metadata: ${field}`);
    }
  }
}
