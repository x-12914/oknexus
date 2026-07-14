// Runs on the VPS from /home/opt/oknexus. Hardens the cron script to extract
// only CRON_SECRET (not source the whole .env), then triggers one cron pass and
// prints the result — proving the scanner talks to real Sepolia.
import { readFileSync, writeFileSync, chmodSync } from "node:fs";

const env = readFileSync(".env", "utf8");
const secret = (env.match(/^CRON_SECRET="?([^"\n]+)/m) || [])[1];
if (!secret) {
  console.log("NO_SECRET");
  process.exit(1);
}

const cron = `#!/usr/bin/env bash
SECRET=$(grep -E '^CRON_SECRET=' /home/opt/oknexus/.env | head -1 | cut -d= -f2- | tr -d '"')
curl -s -X POST -H "Authorization: Bearer $SECRET" http://127.0.0.1:3000/api/custody/cron >/dev/null 2>&1
`;
writeFileSync("/home/opt/oknexus/custody-cron.sh", cron);
chmodSync("/home/opt/oknexus/custody-cron.sh", 0o755);

const r = await fetch("http://127.0.0.1:3000/api/custody/cron", {
  method: "POST",
  headers: { authorization: "Bearer " + secret },
});
console.log("STATUS", r.status);
console.log(await r.text());
