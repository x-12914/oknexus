import { redirect } from "next/navigation";

// Instant Swap was merged into the unified Convert surface.
export default function SwapPage() {
  redirect("/convert");
}
