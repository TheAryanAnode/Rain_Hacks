import { requireUserId } from "@/server/auth";
import { getOrCreateProfile } from "@/lib/demo/store";
import { TravelGraph } from "@/lib/graph/service";
import PageAsciiHero from "@/components/app/PageAsciiHero";
import { groupCompromiseScore } from "@/lib/decision/engine";

export default async function TravelersPage() {
  const userId = await requireUserId();
  const profile = getOrCreateProfile(userId);
  const trips = await new TravelGraph(userId).listTrips();
  const dna: any = profile.dna;

  const party = [
    {
      name: profile.name,
      role: "Primary",
      email: profile.email,
      airport: profile.homeAirport,
      weights: {
        food: (dna?.food?.streetFood ?? 5) / 10,
        walking: (dna?.physical?.walkingTolerance ?? 5) / 10,
        museums: (dna?.social?.touristAttractions ?? 5) / 10,
        budget: (dna?.money?.budgetSensitivity ?? 5) / 10,
        nightlife: (dna?.social?.nightlife ?? 5) / 10,
      },
    },
    {
      name: "Guest traveler",
      role: "Companion",
      email: "guest@wayport.demo",
      airport: profile.homeAirport,
      weights: { food: 0.4, walking: 0.3, museums: 0.9, budget: 0.5, nightlife: 0.2 },
    },
    {
      name: "Budget friend",
      role: "Companion",
      email: "budget@wayport.demo",
      airport: profile.homeAirport,
      weights: { food: 0.5, walking: 0.6, museums: 0.3, budget: 0.95, nightlife: 0.1 },
    },
  ];

  const optionA = { food: 0.85, walking: 0.4, museums: 0.7, budget: 0.55, nightlife: 0.3 };
  const optionB = { food: 0.5, walking: 0.8, museums: 0.55, budget: 0.9, nightlife: 0.2 };
  const scoreA = groupCompromiseScore(party, optionA);
  const scoreB = groupCompromiseScore(party, optionB);
  const winner = scoreA.score >= scoreB.score ? "A · Food-forward walkable core" : "B · Budget + museums";

  return (
    <div className="space-y-8">
      <PageAsciiHero
        variant="travelers"
        eyebrow="You"
        title="Travelers"
        subtitle="Group intelligence — maximize combined satisfaction, not endless debate."
      />

      <div className="grid gap-4 md:grid-cols-3">
        {party.map((p) => (
          <div key={p.email} className="wp-glass rounded-2xl p-6">
            <div className="wp-eyebrow">{p.role}</div>
            <h2 className="mt-2 text-xl font-medium">{p.name}</h2>
            <p className="mt-1 text-sm text-text-secondary">{p.email}</p>
            <ul className="mt-3 space-y-1 text-xs text-text-tertiary">
              {Object.entries(p.weights).map(([k, v]) => (
                <li key={k}>
                  {k} · {Math.round(v * 100)}
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>

      <div className="wp-glass rounded-2xl p-6">
        <div className="wp-eyebrow">Group compromise</div>
        <p className="mt-2 text-sm text-text-secondary">
          Winner: <span className="text-ember">{winner}</span> (score{" "}
          {Math.round(Math.max(scoreA.score, scoreB.score) * 100)} · fairness{" "}
          {Math.round(Math.max(scoreA.fairness, scoreB.fairness) * 100)})
        </p>
        <div className="mt-4 grid gap-3 md:grid-cols-2 text-sm">
          <div className="rounded-xl border border-white/10 p-4">
            <div className="font-medium">Option A</div>
            {scoreA.detail.map((d) => (
              <div key={d.name} className="text-text-tertiary text-xs">
                {d.name}: {Math.round(d.satisfaction * 100)}
              </div>
            ))}
          </div>
          <div className="rounded-xl border border-white/10 p-4">
            <div className="font-medium">Option B</div>
            {scoreB.detail.map((d) => (
              <div key={d.name} className="text-text-tertiary text-xs">
                {d.name}: {Math.round(d.satisfaction * 100)}
              </div>
            ))}
          </div>
        </div>
      </div>

      <div className="wp-glass rounded-2xl p-6">
        <div className="wp-eyebrow">Shared trips</div>
        <ul className="mt-3 space-y-2 text-sm text-text-secondary">
          {trips.map((t: any) => (
            <li key={t.id}>
              {t.title} · {t.destination}
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
