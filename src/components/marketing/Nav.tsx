"use client";

import Link from "next/link";
import { Menu } from "lucide-react";
import { WayportLogo } from "./Logo";
import { useState } from "react";

/**
 * Marketing nav — demo-safe (no Clerk required).
 * With real Clerk keys, "Get started" still goes to /sign-up.
 */
export function Nav() {
  const [open, setOpen] = useState(false);

  return (
    <>
      <header className="fixed top-0 inset-x-0 z-40 flex items-center justify-between px-6 py-5 md:px-10">
        <WayportLogo />
        <button
          aria-label="Open menu"
          className="wp-icon-btn text-white/80 hover:text-white"
          onClick={() => setOpen((o) => !o)}
        >
          <Menu size={20} strokeWidth={1.5} />
        </button>
      </header>

      {open && (
        <div className="fixed inset-0 z-50 bg-black/50 backdrop-blur-md" onClick={() => setOpen(false)}>
          <nav
            className="absolute right-0 top-0 h-full w-full max-w-sm bg-sky-950/95 border-l border-white/10 p-8 flex flex-col gap-6"
            onClick={(e) => e.stopPropagation()}
          >
            <div className="flex justify-end">
              <button className="wp-icon-btn" onClick={() => setOpen(false)} aria-label="Close menu">
                ✕
              </button>
            </div>
            <Link href="/" className="font-display text-3xl" onClick={() => setOpen(false)}>
              Home
            </Link>
            <Link href="/story" className="text-lg text-text-secondary hover:text-white" onClick={() => setOpen(false)}>
              Why WAYPORT
            </Link>
            <Link href="/pricing" className="text-lg text-text-secondary hover:text-white" onClick={() => setOpen(false)}>
              Pricing
            </Link>
            <div className="mt-auto space-y-3">
              <Link href="/app" className="wp-cta block text-center px-6 py-3.5" onClick={() => setOpen(false)}>
                Open WAYPORT
              </Link>
            </div>
          </nav>
        </div>
      )}
    </>
  );
}
