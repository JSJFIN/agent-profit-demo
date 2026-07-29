import SwaggerParser from "@apidevtools/swagger-parser";
import { Ajv2020 } from "ajv/dist/2020.js";
import * as addFormatsModule from "ajv-formats";
import type { EconomicEvent } from "../types.js";
type Doc = Record<string, any>;
export class PublicContracts {
  document!: Doc;
  private ajv = new Ajv2020({ strict: false, allErrors: true });
  constructor(readonly baseUrl: string) {
    const addFormats = (addFormatsModule as unknown as { default: (ajv: Ajv2020) => void }).default;
    addFormats(this.ajv);
  }
  async discover() {
    const res = await fetch(`${this.baseUrl}/openapi.json`, { redirect: "error" });
    if (!res.ok) throw new Error(`OpenAPI discovery failed: ${res.status}`);
    this.document = (await res.json()) as Doc;
    await SwaggerParser.validate(this.document as any);
    return this.document;
  }
  schemaFor(path: string, status = "200", method = "post") {
    const op = this.document.paths[path][method];
    return op.responses[status].content["application/json"].schema;
  }
  validateRequest(path: string, body: unknown) {
    const schema = this.document.paths[path].post.requestBody.content["application/json"].schema;
    return this.validate(schema, body, "request");
  }
  validateResponse(path: string, body: unknown) {
    return this.validate(this.schemaFor(path), body, "response");
  }
  validateEvents(events: EconomicEvent[]) {
    const ref = { type: "array", items: { $ref: "#/components/schemas/EconomicEvent" } };
    return this.validate(ref, events, "events");
  }
  private validate(schema: unknown, value: unknown, label: string) {
    const components = structuredClone(this.document.components);
    const removeNestedIds = (node: unknown): void => {
      if (!node || typeof node !== "object") return;
      delete (node as Record<string, unknown>)["$id"];
      for (const child of Object.values(node as Record<string, unknown>)) removeNestedIds(child);
    };
    removeNestedIds(components);
    const full = {
      $schema: "https://json-schema.org/draft/2020-12/schema",
      ...(schema as Record<string, unknown>),
      components,
    };
    const validate = this.ajv.compile(full);
    if (!validate(value))
      throw new Error(`${label} violates public OpenAPI: ${this.ajv.errorsText(validate.errors)}`);
    return true;
  }
}
