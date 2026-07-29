import openapiTS, { COMMENT_HEADER, astToString } from "openapi-typescript";
import { mkdir, writeFile } from "node:fs/promises";

const baseUrl = (process.env.PROFIT_API_BASE_URL ?? "https://x402.ailabra.org").replace(/\/$/, "");
const response = await fetch(`${baseUrl}/openapi.json`, {
  headers: { accept: "application/json" },
  redirect: "error",
});
if (!response.ok) throw new Error(`OpenAPI download failed: HTTP ${response.status}`);
const document = await response.json();
const output = `${COMMENT_HEADER}${astToString(await openapiTS(document))}`;
await mkdir("src/generated", { recursive: true });
await writeFile("src/generated/openapi.ts", output);
console.log(`Generated public types from ${baseUrl}/openapi.json`);
