import { LedgerType } from "@prisma/client";
import { withLedger, credit, debit } from "@/lib/ledger";
import type { SwapResult, RampResult, OtcResult } from "@/lib/exchange/types";

// Settlement for the three "quote → execute" features. Each records a history
// row and moves wallet balances atomically through the ledger. The connector
// has already validated & consumed the quote by the time we get here; if a
// balance guard fails the whole $transaction rolls back (nothing is persisted)
// and an InsufficientBalanceError propagates to the route.
//
// Model: crypto + USDT are on-ledger wallets; fiat (USD/EUR/GBP/NGN) is
// off-ledger — it moves over external card/bank rails, not the wallet system.

// USD settles 1:1 against the USDT wallet (there is no separate USD balance).
const USD_WALLET = "USDT";

export async function settleSwap(userId: string, r: SwapResult): Promise<void> {
  await withLedger(async (tx) => {
    const row = await tx.swapTx.create({
      data: {
        userId,
        fromSymbol: r.fromSymbol,
        toSymbol: r.toSymbol,
        fromAmount: r.fromAmount,
        toAmount: r.toAmount,
        rate: r.rate,
        feeSymbol: r.toSymbol,
        status: r.status,
      },
    });
    const ref = {
      type: LedgerType.SWAP,
      refId: row.id,
      memo: `Swap ${r.fromSymbol} → ${r.toSymbol}`,
    };
    await debit(tx, userId, r.fromSymbol, r.fromAmount, ref);
    await credit(tx, userId, r.toSymbol, r.toAmount, ref);
  });
}

export async function settleRamp(userId: string, r: RampResult): Promise<void> {
  await withLedger(async (tx) => {
    const row = await tx.rampTx.create({
      data: {
        userId,
        side: r.side,
        fiatCode: r.fiatCode,
        cryptoSymbol: r.cryptoSymbol,
        paymentMethod: r.paymentMethodId,
        fiatAmount: r.fiatAmount,
        totalFiat: r.totalFiat,
        cryptoAmount: r.cryptoAmount,
        status: r.status,
      },
    });
    const ref = {
      type: LedgerType.RAMP,
      refId: row.id,
      memo: `Ramp ${r.side} ${r.cryptoSymbol}`,
    };
    if (r.side === "BUY") {
      // Fiat is charged off-ledger. Crypto lands once the payment settles —
      // instant methods credit now; a PENDING bank transfer credits later.
      if (r.status === "COMPLETED") {
        await credit(tx, userId, r.cryptoSymbol, r.cryptoAmount, ref);
      }
    } else {
      // Selling crypto: debit it now; fiat proceeds pay out off-ledger.
      await debit(tx, userId, r.cryptoSymbol, r.cryptoAmount, ref);
    }
  });
}

export async function settleOtc(userId: string, r: OtcResult): Promise<void> {
  await withLedger(async (tx) => {
    const row = await tx.otcTrade.create({
      data: {
        userId,
        side: r.side,
        baseSymbol: r.baseSymbol,
        settleCurrency: r.settleCurrency,
        baseAmount: r.baseAmount,
        price: r.price,
        totalCost: r.totalCost,
        status: r.status,
      },
    });
    const ref = {
      type: LedgerType.OTC,
      refId: row.id,
      memo: `OTC ${r.side} ${r.baseSymbol}`,
    };
    if (r.side === "BUY") {
      await debit(tx, userId, USD_WALLET, r.totalCost, ref);
      await credit(tx, userId, r.baseSymbol, r.baseAmount, ref);
    } else {
      await debit(tx, userId, r.baseSymbol, r.baseAmount, ref);
      await credit(tx, userId, USD_WALLET, r.totalCost, ref);
    }
  });
}
