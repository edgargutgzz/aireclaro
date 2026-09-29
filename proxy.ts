import { NextResponse, type NextRequest } from "next/server";

// The site lives at www.observatoriodelaire.com. aireclaro.com is the old
// domain, still attached to this project only to send people over: every path
// carries across as-is, except the bare domain, which lands on the map
// (that's what people know aireclaro.com for). That includes partner iframes
// of https://www.aireclaro.com (e.g. sanpedroparques.mx/calidad-del-aire),
// which now render www.observatoriodelaire.com/mapa.
const CANONICAL_ORIGIN = "https://www.observatoriodelaire.com";
const LEGACY_HOSTS = new Set(["aireclaro.com", "www.aireclaro.com"]);

// On the canonical host, `/` is the homepage, but two kinds of request for it
// still mean the map: shared map links (`/?sensor=…` / `?src=…` / `?hide=…`)
// and iframe embeds of the bare domain.
const MAP_PARAMS = ["sensor", "src", "hide"];

// Fallback for browsers that don't send Sec-Fetch-Dest (Safari < 16.4):
// known embedding sites, matched on the Referer host.
const EMBEDDERS = ["sanpedroparques.mx"];

function isEmbedded(req: NextRequest) {
  const dest = req.headers.get("sec-fetch-dest");
  if (dest) return dest === "iframe" || dest === "frame";
  const referer = req.headers.get("referer");
  if (!referer) return false;
  try {
    const host = new URL(referer).hostname;
    return EMBEDDERS.some((d) => host === d || host.endsWith(`.${d}`));
  } catch {
    return false;
  }
}

export function proxy(req: NextRequest) {
  const { pathname, search, searchParams } = req.nextUrl;
  const host = (req.headers.get("host") ?? "").split(":")[0].toLowerCase();

  if (LEGACY_HOSTS.has(host)) {
    const path = pathname === "/" ? "/mapa" : pathname;
    return NextResponse.redirect(`${CANONICAL_ORIGIN}${path}${search}`, 308);
  }

  if (pathname !== "/") return NextResponse.next();
  const hasMapState = MAP_PARAMS.some((p) => searchParams.has(p));
  if (!hasMapState && !isEmbedded(req)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/mapa";
  return NextResponse.redirect(url, 307);
}

// Every path (the legacy domain redirects wholesale) except Next's build
// assets, which are only ever requested by a page already on this host.
export const config = { matcher: "/((?!_next/static|_next/image).*)" };
