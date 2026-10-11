import Image from "next/image";

// The Observatory's image-beside-text card (Proyectos, Quiénes somos, Adopta un
// sensor): a square image on one half at md+ (left by default, `imageSide`
// "right" swaps it), heading and body on the other; stacked image-first on
// mobile either way. `children` is an optional footer row under the body.
export default function FeatureCard({
  title,
  description,
  image,
  imageAlt,
  imageSide = "left",
  children,
}: {
  title: string;
  description: string;
  image: string;
  imageAlt: string;
  imageSide?: "left" | "right";
  children?: React.ReactNode;
}) {
  return (
    <article className="flex flex-col rounded-xl bg-white p-4 shadow-lg md:flex-row md:p-0">
      <div className={imageSide === "right" ? "md:order-last md:w-1/2" : "md:w-1/2"}>
        <Image
          src={image}
          alt={imageAlt}
          width={1080}
          height={1080}
          sizes="(min-width: 1280px) 616px, (min-width: 768px) 50vw, 100vw"
          className="w-full rounded-xl"
        />
      </div>
      <div className="flex flex-col justify-center md:w-1/2 md:px-12">
        <h2 className="pt-6 text-2xl font-semibold text-gray-800 md:text-3xl">{title}</h2>
        <p className="pt-2 text-base md:pt-4 md:text-lg">{description}</p>
        {children}
      </div>
    </article>
  );
}
