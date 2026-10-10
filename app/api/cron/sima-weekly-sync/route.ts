import { NextRequest, NextResponse } from "next/server";
import { createServiceClient } from "@/utils/supabase/service";
import { DEFAULT_PARAMS, iso, syncMedicionesFinales } from "@/lib/sima-finales-sync";

// Keeps the month in progress in sima_mediciones_finales (and so in the
// sima_promedios_diarios view) for internal analysis: every run re-pulls the
// 1st through yesterday, so hours SINAICA receives late are picked up the next
// week. Table only, nothing on /datos changes: the charts and the download
// stop at the latest month the monthly sync has published.

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

  if (sync.errors.length > 0) {
    console.error("sima-weekly-sync errors:", sync.errors);
  }

  return NextResponse.json({ fechaInit, fechaFin, params: DEFAULT_PARAMS, ...sync });
}
