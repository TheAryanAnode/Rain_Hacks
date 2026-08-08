import Link from "next/link";
import { ChevronLeft } from "lucide-react";
import NewTripForm from "@/components/app/program/NewTripForm";

export default function NewTripPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <Link
        href="/app/trips"
        className="inline-flex items-center gap-1.5 text-sm text-text-tertiary transition hover:text-text-secondary"
      >
        <ChevronLeft size={15} /> Trips
      </Link>

      <header>
        <span className="wp-eyebrow">New trip</span>
        <h1 className="font-display mt-2 text-3xl font-semibold tracking-tight">
          Where are you going, and from where?
        </h1>
        <p className="mt-2 text-text-secondary">
          Origin and start date are required — flights can&apos;t be priced without them,
          and every itinerary time is anchored to the start date.
        </p>
      </header>

      <NewTripForm />
    </div>
  );
}
