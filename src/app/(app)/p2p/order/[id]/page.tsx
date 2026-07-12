import { OrderView } from "@/components/p2p/OrderView";

export default async function P2POrderPage({
  params,
}: PageProps<"/p2p/order/[id]">) {
  const { id } = await params;
  return (
    <div className="h-full overflow-y-auto">
      <OrderView orderId={id} />
    </div>
  );
}
