import { execFileSync } from "node:child_process";

const output = execFileSync("npm", ["pack", "--dry-run", "--json", "--ignore-scripts"], {
  encoding: "utf8",
});
const parsed = JSON.parse(output);
const pack = Array.isArray(parsed) ? parsed[0] : parsed;
if (!pack || !Array.isArray(pack.files)) {
  throw new Error("npm pack did not return a file manifest");
}

const files = pack.files.map(({ path }) => path);
const forbidden = files.filter(
  (path) =>
    path.endsWith(".map") ||
    (path.endsWith(".ts") && !path.endsWith(".d.ts")) ||
    path.startsWith("src/") ||
    path.startsWith("tests/") ||
    path.startsWith("artifacts/") ||
    path.startsWith("scripts/") ||
    path.startsWith(".github/") ||
    path.includes("server") ||
    path.includes("database") ||
    path.includes("docker") ||
    path.includes(".env"),
);

if (forbidden.length > 0) {
  console.error("Forbidden files in npm package:", forbidden.join(", "));
  process.exit(1);
}

const required = [
  "package.json",
  "README.md",
  "LICENSE",
  "dist/index.js",
  "dist/index.d.ts",
  "dist/cli.js",
];
const missing = required.filter((path) => !files.includes(path));
if (missing.length > 0) {
  console.error("Required package files missing:", missing.join(", "));
  process.exit(1);
}

console.log(`Package audit passed (${files.length} files, ${pack.size} bytes packed)`);
