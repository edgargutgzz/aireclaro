"use client";

import { useEffect, useId, useMemo, useState } from "react";
import { Search, SlidersHorizontal, X } from "lucide-react";
import { DialogShell } from "@/components/mapa/info-dialog";
import { PublicacionCard, PublicacionDestacada, PublicacionRow } from "@/components/publicaciones/tarjetas";
import {
  DESTACADA,
  PERSONAS,
  TIPOS,
  normalize,
  publicaciones,
  tipoLabel,
  urlKey,
  type Publicacion,
  type Tipo,
} from "@/app/publicaciones/data";

// The /publicaciones library: search, type, outlet, author and year filters over every
// publication, grouped by year, newest first. Unfiltered, the three newest
// lead as image cards; every list row carries its cover as a thumbnail.
// The filters show how many items each option would leave (counted against
// the other active filters, the usual faceted-search rule): a list in the
// sidebar from lg; below that, behind a "Filtros" button that opens them in a
// dialog, so they don't push the results down.
//
// The filters live in the query string (?tipo=informe&anio=2025&q=gasolina,
// ?medio=el-norte, ?autor=selene-m-guajardo) so a filtered view can be shared. Like the map (lib/map-url-state.ts),
// it's read once on load and written back with history.replaceState, never
// the Next router, so the page stays static: the server renders the full
// list, the URL narrows it.

const YEARS = [...new Set(publicaciones.map((p) => p.year))];
const FEATURED = 3;
// Unfiltered, the list stops after this many rows until "Ver todas" is
// pressed; a filter or search always shows every match.
const PREVIEW = 12;

const searchText = new Map(
  publicaciones.map((p) => [
    p.slug,
    normalize([p.title, p.author, ...p.people, p.outlet, tipoLabel(p.tipo)].join(" ")),
  ]),
);

const PERSON_KEYS = new Set(PERSONAS.map(urlKey));

// Every outlet, most items first (a fixed order, like PERSONAS).
const MEDIOS = (() => {
  const counts = new Map<string, number>();
  for (const p of publicaciones) if (p.outlet) counts.set(p.outlet, (counts.get(p.outlet) ?? 0) + 1);
  return [...counts].sort((a, b) => b[1] - a[1] || a[0].localeCompare(b[0], "es")).map(([name]) => name);
})();
const MEDIO_KEYS = new Set(MEDIOS.map(urlKey));

type Filters = { tipo: Tipo | ""; medio: string; autor: string; anio: string; q: string };
const NO_FILTERS: Filters = { tipo: "", medio: "", autor: "", anio: "", q: "" };

function matches(p: Publicacion, { tipo, medio, anio, autor, q }: Filters): boolean {
  const words = normalize(q).split(/\s+/).filter(Boolean);
  return (
    (!tipo || p.tipo === tipo) &&
    (!medio || (p.outlet !== undefined && urlKey(p.outlet) === medio)) &&
    (!anio || p.year === Number(anio)) &&
    (!autor || p.people.some((name) => urlKey(name) === autor)) &&
    words.every((w) => searchText.get(p.slug)!.includes(w))
  );
}

function readParams(): Filters {
  const params = new URLSearchParams(window.location.search);
  const tipo = params.get("tipo") ?? "";
  const anio = params.get("anio") ?? "";
  const autor = params.get("autor") ?? "";
  const medio = params.get("medio") ?? "";
  return {
    tipo: TIPOS.some((t) => t.value === tipo) ? (tipo as Tipo) : "",
    medio: MEDIO_KEYS.has(medio) ? medio : "",
    autor: PERSON_KEYS.has(autor) ? autor : "",
    anio: YEARS.includes(Number(anio)) ? anio : "",
    q: params.get("q") ?? "",
  };
}

function writeParams(state: Filters): void {
  const url = new URL(window.location.href);
  for (const [key, value] of Object.entries(state)) {
    if (value.trim()) url.searchParams.set(key, value.trim());
    else url.searchParams.delete(key);
  }
  const next = `${url.pathname}${url.search}${url.hash}`;
  if (next !== `${window.location.pathname}${window.location.search}${window.location.hash}`) {
    window.history.replaceState(null, "", next);
  }
}

const labelClass = "text-xs font-medium text-gray-500";

