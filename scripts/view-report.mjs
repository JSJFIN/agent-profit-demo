import { createServer } from "node:http";
import { readFile } from "node:fs/promises";
import { resolve } from "node:path";
const root = resolve("artifacts");
createServer(async (req, res) => {
  try {
    const name = req.url === "/" ? "autonomous-agent-profit-report.html" : req.url.slice(1);
    if (name.includes("..")) throw new Error();
    const data = await readFile(resolve(root, name));
    res.setHeader(
      "content-type",
      name.endsWith(".html") ? "text/html; charset=utf-8" : "application/json",
    );
    res.end(data);
  } catch {
    res.statusCode = 404;
    res.end("Not found");
  }
}).listen(4173, "127.0.0.1", () => console.log("http://127.0.0.1:4173"));
