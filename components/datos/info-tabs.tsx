"use client";

import { useId, useState } from "react";
import { ChevronDown, type LucideIcon } from "lucide-react";

// Shared by every /datos chart's "learn more" row (días insalubres,
// cobertura de estaciones) -- extracted after the two drifted apart
// (2026-09-13: cobertura got icon+pill styling, días insalubres was left on
// the old plain-border buttons). One component means one place to keep
// them consistent, instead of trusting two files not to diverge.
//
// Deliberately monochrome (2026-09-13): these are a secondary "learn more"
// row, not calls to action -- per-tab accent colors made them compete with
// the chart above for attention. Icons stay for scannability, colors don't.
// (Tried the brand purple 2026-09-21, reverted same day.)
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
      {/* One full-width pill per row on mobile -- plenty of room per label,
          so none of them wrap (the 2-up grid tried before this needed
          min-h-11 to paper over uneven wrapping between rows; one per row
          sidesteps the problem instead of compensating for it). Reverts to
          the natural flex-wrap row from sm: up, where everything already
          fits on one line. */}
      <div className="grid grid-cols-1 gap-3 sm:flex sm:flex-wrap">
        {tabs.map((tab) => {
          const Icon = tab.icon;
          const isActive = activeTab === tab.id;
          return (
            <button
              key={tab.id}
              onClick={() => setActiveTab(isActive ? null : tab.id)}
              aria-expanded={isActive}
              aria-controls={panelId}
              className={`flex w-full items-center justify-between gap-1.5 rounded-xl border px-3 py-1.5 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 sm:inline-flex sm:w-auto sm:justify-start ${
                isActive
                  ? "border-stone-300 bg-stone-50 text-stone-800 hover:bg-stone-100"
                  : "border-stone-200 bg-white text-stone-700 hover:bg-stone-50"
              }`}
            >
              <span className="flex items-center gap-1.5">
                <Icon className="h-3.5 w-3.5 text-stone-400" />
                {tab.label}
              </span>
              <ChevronDown
                className={`h-3.5 w-3.5 text-stone-400 transition-transform ${isActive ? "rotate-180" : ""}`}
              />
            </button>
          );
        })}
      </div>
      {activeTab && (
        <div id={panelId} className="mt-3 rounded-2xl border border-stone-100 bg-stone-50 px-5 py-4">
          {/* div, not p: a body can hold its own block-level markup (e.g. a
              multi-paragraph tab), which can't legally nest inside a p. */}
          <div className="text-sm leading-relaxed text-stone-600">{tabs.find((t) => t.id === activeTab)?.body}</div>
        </div>
      )}
    </div>
  );
}
