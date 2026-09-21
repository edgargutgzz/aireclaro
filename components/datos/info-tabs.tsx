"use client";

import { useId, useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

// Shared by every /datos chart's "learn more" row (días insalubres,
// cobertura de estaciones) -- extracted after the two drifted apart
// (2026-09-13: cobertura got icon+pill styling, días insalubres was left on
// the old plain-border buttons). One component means one place to keep
// them consistent, instead of trusting two files not to diverge.
//
// Icon color 2026-09-21: the brand purple sampled directly from the OCCAMM
// logo (public/occamm-logo.png, #743479 -- the dominant purple pixel, not a
// guess). Was plain gray-400 (2026-09-13, deliberately monochrome so
// per-tab accent colors didn't compete with the chart above) -- explicit
// user call to override that.
export interface InfoTab {
  id: string;
  label: string;
  icon: LucideIcon;
  body: React.ReactNode;
}

export default function InfoTabs({ tabs }: { tabs: InfoTab[] }) {
  const [activeTab, setActiveTab] = useState<string | null>(null);
  const panelId = useId();

  return (
    <div>
      <div className="flex flex-wrap gap-3">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(isActive ? null : tab.id)}
              aria-expanded={isActive}
              aria-controls={panelId}
              className={`inline-flex items-center gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
                isActive
                  ? "border-gray-300 bg-gray-50 text-gray-800 hover:bg-gray-100"
                  : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
              }`}
            >
              <Icon className="h-3.5 w-3.5 text-[#743479]" />
              {tab.label}
              <ChevronDown
                className={`h-3.5 w-3.5 text-gray-400 transition-transform ${isActive ? "rotate-180" : ""}`}
              />
            </button>
          );
        })}
      </div>
      {activeTab && (
        <div id={panelId} className="mt-3 rounded-2xl border border-gray-100 bg-gray-50 px-5 py-4">
          <p className="text-sm leading-relaxed text-gray-600">{tabs.find((t) => t.id === activeTab)?.body}</p>
        </div>
      )}
    </div>
  );
}
