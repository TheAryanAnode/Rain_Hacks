import { requireUserId } from "@/server/auth";
import { getOrCreateProfile } from "@/lib/demo/store";
import DnaEditor from "@/components/app/DnaEditor";
import PageAsciiHero from "@/components/app/PageAsciiHero";

export default async function DnaPage() {
  const userId = await requireUserId();
  const profile = getOrCreateProfile(userId);

  return (
    <div className="space-y-8">
      <PageAsciiHero
        variant="dna"
        eyebrow="You"
        title="Travel DNA"
        subtitle="Preferences the Orchestrator reads before every plan."
      />
      <DnaEditor initial={profile.dna} />
    </div>
  );
}
