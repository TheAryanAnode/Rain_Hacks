"use client";

import { useEffect, useRef } from "react";
import { cn } from "@/lib/utils";

/**
 * Applies the pointer-tracking multi-layer blend to a host element
 * (matches the body + pointermove pattern you specified).
 */
export default function SunsetPointerHost({
  className,
  children,
}: {
  className?: string;
  children: React.ReactNode;
}) {
  const ref = useRef<HTMLElement>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) return;
    const onMove = (e: PointerEvent) => {
      const { currentTarget, clientX: x, clientY: y } = e;
      const target = currentTarget as HTMLElement;
      const { top: t, left: l, width: w, height: h } = target.getBoundingClientRect();
      target.style.setProperty("--posX", String(x - l - w / 2));
      target.style.setProperty("--posY", String(y - t - h / 2));
    };
    el.addEventListener("pointermove", onMove);
    return () => el.removeEventListener("pointermove", onMove);
  }, []);

  return (
    <main ref={ref} className={cn("wp-sunset-host relative flex-1 overflow-y-auto", className)}>
      {children}
    </main>
  );
}
