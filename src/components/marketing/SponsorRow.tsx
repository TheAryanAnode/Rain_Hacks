export default function SponsorRow() {
  const names = ["Stay22", "Tavily", "ElevenLabs", "Amadeus", "Viator", "Rove"];
  return (
    <div className="wp-glass rounded-3xl px-8 py-10 text-center">
      <p className="wp-eyebrow mb-6">Powered by the best travel infrastructure</p>
      <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-6 gap-6 items-center justify-items-center">
        {names.map((n) => (
          <span key={n} className="grayscale opacity-60 hover:opacity-100 hover:grayscale-0 transition font-display text-lg tracking-wide">
            {n}
          </span>
        ))}
      </div>
      <div className="mt-8 grid gap-3 text-sm text-text-secondary md:grid-cols-3">
        <div>Stay22 · live hotel pricing + affiliate booking</div>
        <div>Tavily · real-time travel intelligence search</div>
        <div>ElevenLabs · voice agents that call hotels</div>
      </div>
    </div>
  );
}
