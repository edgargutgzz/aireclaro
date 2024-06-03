"use client";

import { useEffect, useState } from "react";

interface GeolocationComponentProps {
  onLocationChange?: (latitude: number, longitude: number) => void;
}

export default function UserLocation({
  onLocationChange,
}: GeolocationComponentProps) {
  const [location, setLocation] = useState<{
    latitude: number | null;
    longitude: number | null;
  }>({ latitude: null, longitude: null });

  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (position) => {
          const newLocation = {
            latitude: position.coords.latitude,
            longitude: position.coords.longitude,
          };
          setLocation(newLocation);
          if (onLocationChange) {
            onLocationChange(newLocation.latitude, newLocation.longitude);
          }
        },
        (error) => {
          setError(error.message);
        },
      );
    } else {
      setError("Geolocation is not supported by this browser.");
    }
  }, [onLocationChange]);

  return <div></div>;
}
