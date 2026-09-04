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
  sourceCounts,
  onShowOccammInfo,
  onShowFuenteInfo,
}: {
  showOtros: boolean;
  setShowOtros: Dispatch<SetStateAction<boolean>>;
  showOccamm: boolean;
  setShowOccamm: Dispatch<SetStateAction<boolean>>;
  showSima: boolean;
  setShowSima: Dispatch<SetStateAction<boolean>>;
  sourceCounts: { occamm: number; otros: number; ciudadanos: number; gobierno: number };
  onShowOccammInfo: () => void;
  onShowFuenteInfo: () => void;
}) {
  // Fixed sizes: `compact` was passed false at both call sites, and shrinking
  // rows on mobile is the wrong direction for touch targets anyway.
  const rowPadding = "py-3.5";
  const subRowPadding = "py-3";
  const boxSize = 18;
  // Every row in the panel ends in a 28px control box: an info button, a
  // chevron, or, for the rows that carry neither, this spacer. Without it the
  // counts landed on different rails and read as a ragged column.
  const trailingSlot = <span aria-hidden="true" className="mr-2 h-7 w-7 flex-shrink-0" />;
  const [showCitizenGroup, setShowCitizenGroup] = useState(false);
  // Fuente is the only section now (Contaminante is PM2.5-only, Ubicación was
  // municipio faceting nobody asked for). It stays collapsible so the panel can
  // shrink to its one-line summary.
  const [fuenteOpen, setFuenteOpen] = useState(true);
  const citizenState: CheckState =
    showOtros && showOccamm ? 'checked' :
    !showOtros && !showOccamm ? 'unchecked' : 'indeterminate';

  const toggleCitizenGroup = () => {
    const next = citizenState !== 'checked';
    setShowOtros(next);
    setShowOccamm(next);
  };

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

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div>
        {/* One control opens the section: label, summary and chevron are a
            single button, so there is one tab stop and one thing to announce.
            The info icon is the only other control, and carries its own
            padding — an unpadded 12px icon is half the practical minimum hit
            area. */}
        <div className="flex items-center transition-colors hover:bg-gray-50">
          <button
            type="button"
            onClick={() => setFuenteOpen((v) => !v)}
            aria-expanded={fuenteOpen}
            className="flex min-w-0 flex-1 items-center gap-1.5 py-3.5 pl-4 pr-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15"
          >
            <p className="text-xs font-medium uppercase leading-none tracking-wide text-gray-400">Fuente</p>
            <span className="min-w-0 flex-1 truncate text-xs leading-none text-gray-500">· {fuenteSummary}</span>
            <ChevronRight className={`h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${fuenteOpen ? 'rotate-90' : ''}`} />
          </button>
          <button
            type="button"
            onClick={onShowFuenteInfo}
            className="mr-2 flex-shrink-0 rounded-lg p-2 text-gray-400 transition-colors hover:bg-gray-100 hover:text-gray-600 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
            aria-label="Más información sobre las fuentes de datos"
          >
            <Info className="h-3 w-3" />
          </button>
        </div>
        {fuenteOpen && (
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
                    for the info button so the two counts line up. */}
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
    </div>
  );
}
