"use client";

import { useEffect, useId, useState } from "react";
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
    // 2026-11-03): a small title, then the two pieces on the hero's own two
    // columns and gap, so they line up with the headline and the photo below.
    // Top-aligned, each at its own height: opening the sensitive groups grows
    // the advice card only (a stretched level card turned into a tall orange
    // slab).
    <section aria-labelledby="aire-ahora" className="mx-auto w-full max-w-7xl px-6 pt-8 lg:px-8">
      <h2 id="aire-ahora" className="mx-1 mb-3 text-sm font-semibold text-neutral-700">
        La calidad del aire ahora en la ZMM
      </h2>
      <div className="grid items-start gap-4 lg:grid-cols-2 lg:gap-12">
        {/* The level card opens the map (2026-11-03, in place of a "Ver el
            mapa" link): the reading leads to where it comes from. */}
        <Link
          href="/calidad-del-aire"
          className="block rounded-xl transition-[filter] hover:brightness-[0.97] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15 focus-visible:ring-offset-2"
        >
          <AirNowHeader subject={subject} freshness={freshness} />
          <span className="sr-only">Ver el mapa</span>
        </Link>
        <div>
          <div className="overflow-hidden rounded-2xl border border-stone-200 bg-white">
            <RecRow icons={[UsersRound]} who="Población general" advice={quality.generalRec} info={quality} lead />
            <SensitiveGroups info={quality} />
          </div>
        </div>
      </div>
    </section>
  );
}

// The sensitive groups behind a row in the same card: their icons overlapped
// in the level-tinted discs, the label, a chevron. Open, one row per distinct
// advice (groupByAdvice), exactly as the map sidebar lists them.
function SensitiveGroups({ info }: { info: QualityInfo }) {
  const [open, setOpen] = useState(false);
  const bodyId = `home-grupos-${useId().replace(/:/g, "")}`;
  const blocks = groupByAdvice(info);

  return (
    <div className="border-t border-stone-100">
      <button
        type="button"
        onClick={() => setOpen((v) => !v)}
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
        {blocks.map(({ advice, groups }) => (
          <li key={advice} className="border-t border-stone-100">
            <RecRow icons={groups.map((g) => g.icon)} who={groups.map((g) => g.label).join(", ")} advice={advice} info={info} />
          </li>
        ))}
      </ul>
    </div>
  );
}
