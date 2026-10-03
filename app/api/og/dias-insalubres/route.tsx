import { ImageResponse } from "next/og";
import { createPublicClient } from "@/utils/supabase/public";
import {
  fetchDiasInsalubresMensual,
  monthlySummary,
  MONTHS_ES_FULL,
  type MonthData,
  type MonthlySummary,
  type Pollutant,
} from "@/lib/dias-insalubres-aggregate";
import { COLOR_CUBIERTO, COLOR_CUBIERTO_FILL_OPACITY, COLOR_INSALUBRE } from "@/lib/datos-colors";
import { fetchCoberturaCompacta } from "@/components/datos/cobertura-estaciones";
import type { CoberturaCompacta } from "@/components/datos/cobertura-estaciones-chart";
import { loadGoogleFont } from "@/lib/og-font";
import { loadOgLogo, OG_BRAND_BLUE, ogLogoAt } from "@/lib/og-logo";
import { isShareFormat, SHARE_FORMATS } from "@/lib/share-image-formats";
import { SECTION_CARD, SectionCard } from "@/lib/og-section-card";

// The downloadable, branded version of the /datos monthly summary card
// (components/datos/dias-insalubres-share.tsx, via its download menu) --
// one size per destination (?format=, see
// lib/share-image-formats.ts). ?format=link is the 1200x630 landscape card a
// shared /datos link unfurls with (app/datos/page.tsx's og:image): the same
// message and brand frame, laid out side by side to fit a link preview.
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
// Last year's numbers: gray-400, a step darker than the chart lines'
// gray-300 -- as a big numeral on a phone (and after WhatsApp's
// compression) gray-300 all but disappears, and it's the reference that
// gives this year's number its meaning.
const PAST_NUMBER_COLOR = "#9ca3af";


const GLYPHS =
  "Datos abiertos Gráficas descargas Dentro Ene Feb Mar Abr May Jun Jul Ago Sep Oct Nov Dic Observatorio del Aire abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúÁÉÍÓÚñÑüÜ .,:;·—–/()%°μg³² - observatoriodelaire.com días sobre la norma en el mismo periodo de los superaron Se registraron más menos los mismos que el sobre la norma frente PM2.5 PM10 Partículas finas gruesas Días en que las partículas en el aire superaron el límite para proteger la salud. Con base en NOM-025-SSA1-2021 Aún no hay datos para este año Fuente Gobierno Nuevo León Zona Metropolitana Monterrey No se pudo generar la imagen Falta el año";

type ImageOptions = ConstructorParameters<typeof ImageResponse>[1];

