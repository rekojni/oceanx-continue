import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
const secrets = [process.env.SUPABASE_SECRET_KEY, process.env.SUPABASE_SERVICE_ROLE_KEY].filter(
  Boolean,
);
if (!secrets.length)
  throw new Error("Load .env.local so the actual server key can be checked without printing it.");
function scan(dir) {
  for (const entry of readdirSync(dir, { withFileTypes: true })) {
    const path = join(dir, entry.name);
    if (entry.isDirectory()) scan(path);
    else {
      const bytes = readFileSync(path);
      if (secrets.some((key) => bytes.includes(Buffer.from(key))))
        throw new Error("A server credential was found in the browser output.");
    }
  }
}
scan(".output/public");
console.log("Browser output contains no configured server credentials.");
