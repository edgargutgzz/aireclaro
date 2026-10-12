import { ImageResponse } from "next/og";
import sharp from "sharp";
import { displayDate, getPublicacion, photos, readingMinutes, type Publicacion } from "@/app/publicaciones/data";
import { loadOgLogo, ogLogoAt } from "@/lib/og-logo";
import { loadInterFonts } from "@/lib/og-fonts";
import { SECTION_CARD, SectionCard } from "@/lib/og-section-card";

// One publication's link card. A column's mirrors its page header (the
// user's pick, 2026-10-12, not the section cards' frame): type, title, the
// author's portrait and name, outlet and date, the cover peeking in below,
// no logo (user, 2026-10-12: the link and the site's icon carry it). A document or infographic keeps the section
// cards' frame (lib/og-section-card): its title over white, its cover (a
// page of text, which would fight the headline) standing on the right as a
// page. The card renderer can't read .webp, so sharp re-encodes covers and
// portraits as JPEG first; a failed fetch just leaves that image out. Wired in
// app/publicaciones/[slug]/page.tsx (d= is the design version: bump it on a
// change, chat apps cache per image URL).
const { width: W, height: H } = SECTION_CARD;
const CACHE = "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";

// A document's cover on the right, whole: covers are 16:9, so a 16:9
// frame, 64px from the edge, centered.
const PAGE = { width: 560, height: 315, right: 64 };

// The column card: page gray, 64px sides, the cover's band 1072 wide.
const PAD = 64;
const BAND = { width: W - 2 * PAD, height: 420 };
const PORTRAIT = 88;
const EYEBROW = "COLUMNA DE OPINIÓN";

async function loadJpeg(path: string, requestUrl: string, width: number, height: number, top = false): Promise<string | null> {
  try {
    const res = await fetch(new URL(path, requestUrl));
    if (!res.ok) return null;
    const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(width, height, { fit: "cover", position: top ? "top" : "centre" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

// The title's size by length: one line when short, up to three when long.
function titleSize(title: string): number {
  return title.length <= 24 ? 84 : title.length <= 48 ? 68 : 56;
}

function meta(p: Publicacion): string {
  const minutes = readingMinutes(p);
  return [p.outlet, displayDate(p), minutes && `${minutes} min de lectura`].filter(Boolean).join(" · ");
}

async function columnCard(p: Publicacion, requestUrl: string) {
  const fotos = photos(p);
  const [fonts, cover, ...portraits] = await Promise.all([
    loadInterFonts(EYEBROW + p.title + p.author + meta(p)),
    loadJpeg(p.image, requestUrl, BAND.width, BAND.height),
    ...fotos.map((f) => loadJpeg(f.src, requestUrl, PORTRAIT * 2, PORTRAIT * 2, true)),
  ]);

  return new ImageResponse(
    (
      <div
        style={{
          display: "flex",
          flexDirection: "column",
          width: W,
          height: H,
          padding: `52px ${PAD}px 0`,
          background: "#f9fafb",
          fontFamily: "Inter",
        }}
      >
        <div style={{ display: "flex", flexShrink: 0, fontSize: 26, fontWeight: 600, letterSpacing: 1.5, color: "#6b7280" }}>{EYEBROW}</div>
        <div
          style={{
            display: "flex",
            flexShrink: 0,
            width: BAND.width,
            marginTop: 16,
            fontSize: titleSize(p.title),
            fontWeight: 700,
            lineHeight: 1.08,
            letterSpacing: -2,
            color: "#111827",
          }}
        >
          {p.title}
        </div>
        <div style={{ display: "flex", flexShrink: 0, alignItems: "center", marginTop: 28 }}>
          {portraits.map((src, i) =>
            src ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img
                key={i}
                src={src}
                width={PORTRAIT}
                height={PORTRAIT}
                alt=""
                style={{ borderRadius: 18, border: "3px solid #ffffff", marginLeft: i > 0 ? -24 : 0 }}
              />
            ) : null,
          )}
          <div style={{ display: "flex", flexDirection: "column", marginLeft: portraits.some(Boolean) ? 24 : 0 }}>
            <div style={{ display: "flex", fontSize: 38, fontWeight: 600, color: "#1f2937" }}>{p.author}</div>
            <div style={{ display: "flex", marginTop: 4, fontSize: 30, color: "#6b7280" }}>{meta(p)}</div>
          </div>
        </div>
        {cover ? (
          <div style={{ display: "flex", flexGrow: 1, flexShrink: 1, minHeight: 0, marginTop: 36, overflow: "hidden", borderRadius: "24px 24px 0 0" }}>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={cover} width={BAND.width} height={BAND.height} alt="" style={{ flexShrink: 0 }} />
          </div>
        ) : null}
      </div>
    ),
    { width: W, height: H, fonts, headers: { "cache-control": CACHE } },
  );
}

// A document with its own card background (`fondo`): the picture fills the
// whole card, the title straight on it (no wash).
async function backgroundCard(p: Publicacion, requestUrl: string, fondo: string) {
  const [logo, fonts] = await Promise.all([loadOgLogo(requestUrl, ogLogoAt(65)), loadInterFonts(p.title)]);
  const src = new URL(fondo, requestUrl).toString();
  return new ImageResponse(
    (
      <SectionCard
        // eslint-disable-next-line @next/next/no-img-element
        backdrop={<img src={src} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />}
        headline={p.title}
        wash={false}
        logo={logo}
      />
    ),
    { width: W, height: H, fonts, headers: { "cache-control": CACHE } },
  );
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = getPublicacion((await params).slug);
  if (!p) return new Response("Not found", { status: 404 });
  if (p.tipo === "columna") return columnCard(p, request.url);
  if (p.fondo) return backgroundCard(p, request.url, p.fondo);
  const [logo, fonts, cover] = await Promise.all([
    loadOgLogo(request.url, ogLogoAt(65)),
    loadInterFonts(p.title),
    // An infographic's cover is the top of a tall poster: keep its top.
    loadJpeg(p.image, request.url, PAGE.width * 2, PAGE.height * 2, p.tipo === "infografia"),
  ]);

  return new ImageResponse(
    (
      <SectionCard
        backdrop={
          cover ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={cover}
              width={PAGE.width}
              height={PAGE.height}
              alt=""
              style={{
                position: "absolute",
                right: PAGE.right,
                top: (H - PAGE.height) / 2,
                borderRadius: 12,
                border: "1px solid #e5e7eb",
                boxShadow: "0 12px 32px rgba(17,24,39,0.12)",
              }}
            />
          ) : null
        }
        headline={p.title}
        // Clear of the cover: it starts 64 + 560 from the right edge.
        textWidth={W - PAGE.right - PAGE.width - 64 - 48}
        logo={logo}
      />
    ),
    { width: W, height: H, fonts, headers: { "cache-control": CACHE } },
  );
}
