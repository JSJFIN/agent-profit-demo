import { readFile, writeFile, mkdir } from "node:fs/promises";
import { dirname } from "node:path";
import type { EconomicEvent } from "../types.js";
export class EventStore {
  constructor(readonly path: string) {}
  async write(events: EconomicEvent[]) {
    await mkdir(dirname(this.path), { recursive: true });
    await writeFile(
      this.path,
      JSON.stringify(
        { synthetic: true, scenario: "Autonomous Research Brief Service", events },
        null,
        2,
      ) + "\n",
      { mode: 0o600 },
    );
  }
  async read(): Promise<EconomicEvent[]> {
    const data = JSON.parse(await readFile(this.path, "utf8")) as { events: EconomicEvent[] };
    return data.events;
  }
}
export function assertUniqueExternalIds(events: EconomicEvent[]) {
  const seen = new Set<string>();
  for (const e of events) {
    if (seen.has(e.externalId)) throw new Error(`Duplicate externalId: ${e.externalId}`);
    seen.add(e.externalId);
  }
}
