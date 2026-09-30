// The Observatory lockup (swirl + OCCAMM + "Observatorio del Aire") for the
// next/og ImageResponse routes (app/api/og/*). Fetched from this deployment's
// own public/ and inlined as a data URI, so a failed fetch returns null and
// the card falls back to a text brand line instead of 500ing the image.
//
// Each file is pre-shrunk (Lanczos, from public/navbar/occamm-logo.png) to
// exactly the size it's drawn at: the renderer's own downscale of the 1633px
// original came out pixelated. Draw each at exactly its width x height;
// regenerate the file to change it.
export interface OgLogo {
  src: string;
  width: number;
  height: number;
}

// Pre-shrunk files, by drawn height. The 1200x630 sensor unfurl and the
// 1080-wide download formats use 44; the 1600-wide ones 65 (= 44 at their
// scale); the Instagram story's larger brand frame 62.
const LOGO_FILES: Record<number, OgLogo> = {
  44: { src: "/og/occamm-logo.png", width: 238, height: 44 },
  62: { src: "/og/occamm-logo-62.png", width: 335, height: 62 },
  65: { src: "/og/occamm-logo-65.png", width: 351, height: 65 },
};

export const OG_LOGO = LOGO_FILES[44];

/** The logo file drawn at exactly `height` px. Throws on a height with no
 *  pre-shrunk file (add one rather than let the renderer rescale). */
export function ogLogoAt(height: number): OgLogo {
  const logo = LOGO_FILES[height];
  if (!logo) throw new Error(`No pre-shrunk OG logo at ${height}px`);
  return logo;
}

export async function loadOgLogo(requestUrl: string, logo: OgLogo = OG_LOGO): Promise<string | null> {
  try {
    const res = await fetch(new URL(logo.src, requestUrl));
    if (!res.ok) return null;
    const bytes = Buffer.from(await res.arrayBuffer()).toString("base64");
    return `data:image/png;base64,${bytes}`;
  } catch {
    return null;
  }
}

// The logo's own blue (pixel-sampled from the OCCAMM lettering), for brand
// accents on the cards so they read as the NGO's before anything else.
export const OG_BRAND_BLUE = "#226caf";
