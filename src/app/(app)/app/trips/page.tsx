import Link from "next/link";
import { requireUserId } from "@/server/auth";
import { TravelGraph } from "@/lib/graph/service";
import { formatCurrency } from "@/lib/utils";
import PageAsciiHero from "@/components/app/PageAsciiHero";

export default async function TripsPage() {
  const userId = await requireUserId();
  const trips = await new TravelGraph(userId).listTrips();

  return (
    <div className="space-y-8">
      <PageAsciiHero
        variant="trips"
        eyebrow="Trip"
        title="Trips"
        subtitle="Every journey on your Travel Graph."
      />
      <div className="flex justify-end">
        <Link href="/app/concierge" className="wp-cta px-5 py-2.5 text-sm">
          + Plan with Concierge
        </Link>
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {trips.map((t: any) => (
          <Link key={t.id} href={`/app/trips/${t.id}`} className="wp-glass block rounded-2xl p-6 transition hover:border-ember/40">
            <div className="wp-eyebrow">{t.destination}</div>
            <h2 className="font-display mt-2 text-2xl">{t.title}</h2>
            <div className="mt-4 flex flex-wrap gap-3 text-xs text-text-tertiary">
              <span>{t._count?.items ?? t.items?.length ?? 0} items</span>
              <span>{t.status}</span>
              {t.budgets?.[0] && <span>{formatCurrency(Number(t.budgets[0].remaining))} left</span>}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
