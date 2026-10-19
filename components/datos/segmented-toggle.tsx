// The /datos pill switcher (gray track, white selected chip): one markup for
// every "pick one of a few" control in a chart header, so they can't drift.
export default function SegmentedToggle<T extends string | number>({
  options,
  value,
  onChange,
  ariaLabel,
}: {
  options: { value: T; label: string }[];
  value: T | null;
  onChange: (value: T) => void;
  ariaLabel?: string;
}) {
  return (
    <div role="group" aria-label={ariaLabel} className="flex items-center gap-1 rounded-xl bg-stone-100 p-1">
      {options.map((o) => (
        <button
          key={o.value}
          type="button"
          onClick={() => onChange(o.value)}
          aria-pressed={value === o.value}
          className={`rounded-xl px-3 py-1.5 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 ${
            value === o.value
              ? "bg-white text-neutral-800 shadow-sm hover:shadow"
              : "text-neutral-500 hover:text-neutral-700"
          }`}
        >
          {o.label}
        </button>
      ))}
    </div>
  );
}
