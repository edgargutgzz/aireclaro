// hooks/useAddress.ts
import { useState, useCallback, useEffect } from "react";
import mbxGeocoding from "@mapbox/mapbox-sdk/services/geocoding";

const geocodingClient = mbxGeocoding({
  accessToken: process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN!,
});

const addressCache = new Map<string, string>();

export function useAddress(latitude: number | null, longitude: number | null) {
  const [address, setAddress] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

  const fetchAddress = useCallback(async () => {
    if (latitude === null || longitude === null) return;
    const cacheKey = `${latitude},${longitude}`;

    if (addressCache.has(cacheKey)) {
      setAddress(addressCache.get(cacheKey) || null);
      return;
    }

    try {
      const response = await geocodingClient
        .reverseGeocode({
          query: [longitude, latitude],
          limit: 1,
        })
        .send();

      if (response.body.features.length > 0) {
        const placeName = response.body.features[0].place_name;
        addressCache.set(cacheKey, placeName);
        setAddress(placeName);
      } else {
        setAddress("Dirección no disponible");
      }
    } catch {
      setError("Error al obtener la dirección");
    }
  }, [latitude, longitude]);

  useEffect(() => {
    fetchAddress();
  }, [fetchAddress]);

  return { address, error };
}
