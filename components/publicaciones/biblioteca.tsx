"use client";

import Image from "next/image";
import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import SelectMenu from "@/components/datos/select-menu";
import { TIPOS, formatDate, publicaciones, tipoLabel, type Publicacion, type Tipo } from "@/app/publicaciones/data";

// The /publicaciones library: search, type and year filters over every
// publication, grouped by year, newest first. Unfiltered, the three newest
// lead as image cards; every list row carries its cover as a thumbnail.
// The filters show how many items each option would leave (counted against
// the other active filters, the usual faceted-search rule): a list in the
// sidebar from lg, a dropdown below that so they don't push the results down.
//
// The filters live in the query string (?tipo=informe&anio=2025&q=gasolina)
// so a filtered view can be shared. Like the map (lib/map-url-state.ts),
// it's read once on load and written back with history.replaceState, never
// the Next router, so the page stays static: the server renders the full
// list, the URL narrows it.

const YEARS = [...new Set(publicaciones.map((p) => p.year))];
const FEATURED = 3;

// Lowercase, accents dropped, so "contingencias" finds "Contingencias" and
// "fútbol" finds "futbol".
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const searchText = new Map(
  publicaciones.map((p) => [p.slug, normalize([p.title, p.author, p.outlet, tipoLabel(p.tipo)].join(" "))]),
);

type Filters = { tipo: Tipo | ""; anio: string; q: string };

function matches(p: Publicacion, { tipo, anio, q }: Filters): boolean {
  const words = normalize(q).split(/\s+/).filter(Boolean);
  return (
    (!tipo || p.tipo === tipo) &&
    (!anio || p.year === Number(anio)) &&
    words.every((w) => searchText.get(p.slug)!.includes(w))
  );
}

