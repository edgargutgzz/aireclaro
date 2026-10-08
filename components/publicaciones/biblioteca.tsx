"use client";

import Link from "next/link";
import { useEffect, useMemo, useState } from "react";
import { FileText, Search } from "lucide-react";
import SelectMenu from "@/components/datos/select-menu";
import { TIPOS, formatDate, publicaciones, tipoLabel, type Publicacion, type Tipo } from "@/app/publicaciones/data";

// The /publicaciones library: search, type and year filters over every
// publication, grouped by year, newest first. The filters live in the query
// string (?tipo=informe&anio=2025&q=gasolina) so a filtered view can be
// shared. Like the map (lib/map-url-state.ts), it's read once on load and
// written back with history.replaceState, never the Next router, so the page
// stays static: the server renders the full list, the URL narrows it.

const YEARS = [...new Set(publicaciones.map((p) => p.year))];

const TIPO_OPTIONS: { value: Tipo | ""; label: string }[] = [{ value: "", label: "Todos los tipos" }, ...TIPOS];
const YEAR_OPTIONS = [{ value: "", label: "Todos los años" }, ...YEARS.map((y) => ({ value: String(y), label: String(y) }))];

// Lowercase, accents dropped, so "contingencias" finds "Contingencias" and
// "fútbol" finds "futbol".
function normalize(text: string): string {
  return text.normalize("NFD").replace(/\p{M}/gu, "").toLowerCase();
}

const searchText = new Map(
  publicaciones.map((p) => [p.slug, normalize([p.title, p.author, p.outlet, tipoLabel(p.tipo)].join(" "))]),
);

function readParams(): { tipo: Tipo | ""; anio: string; q: string } {
  const params = new URLSearchParams(window.location.search);
  const tipo = params.get("tipo") ?? "";
  const anio = params.get("anio") ?? "";
  return {
    tipo: TIPOS.some((t) => t.value === tipo) ? (tipo as Tipo) : "",
    anio: YEARS.includes(Number(anio)) ? anio : "",
    q: params.get("q") ?? "",
  };
}

function writeParams(state: { tipo: string; anio: string; q: string }): void {
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

export default function Biblioteca() {
  const [tipo, setTipo] = useState<Tipo | "">("");
  const [anio, setAnio] = useState("");
  const [q, setQ] = useState("");
  const [loaded, setLoaded] = useState(false);

  useEffect(() => {
    const initial = readParams();
    setTipo(initial.tipo);
    setAnio(initial.anio);
    setQ(initial.q);
    setLoaded(true);
  }, []);

  useEffect(() => {
    if (loaded) writeParams({ tipo, anio, q });
  }, [loaded, tipo, anio, q]);

  const results = useMemo(() => {
    const words = normalize(q).split(/\s+/).filter(Boolean);
    return publicaciones.filter(
      (p) =>
        (!tipo || p.tipo === tipo) &&
        (!anio || p.year === Number(anio)) &&
        words.every((w) => searchText.get(p.slug)!.includes(w)),
    );
  }, [tipo, anio, q]);

  const byYear = YEARS.map((year) => ({ year, items: results.filter((p) => p.year === year) })).filter(
    (g) => g.items.length > 0,
  );

  const filtered = Boolean(tipo || anio || q.trim());
  const clear = () => {
    setTipo("");
    setAnio("");
    setQ("");
  };

  return (
    <div>
      <div className="flex flex-col gap-4 md:flex-row md:items-end">
        <div className="flex flex-1 flex-col gap-1.5">
          <label htmlFor="publicaciones-buscar" className={labelClass}>
            Buscar
          </label>
          <div className="relative">
            <Search className="pointer-events-none absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-gray-400" aria-hidden />
            <input
              id="publicaciones-buscar"
              type="search"
              value={q}
              onChange={(e) => setQ(e.target.value)}
              placeholder="Título, autor o medio"
              className="w-full rounded-xl bg-gray-100 py-2.5 pl-9 pr-3 text-sm font-medium text-gray-700 transition-colors placeholder:font-normal placeholder:text-gray-500 hover:bg-gray-200/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
            />
          </div>
        </div>
        <div className="flex gap-4">
          <div className="flex flex-1 flex-col gap-1.5 md:flex-none">
            <label htmlFor="publicaciones-tipo" className={labelClass}>
              Tipo
            </label>
            <SelectMenu
              id="publicaciones-tipo"
              options={TIPO_OPTIONS}
              value={tipo}
              onChange={setTipo}
              className="md:w-52"
            />
          </div>
          <div className="flex flex-1 flex-col gap-1.5 md:flex-none">
            <label htmlFor="publicaciones-anio" className={labelClass}>
              Año
            </label>
            <SelectMenu id="publicaciones-anio" options={YEAR_OPTIONS} value={anio} onChange={setAnio} className="md:w-40" />
          </div>
        </div>
      </div>

      <div className="mt-6 flex items-center gap-3 text-xs text-gray-500" aria-live="polite">
        <p>
          {filtered
            ? `${results.length} de ${publicaciones.length} publicaciones`
            : `${publicaciones.length} publicaciones`}
        </p>
        {filtered && (
          <button
            type="button"
            onClick={clear}
            className="rounded-xl font-medium text-gray-700 underline underline-offset-2 hover:text-gray-900 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
          >
            Quitar filtros
          </button>
        )}
      </div>

      {byYear.length === 0 ? (
        <p className="mt-10 text-sm text-gray-600">No hay publicaciones con estos filtros.</p>
      ) : (
        byYear.map(({ year, items }) => (
          <section key={year} className="mt-10" aria-labelledby={`publicaciones-${year}`}>
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
  );
}

const ROW =
  "block px-5 py-4 transition-colors hover:bg-gray-100/70 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15";

// Every row opens the item's page; the marker says what's behind it.
function PublicacionRow({ publicacion: p }: { publicacion: Publicacion }) {
  const byline = [p.author, p.outlet].filter(Boolean).join(", ");
  return (
    <Link href={`/publicaciones/${p.slug}`} className={ROW}>
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
      <p className="mt-1.5 text-base font-semibold leading-snug text-gray-800">{p.title}</p>
      <p className="mt-1 text-sm text-gray-600">{byline}</p>
    </Link>
  );
}
