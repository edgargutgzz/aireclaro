"use client";

import React from "react";

// Types for the props
interface AirQualityRecommendationProps {
  data: {
    pm25: number | null;
    timestamp: string | null;
  };
  showMenoresRecommendation?: boolean;
  showAdultosMayoresRecommendation?: boolean;
  showEmbarazadasRecommendation?: boolean;
  showEnfermedadesRecommendation?: boolean;
}

// Type for the air quality text
type QualityText =
  | "Buena"
  | "Aceptable"
  | "Mala"
  | "Muy Mala"
  | "Extremadamente Mala"
  | "No Disponible";

// Utility function to determine the recommendation text
const getRecommendationText = (
  pm25: number | null,
  type: string
): string => {
  const pobGeneralTitle = (): QualityText => {
    if (pm25 === null || pm25 < 0) return "No Disponible";
    if (pm25 >= 0 && pm25 <= 15) return "Buena";
    if (pm25 > 15 && pm25 <= 25) return "Aceptable";
    if (pm25 > 25 && pm25 <= 79) return "Mala";
    if (pm25 > 79 && pm25 <= 130) return "Muy Mala";
    if (pm25 > 130) return "Extremadamente Mala";
    return "No Disponible";
  };

  const recommendationMap: {
    [key: string]: { [key in QualityText]: string };
  } = {
    menores: {
      Buena: "Disfruta las actividades al aire libre.",
      Aceptable: "Disfruta las actividades al aire libre.",
      Mala: "Reduce las actividades físicas vigorosas al aire libre.",
      "Muy Mala": "Evita la actividad física vigorosa o prolongada al aire libre.",
      "Extremadamente Mala": "Permanece en interiores.",
      "No Disponible": "No Disponible",
    },
    adultosMayores: {
      Buena: "Disfruta las actividades al aire libre.",
      Aceptable: "Reduce las actividades físicas vigorosas al aire libre.",
      Mala: "Reduce las actividades físicas vigorosas al aire libre.",
      "Muy Mala": "Evita las actividades físicas y el tiempo de estancia al aire libre.",
      "Extremadamente Mala": "Permanece en interiores.",
      "No Disponible": "No Disponible",
    },
    embarazadas: {
      Buena: "Disfruta las actividades al aire libre.",
      Aceptable: "Disfruta las actividades al aire libre.",
      Mala: "Reduce las actividades físicas vigorosas al aire libre.",
      "Muy Mala": "Evita la actividad física vigorosa o prolongada al aire libre.",
      "Extremadamente Mala": "Permanece en interiores.",
      "No Disponible": "No Disponible",
    },
    enfermedades: {
      Buena: "Disfruta las actividades al aire libre.",
      Aceptable: "Reduce las actividades físicas vigorosas al aire libre.",
      Mala: "Reduce las actividades físicas vigorosas al aire libre.",
      "Muy Mala": "Evita las actividades físicas y el tiempo de estancia al aire libre.",
      "Extremadamente Mala": "Permanece en interiores.",
      "No Disponible": "No Disponible",
    },
  };

  return recommendationMap[type][pobGeneralTitle()];
};

function AirQualityRecommendation({
  data,
  showMenoresRecommendation = false,
  showAdultosMayoresRecommendation = false,
  showEmbarazadasRecommendation = false,
  showEnfermedadesRecommendation = false,
}: AirQualityRecommendationProps) {
  return (
    <div className="flex flex-col space-y-4">
      {showMenoresRecommendation && (
        <div className="flex flex-col">
          <div className="font-semibold">Recomendación para menores</div>
          <p>{getRecommendationText(data.pm25, "menores")}</p>
        </div>
      )}
      {showAdultosMayoresRecommendation && (
        <div className="flex flex-col">
          <div className="font-semibold">Recomendación para adultos mayores</div>
          <p>{getRecommendationText(data.pm25, "adultosMayores")}</p>
        </div>
      )}
      {showEmbarazadasRecommendation && (
        <div className="flex flex-col">
          <div className="font-semibold">Recomendación para embarazadas</div>
          <p>{getRecommendationText(data.pm25, "embarazadas")}</p>
        </div>
      )}
      {showEnfermedadesRecommendation && (
        <div className="flex flex-col">
          <div className="font-semibold">Recomendación para enfermedades</div>
          <p>{getRecommendationText(data.pm25, "enfermedades")}</p>
        </div>
      )}
    </div>
  );
}

export default AirQualityRecommendation;
