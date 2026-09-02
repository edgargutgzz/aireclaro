import { ImageResponse } from "next/og";
import { getSensorSnapshot } from "@/lib/sensor-snapshot";
import { getQualityInfo, roundPM25 } from "@/lib/air-quality";

// The unfurl card behind a shared ?sensor= link. Short-lived on purpose: it
// carries a live reading, so a day-long CDN cache would show a stale number.
const CACHE = "public, max-age=0, s-maxage=300, stale-while-revalidate=600";

// Google Fonts' CSS2 endpoint, hit with no browser User-Agent, serves a
// truetype URL — not the woff2 Satori can't parse. Subset to the glyphs this
// card can actually print so the fetch stays tiny.
const GLYPHS =
  "Aire Claro abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789 áéíóúÁÉÍÓÚñÑüÜ .,:;·—–/()%°μg³² - aireclaro.com Actualizado Buena Aceptable Mala Muy Extremadamente Sin lectura reciente PM2.5 μg/m³ Zona Metropolitana de Monterrey Nuevo León";

async function loadFont(weight: 400 | 600 | 700): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&text=${encodeURIComponent(GLYPHS)}`;
  const css = await (await fetch(url)).text();
  const src = css.match(/src:\s*url\((.+?)\)\s*format\('(?:opentype|truetype)'\)/)?.[1];
  if (!src) throw new Error(`OG font ${weight}: no ttf src in CSS`);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`OG font ${weight}: ${res.status}`);
  return res.arrayBuffer();
}

export async function GET(request: Request) {
  const { searchParams } = new URL(request.url);
  const raw = searchParams.get("sensor");
  const sensorId = raw && /^\d+$/.test(raw) ? Number(raw) : null;

  const snapshot = sensorId ? await getSensorSnapshot(sensorId).catch(() => null) : null;
  const quality = snapshot ? getQualityInfo(snapshot.pm25) : null;

  const accent = quality?.color ?? "#d1d5db";
  const ink = quality?.textColor ?? "#6b7280";
  const label = quality?.label ?? "Sin lectura reciente";
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
  try {
    const [f400, f600, f700] = await Promise.all([loadFont(400), loadFont(600), loadFont(700)]);
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
          <div
            style={{
              display: "flex",
              fontSize: 28,
              fontWeight: 700,
              color: "#111827",
              letterSpacing: -0.5,
            }}
          >
            Aire Claro
          </div>

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
            <div style={{ display: "flex", fontWeight: 600, color: "#6b7280" }}>aireclaro.com</div>
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
