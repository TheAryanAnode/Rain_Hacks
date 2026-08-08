import ChatClient from "@/components/app/ChatClient";
import PageAsciiHero from "@/components/app/PageAsciiHero";

export default function Concierge() {
  return (
    <div className="mx-auto max-w-3xl space-y-6">
      <PageAsciiHero
        variant="concierge"
        eyebrow="Trip maker"
        title="AI Concierge"
        subtitle="Tell WAYPORT what you need. The Orchestrator plans into your Travel Graph."
      />

      <div className="wp-card min-h-[480px] rounded-3xl p-6">
        <ChatClient />
      </div>
    </div>
  );
}
