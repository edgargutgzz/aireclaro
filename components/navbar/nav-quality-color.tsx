"use client";

import { useState, useEffect } from "react";

export default function NavQualityColor() {
  const [color, setColor] = useState<string | null>(null);

  useEffect(() => {
    const handler = (e: Event) => setColor((e as CustomEvent<string | null>).detail);
    window.addEventListener("qualityColorChange", handler);
    return () => window.removeEventListener("qualityColorChange", handler);
  }, []);

  return (
    <div
      className="h-0.5 w-full transition-colors duration-500"
      style={{ backgroundColor: color ?? "transparent" }}
    />
  );
}
