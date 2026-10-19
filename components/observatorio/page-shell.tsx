// The shell every page ported from observatoriodelaire.com shares: the centred
// header (small page name over a large lead sentence) and the wide container
// with its generous vertical padding. Children are the page's content block.
export default function PageShell({
  title,
  lead,
  children,
}: {
  title: string;
  lead: string;
  children: React.ReactNode;
}) {
  return (
    <div className="mx-auto max-w-7xl px-6 pb-24 pt-16 lg:px-8 lg:pb-32 lg:pt-40">
      <div className="flex flex-col text-center">
        <h1 className="text-md md:text-lg">{title}</h1>
        <p className="pt-4 text-2xl font-bold text-stone-900 md:px-20 md:pt-6 md:text-4xl md:leading-tight">
          {lead}
        </p>
      </div>
      <div className="pt-32 md:pt-56">{children}</div>
    </div>
  );
}
