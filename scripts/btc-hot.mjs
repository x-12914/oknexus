import * as bitcoin from "bitcoinjs-lib";
import BIP32Factory from "bip32";
import * as ecc from "tiny-secp256k1";
import { mnemonicToSeedSync } from "bip39";
import { readFileSync } from "fs";

bitcoin.initEccLib(ecc);
const bip32 = BIP32Factory(ecc);
const NETWORK = bitcoin.networks.testnet;

const m = readFileSync(".env", "utf8").match(/CUSTODY_MNEMONIC="?([^"\n]+)/)[1];
const seed = mnemonicToSeedSync(m, "");
const child = bip32.fromSeed(seed, NETWORK).derivePath("m/84'/1'/0'/0/0");
console.log("BTC_HOT", bitcoin.payments.p2wpkh({ pubkey: child.publicKey, network: NETWORK }).address);
