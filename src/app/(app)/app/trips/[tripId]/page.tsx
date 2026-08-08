import { requireUserId } from "@/server/auth";
import { TravelGraph } from "@/lib/graph/service";
import { demoStore, useMemoryGraph } from "@/lib/demo/store";
import { notFound } from "next/navigation";
import TripDetail from "@/components/app/TripDetail";

export default async function TripPage({ params }: { params: Promise<{ tripId: string }> }) {
  const userId = await requireUserId();
  const { tripId } = await params;
  const trip = await new TravelGraph(userId).getTrip({ tripId });
  if (!trip) notFound();
  const actions = useMemoryGraph() ? demoStore.listActions(userId, tripId) : [];
  const meta = useMemoryGraph() ? demoStore.getTripMeta(tripId) : {};
  return <TripDetail trip={trip as any} actions={actions as any} meta={meta} />;
}
