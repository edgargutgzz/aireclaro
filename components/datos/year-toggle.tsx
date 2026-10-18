import SegmentedToggle from "@/components/datos/segmented-toggle";

// The /datos charts' year switcher, shared so per-chart copies can't
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
