"use client";

import InkGarden from "@/components/ui/ink-garden";
import type { InkGardenProps } from "@/components/ui/ink-garden";

type Variant = {
  src: string;
  renderMode: InkGardenProps["renderMode"];
  tint: string;
  cellSize: number;
  height: string;
};

const VARIANTS: Record<string, Variant> = {
  trips: { src: "/images/mountain-dusk.jpg", renderMode: "dither", tint: "#e8905a", cellSize: 9, height: "200px" },
  concierge: { src: "/images/sunset-horizon.jpg", renderMode: "characters", tint: "#f4a261", cellSize: 10, height: "200px" },
  explore: { src: "/images/lake-golden.jpg", renderMode: "characters", tint: "#c45c26", cellSize: 9, height: "240px" },
  inbox: { src: "/images/sunset-horizon.jpg", renderMode: "dither", tint: "#e8905a", cellSize: 8, height: "200px" },
  wallet: { src: "/images/sunset-forest.jpg", renderMode: "dots", tint: "#e76f51", cellSize: 10, height: "200px" },
  travelers: { src: "/images/lake-golden.jpg", renderMode: "hearts", tint: "#d4845a", cellSize: 12, height: "200px" },
  money: { src: "/images/mountain-dusk.jpg", renderMode: "dither", tint: "#f0b45a", cellSize: 8, height: "200px" },
  rewards: { src: "/images/sunset-forest.jpg", renderMode: "characters", tint: "#e8905a", cellSize: 11, height: "200px" },
  alerts: { src: "/images/sunset-horizon.jpg", renderMode: "dots", tint: "#e07a6a", cellSize: 9, height: "200px" },
  dna: { src: "/images/mountain-dusk.jpg", renderMode: "hearts", tint: "#e76f51", cellSize: 11, height: "200px" },
  autonomy: { src: "/images/sunset-forest.jpg", renderMode: "dither", tint: "#c48a62", cellSize: 9, height: "200px" },
  sandbox: { src: "/images/lake-golden.jpg", renderMode: "characters", tint: "#f4a261", cellSize: 10, height: "200px" },
  advisor: { src: "/images/mountain-dusk.jpg", renderMode: "dither", tint: "#e8905a", cellSize: 8, height: "200px" },
  hospitality: { src: "/images/sunset-horizon.jpg", renderMode: "dots", tint: "#d4845a", cellSize: 10, height: "200px" },
  account: { src: "/images/sunset-forest.jpg", renderMode: "characters", tint: "#e8905a", cellSize: 9, height: "200px" },
  default: { src: "/images/sunset-horizon.jpg", renderMode: "dither", tint: "#e8905a", cellSize: 9, height: "200px" },
};

export default function PageAsciiHero({
  title,
  eyebrow,
  subtitle,
  variant = "default",
}: {
  title: string;
  eyebrow?: string;
  subtitle?: string;
  variant?: keyof typeof VARIANTS;
}) {
  const v = VARIANTS[variant] ?? VARIANTS.default;
  return (
    <InkGarden
      height={v.height}
      className="rounded-3xl"
      renderMode={v.renderMode}
      src={v.src}
      tint={v.tint}
      cellSize={v.cellSize}
      animIntensity={55 + (title.length % 20)}
    >
      <div className="flex h-full flex-col justify-end bg-gradient-to-t from-black/65 via-black/25 to-transparent p-7 md:p-8">
        {eyebrow && <p className="wp-eyebrow text-white/75">{eyebrow}</p>}
        <h1 className="font-display text-4xl font-semibold text-white md:text-5xl">{title}</h1>
        {subtitle && <p className="mt-2 max-w-xl text-sm text-white/75">{subtitle}</p>}
      </div>
    </InkGarden>
  );
}
