declare module "mapbox-gl" {
  export let accessToken: string;

  export class Map {
    constructor(options: {
      container: string | HTMLElement;
      style: string;
      center: [number, number];
      zoom: number;
    });

    addControl(
      control: Control,
      position?: "top-left" | "top-right" | "bottom-left" | "bottom-right",
    ): this;
    on(type: string, listener: (ev: any) => void): this;
  }

  export class Marker {
    constructor(options?: { color?: string });

    setLngLat(lngLat: [number, number]): this;
    setPopup(popup: Popup): this;
    addTo(map: Map): this;
    getElement(): HTMLElement;
  }

  export class Popup {
    constructor(options?: { offset?: number | [number, number] });

    setLngLat(lngLat: [number, number]): this;
    setHTML(html: string): this;
    addTo(map: Map): this;
  }

  export interface Control {
    onAdd(map: Map): HTMLElement;
    onRemove(map: Map): void;
  }
}
