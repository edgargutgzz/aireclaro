import { useEffect, useState } from "react";
import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";

interface AddressProps {
  latitude: number;
  longitude: number;
}

const geocodingClient = mbxGeocoding({
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!,
});

export default function Address({ latitude, longitude }: AddressProps) {
  const [address, setAddress] = useState<string | null>(null);

  useEffect(() => {
    const fetchAddress = async () => {
      try {
        const response = await geocodingClient
          .reverseGeocode({
            query: [longitude, latitude],
            limit: 1,
          })
          .send();

        if (response.body.features.length > 0) {
          setAddress(response.body.features[0].place_name);
        } else {
          setAddress("Dirección no disponible");
        }
      } catch {
        setAddress("Error al obtener la dirección");
      }
    };

    fetchAddress();
  }, [latitude, longitude]);

  if (!address) {
    return <div>Loading...</div>; // Or some loading indicator
  }

  return <div>{address}</div>;
}
