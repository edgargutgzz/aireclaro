import { ImageResponse } from "next/og";
import sharp from "sharp";
import { getPublicacion } from "@/app/publicaciones/data";
import { loadOgLogo, ogLogoAt } from "@/lib/og-logo";
import { loadInterFonts } from "@/lib/og-fonts";
import { SECTION_CARD, SectionCard } from "@/lib/og-section-card";

// One publication's link card, in the section cards' frame
// (lib/og-section-card): its own cover behind, its title as the headline,
// the logo as the signature. A column's cover (a picture) fills the card; a
// document's or infographic's (a page of text, which would fight the
// headline) stands on the right as a page, its top showing. The card
// renderer can't read the covers' .webp, so sharp re-encodes the cover as a
// JPEG first. With no cover the card still renders, on white. Wired in
// app/publicaciones/[slug]/page.tsx (d= is the design version: bump it on a
// change, chat apps cache per image URL).
const { width: W, height: H } = SECTION_CARD;
const CACHE = "public, max-age=0, s-maxage=86400, stale-while-revalidate=604800";

// A document's page on the right: 420x540, 64px from the edge, centered.
const PAGE = { width: 420, height: 540, right: 64 };

async function loadCover(path: string, requestUrl: string, page: boolean): Promise<string | null> {
  try {
    const res = await fetch(new URL(path, requestUrl));
    if (!res.ok) return null;
    const jpg = await sharp(Buffer.from(await res.arrayBuffer()))
      .resize(page ? PAGE.width : W, page ? PAGE.height : H, { fit: "cover", position: page ? "top" : "centre" })
      .jpeg({ quality: 82 })
      .toBuffer();
    return `data:image/jpeg;base64,${jpg.toString("base64")}`;
  } catch {
    return null;
  }
}

export async function GET(request: Request, { params }: { params: Promise<{ slug: string }> }) {
  const p = getPublicacion((await params).slug);
  if (!p) return new Response("Not found", { status: 404 });
  const page = p.tipo !== "columna";
  const [logo, fonts, cover] = await Promise.all([
    loadOgLogo(request.url, ogLogoAt(65)),
    loadInterFonts(p.title),
    loadCover(p.image, request.url, page),
  ]);

  return new ImageResponse(
    (
      <SectionCard
        backdrop={
          !cover ? null : page ? (
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
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={cover} width={W} height={H} alt="" style={{ position: "absolute", left: 0, top: 0 }} />
          )
        }
        headline={p.title}
        logo={logo}
      />
    ),
    { width: W, height: H, fonts, headers: { "cache-control": CACHE } },
  );
}
