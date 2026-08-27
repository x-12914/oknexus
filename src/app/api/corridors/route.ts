import { listCorridors } from "@/lib/ramp/corridors";

/** Public: which payment corridors OKNexus reaches. */
export async function GET() {
  try {
    return Response.json({ corridors: await listCorridors() });
  } catch {
    // The dashboard strip hides itself on an empty list rather than erroring.
    return Response.json({ corridors: [] });
  }
}
