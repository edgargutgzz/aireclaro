import { ImageResponse } from "next/og";
import { createPublicClient } from "@/utils/supabase/public";
import {
  fetchDiasInsalubresMensual,
  MONTHS_ES_FULL,
  type Pollutant,
} from "@/lib/dias-insalubres-aggregate";
import { COLOR_YEAR_CURRENT, COLOR_YEAR_PAST } from "@/lib/datos-colors";
import { LIMITE_ACTUAL_PM10, LIMITE_ACTUAL_PM25 } from "@/lib/pm25-limits";
import { loadGoogleFont } from "@/lib/og-font";
import { loadOgLogo, OG_BRAND_BLUE, ogLogoAt } from "@/lib/og-logo";
import { isShareFormat, SHARE_FORMATS } from "@/lib/share-image-formats";

// The branded stat card behind the días insalubres chart's download menu
// (components/datos/download-image-menu.tsx) -- one size per destination
// (?format=, see lib/share-image-formats.ts), not the 1200x630 landscape unfurl card
// app/api/og/route.tsx renders for a shared sensor link.
//
// The message is the monthly update: the latest month with data in the
// requested year vs. the same month a year earlier, both counted against
// today's limit (dias_insalubres_limite_actual) -- the same numbers as the
// chart's comparison view, so the image can't drift from the page. Static
// per year+pollutant (only the monthly cron changes it), so this caches far
// longer than the live-reading sensor card.
const CACHE = "public, max-age=0, s-maxage=3600, stale-while-revalidate=86400";

const POLLUTANT_LABEL: Record<Pollutant, string> = {
  pm25: "PM2.5",
  pm10: "PM10",
};
const LIMITE_ACTUAL: Record<Pollutant, number> = {
  pm25: LIMITE_ACTUAL_PM25,
  pm10: LIMITE_ACTUAL_PM10,
};

