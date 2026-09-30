import { ImageResponse } from "next/og";
import { createPublicClient } from "@/utils/supabase/public";
import {
  fetchDiasInsalubresMensual,
  summarizeYear,
  type Pollutant,
} from "@/lib/dias-insalubres-aggregate";
import { COLOR_INSALUBRE, COLOR_SALUDABLE } from "@/lib/datos-colors";
import { loadGoogleFont } from "@/lib/og-font";
import { loadOgLogo, OG_BRAND_BLUE, OG_LOGO_HEIGHT, OG_LOGO_WIDTH } from "@/lib/og-logo";

// The branded stat card behind the días insalubres chart's "Compartir"
// button (components/datos/dias-insalubres-chart.tsx) -- a square image
// sized for Instagram/WhatsApp, not the 1200x630 landscape unfurl card
// app/api/og/route.tsx renders for a shared sensor link. Summarizes the
// requested year+pollutant via the same summarizeYear() the chart itself
// uses, so the number on the downloaded image can never drift from the
// number shown on screen. Static per year+pollutant (only the monthly cron
// changes it), so this caches far longer than the live-reading sensor card.
const CACHE = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

const POLLUTANT_LABEL: Record<Pollutant, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
};

const GLYPHS =
  "Observatorio del Aire abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúÁÉÍÓÚñÑüÜ .,:;·—–/()%°μg³² - observatoriodelaire.com días sobre la norma en el mismo periodo de más menos mismos Fuente Gobierno Nuevo León Zona Metropolitana Monterrey No se pudo generar la imagen Falta el año";

type ImageOptions = ConstructorParameters<typeof ImageResponse>[1];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null;
  const pollutant: Pollutant = searchParams.get("pollutant") === "pm10" ? "pm10" : "pm25";

  const options: ImageOptions = {
    width: 1080,
    height: 1080,
    headers: { "cache-control": CACHE },
  };
  const logo = await loadOgLogo(request.url);
  try {
    const [f400, f600, f700] = await Promise.all([
      loadGoogleFont(400, GLYPHS),
      loadGoogleFont(600, GLYPHS),
      loadGoogleFont(700, GLYPHS),
    ]);
    options.fonts = [
      { name: "Inter", data: f400, weight: 400, style: "normal" },
      { name: "Inter", data: f600, weight: 600, style: "normal" },
      { name: "Inter", data: f700, weight: 700, style: "normal" },
    ];
  } catch {
    // Fall back to Satori's bundled font rather than fail the download.
  }

  if (year === null) {
    return messageCard(options, "Falta el año.");
  }

  let total: number;
  let deltaText: string | null;
  let deltaColor: string | undefined;
  try {
    const supabase = createPublicClient();
    const data = await fetchDiasInsalubresMensual(supabase);
    const summary = summarizeYear(data[pollutant], year);
    total = summary.total;
    deltaColor =
      summary.priorYearDelta === null || summary.priorYearDelta === 0
        ? undefined
        : summary.priorYearDelta < 0
          ? COLOR_SALUDABLE
          : COLOR_INSALUBRE;
    deltaText =
      summary.priorYearDelta === null
        ? null
        : summary.priorYearDelta === 0
          ? `mismos días que en el mismo periodo de ${year - 1}`
          : `${Math.abs(summary.priorYearDelta)} día${Math.abs(summary.priorYearDelta) === 1 ? "" : "s"} ${summary.priorYearDelta < 0 ? "menos" : "más"} que en el mismo periodo de ${year - 1}`;
  } catch {
    return messageCard(options, "No se pudo generar la imagen.");
  }

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: "100%",
          height: "100%",
          background: "#ffffff",
          fontFamily: "Inter",
        }}
      >
        <div style={{ height: 14, background: OG_BRAND_BLUE }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "72px 80px" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={OG_LOGO_WIDTH} height={OG_LOGO_HEIGHT} alt="" />
          ) : (
            <div
              style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#111827", letterSpacing: -0.5 }}
            >
              Observatorio del Aire
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ display: "flex", fontSize: 30, fontWeight: 500, color: "#6b7280", marginBottom: 20 }}>
              Zona Metropolitana de Monterrey
            </div>
            <div style={{ display: "flex", fontSize: 220, fontWeight: 700, color: COLOR_INSALUBRE, lineHeight: 1 }}>
              {total}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: 40,
                fontWeight: 600,
                color: "#111827",
                marginTop: 8,
                marginBottom: 16,
              }}
            >
              días sobre la norma de {POLLUTANT_LABEL[pollutant]} en {year}
            </div>
            {deltaText && (
              <div style={{ display: "flex", fontSize: 28, fontWeight: 600, color: deltaColor ?? "#6b7280" }}>
                {deltaText}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: 40,
              paddingTop: 32,
              borderTop: "2px solid #e5e7eb",
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: 20 }}>
              <div style={{ display: "flex", flexDirection: "column", gap: 4 }}>
                <div style={{ display: "flex", fontSize: 18, color: "#9ca3af" }}>Fuente</div>
                <div style={{ display: "flex", color: "#6b7280" }}>Sistema Integral de Monitoreo Ambiental (SIMA) de Nuevo León</div>
              </div>
              <div style={{ display: "flex", flexShrink: 0, fontWeight: 600, color: "#6b7280" }}>observatoriodelaire.com</div>
            </div>
          </div>
        </div>
      </div>
    ),
    options,
  );
}

function messageCard(options: ImageOptions, message: string) {
  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          alignItems: "center",
          justifyContent: "center",
          width: "100%",
          height: "100%",
          background: "#ffffff",
          fontFamily: "Inter",
          fontSize: 32,
          color: "#6b7280",
        }}
      >
        {message}
      </div>
    ),
    options,
  );
}
