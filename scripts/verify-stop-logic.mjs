// Unit test of stop-order trigger + execution decisions (mirrors orders.ts).
function triggered(side, last, trig) {
  return side === "SELL" ? last <= trig : last >= trig;
}
function stopExecution(type, side, limit, ask, bid) {
  if (type === "STOP") return { kind: "filled", price: side === "BUY" ? ask : bid };
  const marketable = side === "BUY" ? limit >= ask : limit <= bid;
  return marketable ? { kind: "filled", price: limit } : { kind: "rested" };
}
const eq = (a, b) => JSON.stringify(a) === JSON.stringify(b);

console.log("SELL_TRIG_ON_FALL ", triggered("SELL", 99, 100) === true, "(price ≤ trigger)");
console.log("SELL_NOT_ON_RISE  ", triggered("SELL", 101, 100) === false);
console.log("SELL_INCLUSIVE    ", triggered("SELL", 100, 100) === true);
console.log("BUY_TRIG_ON_RISE  ", triggered("BUY", 101, 100) === true, "(price ≥ trigger)");
console.log("BUY_NOT_ON_FALL   ", triggered("BUY", 99, 100) === false);
console.log("STOPMKT_SELL@BID  ", stopExecution("STOP", "SELL", null, 101, 99).price === 99);
console.log("STOPMKT_BUY@ASK   ", stopExecution("STOP", "BUY", null, 101, 99).price === 101);
console.log("STOPLIM_SELL_FILL ", eq(stopExecution("STOP_LIMIT", "SELL", 98, 101, 99), { kind: "filled", price: 98 }), "(limit 98 ≤ bid 99)");
console.log("STOPLIM_SELL_REST ", stopExecution("STOP_LIMIT", "SELL", 100, 101, 99).kind === "rested", "(limit 100 > bid 99)");
console.log("STOPLIM_BUY_FILL  ", stopExecution("STOP_LIMIT", "BUY", 102, 101, 99).kind === "filled", "(limit 102 ≥ ask 101)");
console.log("STOPLIM_BUY_REST  ", stopExecution("STOP_LIMIT", "BUY", 100, 101, 99).kind === "rested", "(limit 100 < ask 101)");
