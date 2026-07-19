import { redirect } from "next/navigation";

// Convert was split back into separate Instant Swap (/swap) and OTC Desk (/otc) surfaces.
export default function ConvertPage() {
  redirect("/swap");
}
