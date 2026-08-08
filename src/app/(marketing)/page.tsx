import Link from "next/link";
import { Dunes } from "@/components/landscape/Dunes";
import TripCommandPreview from "@/components/marketing/TripCommandPreview";
import SponsorRow from "@/components/marketing/SponsorRow";
import { Nav } from "@/components/marketing/Nav";

export default function Landing() {
  return (
    <main className="relative flex-1 overflow-hidden">
      <Nav />
      {/* Hero */}
      <section className="relative mx-auto flex min-h-screen max-w-7xl flex-col items-center justify-center px-6 pt-24 pb-32 md:pt-0">
        <Dunes />
        <h1 className="font-display text-center text-5xl md:text-7xl lg:text-8xl font-semibold leading-[0.94] tracking-tight">
          You don&apos;t manage
          <br />
          your trip anymore.
        </h1>
        <p className="mt-8 max-w-2xl text-center text-lg md:text-xl text-text-secondary leading-relaxed">
          WAYPORT understands the traveler, maintains a live graph of the entire journey,
          searches and optimizes the world, and replans automatically when reality changes.
        </p>
        <div className="mt-10 flex flex-col sm:flex-row items-center gap-4">
          <Link href="/app" className="wp-cta px-8 py-4 text-base">
            Start a trip
          </Link>
          <Link href="/story" className="wp-cta-ghost px-8 py-4 text-base">
            Watch it think
          </Link>
        </div>

        <div className="mt-20 w-full max-w-4xl">
          <TripCommandPreview />
        </div>
      </section>

      {/* Trust */}
      <section className="relative z-10 mx-auto max-w-6xl px-6 pb-32">
        <SponsorRow />
      </section>

      <footer className="border-t border-white/10 bg-black/30 py-12 text-center text-sm text-text-tertiary">
        <div className="mx-auto max-w-6xl px-6">
          <p className="font-display tracking-[0.32em] text-xs text-white/60">WAYPORT</p>
          <p className="mt-3">You don&apos;t manage your trip anymore. WAYPORT does.</p>
        </div>
      </footer>
    </main>
  );
}
