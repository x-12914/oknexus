import { Gift } from "lucide-react";
import { redirect } from "next/navigation";
import { sessionUserId } from "@/lib/auth";
import { FeaturePreview } from "@/components/preview/FeaturePreview";

export const metadata = { title: "Gift Cards · OKNexus" };

export default async function GiftCardsPage() {
  if (!(await sessionUserId())) redirect("/login");
  return (
    <FeaturePreview
      eyebrow="Coming soon"
      title="Gift Card Marketplace"
      icon={Gift}
      lede="Buy and sell gift cards with other people on OKNexus, with the same escrow that protects every P2P trade."
      steps={[
        { title: "Browse or post", body: "Buy a card from a seller, or list one you're holding at a price you set." },
        { title: "Escrow holds the crypto", body: "The buyer's payment is locked before any card details change hands, so neither side has to go first." },
        { title: "Release once verified", body: "The buyer confirms the card balance and escrow releases. A dispute goes to a moderator, exactly as in P2P." },
      ]}
      ctaLabel="The marketplace isn't open yet"
    />
  );
}
