import { Receipt } from "lucide-react";
import { redirect } from "next/navigation";
import { sessionUserId } from "@/lib/auth";
import { FeaturePreview } from "@/components/preview/FeaturePreview";

export const metadata = { title: "Bills Payment · OKNexus" };

export default async function BillsPage() {
  if (!(await sessionUserId())) redirect("/login");
  return (
    <FeaturePreview
      eyebrow="Coming soon"
      title="Bills Payment"
      icon={Receipt}
      lede="Pay for airtime, data, electricity and TV subscriptions straight from your crypto balance, without moving money to a bank first."
      steps={[
        { title: "Pick a biller", body: "Choose your network or utility provider and enter the account or phone number you're paying for." },
        { title: "See the exact cost", body: "We quote the naira amount and the crypto it converts to, with the rate locked while you confirm." },
        { title: "Pay from your balance", body: "The crypto leaves your wallet and the biller is credited. The receipt lands in your activity history like any other transaction." },
      ]}
      ctaLabel="Bill payments aren't available yet"
    />
  );
}
