"use client";

import React from "react";
import { format } from "date-fns";

// Props interface for the AirQualityTime component
interface AirQualityTimeProps {
  timestamp: string | null;
}

function AirQualityTime({ timestamp }: AirQualityTimeProps) {
  // Format the timestamp if available
  const formattedTime = timestamp
    ? format(new Date(timestamp.replace(" ", "T")), "h:mm a").replace(
        /:\d{2}/,
        ":00",
      )
    : "N/A";

  return <div>{formattedTime}</div>;
}

export default AirQualityTime;
