declare module "@mapbox/mapbox-sdk/services/geocoding" {
  import { LngLatLike } from "mapbox-gl";

  export interface GeocodingFeature {
    id: string;
    type: "Feature";
    place_type: string[];
    relevance: number;
    properties: any;
    text: string;
    place_name: string;
    center: [number, number];
    geometry: {
      type: "Point";
      coordinates: [number, number];
    };
    context: any[];
  }

  export interface GeocodingResponse {
    type: "FeatureCollection";
    query: string[];
    features: GeocodingFeature[];
    attribution: string;
  }

  export interface GeocodingService {
    forwardGeocode(options: {
      query: string;
      limit?: number;
      bbox?: [number, number, number, number];
      countries?: string[];
      types?: string[];
      language?: string[];
      proximity?: LngLatLike;
      autocomplete?: boolean;
      fuzzyMatch?: boolean;
      routing?: boolean;
      worldview?: string;
    }): { send: () => Promise<{ body: GeocodingResponse }> };

    reverseGeocode(options: {
      query: [number, number];
      limit?: number;
      types?: string[];
      language?: string[];
      reverseMode?: "distance" | "score";
      routing?: boolean;
      worldview?: string;
    }): { send: () => Promise<{ body: GeocodingResponse }> };
  }

  export default function GeocodingService(config: {
    accessToken: string;
  }): GeocodingService;
}
