import { Info } from "lucide-react";
import { SIMA_OUTAGE_AFTER, SIMA_OUTAGE_BEFORE, SIMA_OUTAGE_LINK } from "@/lib/sima-outage";

// The outage notice's text (lib/sima-outage.ts) with its info icon and the
// link to the state's own site, sized for wherever it sits: the map's legend
// panel (desktop) or under the mobile map pill.
export default function SimaOutageNotice({ compact = false }: { compact?: boolean }) {
  return (
    <p className={`flex gap-2 text-gray-600 ${compact ? "text-[11px] leading-snug" : "text-[13px] leading-relaxed"}`}>
      <Info className={`mt-0.5 shrink-0 text-gray-400 ${compact ? "h-3 w-3" : "h-3.5 w-3.5"}`} aria-hidden />
      <span>
        {SIMA_OUTAGE_BEFORE}{" "}
        <a
          href={SIMA_OUTAGE_LINK.href}
          target="_blank"
          rel="noopener noreferrer"
          className="rounded font-medium text-[#226caf] hover:underline focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          {SIMA_OUTAGE_LINK.label}
          <span className="sr-only"> (abre en una nueva pestaña)</span>
        </a>
        {SIMA_OUTAGE_AFTER ? ` ${SIMA_OUTAGE_AFTER}` : "."}
      </span>
    </p>
  );
}
