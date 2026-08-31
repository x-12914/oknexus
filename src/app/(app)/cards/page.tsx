import { CreditCard } from "lucide-react";
import { redirect } from "next/navigation";
import { sessionUserId } from "@/lib/auth";
import { FeaturePreview } from "@/components/preview/FeaturePreview";

export const metadata = { title: "Crypto Cards · OKNexus" };

export default async function CardsPage() {
  if (!(await sessionUserId())) redirect("/login");
  return (
    <FeaturePreview
      eyebrow="Coming soon"
      title="Crypto Cards"
      icon={CreditCard}
      lede="Spend your balance anywhere cards are accepted, online or in person, without cashing out to a bank account first."
      steps={[
        { title: "Order a card", body: "A virtual card issues instantly for online spending; a physical card can be posted to you." },
        { title: "Choose what funds it", body: "Pick which asset the card draws from. It converts at the point of sale, so you keep holding until you spend." },
        { title: "Control it from here", body: "Freeze, set limits, or change the funding asset at any time. Every transaction appears in your activity." },
      ]}
      ctaLabel="Cards aren't being issued yet"
      note="Card issuing requires a licensed partner and regulatory approval. We'll open a waitlist once that's in place rather than take orders we can't fill."
    />
  );
}
