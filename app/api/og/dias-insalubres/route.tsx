import { ImageResponse } from "next/og";
import { createPublicClient } from "@/utils/supabase/public";
import {
  fetchDiasInsalubresMensual,
  MONTHS_ES_FULL,
  type Pollutant,
} from "@/lib/dias-insalubres-aggregate";
import { COLOR_INSALUBRE, COLOR_YEAR_PAST } from "@/lib/datos-colors";
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


const GLYPHS =
  "Observatorio del Aire abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúÁÉÍÓÚñÑüÜ .,:;·—–/()%°μg³² - observatoriodelaire.com días sobre la norma en el mismo periodo de los superaron Se registraron más menos los mismos que el sobre la norma frente PM2.5 PM10 Con base en NOM-025-SSA1-2021 Aún no hay datos para este año Fuente Gobierno Nuevo León Zona Metropolitana Monterrey No se pudo generar la imagen Falta el año";

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

  // Both pollutants on one image: one share, one message.
  const POLLUTANTS: Pollutant[] = ["pm25", "pm10"];
  type Row = { pollutant: Pollutant; current: number; prior: number | null };
  let mes: number;
  let rowsOut: Row[];
  try {
    const supabase = createPublicClient();
    const data = await fetchDiasInsalubresMensual(supabase);
    const usable = (p: Pollutant, ano: number) =>
      data[p].filter((r) => r.ano === ano && r.diasTotales > 0 && r.diasInsalubresLimiteActual !== null);
    // The latest month the monthly cron has processed for this year, for
    // both pollutants (the data decides, never the calendar).
    const months = POLLUTANTS.map((p) => new Set(usable(p, year).map((r) => r.mesNumero)));
    const shared = [...months[0]].filter((m) => months.every((set) => set.has(m)));
    if (shared.length === 0) {
      return messageCard(options, px(32), "Aún no hay datos para este año.");
    }
    mes = Math.max(...shared);
    rowsOut = POLLUTANTS.map((p) => {
      const cur = usable(p, year).find((r) => r.mesNumero === mes)!;
      const before = usable(p, year - 1).find((r) => r.mesNumero === mes);
      return {
        pollutant: p,
        current: cur.diasInsalubresLimiteActual as number,
        prior: before ? (before.diasInsalubresLimiteActual as number) : null,
      };
    });
  } catch {
    return messageCard(options, px(32), "No se pudo generar la imagen.");
  }

  const mesNombre = MONTHS_ES_FULL[mes - 1];
  const mesMin = mesNombre.toLowerCase();
  const eyebrow = `${mesNombre} ${year}`;
  const hasPrior = rowsOut.every((r) => r.prior !== null);
  // The verdict, always two set lines, in the observatory's own measured
  // terms ("días sobre la norma", not colloquial "aire contaminado"): the
  // image has to read as a professional source. Said for both pollutants
  // only when they agree; otherwise a neutral headline and each row speaks
  // for itself.
  const signs = rowsOut.map((r) => Math.sign(r.current - (r.prior ?? 0)));
  const agree = hasPrior && signs.every((x) => x === signs[0]);
  const headlineLines = !hasPrior
    ? ["Días sobre la norma", `en ${mesMin} de ${year}`]
    : agree
      ? [
          signs[0] > 0
            ? "Se registraron más días sobre la norma"
            : signs[0] < 0
              ? "Se registraron menos días sobre la norma"
              : "Se registraron los mismos días sobre la norma",
          `que en ${mesMin} de ${year - 1}`,
        ]
      : ["Días sobre la norma", `${mesMin} de ${year} frente a ${year - 1}`];
  // This year's number is always red: any day of polluted air is bad news,
  // even in a month with fewer of them than a year earlier (the headline
  // carries the más/menos comparison). Last year's number is the gray
  // reference.
  const verdictColor = COLOR_INSALUBRE;
  const years = hasPrior ? [year - 1, year] : [year];
  // Headline capped where the longest verdict ("Respiramos los mismos días
  // sobre la norma") stays on one line; the pollutant table capped where its
  // three columns still fit the story's width.
  const hx = (n: number) => px(n * Math.min(format.content, 1));
  const tx = (n: number) => px(n * Math.min(format.content, 1.2));

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
            {/* Logo (who says it) -> month + verdict + both pollutants'
                numbers (the finding) -> footer (source). */}
            <div style={{ display: "flex", fontSize: hx(26), fontWeight: 600, color: "#6b7280", marginBottom: cx(12) }}>
              {eyebrow}
            </div>
            <div
              style={{
                display: "flex",
                flexDirection: "column",
                fontSize: hx(40),
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

            {/* One row per pollutant: last year (gray reference), this
                year (always red). */}
            <div style={{ display: "flex", flexDirection: "column", gap: tx(20), marginTop: tx(52) }}>
              <div style={{ display: "flex", fontSize: tx(24), fontWeight: 600, color: "#6b7280" }}>
                <div style={{ display: "flex", width: tx(170) }} />
                {years.map((y) => (
                  <div key={y} style={{ display: "flex", width: tx(270) }}>
                    {mesNombre} {y}
                  </div>
                ))}
              </div>
              {rowsOut.map((r) => (
                <div key={r.pollutant} style={{ display: "flex", alignItems: "baseline" }}>
                  <div style={{ display: "flex", width: tx(170), fontSize: tx(30), fontWeight: 700, color: "#374151" }}>
                    {POLLUTANT_LABEL[r.pollutant]}
                  </div>
                  {years.map((y) => {
                    const v = y === year ? r.current : (r.prior as number);
                    return (
                      <div
                        key={y}
                        style={{
                          display: "flex",
                          alignItems: "baseline",
                          gap: tx(10),
                          width: tx(270),
                          color: y === year ? verdictColor : COLOR_YEAR_PAST,
                        }}
                      >
                        <div style={{ display: "flex", fontSize: tx(110), fontWeight: 700, lineHeight: 1 }}>{v}</div>
                        <div style={{ display: "flex", fontSize: tx(28), fontWeight: 600 }}>
                          {v === 1 ? "día" : "días"}
                        </div>
                      </div>
                    );
                  })}
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
