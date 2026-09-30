import { ImageResponse } from "next/og";
import { createPublicClient } from "@/utils/supabase/public";
import {
  fetchDiasInsalubresMensual,
  summarizeYear,
  type Pollutant,
} from "@/lib/dias-insalubres-aggregate";
import { COLOR_INSALUBRE, COLOR_SALUDABLE } from "@/lib/datos-colors";
import { loadGoogleFont } from "@/lib/og-font";
import { loadOgLogo, OG_BRAND_BLUE, OG_LOGO, OG_LOGO_LARGE } from "@/lib/og-logo";
import { isShareFormat, SHARE_FORMATS } from "@/lib/share-image-formats";

// The branded stat card behind the días insalubres chart's download menu
// (components/datos/download-image-menu.tsx) -- one size per destination
// (?format=, see lib/share-image-formats.ts), not the 1200x630 landscape unfurl card
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
  const formatParam = searchParams.get("format");
  const format = SHARE_FORMATS[isShareFormat(formatParam) ? formatParam : "whatsapp"];
  // The layout below is written at a 1080-wide design scale; px() scales
  // every measurement to this format's width.
  const px = (n: number) => Math.round((n * format.width) / 1080);
  const logoAsset = format.width > 1080 ? OG_LOGO_LARGE : OG_LOGO;

  const options: ImageOptions = {
    width: format.width,
    height: format.height,
    headers: { "cache-control": CACHE },
  };
  const logo = await loadOgLogo(request.url, logoAsset);
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
    return messageCard(options, px(32), "Falta el año.");
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
    return messageCard(options, px(32), "No se pudo generar la imagen.");
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
        <div style={{ height: px(14), background: OG_BRAND_BLUE }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: `${px(format.padTop)}px ${px(80)}px ${px(format.padBottom)}px` }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={logoAsset.width} height={logoAsset.height} alt="" />
          ) : (
            <div
              style={{ display: "flex", fontSize: px(30), fontWeight: 700, color: "#111827", letterSpacing: px(-0.5) }}
            >
              Observatorio del Aire
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            <div style={{ display: "flex", fontSize: px(30), fontWeight: 500, color: "#6b7280", marginBottom: px(20) }}>
              Zona Metropolitana de Monterrey
            </div>
            <div style={{ display: "flex", fontSize: px(220), fontWeight: 700, color: COLOR_INSALUBRE, lineHeight: 1 }}>
              {total}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: px(40),
                fontWeight: 600,
                color: "#111827",
                marginTop: px(8),
                marginBottom: px(16),
              }}
            >
              días sobre la norma de {POLLUTANT_LABEL[pollutant]} en {year}
            </div>
            {deltaText && (
              <div style={{ display: "flex", fontSize: px(28), fontWeight: 600, color: deltaColor ?? "#6b7280" }}>
                {deltaText}
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: px(40),
              paddingTop: px(32),
              borderTop: `${px(2)}px solid #e5e7eb`,
            }}
          >
            <div style={{ display: "flex", justifyContent: "space-between", alignItems: "flex-end", fontSize: px(20) }}>
              <div style={{ display: "flex", flexDirection: "column", gap: px(4) }}>
                <div style={{ display: "flex", fontSize: px(18), color: "#9ca3af" }}>Fuente</div>
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

function messageCard(options: ImageOptions, fontSize: number, message: string) {
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
          fontSize,
          color: "#6b7280",
        }}
      >
        {message}
      </div>
    ),
    options,
  );
}
