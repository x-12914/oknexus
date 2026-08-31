import { Landmark } from "lucide-react";
import { redirect } from "next/navigation";
import { sessionUserId } from "@/lib/auth";
import { FeaturePreview } from "@/components/preview/FeaturePreview";

export const metadata = { title: "Institutional Services · OKNexus" };

export default async function InstitutionalPage() {
  if (!(await sessionUserId())) redirect("/login");
  return (
    <FeaturePreview
      eyebrow="Coming soon"
      title="Institutional Services"
      icon={Landmark}
      lede="Dedicated infrastructure for desks, funds and businesses trading at size — deeper liquidity, direct settlement and a named point of contact."
      steps={[
        { title: "Onboard as an entity", body: "Business verification, multiple users under one account, and role-based permissions for your team." },
        { title: "Trade at size", body: "Block execution through the OTC desk with quoted pricing, so large orders don't move the book against you." },
        { title: "Settle and report", body: "Direct settlement, dedicated support, and statements suitable for your accountants and auditors." },
      ]}
      ctaLabel="Speak to us about institutional access"
      note="Institutional onboarding isn't open yet. The OTC desk is live today and handles larger trades in the meantime."
    />
  );
}
