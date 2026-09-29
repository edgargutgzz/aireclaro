import { NextResponse, type NextRequest } from "next/server";

// The map used to be the homepage, and the outside world still points at `/`:
// partner sites embed https://www.aireclaro.com in an iframe (e.g.
// sanpedroparques.mx/calidad-del-aire), and every shared map link is
// `/?sensor=…` / `?src=…` / `?hide=…`. Both keep landing on the map.
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
  const { searchParams } = req.nextUrl;
  const hasMapState = MAP_PARAMS.some((p) => searchParams.has(p));
  if (!hasMapState && !isEmbedded(req)) return NextResponse.next();

  const url = req.nextUrl.clone();
  url.pathname = "/mapa";
  return NextResponse.redirect(url, 307);
}

export const config = { matcher: "/" };
