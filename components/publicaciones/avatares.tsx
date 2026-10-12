import Image from "next/image";

// The authors' portraits beside the byline on a publication's page
// (app/publicaciones/data.ts `photos`), overlapping when there are two.
// Decorative: the names are written next to them. Lists show no portraits.
// Corners match the cover below them (rounded-xl), not a circle.
export default function Avatares({ fotos }: { fotos: { name: string; src: string }[] }) {
  if (fotos.length === 0) return null;
  return (
    <span className="flex shrink-0 -space-x-3" aria-hidden="true">
      {fotos.map((f) => (
        <Image
          key={f.name}
          src={f.src}
          alt=""
          width={96}
          height={96}
          className="h-12 w-12 rounded-xl object-cover ring-2 ring-white"
        />
      ))}
    </span>
  );
}
