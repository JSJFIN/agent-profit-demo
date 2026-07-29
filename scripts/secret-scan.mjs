import { execFileSync } from "node:child_process";
const files = execFileSync("git", ["ls-files"], { encoding: "utf8" })
  .trim()
  .split("\n")
  .filter(Boolean);
const text = files
  .map((f) => {
    try {
      return execFileSync("git", ["show", `:${f}`], { encoding: "utf8" });
    } catch {
      return "";
    }
  })
  .join("\n");
const patterns = [
  /(?:PRIVATE_KEY|WALLET_KEY)\s*[=:]\s*0x[0-9a-fA-F]{64}/i,
  /(?:SEED_PHRASE|MNEMONIC)\s*[=:]\s*["'][a-z]+(?:\s+[a-z]+){11,23}["']/i,
  /payment-signature\s*:/i,
  /BEGIN (?:EC |RSA )?PRIVATE KEY/,
];
const hits = patterns.filter((p) => p.test(text.replace("0x...", "")));
if (hits.length) {
  console.error("Potential secret found");
  process.exit(1);
}
console.log("Tracked-file secret scan passed");
