import React, { useMemo } from "react";

// Air Quality Data interface
interface AirQualityData {
  pm25: number | null;
  timestamp: string | null;
}

// Type for the air quality text
type QualityText =
  | "Buena"
  | "Aceptable"
  | "Mala"
  | "Muy Mala"
  | "Extremadamente Mala"
  | "No Disponible";

// Props interface for the AirQualityTitle component
interface AirQualityTitleProps {
  data: AirQualityData;
}

const AirQualityTitle: React.FC<AirQualityTitleProps> = ({ data }) => {
  // Determine the title based on pm25 value
  const pobGeneralTitle: QualityText = useMemo(() => {
    const { pm25 } = data;
    if (pm25 === null || pm25 < 0) return "No Disponible";
    if (pm25 >= 0 && pm25 <= 15) return "Buena";
    if (pm25 > 15 && pm25 <= 25) return "Aceptable";
    if (pm25 > 25 && pm25 <= 79) return "Mala";
    if (pm25 > 79 && pm25 <= 130) return "Muy Mala";
    if (pm25 > 130) return "Extremadamente Mala";
    return "No Disponible";
  }, [data]);

  return (
    <div className="text-5xl font-semibold lg:text-5xl">
      {pobGeneralTitle}
    </div>
  );
};

export default AirQualityTitle;
