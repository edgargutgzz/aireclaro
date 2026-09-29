// Shared by every next/og ImageResponse route (app/api/og/*). Google Fonts'
// CSS2 endpoint, hit with no browser User-Agent, serves a truetype URL --
// not the woff2 Satori can't parse. Callers pass their own glyph subset so
// each route's fetch stays tiny instead of pulling the whole font.
export async function loadGoogleFont(
  weight: 400 | 500 | 600 | 700,
  glyphs: string,
): Promise<ArrayBuffer> {
  const url = `https://fonts.googleapis.com/css2?family=Inter:wght@${weight}&text=${encodeURIComponent(glyphs)}`;
  const css = await (await fetch(url)).text();
  const src = css.match(/src:\s*url\((.+?)\)\s*format\('(?:opentype|truetype)'\)/)?.[1];
  if (!src) throw new Error(`OG font ${weight}: no ttf src in CSS`);
  const res = await fetch(src);
  if (!res.ok) throw new Error(`OG font ${weight}: ${res.status}`);
  return res.arrayBuffer();
}