// The link-preview size every chat app and social network unfurls.
const LINK_CARD = SECTION_CARD;

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null;
  const formatParam = searchParams.get("format");
  const isLinkCard = formatParam === "link";
  const format = SHARE_FORMATS[isShareFormat(formatParam) ? formatParam : "whatsapp"];
  // The layout below is written at a 1080-wide design scale; px() scales
  // every measurement to this format's width.
  const px = (n: number) => Math.round((n * format.width) / 1080);
  // The central stat block also takes the format's own content scale.
  const cx = (n: number) => px(n * format.content);
  // The brand frame (logo + footer) takes the format's chrome scale.
  const fx = (n: number) => px(n * format.chrome);
  const logoAsset = ogLogoAt(isLinkCard ? 65 : fx(44));

  const options: ImageOptions = {
    width: isLinkCard ? LINK_CARD.width : format.width,
    height: isLinkCard ? LINK_CARD.height : format.height,
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

  // Both pollutants on one image: one share, one message (monthlySummary
  // in the aggregate lib, shared with the /datos summary card).
  let summary: MonthlySummary | null;
  let chartData: Record<Pollutant, MonthData[]>;
  try {
    const supabase = createPublicClient();
    chartData = await fetchDiasInsalubresMensual(supabase);
    summary = monthlySummary(chartData, year);
  } catch {
    return messageCard(options, px(32), "No se pudo generar la imagen.");
  }
  if (summary === null) {
    return messageCard(options, px(32), "Aún no hay datos para este año.");
  }
  const { mes, rows: rowsOut, hasPrior, headline: headlineLines } = summary;
  const mesNombre = MONTHS_ES_FULL[mes - 1];

  if (isLinkCard) return linkCard(options, year, logo, await fetchCoberturaCompacta().catch(() => null));

  // This year's number is always red: any day of polluted air is bad news,
  // even in a month with fewer of them than a year earlier (the headline
  // carries the más/menos comparison). Last year's number is the gray
  // reference.
  const verdictColor = COLOR_INSALUBRE;
  const years = hasPrior ? [year - 1, year] : [year];
  // Headline capped at 1.12, measured: a
  // 33-character line ("En septiembre 2026 se registraron") still fits the
  // narrowest text column there. A longer line ("los mismos días sobre la
  // norma de salud") scales the whole headline down in proportion, so it
  // never wraps into a fourth line. The pollutant table capped where its
  // three columns still fit the story's width.
  const longestLine = Math.max(...headlineLines.map((l) => l.length));
  const hx = (n: number) => px(n * Math.min(format.content, 1.12, (1.12 * 33) / longestLine));
  const tx = (n: number) => px(n * Math.min(format.content, 1.2));
  // At lineHeight 1, Inter's baseline sits ~0.135em above the bottom of the
  // line box. Bottom-aligned text of size `small` next to size `big` needs
  // this much bottom padding to share `big`'s baseline.
  // 84, down from 115: the headline reads first, the numbers follow as its
  // evidence (at 115 they outweighed the sentence).
  const NUMBER_SIZE = 84;
  const LABEL_COL = 250;
  const baseLift = (big: number, small: number) => tx(0.135 * (big - small));

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

          <div
            style={{ display: "flex", flexDirection: "column", flex: 1, justifyContent: "center", paddingTop: px(56) }}
          >
            {/* Logo (who says it) -> verdict (what they say) -> both
                pollutants' numbers (the evidence) -> footer (source). */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: hx(47),
                // 600 in gray-800, not 700 near-black: lets the numbers
                // below lead instead of competing with them.
                fontWeight: 600,
                color: "#1f2937",
                lineHeight: 1.15,
                // Satori squeezes text blocks in an overfull column instead
                // of letting them push; none of these may shrink.
                flexShrink: 0,
              }}
            >
              {headlineLines.map((line) => (
                <div key={line} style={{ display: "flex" }}>
                  {line}
                </div>
              ))}
            </div>

            {/* One row per pollutant: last year (gray reference), this
                year (always red), bare numbers (the headline already says
                "días"). The two number columns share the full width.
                Satori's alignItems:"baseline" doesn't line up text of very
                different sizes, so each row is bottom-aligned at lineHeight
                1 and the small text is lifted by baseLift() onto the big
                number's baseline. */}
            <div style={{ display: "flex", flexDirection: "column", gap: tx(44), marginTop: tx(72), flexShrink: 0 }}>
              <div style={{ display: "flex", fontSize: tx(24), fontWeight: 600, color: "#6b7280" }}>
                <div style={{ display: "flex", width: tx(LABEL_COL) }} />
                {years.map((y) => (
                  <div key={y} style={{ display: "flex", flex: 1 }}>
                    {mesNombre} {y}
                  </div>
                ))}
              </div>
              {rowsOut.map((r) => (
                <div key={r.pollutant} style={{ display: "flex", alignItems: "flex-end" }}>
                  <div
                    style={{
                      display: "flex",
                      flexDirection: "column",
                      width: tx(LABEL_COL),
                      lineHeight: 1,
                      gap: tx(8),
                      paddingBottom: baseLift(NUMBER_SIZE, 20),
                    }}
                  >
                    <div style={{ display: "flex", fontSize: tx(30), fontWeight: 600, color: "#374151" }}>
                      {POLLUTANT_LABEL[r.pollutant]}
                    </div>
                    {/* The one limit both years' numbers in this row count
                        against. */}
                    <div style={{ display: "flex", fontSize: tx(20), color: "#9ca3af", marginTop: tx(2) }}>
                      Límite: {r.limit} µg/m³
                    </div>
                  </div>
                  {years.map((y) => (
                    <div
                      key={y}
                      style={{
                        display: "flex",
                        flex: 1,
                        fontSize: tx(NUMBER_SIZE),
                        fontWeight: 700,
                        lineHeight: 1,
                        color: y === year ? verdictColor : PAST_NUMBER_COLOR,
                      }}
                    >
                      {y === year ? r.current : (r.prior as number)}
                    </div>
                  ))}
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
                {/* Two sources, one per line, each behind a dot so they read
                    as a list: the data (SIMA) and the norm the days are
                    judged against. A drawn dot, not a glyph: crisp at any
                    scale and not dependent on the font subset. */}
                {["Sistema Integral de Monitoreo Ambiental (SIMA) de Nuevo León", "NOM-025-SSA1-2021"].map((src) => (
                  <div key={src} style={{ display: "flex", alignItems: "center", gap: fx(10), color: "#6b7280" }}>
                    <div style={{ display: "flex", width: fx(5), height: fx(5), borderRadius: fx(5), background: "#9ca3af" }} />
                    {src}
                  </div>
                ))}
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

// The /datos link card, built like the /mapa one: the coverage chart's
// calendars (one per station, weeks as columns, weekdays as rows, this year,
// PM2.5) stacked on the right as the backdrop, in the chart's own colors --
// blue for a day with valid data, gray for a known gap, faded gray for a day
// not synced yet. It introduces the data section, so it states no figure.
function linkCard(options: ImageOptions, year: number, logo: string | null, cobertura: CoberturaCompacta | null) {
  const { width: W, height: H } = SECTION_CARD;
  const CELL = 14;
  const GAP = 3;
  const PITCH = CELL + GAP;
  const STATION_GAP = 26;
  const STATIONS = 4;
  const jan1 = Date.UTC(year, 0, 1);
  // Monday-first weekday of Jan 1, so each column is one calendar week.
  const lead = (new Date(jan1).getUTCDay() + 6) % 7;
  const days = (Date.UTC(year + 1, 0, 1) - jan1) / 86_400_000;
  const weeks = Math.ceil((lead + days) / 7);
  const gridW = weeks * PITCH - GAP;
  const left = W - 56 - gridW;
  const blockH = 7 * PITCH - GAP;
  const top = (H - (STATIONS * blockH + (STATIONS - 1) * STATION_GAP)) / 2;

  const { fechas, porEstacion } = cobertura?.["PM2.5"] ?? { fechas: [], porEstacion: {} };
  const index = new Map(fechas.map((f, i) => [f, i]));
  const codes = Object.values(porEstacion).slice(0, STATIONS);

  const backdrop = (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
      {codes.map((code, s) =>
        Array.from({ length: days }, (_, d) => {
          const fecha = new Date(jan1 + d * 86_400_000).toISOString().slice(0, 10);
          const i = index.get(fecha);
          const c = i === undefined ? "-" : code[i];
          const pos = lead + d;
          return (
            <rect
              key={`${s}-${d}`}
              x={left + Math.floor(pos / 7) * PITCH}
              y={top + s * (blockH + STATION_GAP) + (pos % 7) * PITCH}
              width={CELL}
              height={CELL}
              rx={2.5}
              fill={c === "1" ? COLOR_CUBIERTO : COLOR_INSUFICIENTE}
              fillOpacity={c === "1" ? COLOR_CUBIERTO_FILL_OPACITY : c === "0" ? 1 : NO_DATA_FILL_OPACITY}
            />
          );
        }),
      )}
    </svg>
  );

  return new ImageResponse(
    <SectionCard backdrop={backdrop} headline={["Datos de", "calidad del aire"]} logo={logo} />,
    options,
  );
}

// The coverage chart's own gap colors (components/datos/cobertura-estaciones-chart.tsx).
const COLOR_INSUFICIENTE = "#dbdfe3";
const NO_DATA_FILL_OPACITY = 0.4;

