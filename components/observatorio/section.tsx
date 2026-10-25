// The editorial row the direct pages share (/quienes-somos, /proyectos): the
// section's title in a narrow left column, its content on the right, sections
// split by a hairline. The first section carries the page's h1 and no hairline
// above it.
export default function Section({
  title,
  id,
  as: Heading = "h2",
  children,
}: {
  title: string;
  id?: string;
  as?: "h1" | "h2";
  children: React.ReactNode;
}) {
  return (
    <section id={id} className="grid gap-6 border-t border-stone-200 py-12 first:border-t-0 first:pt-0 md:grid-cols-[minmax(0,1fr)_minmax(0,3fr)] md:gap-12 md:py-16 md:first:pt-0">
      <Heading className="text-lg font-semibold text-neutral-800">{title}</Heading>
      <div className="min-w-0">{children}</div>
    </section>
  );
}
