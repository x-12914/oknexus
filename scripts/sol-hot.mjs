import { mnemonicToSeedSync } from "bip39";
import { derivePath } from "ed25519-hd-key";
import { Keypair } from "@solana/web3.js";
import { readFileSync } from "fs";

const m = readFileSync(".env", "utf8").match(/CUSTODY_MNEMONIC="?([^"\n]+)/)[1];
const seed = mnemonicToSeedSync(m, "");
const { key } = derivePath("m/44'/501'/0'/0'", seed.toString("hex"));
console.log("SOL_HOT", Keypair.fromSeed(key).publicKey.toBase58());
