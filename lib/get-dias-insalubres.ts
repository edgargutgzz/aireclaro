import SimaDiasInsalubres, { type DiaInsalubre } from "@/components/data/sima-dias-insalubres";
import { getDiasInsalubresHistorico } from "@/lib/dias-insalubres-historico";

export default async function getDiasInsalubres(year: number, month: number): Promise<DiaInsalubre[]> {
  const historico = getDiasInsalubresHistorico(year, month);
  if (historico) return historico;
  return SimaDiasInsalubres(year, month);
}
