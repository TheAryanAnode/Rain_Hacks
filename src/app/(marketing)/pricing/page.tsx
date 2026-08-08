export default function Pricing() {
  return (
    <main className="mx-auto max-w-4xl px-6 py-24">
      <p className="wp-eyebrow">Pricing</p>
      <h1 className="font-display mt-4 text-5xl font-semibold">Wayport is free to plan.</h1>
      <p className="mt-4 text-text-secondary text-lg">Premium unlocks autonomous monitoring, voice, rewards optimization, and Travel DNA memory.</p>

      <div className="mt-12 grid gap-6 md:grid-cols-2">
        <Tier name="Explorer" price="$0" features={[
          "Unlimited trip plans",
          "Travel Graph",
          "Local discovery",
          "Beautiful command center",
        ]} />
        <Tier
          name="Wayfarer"
          price="$10/month"
          highlight
          features={[
            "Autonomous monitoring & replans",
            "Voice agent (hotel calls)",
            "Rewards optimization",
            "Travel DNA + memory",
            "Sandbox scenarios",
            "Priority support",
          ]}
        />
      </div>
    </main>
  );
}

function Tier({ name, price, features, highlight }: { name: string; price: string; features: string[]; highlight?: boolean }) {
  return (
    <div className={`rounded-2xl p-8 ${highlight ? "border border-lavender/40 bg-gradient-to-b from-lavender/10 to-transparent" : "wp-glass"}`}>
      <p className="wp-eyebrow">{name}</p>
      <p className="font-display mt-4 text-4xl">{price}</p>
      <ul className="mt-6 space-y-2 text-text-secondary">
        {features.map((f) => (
          <li key={f} className="flex gap-3">
            <span className="text-ok">✓</span>
            <span>{f}</span>
          </li>
        ))}
      </ul>
    </div>
  );
}
