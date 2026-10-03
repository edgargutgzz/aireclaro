import { loadGoogleFont } from "@/lib/og-font";

type Fonts = NonNullable<ConstructorParameters<typeof import("next/og").ImageResponse>[1]>["fonts"];

// Inter 400/600/700 subset to `glyphs`, for the section link cards. Null on
// failure so a card falls back to Satori's bundled font instead of 500ing.
export async function loadInterFonts(glyphs: string): Promise<Fonts | undefined> {
  try {
    const [f400, f600, f700] = await Promise.all([
      loadGoogleFont(400, glyphs),
      loadGoogleFont(600, glyphs),
      loadGoogleFont(700, glyphs),
    ]);
    return [
      { name: "Inter", data: f400, weight: 400, style: "normal" },
      { name: "Inter", data: f600, weight: 600, style: "normal" },
      { name: "Inter", data: f700, weight: 700, style: "normal" },
    ];
  } catch {
    return undefined;
  }
}
