"use client";

import React from "react";

// Props interface for the AirQualityAddress component
interface AirQualityAddressProps {
  latitude: number | null;
  longitude: number | null;
  address: string | null;
}

function AirQualityAddress({
  latitude,
  longitude,
  address,
}: AirQualityAddressProps) {
  return (
    <div className="flex items-center space-x-2">
      {address ? (
        <div>{address}</div>
      ) : (
        <div className="text-gray-500">Loading address...</div>
      )}
      {latitude && longitude && (
        <div className="text-sm text-gray-400">
          ({latitude.toFixed(6)}, {longitude.toFixed(6)})
        </div>
      )}
    </div>
  );
}

export default AirQualityAddress;
