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
import { loadOgLogo, OG_BRAND_BLUE, ogLogoAt } from "@/lib/og-logo";
import { isShareFormat, SHARE_FORMATS } from "@/lib/share-image-formats";

// The downloadable, branded version of the /datos monthly summary card
// (components/datos/dias-insalubres-share.tsx, via its download menu) --
// one size per destination (?format=, see
// lib/share-image-formats.ts), not the 1200x630 landscape unfurl card
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
// For a reader who doesn't know what PM2.5 / PM10 are.
const POLLUTANT_DESCRIPTOR: Record<Pollutant, string> = {
  pm25: "Partículas finas",
  pm10: "Partículas gruesas",
};
// Last year's numbers: gray-400, a step darker than the chart lines'
// gray-300 -- as a big numeral on a phone (and after WhatsApp's
// compression) gray-300 all but disappears, and it's the reference that
// gives this year's number its meaning.
const PAST_NUMBER_COLOR = "#9ca3af";


const GLYPHS =
  "Observatorio del Aire abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúÁÉÍÓÚñÑüÜ .,:;·—–/()%°μg³² - observatoriodelaire.com días sobre la norma en el mismo periodo de los superaron Se registraron más menos los mismos que el sobre la norma frente PM2.5 PM10 Partículas finas gruesas Días en que las partículas en el aire superaron el límite para proteger la salud. Con base en NOM-025-SSA1-2021 Aún no hay datos para este año Fuente Gobierno Nuevo León Zona Metropolitana Monterrey No se pudo generar la imagen Falta el año";

type ImageOptions = ConstructorParameters<typeof ImageResponse>[1];

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const yearParam = searchParams.get("year");
  const year = yearParam && /^\d{4}$/.test(yearParam) ? Number(yearParam) : null;
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

  // This year's number is always red: any day of polluted air is bad news,
  // even in a month with fewer of them than a year earlier (the headline
  // carries the más/menos comparison). Last year's number is the gray
  // reference.
  const verdictColor = COLOR_INSALUBRE;
  const years = hasPrior ? [year - 1, year] : [year];
  // Headline capped where its longest line ("En septiembre 2026 se
  // registraron") stays on one line; the pollutant table capped where its
  // three columns still fit the story's width.
  const hx = (n: number) => px(n * Math.min(format.content, 1));
  const tx = (n: number) => px(n * Math.min(format.content, 1.2));
  // At lineHeight 1, Inter's baseline sits ~0.135em above the bottom of the
  // line box. Bottom-aligned text of size `small` next to size `big` needs
  // this much bottom padding to share `big`'s baseline.
  const NUMBER_SIZE = 115;
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
            {/* Logo (who says it) -> verdict + its plain-language gloss
                (what they say) -> both pollutants' numbers (the evidence)
                -> footer (source). */}
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: hx(47),
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
            {/* The headline's technical term, translated for a reader who
                doesn't know what the norm protects. */}
            <div
              style={{
                display: "flex",
                fontSize: hx(26),
                lineHeight: 1.35,
                color: "#6b7280",
                marginTop: hx(20),
                // Breaks the sentence evenly ('...superaron el límite' / 'para
                // proteger la salud.') instead of stranding one word.
                maxWidth: px(760),
              }}
            >
              Días en que las partículas en el aire superaron el límite para proteger la salud.
            </div>

            {/* One row per pollutant: last year (gray reference), this
                year (always red), bare numbers (the headline already says
                "días"). The two number columns share the full width.
                Satori's alignItems:"baseline" doesn't line up text of very
                different sizes, so each row is bottom-aligned at lineHeight
                1 and the small text is lifted by baseLift() onto the big
                number's baseline. */}
            <div style={{ display: "flex", flexDirection: "column", gap: tx(44), marginTop: tx(52) }}>
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
                      paddingBottom: baseLift(NUMBER_SIZE, 22),
                    }}
                  >
                    <div style={{ display: "flex", fontSize: tx(30), fontWeight: 700, color: "#374151" }}>
                      {POLLUTANT_LABEL[r.pollutant]}
                    </div>
                    <div style={{ display: "flex", fontSize: tx(22), color: "#9ca3af" }}>
                      {POLLUTANT_DESCRIPTOR[r.pollutant]}
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
                <div style={{ display: "flex", color: "#6b7280" }}>Sistema Integral de Monitoreo Ambiental (SIMA) de Nuevo León</div>
                {/* The norm the days are judged against, under the source. */}
                <div style={{ display: "flex", color: "#6b7280" }}>NOM-025-SSA1-2021</div>
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
