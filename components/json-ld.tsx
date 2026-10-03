// Structured data for search engines (schema.org JSON-LD). `<` is escaped so
// no string in the data can close the script tag, per Next's JSON-LD guide.
export default function JsonLd({ data }: { data: Record<string, unknown> }) {
  return (
    <script
      type="application/ld+json"
      dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }}
    />
  );
}
