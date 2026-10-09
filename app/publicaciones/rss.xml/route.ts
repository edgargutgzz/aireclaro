import { SITE_NAME } from "@/lib/metadata";
import { SITE_URL } from "@/lib/site";
import { pageUrl, publicaciones, tipoLabel } from "../data";

// An RSS 2.0 feed of /publicaciones, newest first, so journalists and partner
// organizations can follow new columns and documents in a feed reader. Built
// at deploy time from ../data, like the page. Linked from the page's <head>
// (alternates.types in ../page.tsx).
export const dynamic = "force-static";

function escape(text: string): string {
  return text.replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
}

// Documents only carry a year; they're dated January 1 of it.
function pubDate(date: string | undefined, year: number): string {
  return new Date(`${date ?? `${year}-01-01`}T12:00:00-06:00`).toUTCString();
}

export function GET() {
  const items = publicaciones
    .map((p) => {
      const link = p.externalUrl ?? pageUrl(p);
      const description = p.summary ?? [p.author, p.outlet].filter(Boolean).join(", ");
      return `    <item>
      <title>${escape(p.title)}</title>
      <link>${escape(link)}</link>
      <guid isPermaLink="false">${escape(pageUrl(p))}</guid>
      <pubDate>${pubDate(p.date, p.year)}</pubDate>
      <dc:creator>${escape(p.author)}</dc:creator>
      <category>${escape(tipoLabel(p.tipo))}</category>
      <description>${escape(description)}</description>
    </item>`;
    })
    .join("\n");

  const xml = `<?xml version="1.0" encoding="UTF-8"?>
<rss version="2.0" xmlns:atom="http://www.w3.org/2005/Atom" xmlns:dc="http://purl.org/dc/elements/1.1/">
  <channel>
    <title>Publicaciones | ${SITE_NAME}</title>
    <link>${SITE_URL}/publicaciones</link>
    <atom:link href="${SITE_URL}/publicaciones/rss.xml" rel="self" type="application/rss+xml" />
    <description>Columnas, estudios y posicionamientos del Observatorio sobre la calidad del aire.</description>
    <language>es-MX</language>
${items}
  </channel>
</rss>
`;
  return new Response(xml, { headers: { "content-type": "application/rss+xml; charset=utf-8" } });
}
