import Image from "next/image";

// The authors' portraits beside a byline (app/publicaciones/data.ts `photos`),
// overlapping when there are two. Decorative: the names are written next to
// them.
export default function Avatares({ fotos, size }: { fotos: { name: string; src: string }[]; size: "sm" | "lg" }) {
  if (fotos.length === 0) return null;
  const box = size === "sm" ? "h-5 w-5" : "h-12 w-12";
  const overlap = size === "sm" ? "-space-x-1.5" : "-space-x-3";
  return (
    <span className={`flex shrink-0 ${overlap}`} aria-hidden="true">
      {fotos.map((f) => (
        <Image
          key={f.name}
          src={f.src}
          alt=""
          width={size === "sm" ? 40 : 96}
          height={size === "sm" ? 40 : 96}
          className={`${box} rounded-full object-cover ring-2 ring-white`}
        />
      ))}
    </span>
  );
}
