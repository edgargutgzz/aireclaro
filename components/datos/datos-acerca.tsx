import { fetchPrimerMes, fetchUltimoMes } from "@/lib/datos-cache";
import { MONTHS_ES_FULL } from "@/lib/dias-insalubres-aggregate";
import DatosGeneralInfo from "@/components/datos/datos-general-info";

// "Sobre los datos", near the foot of /datos: the context every chart above
// shares, for whoever wants it after reading the charts (2026-10-06: charts
// first, sources/period/download after, the Our World in Data order). The
// period and frequency are labelled facts, INEGI style ("Periodo · Actualización"),
// not a sentence. Same shell and header recipe as ChartCard, so it reads as
// one more card in the page's column.

const monthLabel = (m: { ano: number; mes: number }) =>
  `${MONTHS_ES_FULL[m.mes - 1].toLowerCase()} ${m.ano}`;

export default async function DatosAcerca() {
  const [primer, ultimo] = await Promise.all([
    fetchPrimerMes().catch(() => null),
    fetchUltimoMes().catch(() => null),
  ]);

  return (
    <div className="overflow-hidden rounded-2xl border border-gray-200 bg-white">
      <div className="border-b border-gray-100 px-5 pb-3 pt-4">
        <h3 className="text-lg font-medium text-gray-700">Sobre los datos</h3>
        {primer && ultimo && (
          <div className="mt-1 text-xs text-gray-500 md:text-sm">
            <span className="font-medium text-gray-700">Periodo:</span> {monthLabel(primer)} a {monthLabel(ultimo)}
            <span className="px-2 text-gray-300" aria-hidden>
              ·
            </span>
            <span className="font-medium text-gray-700">Actualización:</span> mensual
          </div>
        )}
      </div>
      <div className="px-5 pb-5 pt-4">
        <DatosGeneralInfo />
      </div>
    </div>
  );
}
