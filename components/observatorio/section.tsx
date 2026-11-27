// The editorial row the direct pages share (/quienes-somos, /proyectos,
// /adopta-sensor): the section's title in a narrow left column, its content on
// the right, sections split by a hairline. The first section carries the
// page's h1 and no hairline above it. `eyebrow` is an optional small line
// above the title (/adopta-sensor's "Paso 1").
export default function Section({
  title,
  eyebrow,
  id,
  as: Heading = "h2",
  children,
}: {
  title: string;
  eyebrow?: string;
  id?: string;
  as?: "h1" | "h2";
  children: React.ReactNode;
}) {
  const heading = <Heading className="text-lg font-semibold text-neutral-800">{title}</Heading>;
  return (
    <section id={id} className="grid gap-6 border-t border-stone-200 py-12 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] md:gap-12 md:py-16 md:first:pt-0">
      {eyebrow ? (
        <div className="flex flex-col gap-1.5">
          <p className="text-sm font-semibold text-neutral-600">{eyebrow}</p>
          {heading}
        </div>
      ) : (
        heading
      )}
      <div className="min-w-0">{children}</div>
    </section>
  );
}
