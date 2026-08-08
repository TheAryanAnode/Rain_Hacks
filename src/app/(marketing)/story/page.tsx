import Link from "next/link";

export default function Story() {
  return (
    <main className="mx-auto max-w-3xl px-6 py-24">
      <p className="wp-eyebrow">The problem</p>
      <h1 className="font-display mt-4 text-5xl font-semibold">Travel is still a collection of disconnected apps.</h1>
      <p className="mt-6 text-text-secondary text-lg leading-relaxed">
        Flights live in one tab, hotels in another, reservations in a third — and when something breaks,
        the traveler becomes the integration layer. WAYPORT is the operating system that replaces that glue.
      </p>

      <section className="mt-12 wp-glass rounded-2xl p-8 space-y-3">
        <p className="wp-eyebrow">The pitch</p>
        <p>WAYPORT understands the traveler, builds a live model of the trip, searches the world for the best options, optimizes the itinerary around real constraints, books through partners, talks to hotels for you, monitors the trip in real time, and replans automatically when reality changes.</p>
      </section>

      <div className="mt-12">
        <Link className="wp-cta px-6 py-3" href="/sign-up">Start a trip</Link>
      </div>
    </main>
  );
}
