import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";

interface AddressProps {
  latitude: number;
  longitude: number;
}

const geocodingClient = mbxGeocoding({
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!,
});

export default async function Address({ latitude, longitude }: AddressProps) {
  let address: string | null = null;
  try {
    const response = await geocodingClient
      .reverseGeocode({
        query: [longitude, latitude],
        limit: 1,
      })
      .send();

    if (response.body.features.length > 0) {
      address = response.body.features[0].place_name;
    } else {
      address = "Dirección no disponible";
    }
  } catch {
    address = "Error al obtener la dirección";
  }

  return <div>{address}</div>;
}
