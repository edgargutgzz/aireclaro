"use client";

import { useState, type Dispatch, type SetStateAction } from "react";
import { Check, ChevronRight, Info, Minus } from "lucide-react";

type CheckState = 'checked' | 'indeterminate' | 'unchecked';

// Styled after shadcn/ui's Checkbox (rounded-sm, border always in the
// "primary" tone, filled + shadow only once checked) rather than a plain
// light-gray box that suddenly turns dark.
function LayerCheckbox({ state, size }: { state: CheckState; size: number }) {
  if (state === 'unchecked') {
    return (
      <div
        style={{ width: size, height: size, borderRadius: 4, border: '1.5px solid #6b7280', flexShrink: 0 }}
      />
    );
  }
  return (
    <div
      className="flex items-center justify-center shadow-sm"
      style={{ width: size, height: size, borderRadius: 4, backgroundColor: '#6b7280', flexShrink: 0 }}
    >
      {state === 'checked' ? (
        <Check className="text-white" style={{ width: size - 6, height: size - 6 }} strokeWidth={3} />
      ) : (
        <Minus className="text-white" style={{ width: size - 7, height: size - 7 }} strokeWidth={3} />
      )}
    </div>
  );
}

export function LayersFilterContent({
  showOtros,
  setShowOtros,
  showOccamm,
  setShowOccamm,
  showSima,
  setShowSima,
  estados,
  sourceCounts,
  hiddenMunicipios,
  setHiddenMunicipios,
  onShowOccammInfo,
  onShowPM25Info,
  onShowFuenteInfo,
}: {
  showOtros: boolean;
  setShowOtros: Dispatch<SetStateAction<boolean>>;
  showOccamm: boolean;
  setShowOccamm: Dispatch<SetStateAction<boolean>>;
  showSima: boolean;
  setShowSima: Dispatch<SetStateAction<boolean>>;
  estados: { key: string; label: string; count: number; municipios: { key: string; label: string; count: number }[] }[];
  sourceCounts: { occamm: number; otros: number; ciudadanos: number; gobierno: number };
  hiddenMunicipios: string[];
  setHiddenMunicipios: Dispatch<SetStateAction<string[]>>;
  onShowOccammInfo: () => void;
  onShowPM25Info: () => void;
  onShowFuenteInfo: () => void;
}) {
  // Fixed sizes: `compact` was passed false at both call sites, and shrinking
  // rows on mobile is the wrong direction for touch targets anyway.
  const rowPadding = "py-3.5";
  const subRowPadding = "py-3";
  const boxSize = 18;
  // Every row in the panel ends in a 28px control box: an info button, a
  // chevron, or, for the rows that carry neither, this spacer. Without it the
  // counts landed on three different rails depending on which section they
  // were in, and read as a ragged column rather than one list.
  const trailingSlot = <span aria-hidden="true" className="mr-2 h-7 w-7 flex-shrink-0" />;
  const [showCitizenGroup, setShowCitizenGroup] = useState(false);
  const [openEstados, setOpenEstados] = useState<string[]>([]);
  // One section open at a time: three expanded sections is how a filter panel
  // grows past the map it filters.
  const [openSection, setOpenSection] = useState<'ubicacion' | 'fuente' | 'contaminante' | null>('fuente');
  const toggleSection = (name: 'ubicacion' | 'fuente' | 'contaminante') =>
    setOpenSection((current) => (current === name ? null : name));
  const citizenState: CheckState =
    showOtros && showOccamm ? 'checked' :
    !showOtros && !showOccamm ? 'unchecked' : 'indeterminate';

  const toggleCitizenGroup = () => {
    const next = citizenState !== 'checked';
    setShowOtros(next);
    setShowOccamm(next);
  };

  // What each collapsed section says about itself, so nobody has to open one
  // just to find out whether it is filtering anything.
  const totalMunicipios = estados.reduce((n, e) => n + e.municipios.length, 0);
  const shownMunicipios = totalMunicipios - hiddenMunicipios.length;
  const ubicacionSummary = hiddenMunicipios.length === 0
    ? "Todos"
    : `${shownMunicipios} de ${totalMunicipios} municipios`;
  // Named, not counted: the panel shows two rows while there are three
  // toggles underneath, so "1 de 3" reads as wrong against two checkboxes.
  const fuenteSummary = (() => {
    if (showOccamm && showOtros && showSima) return "Todas";
    const on: string[] = [];
    if (showOccamm && showOtros) on.push("Ciudadanos");
    else {
      if (showOccamm) on.push("OCCAMM");
      if (showOtros) on.push("Otros");
    }
    if (showSima) on.push("Gobierno");
    return on.length ? on.join(" · ") : "Ninguna";
  })();

  // One control opens the section: label, summary and chevron are a single
  // button, so there is one tab stop and one thing to announce. The info icon
  // is the only other control, and carries its own padding — an unpadded 12px
  // icon is half the practical minimum hit area.
  // The whole panel is one grouped list: a section is a row, and opening it
  // reveals its contents inside the same card on a tinted ground. Three
  // separate cards floating in whitespace left the hover with nothing to
  // belong to, and read as disconnected once every section was collapsed.
  const sectionRow = (
    name: 'ubicacion' | 'fuente' | 'contaminante',
    label: string,
    summary: string,
    info?: { onClick: () => void; ariaLabel: string },
  ) => (
    <div className="flex items-center transition-colors hover:bg-gray-50">
      <button
        type="button"
        onClick={() => toggleSection(name)}
        aria-expanded={openSection === name}
        className="flex min-w-0 flex-1 items-center gap-1.5 py-3.5 pl-4 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15"
      >
        <p className="text-xs font-medium uppercase leading-none tracking-wide text-gray-400">{label}</p>
        <span className="min-w-0 flex-1 truncate text-xs leading-none text-gray-500">· {summary}</span>
        <ChevronRight className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${openSection === name ? 'rotate-90' : ''}`} />
      </button>
      <button
        type="button"
        onClick={info?.onClick}
        disabled={!info}
        className={`mr-2 flex-shrink-0 rounded-lg p-2 transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15 ${info ? 'text-gray-400 hover:bg-gray-100 hover:text-gray-600' : 'invisible'}`}
        aria-label={info?.ariaLabel ?? ""}
        aria-hidden={!info}
        tabIndex={info ? undefined : -1}
      >
        <Info className="h-3 w-3" />
      </button>
    </div>
  );

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      {/* Fuente first — the network is the primary cut, and it now drives
          the Ubicación counts below. */}
      <div>
        {sectionRow('fuente', 'Fuente', fuenteSummary, {
          onClick: onShowFuenteInfo,
          ariaLabel: "Más información sobre las fuentes de datos",
        })}
        {openSection === 'fuente' && (
          <div className="disclosure-in border-t border-gray-100 bg-gray-50/60">
            <div className="flex items-center transition-colors hover:bg-gray-100/70">
              <button
                type="button"
                role="checkbox"
                aria-checked={showSima}
                onClick={() => setShowSima((v) => !v)}
                className={`flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${rowPadding}`}
              >
                <LayerCheckbox state={showSima ? 'checked' : 'unchecked'} size={boxSize} />
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${showSima ? 'text-gray-800' : 'text-gray-400'}`}>Estaciones de Gobierno</span>
                <span className="flex-shrink-0 text-xs text-gray-500">{sourceCounts.gobierno}</span>
              </button>
              {trailingSlot}
            </div>
            <div className="flex w-full items-center border-t border-gray-100 transition-colors hover:bg-gray-100/70">
              <button
                type="button"
                role="checkbox"
                aria-checked={citizenState === 'indeterminate' ? 'mixed' : citizenState === 'checked'}
                onClick={toggleCitizenGroup}
                className={`flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${rowPadding}`}
              >
                <LayerCheckbox state={citizenState} size={boxSize} />
                <span className={`min-w-0 flex-1 truncate text-sm font-medium ${citizenState === 'unchecked' ? 'text-gray-400' : 'text-gray-800'}`}>Sensores Ciudadanos</span>
                <span className="flex-shrink-0 text-xs text-gray-500">{sourceCounts.ciudadanos}</span>
              </button>
              <button
                type="button"
                onClick={() => setShowCitizenGroup((v) => !v)}
                className="mr-2 flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                aria-expanded={showCitizenGroup}
                aria-label={showCitizenGroup ? "Ocultar OCCAMM y Otros" : "Mostrar OCCAMM y Otros"}
              >
                <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${showCitizenGroup ? 'rotate-90' : ''}`} />
              </button>
            </div>
            {showCitizenGroup && (
              <div role="group" aria-label="Redes de sensores ciudadanos" className="disclosure-in flex flex-col">
                <div className="flex items-center border-t border-gray-100 transition-colors hover:bg-gray-100/70">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={showOccamm}
                    onClick={() => setShowOccamm((v) => !v)}
                    className={`ml-11 flex min-w-0 flex-1 items-center gap-3 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${subRowPadding}`}
                  >
                    <LayerCheckbox state={showOccamm ? 'checked' : 'unchecked'} size={boxSize} />
                    <span className={`min-w-0 flex-1 truncate text-sm ${showOccamm ? 'text-gray-600' : 'text-gray-400'}`}>OCCAMM</span>
                    <span className="flex-shrink-0 text-xs text-gray-500">{sourceCounts.occamm}</span>
                  </button>
                  <button
                    type="button"
                    onClick={onShowOccammInfo}
                    className="mr-2 flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                    aria-label="Más información sobre OCCAMM"
                  >
                    <Info className="h-3 w-3" />
                  </button>
                </div>
                {/* Same two-part row as OCCAMM above, with an invisible stand-in
                    for the info button. It used to reserve that space with a
                    hand-computed pr-[2.375rem], which was 2px short of what the
                    button actually measures, so the two counts did not line up.
                    sectionRow already reserves its own info slot this way. */}
                <div className="flex items-center border-t border-gray-100 transition-colors hover:bg-gray-100/70">
                  <button
                    type="button"
                    role="checkbox"
                    aria-checked={showOtros}
                    onClick={() => setShowOtros((v) => !v)}
                    className={`ml-11 flex min-w-0 flex-1 items-center gap-3 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${subRowPadding}`}
                  >
                    <LayerCheckbox state={showOtros ? 'checked' : 'unchecked'} size={boxSize} />
                    <span className={`min-w-0 flex-1 truncate text-sm ${showOtros ? 'text-gray-600' : 'text-gray-400'}`}>Otros</span>
                    <span className="flex-shrink-0 text-xs text-gray-500">{sourceCounts.otros}</span>
                  </button>
                  {trailingSlot}
                </div>
              </div>
            )}
          </div>
        )}
      </div>

      {/* Ubicación — state, then its municipalities. Every sensor sits under a
          row, so hiding everything really does empty the map. */}
      <div className="border-t border-gray-100">
        {sectionRow('ubicacion', 'Ubicación', ubicacionSummary)}
        {openSection === 'ubicacion' && (
          <div className="disclosure-in border-t border-gray-100 bg-gray-50/60">
            {estados.map((estado, i) => {
              const keys = estado.municipios.map((m) => m.key);
              const hidden = keys.filter((k) => hiddenMunicipios.includes(k)).length;
              const state: CheckState = hidden === 0 ? 'checked' : hidden === keys.length ? 'unchecked' : 'indeterminate';
              const open = openEstados.includes(estado.key);
              return (
                <div key={estado.key} className={i > 0 ? "border-t border-gray-100" : ""}>
                  <div className="flex w-full items-center transition-colors hover:bg-gray-100/70">
                    <button
                      type="button"
                      role="checkbox"
                      aria-checked={state === 'indeterminate' ? 'mixed' : state === 'checked'}
                      onClick={() => setHiddenMunicipios((prev) => state === 'checked'
                        ? [...prev, ...keys.filter((k) => !prev.includes(k))]
                        : prev.filter((k) => !keys.includes(k)))}
                      className={`flex min-w-0 flex-1 items-center gap-3 pl-4 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${rowPadding}`}
                    >
                      <LayerCheckbox state={state} size={boxSize} />
                      <span className={`min-w-0 flex-1 truncate text-sm font-medium ${state === 'unchecked' ? 'text-gray-400' : 'text-gray-800'}`}>
                        {estado.label}
                      </span>
                      <span className="flex-shrink-0 text-xs text-gray-500">{estado.count}</span>
                    </button>
                    <button
                      type="button"
                      onClick={() => setOpenEstados((prev) => open ? prev.filter((k) => k !== estado.key) : [...prev, estado.key])}
                      className="mr-2 flex-shrink-0 rounded-lg p-1.5 text-gray-400 transition-colors hover:bg-gray-200/70 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                      aria-expanded={open}
                      aria-label={open ? `Ocultar municipios de ${estado.label}` : `Mostrar municipios de ${estado.label}`}
                    >
                      <ChevronRight className={`h-4 w-4 transition-transform duration-200 ${open ? 'rotate-90' : ''}`} />
                    </button>
                  </div>
                  {open && (
                    <div role="group" aria-label={`Municipios de ${estado.label}`} className="disclosure-in flex flex-col">
                      {estado.municipios.map((m) => {
                        const on = !hiddenMunicipios.includes(m.key);
                        return (
                          <div key={m.key} className="flex items-center border-t border-gray-100 transition-colors hover:bg-gray-100/70">
                            <button
                              type="button"
                              role="checkbox"
                              aria-checked={on}
                              onClick={() => setHiddenMunicipios((prev) => on ? [...prev, m.key] : prev.filter((k) => k !== m.key))}
                              className={`ml-11 flex min-w-0 flex-1 items-center gap-3 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15 ${subRowPadding}`}
                            >
                              <LayerCheckbox state={on ? 'checked' : 'unchecked'} size={boxSize} />
                              <span className={`min-w-0 flex-1 truncate text-sm ${on ? 'text-gray-600' : 'text-gray-400'}`}>{m.label}</span>
                              <span className="flex-shrink-0 text-xs text-gray-500">{m.count}</span>
                            </button>
                            {trailingSlot}
                          </div>
                        );
                      })}
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        )}
      </div>

      <div className="border-t border-gray-100">
        {sectionRow('contaminante', 'Contaminante', 'PM2.5', {
          onClick: onShowPM25Info,
          ariaLabel: "Por qué medimos PM2.5",
        })}
        {/* No control here: unlike the filters above this is a selector, and
            with PM2.5 as the only live option there is nothing to operate. */}
        {openSection === 'contaminante' && (
          <div className="disclosure-in border-t border-gray-100 bg-gray-50/60">
            <div className={`flex items-center gap-3 pl-4 pr-2 ${rowPadding}`}>
              <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-800">PM2.5</span>
              <Check className="h-4 w-4 flex-shrink-0 text-gray-700" strokeWidth={2.5} />
              {trailingSlot}
            </div>
            {["PM10", "Ozono"].map((name) => (
              <div
                key={name}
                className={`flex items-center gap-3 border-t border-gray-100 pl-4 pr-2 ${rowPadding}`}
              >
                <span className="min-w-0 flex-1 truncate text-sm font-medium text-gray-400">{name}</span>
                <span className="flex-shrink-0 text-xs text-gray-500">No disponible</span>
                {trailingSlot}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
