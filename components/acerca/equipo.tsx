import Image from "next/image";

export default function Equipo() {
  const integrantes = [
    {
      name: "Selene Guajardo",
      image: "/profile-selene.jpg",
      puesto: "Directora Ejecutiva del OCCAMM",
      alt: "Selene Guajardo",
    },
    {
      name: "Edgar Gutiérrez",
      image: "/profile-edgar.jpeg",
      puesto: "Diseño y Desarrollo de Aire Claro",
      alt: "Edgar Gutiérrez",
    },
    {
      name: "Lucía Barrera",
      image: "/profile-lucia.JPG",
      puesto: "Miembro del Consejo Juvenil del OCCAMM",
      alt: "Lucía Barrera",
    },
    {
      name: "Carlos R. García",
      image: "/profile-carlos.jpg",
      puesto: "Miembro del Consejo Juvenil del OCCAMM",
      alt: "Carlos R. García",
    },
  ];
  return (
    <>
      {integrantes.map((integrante) => (
        <div
          key={integrante.name}
          className="my-3 flex items-center rounded-lg bg-white p-4 shadow-lg lg:my-4"
        >
          <Image
            src={integrante.image}
            alt={integrante.alt}
            width={48}
            height={48}
            className="mr-4 h-12 w-12 rounded-full"
          />
          <div>
            <p className="text-sm font-bold lg:text-base">{integrante.name}</p>
            <p className="text-sm lg:text-base">{integrante.puesto}</p>
          </div>
        </div>
      ))}
    </>
  );
}
