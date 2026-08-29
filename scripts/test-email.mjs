/**
 * Prove transactional email actually delivers.
 *
 * Resend refuses every recipient except the account owner until a sending
 * domain is verified, and that refusal never reaches the user — a registration
 * email that is never delivered looks identical to one the user ignored. The
 * only way to know is to send one and look.
 *
 *   node scripts/test-email.mjs you@example.com
 *
 * Run from the app directory on the server, where .env lives.
 */
import { Resend } from "resend";
import fs from "node:fs";

const to = process.argv[2];
if (!to) {
  console.error("Usage: node scripts/test-email.mjs <recipient@example.com>");
  process.exit(1);
}

const env = Object.fromEntries(
  fs
    .readFileSync(".env", "utf8")
    .split("\n")
    .filter((l) => l.includes("="))
    .map((l) => [l.slice(0, l.indexOf("=")), l.slice(l.indexOf("=") + 1).replace(/^"|"$/g, "")]),
);

const key = env.RESEND_API_KEY;
if (!key) {
  console.error("RESEND_API_KEY is not set.");
  process.exit(1);
}
const from = env.EMAIL_FROM ?? "OKNexus <autoresponse@oknexusexchange.com>";
console.log("from:", from);
console.log("to  :", to);

const { data, error } = await new Resend(key).emails.send({
  from,
  to,
  subject: "OKNexus email delivery test",
  html: "<p>If you are reading this, transactional email works.</p>",
});

if (error) {
  console.error("\nFAILED:", error.message);
  console.error(
    "\nIf this mentions verifying a domain, that is the whole problem: add the DNS\n" +
      "records at resend.com/domains for oknexusexchange.com, then set EMAIL_FROM.",
  );
  process.exit(1);
}
console.log("\nSENT. id:", data?.id);
console.log("Check the inbox — and the spam folder, which matters for a new domain.");
