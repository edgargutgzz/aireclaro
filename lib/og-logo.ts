// The Observatory lockup (swirl + OCCAMM + "Observatorio del Aire") for the
// next/og ImageResponse routes (app/api/og/*). Fetched from this deployment's
// own public/ and inlined as a data URI, so a failed fetch returns null and
// the card falls back to a text brand line instead of 500ing the image.
//
// public/og/occamm-logo.png is pre-shrunk (Lanczos, from
// public/navbar/occamm-logo.png) to exactly OG_LOGO_WIDTH x OG_LOGO_HEIGHT:
// the renderer's own downscale of the 1633px original came out pixelated.
// Draw it at exactly this size; regenerate the file to change it.
export const OG_LOGO_WIDTH = 238;
export const OG_LOGO_HEIGHT = 44;

export async function loadOgLogo(requestUrl: string): Promise<string | null> {
  try {
    const res = await fetch(new URL("/og/occamm-logo.png", requestUrl));
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:image/png;base64,${bytes}`;
  } catch {
    return null;
  }
}
