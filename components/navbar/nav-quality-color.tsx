"use client";

import { useEffect, useState } from "react";

function hexToRgba(hex: string, alpha: number): string {
  const r = parseInt(hex.slice(1, 3), 16);
  const g = parseInt(hex.slice(3, 5), 16);
  const b = parseInt(hex.slice(5, 7), 16);
  return `rgba(${r}, ${g}, ${b}, ${alpha})`;
}

export default function NavQualityColor() {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => {
      const detail = (e as CustomEvent).detail;
      setColor(detail?.color ?? null);
    };
    window.addEventListener("qualityColorChange", handler);
    return () => window.removeEventListener("qualityColorChange", handler);
  }, []);

  if (!color) return null;

  return (
    <div
      className="pointer-events-none absolute inset-x-0 top-0 h-0.5"
      style={{ backgroundColor: color }}
    />
  );
}
