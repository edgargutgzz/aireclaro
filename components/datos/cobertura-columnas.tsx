import { fetchEstaciones } from "@/lib/datos-cache";
import { fetchCoberturaCompacta } from "@/components/datos/cobertura-estaciones";
import CoberturaColumnasChart from "@/components/datos/cobertura-columnas-chart";

// Same cached read as CoberturaEstaciones, so the second view costs no query.
export default async function CoberturaColumnas({ dark = false }: { dark?: boolean }) {
  const [estaciones, cobertura] = await Promise.all([fetchEstaciones(), fetchCoberturaCompacta()]);
  return <CoberturaColumnasChart estaciones={estaciones} cobertura={cobertura} dark={dark} />;
}
