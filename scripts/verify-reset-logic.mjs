// Unit test of the password-reset token scheme (mirrors src/lib/password-reset.ts),
// proving round-trip, tamper-rejection, single-use-after-reset, and expiry — no DB/secret needed.
import crypto from "crypto";

const SECRET = "test-secret-abc";
const TTL_MS = 1000 * 60 * 30;

const sign = (userId, hash, exp) =>
  crypto.createHmac("sha256", SECRET).update(`${userId}:${hash}:${exp}`).digest("base64url");

const make = (userId, hash, exp = Date.now() + TTL_MS) =>
  `${Buffer.from(`${userId}:${exp}`).toString("base64url")}.${sign(userId, hash, exp)}`;

const read = (token, currentHash) => {
  const dot = token.indexOf(".");
  if (dot < 1) return null;
  let payload;
  try {
    payload = Buffer.from(token.slice(0, dot), "base64url").toString("utf8");
  } catch {
    return null;
  }
  const sig = token.slice(dot + 1);
  const [userId, expStr] = payload.split(":");
  const exp = Number(expStr);
  if (!userId || !Number.isFinite(exp) || Date.now() > exp) return null;
  const expected = sign(userId, currentHash, exp);
  const a = Buffer.from(sig);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !crypto.timingSafeEqual(a, b)) return null;
  return userId;
};

const OLD = "$2a$10$oldhashvalueoldhashvalue";
const NEW = "$2a$10$newhashafterthereset00";

const t = make("user_1", OLD);
console.log("VALID_ROUNDTRIP  ", read(t, OLD) === "user_1", "(expect true)");
console.log("TAMPERED_SIG     ", read(t.slice(0, -2) + "xx", OLD) === null, "(expect true)");
console.log("SINGLE_USE       ", read(t, NEW) === null, "(expect true — invalid once password changed)");
console.log("EXPIRED          ", read(make("user_1", OLD, Date.now() - 1000), OLD) === null, "(expect true)");
console.log("GARBAGE          ", read("not-a-token", OLD) === null, "(expect true)");
console.log("PER_USER         ", read(make("user_2", OLD), OLD) === "user_2", "(expect true)");
