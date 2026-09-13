// Shared by both /datos charts' year switcher -- same duplication risk as
// info-tabs.tsx (see that file's comment): this exact button group was
// typed out identically in both dias-insalubres-chart.tsx and
// cobertura-estaciones-chart.tsx. Extracted proactively before it had a
// chance to drift, rather than after.
export default function YearToggle({
  years,
  year,
  onChange,
}: {
  years: number[];
  year: number | null;
  onChange: (year: number) => void;
}) {
  if (years.length <= 1) return null;

  return (
    <div className="flex items-center gap-1 rounded-xl bg-gray-100 p-1">
      {years.map((y) => (
        <button
          key={y}
          onClick={() => onChange(y)}
          className={`rounded-lg px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
            year === y ? "bg-white text-gray-800 shadow-sm" : "text-gray-500 hover:text-gray-700"
          }`}
        >
          {y}
        </button>
      ))}
    </div>
  );
}
