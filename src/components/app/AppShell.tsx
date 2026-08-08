"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import {
  LayoutGrid,
  MessageSquare,
  Map,
  Inbox,
  Ticket,
  Users,
  Wallet,
  Gift,
  Bell,
  Dna,
  Settings,
  Sparkles,
  Plane,
  Building2,
  UserRound,
  ChevronDown,
} from "lucide-react";
import SunsetPointerHost from "@/components/app/SunsetPointerHost";
import { useState } from "react";

type NavItem = { href: string; label: string; icon: React.ComponentType<{ size?: number; strokeWidth?: number; className?: string }> };
type NavGroup = { id: string; label: string; items: NavItem[] };

const GROUPS: NavGroup[] = [
  {
    id: "trip",
    label: "Trip",
    items: [
      { href: "/app", label: "Command Center", icon: LayoutGrid },
      { href: "/app/trips", label: "Trips", icon: Plane },
      { href: "/app/concierge", label: "AI Concierge", icon: MessageSquare },
    ],
  },
  {
    id: "live",
    label: "Live",
    items: [
      { href: "/app/explore", label: "Explore", icon: Map },
      { href: "/app/live", label: "Live Companion", icon: Sparkles },
      { href: "/app/inbox", label: "Travel Inbox", icon: Inbox },
      { href: "/app/alerts", label: "Alerts", icon: Bell },
      { href: "/app/wallet", label: "Travel Wallet", icon: Ticket },
    ],
  },
  {
    id: "you",
    label: "You",
    items: [
      { href: "/app/dna", label: "Travel DNA", icon: Dna },
      { href: "/app/autonomy", label: "Autonomy", icon: Settings },
      { href: "/app/money", label: "Money", icon: Wallet },
      { href: "/app/rewards", label: "Rewards", icon: Gift },
      { href: "/app/travelers", label: "Travelers", icon: Users },
    ],
  },
  {
    id: "studio",
    label: "Studio",
    items: [
      { href: "/app/sandbox", label: "Sandbox", icon: Sparkles },
      { href: "/app/eval", label: "Eval harness", icon: LayoutGrid },
      { href: "/app/advisor", label: "Advisor", icon: Users },
      { href: "/app/hospitality", label: "Hospitality", icon: Building2 },
    ],
  },
];

function isActive(pathname: string, href: string) {
  if (href === "/app") return pathname === "/app";
  return pathname === href || pathname.startsWith(href + "/");
}

export default function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const [open, setOpen] = useState<Record<string, boolean>>({
    trip: true,
    live: true,
    you: false,
    studio: false,
  });
  const activeGroup = GROUPS.find((g) => g.items.some((i) => isActive(pathname, i.href)))?.id;
  const mapMode = pathname === "/app";

  return (
    <div className="flex h-screen text-white">
      <aside className="sticky top-0 z-30 flex w-[272px] shrink-0 flex-col border-r border-white/10 bg-[#140e0c]/90 backdrop-blur-xl">
        <div className="flex items-center gap-3 border-b border-white/10 px-5 py-4">
          <span className="flex h-9 w-9 items-center justify-center rounded-[10px] bg-ember/15 ring-1 ring-ember/30">
            <WayMark />
          </span>
          <div>
            <div className="font-display text-sm tracking-[0.28em]">WAYPORT</div>
            <div className="text-[10px] uppercase tracking-[0.32em] text-text-tertiary">Travel OS</div>
          </div>
        </div>

        <nav className="flex-1 space-y-4 overflow-y-auto p-3">
          {GROUPS.map((group) => {
            const expanded = open[group.id] || activeGroup === group.id;
            return (
              <div key={group.id}>
                <button
                  type="button"
                  onClick={() => setOpen((o) => ({ ...o, [group.id]: !expanded }))}
                  className="mb-1 flex w-full items-center justify-between px-3 py-1.5 text-[10px] uppercase tracking-[0.22em] text-text-tertiary hover:text-text-secondary"
                >
                  {group.label}
                  <ChevronDown size={12} className={cn("transition", expanded ? "rotate-0" : "-rotate-90")} />
                </button>
                {expanded && (
                  <div className="space-y-0.5">
                    {group.items.map(({ href, label, icon: Icon }) => {
                      const active = isActive(pathname, href);
                      return (
                        <Link
                          key={href}
                          href={href}
                          className={cn(
                            "flex items-center gap-3 rounded-lg px-3 py-2 text-sm transition",
                            active ? "bg-white/10 text-white" : "text-text-secondary hover:bg-white/5 hover:text-white",
                          )}
                        >
                          <Icon size={16} strokeWidth={1.5} className={active ? "text-ember" : ""} />
                          {label}
                        </Link>
                      );
                    })}
                  </div>
                )}
              </div>
            );
          })}
        </nav>

        <div className="border-t border-white/10 p-3">
          <Link
            href="/app/account"
            className={cn(
              "flex items-center gap-3 rounded-xl px-3 py-3 transition",
              isActive(pathname, "/app/account") ? "bg-ember/15 ring-1 ring-ember/30" : "hover:bg-white/5",
            )}
          >
            <div className="flex h-9 w-9 items-center justify-center rounded-full bg-ember/25 text-xs font-semibold text-ember">
              A
            </div>
            <div className="min-w-0 flex-1">
              <div className="truncate text-sm font-medium">Aryan</div>
              <div className="truncate text-[11px] text-text-tertiary">Profile & settings</div>
            </div>
            <UserRound size={14} className="text-text-tertiary" />
          </Link>
        </div>
      </aside>

      <SunsetPointerHost className={mapMode ? "h-full overflow-hidden" : ""}>
        <div className={cn("relative z-10 min-h-full", mapMode ? "h-full" : "")}>
          {mapMode ? (
            <div className="h-full">{children}</div>
          ) : (
            <div className="mx-auto max-w-7xl p-6 md:p-10">{children}</div>
          )}
        </div>
      </SunsetPointerHost>
    </div>
  );
}

function WayMark() {
  return (
    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" className="h-5 w-5 text-ember">
      <path d="M4 8 L20 8" />
      <path d="M7 8 L7 20" />
      <path d="M17 8 L17 20" />
      <path d="M4 20 L20 20" />
    </svg>
  );
}
