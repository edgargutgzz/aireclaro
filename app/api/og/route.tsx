import { ImageResponse } from "next/og";
import { getSensorSnapshot } from "@/lib/sensor-snapshot";
import { parseSensorParam } from "@/lib/map-url-state";
import { getQualityInfo, roundPM25 } from "@/lib/air-quality";
import { loadGoogleFont } from "@/lib/og-font";
import { loadOgLogo, OG_LOGO } from "@/lib/og-logo";

// The unfurl card behind a shared ?sensor= link. Short-lived on purpose: it
// carries a live reading, so a day-long CDN cache would show a stale number.
const CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

// Subset to the glyphs this card can actually print so the font fetch stays
// tiny (see lib/og-font.ts).
const GLYPHS =
  "Observatorio del Aire abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúÁÉÍÓÚñÑüÜ .,:;·—–/()%°μg³² - observatoriodelaire.com Actualizado Buena Aceptable Mala Muy Extremadamente No disponible PM2.5 μg/m³ Zona Metropolitana de Monterrey Nuevo León";

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("sensor");
  const param = parseSensorParam(raw);
  const sensorId = param && /^\d+$/.test(param) ? Number(param) : param;

  const snapshot = sensorId ? await getSensorSnapshot(sensorId).catch(() => null) : null;
  const quality = snapshot ? getQualityInfo(snapshot.pm25) : null;

  const accent = quality?.color ?? "#d1d5db";
  const ink = quality?.textColor ?? "#6b7280";
  const label = quality?.label ?? "No disponible";
  const name = snapshot?.name ?? "Zona Metropolitana de Monterrey";
  const municipio = snapshot?.municipio ?? "Nuevo León";
  const pm = snapshot?.pm25 != null ? roundPM25(snapshot.pm25) : null;
  const updated = snapshot?.readingAt ? formatReadingTime(snapshot.readingAt) : null;
  const nameSize = name.length > 26 ? 52 : 66;

  const options: ConstructorParameters<typeof ImageResponse>[1] = {
    width: 1200,
    height: 630,
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
    // Fall back to Satori's bundled font rather than 500 the unfurl.
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
        <div style={{ height: 14, background: accent }} />
        <div style={{ display: "flex", flexDirection: "column", flex: 1, padding: "72px 80px" }}>
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} width={OG_LOGO.width} height={OG_LOGO.height} alt="" />
          ) : (
            <div
              style={{
                display: "flex",
                fontSize: 28,
                fontWeight: 700,
                color: "#111827",
                letterSpacing: -0.5,
              }}
            >
              Observatorio del Aire
            </div>
          )}

          <div
            style={{
              display: "flex",
              flexDirection: "column",
              flex: 1,
              justifyContent: "center",
            }}
          >
            <div style={{ display: "flex", fontSize: 26, fontWeight: 500, color: "#6b7280", marginBottom: 14 }}>
              {municipio}
            </div>
            <div
              style={{
                display: "flex",
                fontSize: nameSize,
                fontWeight: 700,
                color: "#111827",
                lineHeight: 1.05,
                marginBottom: 40,
              }}
            >
              {name}
            </div>
            <div style={{ display: "flex", alignItems: "center", gap: 24 }}>
              <div
                style={{
                  width: 48,
                  height: 48,
                  borderRadius: 48,
                  background: accent,
                  border: `4px solid ${ink}`,
                }}
              />
              <div style={{ display: "flex", fontSize: 68, fontWeight: 700, color: ink, lineHeight: 1 }}>
                {label}
              </div>
            </div>
            {pm != null && (
              <div
                style={{
                  display: "flex",
                  alignItems: "baseline",
                  gap: 10,
                  marginTop: 28,
                  fontSize: 30,
                  color: "#6b7280",
                }}
              >
                <span style={{ fontWeight: 700, color: "#111827" }}>{pm}</span>
                <span>μg/m³ PM2.5</span>
              </div>
            )}
          </div>

          <div
            style={{
              display: "flex",
              justifyContent: "space-between",
              alignItems: "flex-end",
              fontSize: 22,
            }}
          >
            <div style={{ display: "flex", color: "#9ca3af" }}>
              {updated ? `Actualizado ${updated}` : "Datos en tiempo real"}
            </div>
            <div style={{ display: "flex", fontWeight: 600, color: "#6b7280" }}>observatoriodelaire.com</div>
          </div>
        </div>
      </div>
    ),
    options,
  );
}

// time_stamp is stored as naive Monterrey wall-clock. Append Z and read the
// parts back in UTC so the printed time matches what's stored, with no shift
// from the (UTC) server it renders on.
function formatReadingTime(ts: string): string {
  const d = new Date(ts.replace(" ", "T").replace(/Z?$/, "") + "Z");
  if (Number.isNaN(d.getTime())) return "";
  return new Intl.DateTimeFormat("es-MX", {
    day: "numeric",
    month: "short",
    hour: "numeric",
    minute: "2-digit",
    hour12: true,
    timeZone: "UTC",
  }).format(d);
}
