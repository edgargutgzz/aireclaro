"use client";

import { useId, useState } from "react";
import { ChevronDown, Info, type LucideIcon } from "lucide-react";

// Shared by every /datos chart's "learn more" row (días insalubres,
// cobertura de estaciones) -- one component means one place to keep them
// consistent, instead of trusting two files not to diverge.
//
// One disclosure, not four (2026-09-14): four separate toggle pills meant
// opening one always closed the last, so seeing "Metodología" and "Impacto
// en salud" together took two clicks and re-reading. Collapsed to a single
// "Fuentes y metodología" link that opens one FAQ-style panel listing every
// topic at once -- still separately labeled (source, legal basis,
// methodology, health context stay individually scannable, since a
// skeptical reader may want to verify just one), just no longer gated
// one-at-a-time behind their own buttons.
//
// Deliberately monochrome: this is a secondary "learn more" affordance, not
// a call to action -- per-topic accent colors would compete with the chart
// above for attention. Icons stay for scannability, colors don't.
export interface InfoTab {
  id: string;
  label: string;
  icon: LucideIcon;
  body: React.ReactNode;
}

export default function InfoTabs({ tabs }: { tabs: InfoTab[] }) {
  const [open, setOpen] = useState(false);
  const panelId = useId();

  return (
    <div>
      <button
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        aria-controls={panelId}
        className={`inline-flex items-center gap-1.5 rounded-full border px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
          open
            ? "border-gray-300 bg-gray-50 text-gray-800"
            : "border-gray-200 bg-white text-gray-700 hover:bg-gray-50"
        }`}
      >
        <Info className="h-3.5 w-3.5 text-gray-400" />
        Fuentes y metodología
        <ChevronDown className={`h-3.5 w-3.5 text-gray-400 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>
      {open && (
        <div id={panelId} className="mt-3 divide-y divide-gray-100 rounded-2xl border border-gray-100 bg-gray-50 px-5">
          {tabs.map((tab) => {
            const Icon = tab.icon;
            return (
              <div key={tab.id} className="py-4 first:pt-4 last:pb-4">
                <h4 className="mb-1.5 flex items-center gap-1.5 text-sm font-medium text-gray-700">
                  <Icon className="h-3.5 w-3.5 text-gray-400" />
                  {tab.label}
                </h4>
                <p className="text-sm leading-relaxed text-gray-600">{tab.body}</p>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
