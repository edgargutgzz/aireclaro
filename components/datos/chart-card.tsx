import type { ReactNode } from "react";

// Shared outer shell for every /datos chart -- same duplication risk as
// info-tabs.tsx and year-toggle.tsx (see those files): this exact card
// shell (border, header row, title/subtitle block) was typed out
// identically in both dias-insalubres-chart.tsx and
// cobertura-estaciones-chart.tsx. One shell, so a border, radius, or
// spacing tweak lands on every /datos chart at once instead of needing to
// be repeated (or forgotten) per file.
export default function ChartCard({
  title,
  subtitle,
  headerRight,
  children,
}: {
  title: string;
  subtitle: ReactNode;
  headerRight?: ReactNode;
  children: ReactNode;
}) {
  return (
    // Glass, not the usual opaque reading-surface card: matches the map's
    // floating chrome (legend/filter panels) on request, and /datos sits on
    // a plain bg-gray-50 page rather than busy map imagery, so the
    // contrast concern that keeps dialogs opaque doesn't apply here.
    <div className="glass overflow-hidden rounded-2xl">
      <div className="flex flex-col gap-3 border-b border-gray-100 px-5 pt-4 pb-3 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <h3 className="text-base font-medium text-gray-700">{title}</h3>
          <p className="mt-1 text-sm text-gray-500">{subtitle}</p>
        </div>
        {headerRight && <div className="flex items-center gap-2">{headerRight}</div>}
      </div>
      {children}
    </div>
  );
}
