"use client";

import { motion } from "framer-motion";

/**
 * The central hero mockup: a trip command-center control surface
 * floating in the landscape. Alive with subtle LCD glow + feed motion.
 */
export default function TripCommandPreview() {
  return (
    <motion.div
      initial={{ opacity: 0, y: 40 }}
      animate={{ opacity: 1, y: 0 }}
      transition={{ duration: 1.2, ease: "easeOut" }}
      whileHover={{ y: -6 }}
      className="wp-glass relative overflow-hidden rounded-3xl"
    >
      {/* top bar */}
      <div className="flex items-center justify-between border-b border-white/10 px-6 py-3">
        <div className="flex items-center gap-2">
          <span className="h-3 w-3 rounded-full bg-red-400/70" />
          <span className="h-3 w-3 rounded-full bg-yellow-400/70" />
          <span className="h-3 w-3 rounded-full bg-green-400/70" />
        </div>
        <span className="wp-eyebrow">WAYPORT Command Center</span>
      </div>

      <div className="grid md:grid-cols-[240px,1fr]">
        {/* sidebar mock */}
        <div className="hidden md:block border-r border-white/10 bg-sky-950/40 p-5 space-y-3">
          {["Command Center", "Trips", "AI Concierge", "Explore", "Inbox", "Wallet", "Travelers", "Money", "Rewards", "Alerts", "Travel DNA", "Autonomy"].map((t, i) => (
            <div key={t} className={`flex items-center gap-2.5 rounded-lg px-3 py-2 text-sm ${i === 0 ? "bg-white/10 text-white" : "text-text-secondary hover:bg-white/5"}`}>
              <span className="h-1.5 w-1.5 rounded-full bg-lavender" />
              {t}
            </div>
          ))}
        </div>

        {/* main stage */}
        <div className="wp-stage relative p-6">
          <div className="grid gap-4 sm:grid-cols-3">
            <Stat label="Trip" value="NYC — Anniversary" hint="Aug 9 – Aug 13" />
            <Stat label="Budget" value="$2,184 / $3,000" hint="63% spent" tone="ok" />
            <Stat label="Flight" value="On time" hint="EWR → LAX · 6:20 PM" tone="ok" />
          </div>

          <div className="mt-6 grid gap-4 md:grid-cols-[1.4fr,1fr]">
            {/* today */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="wp-eyebrow mb-3">Today</div>
              {[
                ["09:00", "Coffee at Café Lyria"],
                ["10:30", "Meiji Shrine — 8 min walk"],
                ["12:30", "Lunch — Tiny local soba"],
                ["14:00", "Shibuya — matcha crawl"],
                ["18:30", "Dinner — Omakase (no seafood)"],
                ["20:30", "Rooftop jazz — 0.4 mi away"],
              ].map(([t, s]) => (
                <div key={t} className="flex items-baseline gap-4 border-b border-white/5 last:border-0 py-2.5">
                  <span className="w-12 text-xs font-mono text-text-tertiary">{t}</span>
                  <span className="text-sm">{s}</span>
                </div>
              ))}
            </div>

            {/* agent activity */}
            <div className="rounded-2xl border border-white/10 bg-black/20 p-5">
              <div className="wp-eyebrow mb-3 flex items-center justify-between">
                <span>WAYPORT Activity</span>
                <span><span className="wp-dot"/><span className="wp-dot"/><span className="wp-dot"/></span>
              </div>
              <LiveLog />
            </div>
          </div>

          {/* small autonomy widget */}
          <div className="mt-6 flex items-center justify-between rounded-2xl border border-white/10 bg-gradient-to-r from-sky-900/40 to-horizon-900/30 p-4">
            <div>
              <div className="wp-eyebrow">Autonomy</div>
              <div className="mt-1 text-sm">Execute with approval</div>
            </div>
            <div className="flex items-center gap-2 rounded-full bg-white/5 px-4 py-2 text-xs">
              <span className="h-2 w-2 rounded-full bg-ok animate-pulse" />
              Hotels &lt; $250 ✓ · Restaurants ✓ · Changes &lt; $100 ✓
            </div>
          </div>
        </div>
      </div>
    </motion.div>
  );
}

function Stat({ label, value, hint, tone }: { label: string; value: string; hint: string; tone?: "ok" | "warn" }) {
  return (
    <div className="rounded-2xl border border-white/10 bg-black/20 p-4">
      <div className="wp-eyebrow">{label}</div>
      <div className="mt-2 text-xl font-semibold">
        {value}
        {tone === "ok" && <span className="ml-2 align-middle text-ok">●</span>}
      </div>
      <div className="mt-1 text-xs text-text-tertiary">{hint}</div>
    </div>
  );
}

function LiveLog() {
  const lines = [
    ["10:32:01", "Analyzing your trip…"],
    ["10:32:04", "Searching 43 hotels…"],
    ["10:32:08", "Found 8 matches"],
    ["10:32:11", "Checking availability…"],
    ["10:32:15", "Comparing rewards…"],
    ["10:32:19", "Checking local events…"],
    ["10:32:22", "Found a jazz set 0.4 mi away"],
    ["10:32:28", "Optimizing itinerary…"],
    ["10:32:31", "Trip optimized ✓"],
  ];
  return (
    <div className="space-y-2 text-[13px] font-mono text-text-secondary">
      {lines.map(([t, s], i) => (
        <motion.div
          key={t + s}
          initial={{ opacity: 0, x: -6 }}
          animate={{ opacity: 1, x: 0 }}
          transition={{ delay: i * 0.18 }}
          className="flex gap-3"
        >
          <span className="w-16 shrink-0 text-text-tertiary">{t}</span>
          <span>{s}</span>
        </motion.div>
      ))}
      <motion.div
        initial={{ opacity: 0 }}
        animate={{ opacity: [0.4, 1, 0.4] }}
        transition={{ duration: 1.6, repeat: Infinity }}
        className="flex gap-3 text-lavender"
      >
        <span className="w-16 shrink-0">10:32:33</span>
        <span>Standing by…</span>
      </motion.div>
    </div>
  );
}
