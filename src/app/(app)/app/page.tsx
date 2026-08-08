import Link from "next/link";
import { requireUserId } from "@/server/auth";
import { TravelGraph } from "@/lib/graph/service";
import { isDemoMode } from "@/lib/demo";
import WayportMapOS from "@/components/map/WayportMapOS";

export default async function CommandCenter() {
  const userId = await requireUserId();
  let trips: any[] = [];
  try {
    trips = await new TravelGraph(userId).listTrips();
  } catch {
    trips = [];
  }
  const active = trips.find((t) => t.status === "ACTIVE") ?? trips[0];

  if (!active) {
    return (
      <div className="flex h-full min-h-[70vh] items-center justify-center p-10">
        <div className="wp-glass max-w-lg rounded-3xl p-10 text-center">
          {isDemoMode() && (
            <p className="mb-4 text-xs text-text-tertiary">Demo mode — graph runs in-memory</p>
          )}
          <h1 className="font-display text-3xl">Command Center</h1>
          <p className="mt-3 text-text-secondary">Plan a trip to open the live map OS over your Travel Graph.</p>
          <Link href="/app/concierge" className="wp-cta mt-6 inline-flex px-6 py-3">
            Start with Concierge
          </Link>
        </div>
      </div>
    );
  }

  return (
    <WayportMapOS
      tripId={active.id}
      tripTitle={active.title}
      destination={active.destination}
    />
  );
}
