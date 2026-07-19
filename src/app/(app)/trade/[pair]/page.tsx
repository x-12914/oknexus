import { TradeWorkspace } from "@/components/trade/TradeWorkspace";

export default async function TradePairPage(
  props: PageProps<"/trade/[pair]">,
) {
  const { pair } = await props.params;
  return <TradeWorkspace pair={pair.toUpperCase()} />;
}
