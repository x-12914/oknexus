import { Rocket } from "lucide-react";
import { redirect } from "next/navigation";
import { sessionUserId } from "@/lib/auth";
import { FeaturePreview } from "@/components/preview/FeaturePreview";

export const metadata = { title: "Launchpad · OKNexus" };

export default async function LaunchpadPage() {
  if (!(await sessionUserId())) redirect("/login");
  return (
    <FeaturePreview
      eyebrow="Coming soon"
      title="Launchpad"
      icon={Rocket}
      lede="Early access to new token listings, and a route to market for projects that want to launch on OKNexus."
      steps={[
        { title: "Projects apply", body: "Teams submit their token, documentation and allocation plan for review before anything is listed." },
        { title: "Subscribe with your balance", body: "Committed funds are held aside for the sale window, and returned in full if the sale doesn't complete." },
        { title: "Allocation and listing", body: "Tokens are distributed to subscribers and the pair opens for trading on the exchange." },
      ]}
      ctaLabel="No sales are open"
      note="Token sales carry regulatory obligations that differ by country. Nothing will be offered here until that is settled."
    />
  );
}
