import { ImageResponse } from "next/og";
import { createPublicClient } from "@/utils/supabase/public";
import {
  fetchDiasInsalubresMensual,
  monthlySummary,
  MONTHS_ES_FULL,
  type MonthlySummary,
  type Pollutant,
} from "@/lib/dias-insalubres-aggregate";
import { COLOR_INSALUBRE } from "@/lib/datos-colors";
import { loadGoogleFont } from "@/lib/og-font";
import { loadOgLogo, OG_BRAND_BLUE, OG_LOGO, ogLogoAt } from "@/lib/og-logo";
import { isShareFormat, SHARE_FORMATS } from "@/lib/share-image-formats";

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
  "Observatorio del Aire abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúÁÉÍÓÚñÑüÜ .,:;·—–/()%°μg³² - observatoriodelaire.com días sobre la norma en el mismo periodo de los superaron Se registraron más menos los mismos que el sobre la norma frente PM2.5 PM10 Partículas finas gruesas Días en que las partículas en el aire superaron el límite para proteger la salud. Con base en NOM-025-SSA1-2021 Aún no hay datos para este año Fuente Gobierno Nuevo León Zona Metropolitana Monterrey No se pudo generar la imagen Falta el año";

type ImageOptions = ConstructorParameters<typeof ImageResponse>[1];

// The link-preview size every chat app and social network unfurls.
const LINK_CARD = { width: 1200, height: 630 };

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
  const logoAsset = isLinkCard ? OG_LOGO : ogLogoAt(fx(44));

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
  try {
    const supabase = createPublicClient();
    summary = monthlySummary(await fetchDiasInsalubresMensual(supabase), year);
  } catch {
    return messageCard(options, px(32), "No se pudo generar la imagen.");
  }
  if (summary === null) {
    return messageCard(options, px(32), "Aún no hay datos para este año.");
  }
  const { mes, rows: rowsOut, hasPrior, headline: headlineLines } = summary;
  const mesNombre = MONTHS_ES_FULL[mes - 1];

  if (isLinkCard) return linkCard(options, summary, year, logo);

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

// The /datos link card: logo, then the headline on the left and both
// pollutants' numbers on the right, source along the bottom. A preview shows
// at roughly a third of this size, so type runs larger relative to the canvas
// than on the download formats, and the source is one line.
function linkCard(options: ImageOptions, summary: MonthlySummary, year: number, logo: string | null) {
  const { mes, rows, hasPrior, headline } = summary;
  const mesNombre = MONTHS_ES_FULL[mes - 1];
  const years = hasPrior ? [year - 1, year] : [year];
  // Inter runs ~0.49em per character here: 38px fits a 30-character line in
  // the 580px column, and longer lines ("más días sobre la norma de salud",
  // 32) scale down in proportion so none wraps.
  const longestLine = Math.max(...headline.map((l) => l.length));
  const headlineSize = Math.floor(Math.min(38, (38 * 30) / longestLine));
  const LABEL_COL = 150;
  const NUMBER_SIZE = 76;
  const LABEL_SIZE = 15;
  const baseLift = Math.round(0.135 * (NUMBER_SIZE - LABEL_SIZE));

  return new ImageResponse(
    (
      <div style={{ display: "flex", flexDirection: "column", width: "100%", height: "100%", background: "#ffffff", fontFamily: "Inter" }}>
        <div style={{ height: 12, background: OG_BRAND_BLUE }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "44px 64px 36px" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={OG_LOGO.width} height={OG_LOGO.height} alt="" />
          ) : (
            <div style={{ display: "flex", fontSize: 30, fontWeight: 700, color: "#111827" }}>Observatorio del Aire</div>
          )}

          <div style={{ display: "flex", flex: 1, alignItems: "center", gap: 48 }}>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                width: 580,
                flexShrink: 0,
                fontSize: headlineSize,
                fontWeight: 600,
                color: "#1f2937",
                lineHeight: 1.18,
              }}
            >
              {headline.map((line) => (
                <div key={line} style={{ display: "flex" }}>
                  {line}
                </div>
              ))}
            </div>

            <div style={{ display: "flex", flexDirection: "column", flex: 1, gap: 26 }}>
              <div style={{ display: "flex", fontSize: 17, fontWeight: 600, color: "#6b7280" }}>
                <div style={{ display: "flex", width: LABEL_COL }} />
                {years.map((y) => (
                  <div key={y} style={{ display: "flex", flex: 1 }}>
                    {mesNombre} {y}
                  </div>
                ))}
              </div>
              {rows.map((r) => (
                <div key={r.pollutant} style={{ display: "flex", alignItems: "flex-end" }}>
                  <div style={{ display: "flex", flexDirection: "column", width: LABEL_COL, lineHeight: 1, gap: 6, paddingBottom: baseLift }}>
                    <div style={{ display: "flex", fontSize: 24, fontWeight: 600, color: "#374151" }}>
                      {POLLUTANT_LABEL[r.pollutant]}
                    </div>
                    <div style={{ display: "flex", fontSize: LABEL_SIZE, color: "#9ca3af" }}>Límite: {r.limit} µg/m³</div>
                  </div>
                  {years.map((y) => (
                    <div
                      key={y}
                      style={{
                        display: "flex",
                        flex: 1,
                        fontSize: NUMBER_SIZE,
                        fontWeight: 700,
                        lineHeight: 1,
                        color: y === year ? COLOR_INSALUBRE : PAST_NUMBER_COLOR,
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
              justifyContent: "space-between",
              alignItems: "center",
              paddingTop: 20,
              borderTop: "2px solid #e5e7eb",
              fontSize: 17,
              color: "#6b7280",
            }}
          >
            {/* Same two sources as the download formats, as drawn-dot items
                on one line. */}
            <div style={{ display: "flex", alignItems: "center", gap: 18 }}>
              <div style={{ display: "flex", color: "#9ca3af" }}>Fuente</div>
              {["SIMA de Nuevo León", "NOM-025-SSA1-2021"].map((src) => (
                <div key={src} style={{ display: "flex", alignItems: "center", gap: 8 }}>
                  <div style={{ display: "flex", width: 5, height: 5, borderRadius: 5, background: "#9ca3af" }} />
                  {src}
                </div>
              ))}
            </div>
            <div style={{ display: "flex", fontWeight: 600 }}>observatoriodelaire.com</div>
          </div>
        </div>
      </div>
    ),
    options,
  );
}
