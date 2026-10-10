import { NextRequest, NextResponse } from "next/server";
import { revalidateTag } from "next/cache";
import { DATOS_CACHE_TAG } from "@/lib/datos-cache";
import { createServiceClient } from "@/utils/supabase/service";
import { DEFAULT_PARAMS, iso, syncMedicionesFinales } from "@/lib/sima-finales-sync";

// Keeps the month in progress in sima_mediciones_finales (and so in the
// sima_promedios_diarios view): every run re-pulls the 1st through yesterday,
// so hours SINAICA receives late are picked up the next week. Table only: the
// /datos chart tables stay on the monthly sync, which pulls the full month on
// the 1st.

export const maxDuration = 120;

export async function GET(request: NextRequest) {
  const authHeader = request.headers.get("authorization");
  if (authHeader !== `Bearer ${process.env.CRON_SECRET}`) {
    return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  }

  const now = new Date();
  const fechaInit = iso(new Date(Date.UTC(now.getUTCFullYear(), now.getUTCMonth(), 1)));
  const fechaFin = iso(now); // exclusive: today is still in progress
  if (fechaInit === fechaFin) {
    return NextResponse.json({ fechaInit, fechaFin, rowsWritten: 0, skipped: "first of the month" });
  }

  const supabase = createServiceClient();

  let sync;
  try {
    sync = await syncMedicionesFinales(supabase, fechaInit, fechaFin, DEFAULT_PARAMS);
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : String(err) },
      { status: 500 },
    );
  }

  // The download card's "latest date" reads this table through the /datos
  // cache; the chart tables it also caches are unchanged, so expiring it only
  // costs a re-read.
  if (sync.rowsWritten > 0) revalidateTag(DATOS_CACHE_TAG, { expire: 0 });

  if (sync.errors.length > 0) {
    console.error("sima-weekly-sync errors:", sync.errors);
  }

  return NextResponse.json({ fechaInit, fechaFin, params: DEFAULT_PARAMS, ...sync });
}
