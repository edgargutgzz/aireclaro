"use client";

import React from "react";

// Props interface for the AirQualityBar component
interface AirQualityBarProps {
  data: {
    pm25: number | null;
    timestamp: string | null;
  };
}

// Utility function to calculate the marker position based on pm25 value
const getMarkerPosition = (pm25: number | null): number => {
  if (pm25 === null) return 0; // default value when pm25 is null
  if (pm25 <= 15) return (pm25 / 15) * 10 + 6;
  if (pm25 <= 25) return 16 + ((pm25 - 16) / 10) * 10 + 6;
  if (pm25 <= 79) return 32 + ((pm25 - 26) / 54) * 20 + 6;
  if (pm25 <= 130) return 58 + ((pm25 - 80) / 51) * 20 + 6;
  return 84 + 6;
};

// Utility function to determine the bar color based on pm25 value
const getBarColor = (pm25: number | null): string => {
  if (pm25 === null) return "bg-gray-300";
  if (pm25 <= 15) return "bg-green-400";
  if (pm25 > 15 && pm25 <= 25) return "bg-yellow-400";
  if (pm25 > 25 && pm25 <= 79) return "bg-orange-400";
  if (pm25 > 79 && pm25 <= 130) return "bg-red-400";
  if (pm25 > 130) return "bg-purple-400";
  return "bg-gray-300"; // default color in case the value is null or undefined
};

function AirQualityBar({ data }: AirQualityBarProps) {
  const markerPosition = getMarkerPosition(data.pm25);
  const barColor = getBarColor(data.pm25);

  return (
    <div className="pt-2 lg:pt-3">
      <div className="relative flex min-h-[10px] overflow-hidden rounded-lg">
        <div style={{ flexBasis: "12%" }} className="bg-green-400" />
        <div
          style={{ flexBasis: "10%" }}
          className="bg-gradient-to-r from-green-400 to-yellow-400"
        />
        <div style={{ flexBasis: "12%" }} className="bg-yellow-400" />
        <div
          style={{ flexBasis: "10%" }}
          className="bg-gradient-to-r from-yellow-400 to-orange-400"
        />
        <div style={{ flexBasis: "12%" }} className="bg-orange-400" />
        <div
          style={{ flexBasis: "10%" }}
          className="bg-gradient-to-r from-orange-400 to-red-400"
        />
        <div style={{ flexBasis: "12%" }} className="bg-red-400" />
        <div
          style={{ flexBasis: "10%" }}
          className="bg-gradient-to-r from-red-400 to-purple-400"
        />
        <div style={{ flexBasis: "12%" }} className="bg-purple-400" />
        <div
          style={{
            left: `${markerPosition}%`,
            borderColor: "white",
          }}
          className="absolute top-1/2 h-3 w-3 -translate-y-1/2 transform rounded-full border-4 bg-gray-300"
        ></div>
      </div>
    </div>
  );
}

export default AirQualityBar;
