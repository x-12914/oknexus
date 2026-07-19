export function pairToSymbol(pair: string): string {
  return pair.replace("-", "/").toUpperCase();
}

export function symbolToPair(symbol: string): string {
  return symbol.replace("/", "-");
}
