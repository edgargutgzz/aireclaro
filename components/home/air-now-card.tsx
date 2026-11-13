"use client";

import { useEffect, useId, useRef, useState } from "react";
import Link from "next/link";
import { ChevronDown, UsersRound } from "lucide-react";
import { getQualityInfo, type QualityInfo } from "@/lib/air-quality";
import { AirNowHeader, RecRow, groupByAdvice } from "@/components/mapa/station-card";
import { toFreshness } from "@/components/mapa/lib";
import type { SelectedSensor } from "@/components/mapa/types";

// The homepage's live card, at the top of the page (replaced the ticker
// 2026-11-03). In order of importance:
// the air right now (the map sidebar's level card, AirNowHeader, same station
// rule, pickDefaultSensor), the health advice (Población general shown, the
// sensitive groups one tap away in the same card, the official text as on the
// map). The level card itself opens the map. `subject` is null when no reading
// is live anywhere: the card is hidden rather than shown empty.
export default function AirNowCard({ subject }: { subject: SelectedSensor | null }) {
  // The reading's age needs the visitor's clock: null until mounted, then
  // re-read every minute, as on the map.
  const [now, setNow] = useState<number | null>(null);
  const [groupsOpen, setGroupsOpen] = useState(false);
  // Whether anything in the advice card is open (the sensitive groups or a
  // "Ver más" norm box): read off the card's own aria-expanded buttons, so
  // every toggle inside counts without threading state through RecRow.
  const adviceRef = useRef<HTMLDivElement>(null);
  const [expanded, setExpanded] = useState(false);
  useEffect(() => {
    const el = adviceRef.current;
    if (!el) return;
    const read = () => setExpanded(el.querySelector('[aria-expanded="true"]') !== null);
    const mo = new MutationObserver(read);
    mo.observe(el, { subtree: true, attributes: true, attributeFilter: ["aria-expanded"] });
    return () => mo.disconnect();
  }, []);
  // The advice card's height with nothing open, tracked while closed, so the
  // level card can hold it while something is open.
  const [closedHeight, setClosedHeight] = useState<number | null>(null);
  useEffect(() => {
    const el = adviceRef.current;
    if (!el || expanded) return;
    const ro = new ResizeObserver(() => setClosedHeight(el.offsetHeight));
    ro.observe(el);
    return () => ro.disconnect();
  }, [expanded]);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  if (!subject) return null;
  const quality = getQualityInfo(subject.pm25);
  if (!quality) return null;
  const freshness = toFreshness(subject, null, now);

  return (
    // At the top of the page, above the hero (option B of the fit mockups,
    // 2026-11-03, its title removed the same day): the two pieces on the hero's own two
    // columns and gap, so they line up with the headline and the photo below.
    // Same height at rest; opening the sensitive groups or a "Ver más" grows
    // the advice card only, the level card holding its closed height (stretched it turned into
    // a tall orange slab; at its own height it shrank).
    <section aria-label="Calidad del aire ahora" className="mx-auto w-full max-w-7xl px-6 pt-8 lg:px-8">
      <div className={`grid gap-4 lg:grid-cols-2 lg:gap-12 ${expanded ? "items-start" : "items-stretch"}`}>
        {/* The level card opens the map (2026-11-03, in place of a "Ver el
            mapa" link): the reading leads to where it comes from. */}
        <Link
          href="/calidad-del-aire"
          // Desktop only (lg:): stacked on a phone, the cards don't sit side by side.
          style={expanded && closedHeight ? ({ "--closed-h": `${closedHeight}px` } as React.CSSProperties) : undefined}
          className={`block h-full rounded-xl transition-[filter] ${expanded && closedHeight ? "lg:h-[var(--closed-h)]" : ""} hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 focus-visible:ring-offset-2`}
        >
          <AirNowHeader subject={subject} freshness={freshness} stretch place="Zona Metropolitana de Monterrey" />
          <span className="sr-only">Ver el mapa</span>
        </Link>
        <div>
          {/* Fills the row's height at rest, so both cards match whichever is
              taller; the extra space goes around Población general, the
              groups row staying at the bottom. */}
          <div ref={adviceRef} className="flex h-full flex-col overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <div className="flex flex-1 flex-col justify-center">
              <RecRow icons={[UsersRound]} who="Población general" advice={quality.generalRec} full={quality.generalFull} info={quality} lead />
            </div>
            <SensitiveGroups info={quality} open={groupsOpen} onToggle={() => setGroupsOpen((v) => !v)} />
          </div>
        </div>
      </div>
    </section>
  );
}

// The sensitive groups behind a row in the same card: their icons overlapped
// in the level-tinted discs, the label, a chevron. Open, one row per distinct
// advice (groupByAdvice), exactly as the map sidebar lists them.
function SensitiveGroups({ info, open, onToggle }: { info: QualityInfo; open: boolean; onToggle: () => void }) {
  const bodyId = `home-grupos-${useId().replace(/:/g, "")}`;
  const blocks = groupByAdvice(info);

  return (
    <div className="border-t border-stone-100">
      <button
        type="button"
        onClick={onToggle}
        aria-expanded={open}
        aria-controls={bodyId}
        className="flex w-full items-center gap-3.5 px-[18px] py-3 text-left transition-colors hover:bg-stone-50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15"
      >
        <span aria-hidden="true" className="flex">
          {blocks.flatMap((b) => b.groups).map((g, i) => (
            <span
              key={g.key}
              className={`flex h-7 w-7 items-center justify-center rounded-full border-2 border-white ${i > 0 ? "-ml-2" : ""}`}
              style={{ backgroundColor: `color-mix(in srgb, ${info.color} 14%, white)`, color: info.textColor }}
            >
              <g.icon className="h-3.5 w-3.5" />
            </span>
          ))}
        </span>
        <span className="min-w-0 flex-1 text-sm font-semibold text-neutral-900">Grupos sensibles</span>
        <ChevronDown aria-hidden="true" className={`h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform duration-200 ${open ? "rotate-180" : ""}`} />
      </button>
      <ul id={bodyId} hidden={!open}>
        {blocks.map(({ advice, groups, full }) => (
          <li key={advice} className="border-t border-stone-100">
            <RecRow icons={groups.map((g) => g.icon)} who={groups.map((g) => g.label)} advice={advice} info={info} full={full} />
          </li>
        ))}
      </ul>
    </div>
  );
}
