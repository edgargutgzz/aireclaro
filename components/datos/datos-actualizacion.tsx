import { fetchUltimoMes } from "@/lib/datos-cache";
import { monterreyNaiveNow } from "@/lib/monterrey-time";

const TZ = "America/Monterrey";
const fecha = new Intl.DateTimeFormat("es-MX", { day: "numeric", month: "long", year: "numeric", timeZone: TZ });
const mes = (ano: number, m: number) =>
  new Intl.DateTimeFormat("es-MX", { month: "long", timeZone: "UTC" }).format(new Date(Date.UTC(ano, m - 1, 1)));

// The quiet line above the first chart that says the page is alive: when the
// latest month was published and when the next one comes. The next update is
// the month after publishing, or the current month if that one is already
// late, so the line never names a month that has passed.
export default async function DatosActualizacion() {
  const ultimo = await fetchUltimoMes().catch(() => null);
  if (!ultimo?.updated_at) return null;

  const publicado = new Date(ultimo.updated_at);
  const [pubAno, pubMes] = new Intl.DateTimeFormat("en-CA", { year: "numeric", month: "2-digit", timeZone: TZ })
    .format(publicado)
    .split("-")
    .map(Number);
  const [hoyAno, hoyMes] = monterreyNaiveNow().slice(0, 7).split("-").map(Number);
  const siguiente = Math.max(pubAno * 12 + pubMes, hoyAno * 12 + hoyMes - 1) + 1;
  const sigAno = Math.floor((siguiente - 1) / 12);
  const sigMes = ((siguiente - 1) % 12) + 1;

  const datos = mes(ultimo.ano, ultimo.mes) + (ultimo.ano !== pubAno ? ` de ${ultimo.ano}` : "");
  const proxima = mes(sigAno, sigMes) + (sigAno !== hoyAno ? ` de ${sigAno}` : "");

  return (
    <p className="mb-4 text-sm text-neutral-500">
      Actualizado el {fecha.format(publicado)} con los datos de {datos}. Próxima actualización: {proxima}.
    </p>
  );
}
