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
import { COLOR_INSALUBRE, COLOR_YEAR_CURRENT, COLOR_YEAR_PAST } from "@/lib/datos-colors";
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

  if (isLinkCard) return linkCard(options, year, logo, chartData.pm25);

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

// The /datos link card, built like the /mapa one: chart 1's comparison
// view (one line per year, PM2.5, every year counted against today's limit
// so the lines compare on one yardstick) fills the card as its backdrop:
// past years gray, this year violet with a soft fill under it. It introduces
// the data section, so it states no single figure.
function linkCard(options: ImageOptions, year: number, logo: string | null, months: MonthData[]) {
  const { width: W, height: H } = SECTION_CARD;
  const X0 = 470;
  const X1 = W - 70;
  const Y0 = 70;
  const Y1 = H - 70;
  const years = [year - 1, year];
  const series = years.map((y) =>
    months
      .filter((m) => m.ano === y)
      .sort((a, b) => a.mesNumero - b.mesNumero)
      .map((m) => ({ mes: m.mesNumero, v: m.diasInsalubresLimiteActual ?? m.diasInsalubres })),
  );
  const max = Math.max(10, ...series.flat().map((p) => p.v));
  const x = (mes: number) => X0 + ((mes - 1) / 11) * (X1 - X0);
  const yPos = (v: number) => Y1 - (v / max) * (Y1 - Y0);
  const pts = (s: { mes: number; v: number }[]) => s.map((p) => [x(p.mes), yPos(p.v)] as const);

  const backdrop = (
    <svg width={W} height={H} viewBox={`0 0 ${W} ${H}`} style={{ position: "absolute", left: 0, top: 0 }}>
      {[0, 0.25, 0.5, 0.75, 1].map((t) => (
        <line key={t} x1={X0} x2={X1} y1={Y1 - t * (Y1 - Y0)} y2={Y1 - t * (Y1 - Y0)} stroke="#eef0f3" strokeWidth={2} />
      ))}
      {series.map((s, i) => {
        const p = pts(s);
        if (p.length < 2) return null;
        const d = smoothPath(p);
        const current = years[i] === year;
        return (
          <g key={years[i]}>
            {current ? (
              <path d={`${d} L ${p[p.length - 1][0]} ${Y1} L ${p[0][0]} ${Y1} Z`} fill={COLOR_YEAR_CURRENT} fillOpacity={0.12} />
            ) : null}
            <path d={d} fill="none" stroke={current ? COLOR_YEAR_CURRENT : COLOR_YEAR_PAST} strokeWidth={current ? 7 : 6} strokeLinecap="round" strokeLinejoin="round" />
            {current
              ? p.map(([cx, cy], k) => (
                  <circle key={k} cx={cx} cy={cy} r={k === p.length - 1 ? 11 : 7} fill={COLOR_YEAR_CURRENT} stroke="#ffffff" strokeWidth={3} />
                ))
              : null}
          </g>
        );
      })}
    </svg>
  );

  return new ImageResponse(
    <SectionCard backdrop={backdrop} headline={["Datos de", "calidad del aire"]} logo={logo} />,
    options,
  );
}

// A gentle curve through the points that never overshoots them (monotone
// cubic, Fritsch-Carlson; the same idea as d3's curveMonotoneX): between two
// months the line stays within their two values, so the curve can't invent
// a peak or dip the data doesn't have.
function smoothPath(p: readonly (readonly [number, number])[]) {
  const n = p.length;
  const dx = (i: number) => p[i + 1][0] - p[i][0];
  const slope = (i: number) => (p[i + 1][1] - p[i][1]) / dx(i);
  const m: number[] = new Array(n);
  m[0] = slope(0);
  m[n - 1] = slope(n - 2);
  for (let i = 1; i < n - 1; i++) {
    const a = slope(i - 1);
    const b = slope(i);
    m[i] = a * b <= 0 ? 0 : (3 * (dx(i - 1) + dx(i))) / ((2 * dx(i) + dx(i - 1)) / a + (dx(i) + 2 * dx(i - 1)) / b);
  }
  let d = `M ${p[0][0]} ${p[0][1]}`;
  for (let i = 0; i < n - 1; i++) {
    const h = dx(i) / 3;
    d += ` C ${p[i][0] + h} ${p[i][1] + h * m[i]}, ${p[i + 1][0] - h} ${p[i + 1][1] - h * m[i + 1]}, ${p[i + 1][0]} ${p[i + 1][1]}`;
  }
  return d;
}