const GLYPHS =
  "Observatorio del Aire abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúÁÉÍÓÚñÑüÜ .,:;·—–/()%°μg³² - observatoriodelaire.com días sobre la norma en el mismo periodo de los superaron Más Menos Los mismos que el límite ambos años Límite µg/m³ con medición Aún no hay datos para este año Fuente Gobierno Nuevo León Zona Metropolitana Monterrey No se pudo generar la imagen Falta el año";

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
  // The central stat block also takes the format's own content scale.
  const cx = (n: number) => px(n * format.content);
  // The brand frame (logo + footer) takes the format's chrome scale.
  const fx = (n: number) => px(n * format.chrome);
  const logoAsset = ogLogoAt(fx(44));

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

  type YearPoint = { ano: number; dias: number; totales: number };
  let mes: number;
  let current: YearPoint;
  let prior: YearPoint | null;
  try {
    const supabase = createPublicClient();
    const rows = (await fetchDiasInsalubresMensual(supabase))[pollutant];
    // The latest month the monthly cron has processed for this year (the
    // data decides, never the calendar).
    const latest = rows
      .filter((r) => r.ano === year && r.diasTotales > 0 && r.diasInsalubresLimiteActual !== null)
      .sort((x, y) => y.mesNumero - x.mesNumero)[0];
    if (!latest) {
      return messageCard(options, px(32), "Aún no hay datos para este año.");
    }
    mes = latest.mesNumero;
    current = { ano: year, dias: latest.diasInsalubresLimiteActual as number, totales: latest.diasTotales };
    const before = rows.find(
      (r) => r.ano === year - 1 && r.mesNumero === mes && r.diasTotales > 0 && r.diasInsalubresLimiteActual !== null,
    );
    prior = before
      ? { ano: year - 1, dias: before.diasInsalubresLimiteActual as number, totales: before.diasTotales }
      : null;
  } catch {
    return messageCard(options, px(32), "No se pudo generar la imagen.");
  }

  const mesNombre = MONTHS_ES_FULL[mes - 1];
  const mesMin = mesNombre.toLowerCase();
  const eyebrow = `${mesNombre} de ${year} · ${POLLUTANT_LABEL[pollutant]}`;
  // The verdict, always two set lines. "Más/menos días sobre el límite",
  // not "respiramos mejor/peor": a day counts when any one station exceeded
  // the limit, which says that much and no more.
  const headlineLines = prior
    ? [
        current.dias > prior.dias
          ? "Más días sobre el límite"
          : current.dias < prior.dias
            ? "Menos días sobre el límite"
            : "Los mismos días sobre el límite",
        `que en ${mesMin} de ${prior.ano}`,
      ]
    : [`${current.dias} días sobre el límite`, `en ${mesMin} de ${year}`];
  const points = prior ? [prior, current] : [current];
  const context = [
    "Zona Metropolitana de Monterrey",
    `Límite de ${POLLUTANT_LABEL[pollutant]}: ${LIMITE_ACTUAL[pollutant]} µg/m³${prior ? " en ambos años" : ""}`,
  ];
  // Headline and numbers scale with the format but are capped where the
  // longest verdict ("Los mismos días sobre el límite") must stay on one line.
  const hx = (n: number) => px(n * Math.min(format.content, 1.45));

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
              style={{ display: "flex", fontSize: fx(30), fontWeight: 700, color: "#111827", letterSpacing: px(-0.5) }}
            >
              Observatorio del Aire
            </div>
          )}

          <div style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center" }}>
            {/* Logo (who says it) -> month + verdict + the two numbers (the
                finding) -> where / which limit -> footer (source). */}
            <div style={{ display: "flex", fontSize: hx(26), fontWeight: 600, color: "#6b7280", marginBottom: cx(12) }}>
              {eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: hx(46),
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.15,
              }}
            >
              {headlineLines.map((line) => (
                <div key={line} style={{ display: "flex" }}>
                  {line}
                </div>
              ))}
            </div>

            {/* Past year gray, current year blue: the same colors as the
                chart's comparison view. */}
            <div style={{ display: "flex", gap: cx(72), marginTop: cx(48) }}>
              {points.map((pt) => {
                const isCurrent = pt.ano === year;
                return (
                  <div key={pt.ano} style={{ display: "flex", flexDirection: "column" }}>
                    <div style={{ display: "flex", fontSize: cx(26), fontWeight: 600, color: "#6b7280" }}>
                      {mesNombre} {pt.ano}
                    </div>
                    <div
                      style={{
                        display: "flex",
                        alignItems: "baseline",
                        gap: cx(12),
                        color: isCurrent ? COLOR_YEAR_CURRENT : COLOR_YEAR_PAST,
                      }}
                    >
                      <div style={{ display: "flex", fontSize: cx(150), fontWeight: 700, lineHeight: 1.05 }}>
                        {pt.dias}
                      </div>
                      <div style={{ display: "flex", fontSize: cx(34), fontWeight: 600 }}>
                        {pt.dias === 1 ? "día" : "días"}
                      </div>
                    </div>
                    <div style={{ display: "flex", fontSize: cx(22), color: "#9ca3af" }}>
                      de {pt.totales} con medición
                    </div>
                  </div>
                );
              })}
            </div>

            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: cx(24),
                lineHeight: 1.4,
                color: "#6b7280",
                marginTop: cx(44),
              }}
            >
              {context.map((line) => (
                <div key={line} style={{ display: "flex" }}>
                  {line}
                </div>
              ))}
            </div>
          </div>

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              marginTop: px(40),
              paddingTop: fx(32),
              borderTop: `${px(2)}px solid #e5e7eb`,
            }}
          >
            <div
              style={{
                display: "flex",
                flexDirection: format.stackFooter ? "column" : "row",
                justifyContent: "space-between",
                alignItems: format.stackFooter ? "flex-start" : "flex-end",
                gap: format.stackFooter ? fx(20) : 0,
                fontSize: fx(20),
              }}
            >
              <div style={{ display: "flex", flexDirection: "column", gap: fx(4) }}>
                <div style={{ display: "flex", fontSize: fx(18), color: "#9ca3af" }}>Fuente</div>
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
