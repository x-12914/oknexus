// Run on the VPS: cd /home/opt/oknexus && set -a && . ./.env && set +a && node scripts/verify-email-flow.mjs
// Registers a user via the API (proving signup still works with the email hook),
// then builds a matching verification token and confirms the verify route sets emailVerified.
import crypto from "crypto";
import pg from "pg";

const DB = (process.env.DATABASE_URL || "").replace(/[?].*/, "");
const SECRET = process.env.AUTH_SECRET || process.env.NEXTAUTH_SECRET || "insecure-dev-secret";
const BASE = "http://127.0.0.1:3000";
const email = `emv_${Date.now()}@nexus.test`;

const reg = await fetch(`${BASE}/api/auth/register`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ email, password: "TestPass12345", name: "EmV Bot" }),
});
console.log("REGISTER_HTTP", reg.status);

const client = new pg.Client({ connectionString: DB });
await client.connect();
const { rows } = await client.query('SELECT id, "emailVerified" FROM "User" WHERE email=$1', [email]);
const u = rows[0];
console.log("USER", u.id, "verifiedBefore=", u.emailVerified);

const payload = `${u.id}:${Date.now() + 1000 * 60 * 60 * 24}`;
const sig = crypto.createHmac("sha256", SECRET).update(payload).digest("base64url");
const token = Buffer.from(payload).toString("base64url") + "." + sig;

const res = await fetch(`${BASE}/api/auth/verify-email?token=${encodeURIComponent(token)}`, { redirect: "manual" });
console.log("VERIFY_HTTP", res.status, "location=", res.headers.get("location"));

const bad = await fetch(`${BASE}/api/auth/verify-email?token=tampered.xyz`, { redirect: "manual" });
console.log("TAMPERED_HTTP", bad.status, "location=", bad.headers.get("location"));

const after = await client.query('SELECT "emailVerified" FROM "User" WHERE id=$1', [u.id]);
console.log("verifiedAfter=", after.rows[0].emailVerified);
await client.end();
