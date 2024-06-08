declare module "mapbox-gl" {
  import { Map } from "mapbox-gl";

  export let accessToken: string;

  export class Map {
    constructor(options: {
      container: string | HTMLElement;
      style: string;
      center: [number, number];
      zoom: number;
    });
  }
}
