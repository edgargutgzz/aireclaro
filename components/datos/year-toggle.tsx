import SegmentedToggle from "@/components/datos/segmented-toggle";

// Shared by the /datos charts' year switcher -- extracted before the copies
// in dias-insalubres-chart.tsx and cobertura-estaciones-chart.tsx could
// drift. The pill markup itself lives in SegmentedToggle.
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
    <SegmentedToggle
      options={years.map((y) => ({ value: y, label: String(y) }))}
      value={year}
      onChange={onChange}
      ariaLabel="Año"
    />
  );
}