type FacetOption<T extends string> = { value: T; label: string; count: number };

export default function Biblioteca() {
  const [filters, setFilters] = useState<Filters>(NO_FILTERS);
  const [loaded, setLoaded] = useState(false);
  const { tipo, medio, anio, autor, q } = filters;
  const set = (patch: Partial<Filters>) => setFilters((f) => ({ ...f, ...patch }));

  useEffect(() => {
    setFilters(readParams());
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeParams(filters);
  }, [loaded, filters]);

  const results = useMemo(() => publicaciones.filter((p) => matches(p, filters)), [filters]);

  // Each option's count applies every other active filter, plus itself.
  const tipoOptions = useMemo((): FacetOption<Tipo | "">[] => {
    const pool = publicaciones.filter((p) => matches(p, { ...filters, tipo: "" }));
    return [
      { value: "", label: "Todos los tipos", count: pool.length },
      ...TIPOS.map((t) => ({ ...t, count: pool.filter((p) => p.tipo === t.value).length })),
    ];
  }, [filters]);
  const anioOptions = useMemo((): FacetOption<string>[] => {
    const pool = publicaciones.filter((p) => matches(p, { ...filters, anio: "" }));
    return [
      { value: "", label: "Todos los años", count: pool.length },
      ...YEARS.map((y) => ({ value: String(y), label: String(y), count: pool.filter((p) => p.year === y).length })),
    ];
  }, [filters]);

  const autorOptions = useMemo((): FacetOption<string>[] => {
    const pool = publicaciones.filter((p) => matches(p, { ...filters, autor: "" }));
    return [
      { value: "", label: "Todas las personas", count: pool.length },
      ...PERSONAS.map((name) => {
        const key = urlKey(name);
        return { value: key, label: name, count: pool.filter((p) => p.people.some((n) => urlKey(n) === key)).length };
      }),
    ];
  }, [filters]);
  const medioOptions = useMemo((): FacetOption<string>[] => {
    const pool = publicaciones.filter((p) => matches(p, { ...filters, medio: "" }));
    return [
      { value: "", label: "Todos los medios", count: pool.length },
      ...MEDIOS.map((name) => ({ value: urlKey(name), label: name, count: pool.filter((p) => p.outlet === name).length })),
    ];
  }, [filters]);

  const filtered = Boolean(tipo || medio || anio || autor || q.trim());
  // Unfiltered, the featured item (DESTACADA) leads, then the newest as
  // cards, and the list carries on after them; none is shown twice.
  const destacada = filtered ? undefined : results.find((p) => p.slug === DESTACADA);
  const pool = destacada ? results.filter((p) => p !== destacada) : results;
  const featured = filtered ? [] : pool.slice(0, FEATURED);
  const rest = filtered ? results : pool.slice(FEATURED);
  const [showAll, setShowAll] = useState(false);
  const hidden = filtered || showAll ? 0 : Math.max(0, rest.length - PREVIEW);
  const listed = hidden > 0 ? rest.slice(0, PREVIEW) : rest;
  const byYear = YEARS.map((year) => ({ year, items: listed.filter((p) => p.year === year) })).filter(
    (g) => g.items.length > 0,
  );

  // How many of the four filters are on, for the mobile "Filtros" button.
  const activeFilters = [tipo, medio, autor, anio].filter(Boolean).length;
  const [filtersOpen, setFiltersOpen] = useState(false);
  const filtersTitleId = `filtros-${useId().replace(/:/g, "")}`;

  // The four filter lists: the sidebar from lg, the "Filtros" dialog below.
  const facets = (
    <>
      <Facet label="Tipo" options={tipoOptions} value={tipo} onChange={(v) => set({ tipo: v })} />
      <Facet
        label="Autoría"
        options={autorOptions}
        value={autor}
        onChange={(v) => set({ autor: v })}
        limit={6}
        moreLabel="Ver todas las personas"
      />
      <Facet label="Medio" options={medioOptions} value={medio} onChange={(v) => set({ medio: v })} />
      <Facet label="Año" options={anioOptions} value={anio} onChange={(v) => set({ anio: v })} />
    </>
  );

  return (
    // lg+: the filters are a sidebar and the results take the rest of the
    // site's container; below that they stack, filters first.
    <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-12">
      <div className="flex flex-col gap-4 lg:gap-8">
        <div className="flex flex-col gap-1.5">
          {/* Visible in the desktop sidebar; on mobile the icon and the
              placeholder say it, so the label is for screen readers only. */}
          <label htmlFor="publicaciones-buscar" className={`${labelClass} sr-only lg:not-sr-only`}>
            Buscar
          </label>
          <div className="flex gap-2">
            <div className="relative flex-1">
              <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
              <input
                id="publicaciones-buscar"
                type="search"
                value={q}
                onChange={(e) => set({ q: e.target.value })}
                placeholder="Título, autor o medio"
                className="w-full rounded-xl bg-gray-100 py-2.5 pl-9 pr-3 text-sm font-medium text-gray-700 transition-colors placeholder:font-normal placeholder:text-gray-500 hover:bg-gray-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
              />
            </div>
            {/* Below lg the filters live behind this button (the usual mobile
                pattern), so the results start near the top of the screen. */}
            <button
              type="button"
              onClick={() => setFiltersOpen(true)}
              aria-haspopup="dialog"
              className="flex shrink-0 items-center gap-1.5 rounded-xl bg-gray-100 px-3.5 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 lg:hidden"
            >
              <SlidersHorizontal className="h-4 w-4" aria-hidden />
              Filtros
              {activeFilters > 0 && (
                <span className="flex h-5 min-w-5 items-center justify-center rounded-full bg-gray-800 px-1.5 text-xs font-semibold text-white">
                  {activeFilters}
                  <span className="sr-only"> activos</span>
                </span>
              )}
            </button>
          </div>
        </div>

        {/* lg+: every option in view, with its count. */}
        <div className="hidden lg:flex lg:flex-col lg:gap-8">{facets}</div>
      </div>

      {filtersOpen && (
        <DialogShell
          onClose={() => setFiltersOpen(false)}
          labelledBy={filtersTitleId}
          className="flex max-h-[85svh] w-[90%] max-w-md flex-col overflow-hidden rounded-3xl border border-gray-200 bg-white p-6 shadow-xl"
        >
          <div className="flex flex-shrink-0 items-start justify-between gap-4 pb-4">
            <h2 id={filtersTitleId} className="text-base font-medium text-gray-800">
              Filtros
            </h2>
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              aria-label="Cerrar"
              className="-mr-2 -mt-1 flex-shrink-0 rounded-xl p-2 text-gray-500 transition-colors hover:bg-gray-50 hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
            >
              <X className="h-4 w-4" />
            </button>
          </div>
          {/* `grow basis-auto`, not `flex-1`: see InfoDialog (iOS Safari
              collapses a flex-1 body inside a fit-content <dialog>). */}
          <div className="-mx-1 flex min-h-0 grow basis-auto flex-col gap-6 overflow-y-auto overscroll-contain px-1">
            {facets}
          </div>
          <div className="flex flex-shrink-0 items-center gap-4 pt-4">
            {activeFilters > 0 && (
              <button
                type="button"
                onClick={() => setFilters((f) => ({ ...NO_FILTERS, q: f.q }))}
                className="rounded-xl text-sm font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
              >
                Quitar filtros
              </button>
            )}
            <button
              type="button"
              onClick={() => setFiltersOpen(false)}
              className="ml-auto flex h-10 items-center rounded-xl bg-gray-800 px-4 text-sm font-medium text-white transition-colors hover:bg-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
            >
              Ver {results.length} {results.length === 1 ? "publicación" : "publicaciones"}
            </button>
          </div>
        </DialogShell>
      )}

      <div className="mt-6 lg:mt-0">
        {/* Only once something is filtered: how many matched, and the way
            back. Unfiltered, the page opens straight on the content. The
            live region stays mounted so the counts are announced. */}
        <div className="flex flex-wrap items-center gap-x-3 gap-y-1 text-sm text-gray-600" aria-live="polite">
          {filtered && (
            <>
              <p>
                <span className="font-semibold text-gray-800">
                  {results.length} de {publicaciones.length}
                </span>{" "}
                publicaciones
              </p>
              <button
                type="button"
                onClick={() => setFilters(NO_FILTERS)}
                className="rounded-xl font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
              >
                Quitar filtros
              </button>
            </>
          )}
        </div>

        {/* The featured item, the newest as cards, then the list grouped by year. */}
        {destacada && (
          <section aria-labelledby="publicaciones-destacada">
            <h2 id="publicaciones-destacada" className="mb-3 text-sm font-semibold text-gray-800">
              Destacado
            </h2>
            <PublicacionDestacada publicacion={destacada} />
          </section>
        )}

        {featured.length > 0 && (
          <section aria-labelledby="publicaciones-recientes" className={destacada ? "mt-8" : undefined}>
            <h2 id="publicaciones-recientes" className="mb-3 text-sm font-semibold text-gray-800">
              Lo más reciente
            </h2>
            <ul className="grid gap-4 sm:grid-cols-3">
              {featured.map((p, i) => (
                <li key={p.slug}>
                  <PublicacionCard publicacion={p} priority={i === 0 && !destacada} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {results.length === 0 ? (
          <p className="mt-10 text-sm text-gray-600">No hay publicaciones con estos filtros.</p>
        ) : (
          byYear.map(({ year, items }, i) => (
            <section
              key={year}
              aria-labelledby={`publicaciones-${year}`}
              className={i > 0 ? "mt-10" : featured.length > 0 ? "mt-8" : "mt-4"}
            >
              <h2 id={`publicaciones-${year}`} className="mb-3 text-sm font-semibold text-gray-800">
                {year}
              </h2>
              <ul className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
                {items.map((p) => (
                  <li key={p.slug} className="border-t border-gray-100 first:border-t-0">
                    <PublicacionRow publicacion={p} />
                  </li>
                ))}
              </ul>
            </section>
          ))
        )}

        {hidden > 0 && (
          <button
            type="button"
            onClick={() => setShowAll(true)}
            className="mt-6 flex h-10 w-full items-center justify-center rounded-xl bg-gray-100 px-4 text-sm font-medium text-gray-700 transition-colors hover:bg-gray-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            Ver todas las publicaciones ({hidden} más)
          </button>
        )}
      </div>
    </div>
  );
}

// A filter (the lg+ sidebar, or the mobile "Filtros" dialog): one row per option, the count trailing. The current
// option gets the nav's wash; an option that would leave nothing is disabled
// (its 0 says why), unless it's the current one. With `limit`, only the first
// options show until "Ver todas…" is pressed (the current one always shows).
function Facet<T extends string>({
  label,
  options,
  value,
  onChange,
  limit,
  moreLabel,
}: {
  label: string;
  options: FacetOption<T>[];
  value: T;
  onChange: (value: T) => void;
  limit?: number;
  moreLabel?: string;
}) {
  const [expanded, setExpanded] = useState(false);
  const collapsed = limit !== undefined && !expanded && options.length > limit + 1;
  // +1: the "Todas…" option doesn't count toward the limit.
  const shown = collapsed ? options.filter((o, i) => i <= limit || o.value === value) : options;
  return (
    <div role="group" aria-label={label}>
      <p className={`${labelClass} mb-1.5`}>{label}</p>
      <ul>
        {shown.map((o) => {
          const current = o.value === value;
          const empty = o.count === 0 && !current;
          return (
            <li key={o.value}>
              <button
                type="button"
                onClick={() => onChange(o.value)}
                aria-pressed={current}
                disabled={empty}
                className={`flex w-full items-center justify-between gap-3 rounded-xl px-3 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${
                  current
                    ? "bg-gray-900/[0.08] font-semibold text-gray-900"
                    : empty
                      ? "text-gray-400"
                      : "text-gray-600 hover:bg-gray-100 hover:text-gray-800"
                }`}
              >
                <span className="min-w-0 truncate">{o.label}</span>
                <span className={`shrink-0 text-xs ${empty ? "text-gray-400" : "text-gray-500"}`}>{o.count}</span>
              </button>
            </li>
          );
        })}
      </ul>
      {collapsed && (
        <button
          type="button"
          onClick={() => setExpanded(true)}
          className="mt-1 rounded-xl px-3 py-1.5 text-xs font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
        >
          {moreLabel} ({options.length - 1})
        </button>
      )}
    </div>
  );
}
