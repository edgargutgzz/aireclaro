"use client";

import { useState } from "react";
import type { LucideIcon } from "lucide-react";

// Shared by every /datos chart's "learn more" row (días insalubres,
// cobertura de estaciones) -- extracted after the two drifted apart
// (2026-09-13: cobertura got icon+pill styling, días insalubres was left on
// the old plain-border buttons). One component means one place to keep
// them consistent, instead of trusting two files not to diverge.
export type TabAccent = "green" | "violet";

export interface InfoTab {
  id: string;
  label: string;
  icon: LucideIcon;
  accent: TabAccent;
  body: React.ReactNode;
}

const ACCENT_STYLES: Record<TabAccent, { icon: string; active: string }> = {
  green: { icon: "text-green-600", active: "border-green-200 bg-green-50" },
  violet: { icon: "text-violet-500", active: "border-violet-200 bg-violet-50" },
};

export default function InfoTabs({ tabs }: { tabs: InfoTab[] }) {
  const [activeTab, setActiveTab] = useState<string | null>(null);

  return (
    <div>
      <div className="flex flex-wrap gap-2">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const accent = ACCENT_STYLES[tab.accent];
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(activeTab === tab.id ? null : tab.id)}
              className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
                activeTab === tab.id ? accent.active + " text-gray-800" : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className={`h-4 w-4 ${accent.icon}`} />
              {tab.label}
            </button>
          );
        })}
      </div>
      {activeTab && (
        <div className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
          <p className="text-sm leading-relaxed text-gray-600">{tabs.find((t) => t.id === activeTab)?.body}</p>
        </div>
      )}
    </div>
  );
}
