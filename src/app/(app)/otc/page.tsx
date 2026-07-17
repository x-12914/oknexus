import { redirect } from "next/navigation";

// The OTC desk was merged into the unified Convert surface (large orders auto-route to it).
export default function OtcPage() {
  redirect("/convert");
}