function readParams(): Filters {
  const params = new URLSearchParams(window.location.search);
  const tipo = params.get("tipo") ?? "";
  const anio = params.get("anio") ?? "";
  return {
    tipo: TIPOS.some((t) => t.value === tipo) ? (tipo as Tipo) : "",
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
  const [filters, setFilters] = useState<Filters>({ tipo: "", anio: "", q: "" });
  const [loaded, setLoaded] = useState(false);
  const { tipo, anio, q } = filters;
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

  const filtered = Boolean(tipo || anio || q.trim());
  // Unfiltered, the newest lead as cards and the list carries on after them.
  const featured = filtered ? [] : results.slice(0, FEATURED);
  const listed = filtered ? results : results.slice(FEATURED);
  const byYear = YEARS.map((year) => ({ year, items: listed.filter((p) => p.year === year) })).filter(
    (g) => g.items.length > 0,
  );

  const withCounts = <T extends string>(options: FacetOption<T>[]) =>
    options.map((o) => ({ value: o.value, label: `${o.label} (${o.count})` }));

  return (
    // lg+: the filters are a sticky sidebar and the results take the rest of
    // the site's container; below that they stack, filters first.
    <div className="lg:grid lg:grid-cols-[15rem_minmax(0,1fr)] lg:items-start lg:gap-12">
      <div className="flex flex-col gap-4 md:flex-row md:items-end lg:sticky lg:top-6 lg:flex-col lg:items-stretch lg:gap-8">
        <div className="flex flex-1 flex-col gap-1.5 lg:flex-none">
          <label htmlFor="publicaciones-buscar" className={labelClass}>
            Buscar
          </label>
          <div className="relative">
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
        </div>

        {/* Below lg: dropdowns. */}
        <div className="flex gap-4 lg:hidden">
          <div className="flex flex-1 flex-col gap-1.5 md:flex-none">
            <label htmlFor="publicaciones-tipo" className={labelClass}>
              Tipo
            </label>
            <SelectMenu
              id="publicaciones-tipo"
              options={withCounts(tipoOptions)}
              value={tipo}
              onChange={(v) => set({ tipo: v })}
              className="md:w-56"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 md:flex-none">
            <label htmlFor="publicaciones-anio" className={labelClass}>
              Año
            </label>
            <SelectMenu
              id="publicaciones-anio"
              options={withCounts(anioOptions)}
              value={anio}
              onChange={(v) => set({ anio: v })}
              className="md:w-44"
            />
          </div>
        </div>

        {/* lg+: every option in view, with its count. */}
        <Facet label="Tipo" options={tipoOptions} value={tipo} onChange={(v) => set({ tipo: v })} />
        <Facet label="Año" options={anioOptions} value={anio} onChange={(v) => set({ anio: v })} />
      </div>

      <div className="mt-6 lg:mt-0">
        <div className="flex items-center gap-3 text-xs text-gray-500" aria-live="polite">
          <p>
            {filtered
              ? `${results.length} de ${publicaciones.length} publicaciones`
              : `${publicaciones.length} publicaciones`}
          </p>
          {filtered && (
            <button
              type="button"
              onClick={() => setFilters({ tipo: "", anio: "", q: "" })}
              className="rounded-xl font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
            >
              Quitar filtros
            </button>
          )}
        </div>

        {featured.length > 0 && (
          <section aria-labelledby="publicaciones-recientes" className="mt-4">
            <h2 id="publicaciones-recientes" className="mb-3 text-sm font-semibold text-gray-800">
              Lo más reciente
            </h2>
            <ul className="grid gap-4 sm:grid-cols-3">
              {featured.map((p, i) => (
                <li key={p.slug}>
                  <PublicacionCard publicacion={p} priority={i === 0} />
                </li>
              ))}
            </ul>
          </section>
        )}

        {results.length === 0 ? (
          <p className="mt-10 text-sm text-gray-600">No hay publicaciones con estos filtros.</p>
        ) : (
          byYear.map(({ year, items }) => (
            <section key={year} className="mt-10 first-of-type:mt-4" aria-labelledby={`publicaciones-${year}`}>
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
      </div>
    </div>
  );
}

// A sidebar filter (lg+): one row per option, the count trailing. The current
// option gets the nav's wash; an option that would leave nothing is disabled
// (its 0 says why), unless it's the current one.
function Facet<T extends string>({
  label,
  options,
  value,
  onChange,
}: {
  label: string;
  options: FacetOption<T>[];
  value: T;
  onChange: (value: T) => void;
}) {
  return (
    <div role="group" aria-label={label} className="hidden lg:block">
      <p className={`${labelClass} mb-1.5`}>{label}</p>
      <ul>
        {options.map((o) => {
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
    </div>
  );
}

// "Columna de opinión · 30 ago 2026 · PDF": what it is and what's behind it.
function Meta({ p }: { p: Publicacion }) {
  return (
    <p className="flex flex-wrap items-center gap-x-1.5 text-xs text-gray-500">
      <span>{tipoLabel(p.tipo)}</span>
      {p.tipo === "columna" && p.date && <span>· {formatDate(p.date)}</span>}
      {p.file && (
        <span className="inline-flex items-center gap-1">
          · <FileText className="h-3 w-3" aria-hidden /> PDF
        </span>
      )}
      {p.externalUrl && <span>· {p.outlet}</span>}
    </p>
  );
}

function byline(p: Publicacion): string {
  return [p.author, p.outlet].filter(Boolean).join(", ");
}

const FOCUS_RING = "focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15";

function PublicacionCard({ publicacion: p, priority }: { publicacion: Publicacion; priority: boolean }) {
  return (
    <Link
      href={`/publicaciones/${p.slug}`}
      className={`group flex h-full flex-col overflow-hidden rounded-2xl border border-gray-200 bg-white transition-shadow hover:shadow-md ${FOCUS_RING}`}
    >
      <Image
        src={p.image}
        alt=""
        width={640}
        height={360}
        sizes="(min-width: 1024px) 300px, (min-width: 640px) 33vw, 100vw"
        preload={priority}
        className="aspect-video w-full object-cover"
      />
      <div className="flex flex-1 flex-col p-4">
        <Meta p={p} />
        <p className="mt-1.5 text-base font-semibold leading-snug text-gray-800 group-hover:text-gray-600">{p.title}</p>
        <p className="mt-auto pt-2 text-sm text-gray-600">{byline(p)}</p>
      </div>
    </Link>
  );
}

// Every row opens the item's page, its cover as a thumbnail.
function PublicacionRow({ publicacion: p }: { publicacion: Publicacion }) {
  return (
    <Link
      href={`/publicaciones/${p.slug}`}
      className={`flex items-start gap-4 px-4 py-4 transition-colors hover:bg-gray-100/70 sm:px-5 ${FOCUS_RING} focus-visible:ring-inset`}
    >
      <Image
        src={p.image}
        alt=""
        width={288}
        height={162}
        sizes="(min-width: 640px) 144px, 96px"
        className="aspect-video w-24 shrink-0 rounded-lg object-cover sm:w-36"
      />
      <div className="min-w-0">
        <Meta p={p} />
        <p className="mt-1.5 text-base font-semibold leading-snug text-gray-800">{p.title}</p>
        <p className="mt-1 text-sm text-gray-600">{byline(p)}</p>
      </div>
    </Link>
  );
}
