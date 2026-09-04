"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronRight, Layers, Wind, X } from "lucide-react";
import mapboxgl, { Map, Marker } from "mapbox-gl";
import "mapbox-gl/dist/mapbox-gl.css";
import { format } from "date-fns";
import { getMarkerFill, getMarkerFillHex, getLevel, createMarker, getQualityInfo, type QualityInfo } from "@/lib/air-quality";
import { FreshnessBadge, FreshnessDot, FreshnessText, type Freshness } from "@/components/data/freshness";
import { readSensorParam, writeSensorParam, readFilterParams, writeFilterParams } from "@/lib/map-url-state";
import type { Sensor, Data, SelectedSensor } from "./types";
import {
  PULSE_FALLBACK_COLOR,
  municipioKey,
  estadoKey,
  getRelativeDayLabel,
  prefersReducedMotion,
  buildSelection,
  displayName,
  markerLabel,
} from "./lib";
import {
  OPENING_CENTER,
  OPENING_ZOOM,
  OPENING_MOVE_MS,
  FIELD_SOURCE,
  FIELD_LAYER,
  SIMA_BADGE_LAYER,
  SIMA_BADGE_IMAGE,
  makeSimaBadge,
  FIELD_RADIUS,
} from "./field-layer";
import { LayersFilterContent } from "./layers-filter";
import { ScaleBar, LegendDetail, AirQualityLegend } from "./air-quality-legend";
import { HealthRecommendations, StationReading } from "./station-card";
import { AccordionDialog, DialogLink, InfoDialog } from "./info-dialog";

// Initialize Mapbox
(mapboxgl as any).accessToken =
  process.env.NEXT_PUBLIC_MAPBOX_ACCESS_TOKEN || "";

// The station the estación card shows at rest, before any marker is picked:
// SIMA "CE" — Monterrey: Obispado, the central government reference station.
// The card shows this one station's own reading; there is no median fallback,
// so if it's filtered out (Capas → gobierno off) the card is simply empty.
const DEFAULT_SENSOR_ID = "CE";

// Subtle repaint of stock light-v11, applied on style.load. Tuned in small
// increments — each value is a knob.
//
// Ground: near-white was most of why the map read washed out; one step off
// white, a very light warm grey.
const BASEMAP_GROUND = "#f2f1ef";
// Water: light-v11's water is a barely-there pale blue. A step deeper and cooler
// so the Río Santa Catarina and the dams read across the city. Cool vs the warm
// ground is what separates land from water without either colour being loud.
const BASEMAP_WATER = "#c9d6dd";
const BASEMAP_WATERWAY = "#bcccd5"; // the thin river / arroyo centrelines

export default function MapaSensors({
  sensors,
  data,
}: {
  sensors: Sensor[];
  data: Data[];
}) {
  const mapContainer = useRef<HTMLDivElement>(null);
  const map = useRef<Map | null>(null);
  // The marker field is one GL circle layer (FIELD_LAYER). The only DOM marker
  // is the selected station, held here so a new pick can replace it; `activeFid`
  // is that station's feature id in the GL source, tracked so its flat disc can
  // be toggled off (feature-state `selected`) while the DOM marker stands in.
  const selectedMarkerRef = useRef<Marker | null>(null);
  const activeFidRef = useRef<string | null>(null);
  const hoveredFidRef = useRef<string | null>(null);
  const activeSensorIdRef = useRef<number | null>(null);
  const activeColorRef = useRef<string>(PULSE_FALLBACK_COLOR);
  const selectedIdRef = useRef<number | null>(null);

  // ---- Initial state from the URL (lib/map-url-state) ----------------------
  // Resolved once on mount. ?sensor= seeds the card selection and the opening
  // camera; ?src= / ?hide= seed the Capas filters. A ?sensor= link wins over a
  // conflicting ?src= / ?hide= in the same URL: its station's source and
  // municipio are forced visible so the clear-selection effect can't drop the
  // very sensor the link is about.
  const initialSensorId = useRef(readSensorParam()).current;
  const initialFilters = useRef(readFilterParams()).current;
  const linkedSensor = initialSensorId != null
    ? sensors.find((s) => s.sensor_id === initialSensorId)
    : undefined;
  const linkedSource: "occamm" | "otros" | "gob" | null = linkedSensor
    ? linkedSensor.source === "sima" ? "gob" : linkedSensor.red ? "occamm" : "otros"
    : null;
  const seedSource = (kind: "occamm" | "otros" | "gob") =>
    linkedSource === kind ? true : initialFilters.src ? initialFilters.src[kind] : true;
  const seedHidden = () => {
    if (!initialFilters.hide.length) return [];
    const known = new Set(sensors.map((s) => municipioKey(s.municipio)).filter(Boolean) as string[]);
    const linkedMuni = linkedSensor ? municipioKey(linkedSensor.municipio) : null;
    return initialFilters.hide.filter((k) => known.has(k) && k !== linkedMuni);
  };
  // -----------------------------------------------------------------------------

  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false); // mobile only — the air-quality legend as a bottom sheet
  const [showFiltrosContent, setShowFiltrosContent] = useState(false); // desktop only — Filtros body starts collapsed
  const [mapLoaded, setMapLoaded] = useState(false);
  const [showOtros, setShowOtros] = useState(() => seedSource("otros"));
  const [showOccammInfo, setShowOccammInfo] = useState(false);
  const [showFuenteInfo, setShowFuenteInfo] = useState(false);
  const [showSima, setShowSima] = useState(() => seedSource("gob"));
  const [hiddenMunicipios, setHiddenMunicipios] = useState<string[]>(seedHidden);
  const [showOccamm, setShowOccamm] = useState(() => seedSource("occamm"));

  const [selectedSensor, setSelectedSensor] = useState<SelectedSensor | null>(() =>
    linkedSensor ? buildSelection(linkedSensor, data) : null,
  );
  const [copied, setCopied] = useState(false);
  const [sheetState, setSheetState] = useState<'peek' | 'mid'>('peek');
  const [cuidarmeQuality, setCuidarmeQuality] = useState<QualityInfo | null>(null);

  // Desktop drops the default-station card at rest: the right column is empty
  // and the map stands alone until a marker is picked. Mobile still rests its
  // sheet on the default station, so the fallback applies there. Tracked in
  // state (not just a CSS `md:` toggle) because the active-marker pulse has to
  // follow the card — no card, no pulse. Starts false so SSR and the first
  // client render agree; the effect promotes it on a wide viewport.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // Desktop opens with the default station already picked — the card is up with
  // its X and the pulse is on Obispado, exactly the state a click produces. It's
  // seeded here rather than in the useState initializer so it stays desktop-only
  // (the flag can't be read during SSR) and one-shot: once it has fired, closing
  // the card leaves the map bare and this never re-seeds. Skipped when a
  // ?sensor= link or an earlier pick already set the subject.
  const didSeedDefaultRef = useRef(false);
  useEffect(() => {
    if (didSeedDefaultRef.current || !isDesktop) return;
    didSeedDefaultRef.current = true;
    if (linkedSensor || selectedSensor) return;
    const def = sensors.find((s) => String(s.sensor_id) === DEFAULT_SENSOR_ID);
    if (def) setSelectedSensor(buildSelection(def, data));
  }, [isDesktop, linkedSensor, selectedSensor, sensors, data]);

  // One entry per municipality that actually has sensors, labelled with its
  // best spelling and counted so the list says how much each filter holds.
  // Two levels, state then municipality, so every sensor sits under a row:
  // the map reaches into Coahuila (Saltillo, Arteaga) even though this
  // observatory follows the Monterrey metro area.
  //
  // Counts are faceted: a row tallies only the sensors that also pass the
  // current Fuente filter, so "Monterrey · 47" drops to the handful of
  // government stations when Fuente is narrowed to Gobierno. Every row still
  // renders (a filtered-out municipality reads 0, not gone) so the list
  // doesn't reflow each time a source is toggled.
  const estados = useMemo(() => {
    const sourceOn = (sensor: Sensor) =>
      sensor.source === "sima" ? showSima : sensor.red ? showOccamm : showOtros;

    const byState = new globalThis.Map<string, {
      key: string;
      label: string;
      count: number;
      municipios: globalThis.Map<string, { key: string; label: string; count: number }>;
    }>();

    sensors.forEach((sensor) => {
      const sKey = estadoKey(sensor.estado);
      const mKey = municipioKey(sensor.municipio);
      if (!sKey || !mKey) return;

      const n = sourceOn(sensor) ? 1 : 0;

      let state = byState.get(sKey);
      if (!state) {
        state = { key: sKey, label: sensor.estado!.trim(), count: 0, municipios: new globalThis.Map() };
        byState.set(sKey, state);
      }
      state.count += n;
      // Prefer the accented spelling wherever the data disagrees with itself
      if (/[^\x00-\x7F]/.test(sensor.estado!) && !/[^\x00-\x7F]/.test(state.label)) state.label = sensor.estado!.trim();

      const label = sensor.municipio!.trim();
      const municipio = state.municipios.get(mKey);
      if (!municipio) {
        state.municipios.set(mKey, { key: mKey, label, count: n });
        return;
      }
      municipio.count += n;
      if (/[^\x00-\x7F]/.test(label) && !/[^\x00-\x7F]/.test(municipio.label)) municipio.label = label;
    });

    return Array.from(byState.values())
      .map((state) => ({
        ...state,
        municipios: Array.from(state.municipios.values()).sort((a, b) => a.label.localeCompare(b.label, "es")),
      }))
      .sort((a, b) => b.count - a.count);
  }, [sensors, showSima, showOccamm, showOtros]);

  // How many sensors each source contributes, so the Fuente rows carry the
  // same information the Ubicación rows do.
  const sourceCounts = useMemo(() => {
    const occamm = sensors.filter((sensor) => sensor.source !== "sima" && sensor.red).length;
    const otros = sensors.filter((sensor) => sensor.source !== "sima" && !sensor.red).length;
    return { occamm, otros, ciudadanos: occamm + otros, gobierno: sensors.filter((s) => s.source === "sima").length };
  }, [sensors]);

  const visibleSensors = useMemo(
    () => sensors.filter((sensor) => {
      if (hiddenMunicipios.includes(municipioKey(sensor.municipio) ?? "")) return false;
      if (sensor.source === "sima") return showSima;
      return sensor.red ? showOccamm : showOtros;
    }),
    [sensors, hiddenMunicipios, showSima, showOccamm, showOtros],
  );

  const sensorById = useMemo(() => {
    const m = new globalThis.Map<string, Sensor>();
    sensors.forEach((s) => m.set(String(s.sensor_id), s));
    return m;
  }, [sensors]);

  // All the per-sensor lookups below key on String(sensor_id): PurpleAir ids
  // are numbers, SIMA station ids are string codes ("SE", "NO", "Norte2"…).
  // Coercing to Number turned every SIMA id into NaN and dropped the stations
  // from the frame.

  // Latest reading per sensor — the frame the map paints. There is only the
  // live frame now (the time scrubber and its field-history window were
  // removed). `frameReadings` is kept as the name the field-build path reads.
  const frameReadings = useMemo(() => {
    const m = new globalThis.Map<string, number | null>();
    for (const d of data) m.set(String(d.sensor_id), d.pm25);
    return m;
  }, [data]);
  const frameReadingsRef = useRef(frameReadings);
  frameReadingsRef.current = frameReadings;

  // Which sensors can carry a marker at all: a valid reading now. Every SIMA
  // reference station is always in — it shows grey (see buildFieldData) rather
  // than vanishing on an hour it didn't report.
  const markerableIds = useMemo(() => {
    const ids = new Set<string>();
    for (const s of sensors) if (s.source === "sima") ids.add(String(s.sensor_id));
    for (const d of data) if (d.pm25 != null && d.pm25 > 0.4) ids.add(String(d.sensor_id));
    return ids;
  }, [sensors, data]);

  // Snapshots the GL field-build and map event handlers read without being
  // rebuilt on every render (they run once, or off a ref-stable useCallback).
  const visibleSensorsRef = useRef(visibleSensors);
  visibleSensorsRef.current = visibleSensors;
  const markerableIdsRef = useRef(markerableIds);
  markerableIdsRef.current = markerableIds;
  const dataRef = useRef(data);
  dataRef.current = data;

  // What the panel says about itself in its own header, so the collapsed card
  // answers "is the map filtered?" rather than holding 380px of empty glass
  // around one word. Counted over sensors that actually have a reading, since
  // those are the only ones drawn: a total that included silent sensors would
  // never match the dots you can see.
  const capasSummary = useMemo(() => {
    const reporting = new Set(
      data.filter((d) => d.pm25 !== null && d.pm25 > 0.4).map((d) => d.sensor_id),
    );
    const mapped = sensors.filter((sensor) => reporting.has(sensor.sensor_id)).length;
    if (!mapped) return null;
    const shown = visibleSensors.filter((sensor) => reporting.has(sensor.sensor_id)).length;
    return shown === mapped ? "Todos los sensores" : `${shown} de ${mapped} sensores`;
  }, [sensors, visibleSensors, data]);

  // The newest reading anywhere in the data set, which is what the freshness
  // badge reports. Kept as a Date rather than a formatted string: the badge needs to know how
  // old this is, and formatting the age away here is what let it insist the
  // map was live however long the pipeline had been down.
  const latestReading = useMemo(() => {
    let newest = 0;
    for (const d of data) {
      const t = new Date(d.time_stamp).getTime();
      if (!Number.isNaN(t) && t > newest) newest = t;
    }
    return newest ? new Date(newest) : null;
  }, [data]);

  // The station the card falls back to when nothing is picked: Obispado (CE),
  // built the same way a click builds a selection. Null only if it's filtered
  // out or absent from the feed. `cardSubject` is what every card consumer
  // reads — the explicit pick, else this.
  const defaultSelection = useMemo<SelectedSensor | null>(() => {
    const obispado = visibleSensors.find((s) => String(s.sensor_id) === DEFAULT_SENSOR_ID);
    return obispado ? buildSelection(obispado, data) : null;
  }, [visibleSensors, data]);
  const cardSubject = selectedSensor ?? defaultSelection;

  // Null until mounted, so the server and the first client render agree on a
  // value that is by definition different on each; then re-read on a timer,
  // because a tab left open all afternoon should watch the badge go amber
  // rather than sit on the state it had at page load.
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    const tick = () => setNow(Date.now());
    tick();
    const id = window.setInterval(tick, 60_000);
    return () => window.clearInterval(id);
  }, []);

  // The freshness readout reports the reading on screen: the card's station
  // (picked, else Obispado), else the newest anywhere in the live set. Sensors
  // publish on their own schedules, so a dataset-wide "newest" would sit ahead
  // of one station and make a current reading look late.
  //
  // Readings land hourly, so 90 minutes is one missed cycle plus slack, and
  // six hours is a pipeline that has stopped rather than a run that is late.
  // Past today the label picks up the day, so "11:00 AM" can never be
  // yesterday's 11:00 AM wearing a green dot.
  const freshness = useMemo<Freshness | null>(() => {
    if (now === null) return null;
    const reading = cardSubject?.readingAt ? new Date(cardSubject.readingAt) : latestReading;
    if (!reading || Number.isNaN(reading.getTime())) return null;

    const age = now - reading.getTime();
    const hour = `${format(reading, "h")}:00 ${format(reading, "a")}`;
    const day = getRelativeDayLabel(reading);
    return {
      dateTime: reading.toISOString(),
      when: day === "Hoy" ? hour : `${day.toLowerCase()} ${hour}`,
      status: age < 90 * 60 * 1000 ? "fresh" : age < 6 * 60 * 60 * 1000 ? "delayed" : "stale",
    };
  }, [cardSubject, latestReading, now]);

  // The marker that wears the pulse: the card's station. On desktop that is the
  // explicit pick only (empty right column and no pulse at rest); on mobile the
  // sheet still rests on Obispado, so the fallback carries. Mirrored into refs
  // so the map event handlers read the current value without being rebuilt on
  // each pick.
  const pulseSubject = isDesktop ? selectedSensor : cardSubject;
  const activeSensorId = pulseSubject?.sensor.sensor_id ?? null;
  activeSensorIdRef.current = activeSensorId;

  // The pulse halo is a large soft translucent fill, so it takes the official
  // `color` at full chroma, not the darkened `ink`.
  activeColorRef.current =
    getQualityInfo(
      activeSensorId != null ? data.find((d) => d.sensor_id === activeSensorId)?.pm25 ?? null : null,
    )?.color ?? PULSE_FALLBACK_COLOR;
  selectedIdRef.current = selectedSensor?.sensor.sensor_id ?? null;

  // The GL source's features for the live frame.
  // Citizen sensors with no reading drop out; SIMA reference stations stay as a
  // grey `nodata` disc so the network's shape holds. `sortKey` puts the
  // southern disc of an overlapping pair on top and every SIMA disc above the
  // citizen field — latitude and provenance only, never the reading, so an
  // overlap is never biased toward one end of the scale.
  const buildFieldData = useCallback(
    (readings: globalThis.Map<string, number | null>): GeoJSON.FeatureCollection => {
      const features: GeoJSON.Feature[] = [];
      for (const sensor of visibleSensorsRef.current) {
        const fid = String(sensor.sensor_id);
        if (!markerableIdsRef.current.has(fid)) continue;
        const isSima = sensor.source === "sima";
        const pm25 = readings.get(fid) ?? null;
        const hasReading = pm25 != null && pm25 > 0.4;
        if (!hasReading && !isSima) continue;
        const lon = Number(sensor.lon);
        const lat = Number(sensor.lat);
        if (!Number.isFinite(lon) || !Number.isFinite(lat)) continue;
        features.push({
          type: "Feature",
          id: fid,
          geometry: { type: "Point", coordinates: [lon, lat] },
          properties: {
            fid,
            fill: hasReading ? getMarkerFillHex(pm25)! : "#9ca3af",
            isSima,
            nodata: !hasReading,
            sortKey: (isSima ? 1_000_000 : 0) - lat,
          },
        });
      }
      return { type: "FeatureCollection", features };
    },
    [],
  );

  // Repaint the one DOM marker (the selected station) for the current frame:
  // fill, edge and the aria-label. Mutates the existing element — no rebuild,
  // so the pulse animation doesn't restart on a live-data refresh.
  const paintSelectedMarker = useCallback(
    (readings: globalThis.Map<string, number | null>) => {
      const el = (selectedMarkerRef.current as any)?.getElement() as HTMLElement | undefined;
      const id = activeFidRef.current;
      if (!el || !id) return;
      const sensor = sensorById.get(id);
      if (!sensor) return;
      const pm25 = readings.get(id) ?? null;
      const has = pm25 != null && pm25 > 0.4;
      const dot = el.querySelector<HTMLElement>(".sensor-marker__dot");
      el.classList.toggle("sensor-marker--nodata", !has);
      if (dot) {
        dot.style.setProperty("--marker-fill", has ? getMarkerFill(pm25)! : "#9ca3af");
        dot.style.setProperty("--marker-edge", has ? getLevel(pm25 as number).ink : "#6b7280");
      }
      el.setAttribute("aria-label", markerLabel(sensor, pm25));
    },
    [sensorById],
  );

  // Push a frame to the GL field: rebuild the source data, re-assert the
  // hover/selected feature-state (setData drops it), repaint the DOM marker.
  // One setData, no DOM churn.
  const updateField = useCallback(
    (readings: globalThis.Map<string, number | null>) => {
      const m = map.current as any;
      const src = m?.getSource(FIELD_SOURCE);
      if (!m || !src) return;
      src.setData(buildFieldData(readings));
      if (hoveredFidRef.current) {
        m.setFeatureState({ source: FIELD_SOURCE, id: hoveredFidRef.current }, { hover: true });
      }
      if (activeFidRef.current) {
        m.setFeatureState({ source: FIELD_SOURCE, id: activeFidRef.current }, { selected: true });
      }
      paintSelectedMarker(readings);
    },
    [buildFieldData, paintSelectedMarker],
  );

  // Move the selection to whichever station is now active: hide that station's
  // flat GL disc (feature-state `selected`) and stand a single DOM marker in
  // its place — the DOM marker carries the expanding CSS pulse halo GL can't
  // draw, plus a fuller opaque disc and the SIMA badge. Rebuilt only when the
  // active station's identity changes, not on a live-data refresh.
  const syncActive = useCallback(() => {
    const m = map.current as any;
    if (!m) return;
    const activeId = activeSensorIdRef.current;
    const nextFid = activeId != null ? String(activeId) : null;

    if (activeFidRef.current && activeFidRef.current !== nextFid && m.getSource(FIELD_SOURCE)) {
      m.setFeatureState({ source: FIELD_SOURCE, id: activeFidRef.current }, { selected: false });
    }
    activeFidRef.current = nextFid;
    if (nextFid && m.getSource(FIELD_SOURCE)) {
      m.setFeatureState({ source: FIELD_SOURCE, id: nextFid }, { selected: true });
    }

    (selectedMarkerRef.current as any)?.remove();
    selectedMarkerRef.current = null;
    if (activeId == null) return;

    const sensor = sensorById.get(String(activeId));
    if (!sensor) return;
    const isSima = sensor.source === "sima";
    const pm25 = frameReadingsRef.current.get(String(activeId)) ?? null;
    const has = pm25 != null && pm25 > 0.4;
    const el = createMarker(
      has ? (pm25 as number) : 1,
      markerLabel(sensor, pm25),
      isSima,
    );
    if (!el) return;
    el.classList.add("sensor-marker--selected");
    if (!has) el.classList.add("sensor-marker--nodata");
    el.style.setProperty("--pulse-color", activeColorRef.current);
    el.style.cursor = "pointer";
    el.addEventListener("click", (e) => {
      e.stopPropagation();
      if (window.innerWidth >= 768 && selectedIdRef.current === sensor.sensor_id) {
        setSelectedSensor(null);
        return;
      }
      setSelectedSensor(buildSelection(sensor, dataRef.current));
    });
    selectedMarkerRef.current = new Marker({ element: el })
      .setLngLat([sensor.lon, sensor.lat])
      .addTo(m);
    paintSelectedMarker(frameReadingsRef.current);
  }, [sensorById, paintSelectedMarker]);

  // Initialize map once, zoomed out; the opening flyTo below settles it in.
  useEffect(() => {
    if (map.current) return;

    map.current = new Map({
      container: mapContainer.current!,
      // Classic Light: muted, flat, no 3D buildings / lighting / model assets,
      // small style + streets-v8 tiles, so it loads fast and stays out of the
      // way while the NOM-172 marker colours carry the read.
      // Previous bespoke style: mapbox://styles/edgargutgzz/climactgb00cn01qw7amo9bbd
      style: "mapbox://styles/mapbox/light-v11",
      center: OPENING_CENTER,
      zoom: OPENING_ZOOM,
    });

    // Set padding instantly, not as part of flyTo: interpolating it alongside
    // the zoom looked like the map veering sideways partway through the fly-in.
    // Card clearance on desktop, bottom sheet on mobile.
    const initialIsMobile = window.innerWidth < 768;
    (map.current as any).setPadding(
      initialIsMobile ? { top: 0, bottom: 180, left: 0, right: 0 } : { top: 0, bottom: 0, left: 0, right: 280 }
    );

    map.current.on("style.load", () => {
      const m = map.current as any;
      // Classic Light labels follow the viewer's locale; pin to Spanish.
      try {
        m.setLanguage("es");
      } catch {
        // API shape shift — labels fall back to locale, harmless
      }
      // Repaint a few layers off stock light-v11 — see the BASEMAP_* knobs.
      const paint = (id: string, prop: string, value: string | number) => {
        try {
          if (m.getLayer(id)) m.setPaintProperty(id, prop, value);
        } catch {
          // that layer isn't in this build — skip it
        }
      };
      try {
        // Ground: background-type layers, plus a "land" fill if this build has one.
        for (const layer of m.getStyle()?.layers ?? []) {
          if (layer.type === "background") {
            m.setPaintProperty(layer.id, "background-color", BASEMAP_GROUND);
          }
        }
        if (m.getLayer("land") && m.getLayer("land").type === "fill") {
          m.setPaintProperty("land", "fill-color", BASEMAP_GROUND);
        }
        // Water: the river channel + dams, then the thin centrelines.
        paint("water", "fill-color", BASEMAP_WATER);
        paint("water-shadow", "fill-color", BASEMAP_WATER);
        paint("waterway", "line-color", BASEMAP_WATERWAY);
      } catch {
        // upstream layer shape changed — basemap still renders, just paler
      }
    });

    map.current.on("load", () => {
      setMapLoaded(true);
    });

    return () => {
      (map.current as any)?.remove();
      map.current = null;
      setMapLoaded(false);
    };
  }, []);

  // Opening camera. Runs once. A shared ?sensor= link flies in close (zoom 13)
  // to the station it's about. A normal load lands on the metro field, centred
  // on the default station so its pulse is in frame — knowing which station the
  // card speaks for matters, but going right to it doesn't. jumpTo under
  // reduced motion. essential: true so a backgrounded tab doesn't drop the move.
  const didOpeningFlyRef = useRef(false);
  useEffect(() => {
    if (!mapLoaded || !map.current || didOpeningFlyRef.current) return;
    didOpeningFlyRef.current = true;

    const urlSensor = initialSensorId != null
      ? sensors.find((s) => s.sensor_id === initialSensorId)
      : undefined;
    const focus = urlSensor
      ? { center: [urlSensor.lon, urlSensor.lat] as [number, number], zoom: 13 }
      : defaultSelection
        ? { center: [defaultSelection.sensor.lon, defaultSelection.sensor.lat] as [number, number], zoom: 11 }
        : { center: OPENING_CENTER, zoom: 10.5 };

    if (prefersReducedMotion()) {
      (map.current as any).jumpTo(focus);
      return;
    }
    (map.current as any).flyTo({ ...focus, duration: OPENING_MOVE_MS, essential: true });
  }, [mapLoaded, sensors, initialSensorId, defaultSelection]);

  // Stand up the GL marker field once the style is ready: one geojson source
  // and one circle layer, plus the hover/click handlers. No clustering — every
  // markerable sensor is always in the source; the GPU sizes each disc per
  // zoom and resolves overlap by `circle-sort-key`. The disc has a flat 1.5px
  // white stroke and no drop shadow — flat reads far better in the basin knot
  // than the old ink hairline + white ring + double shadow, and the selected
  // DOM marker keeps the lift + pulse.
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    const m = map.current as any;

    try {
      if (!m.getSource(FIELD_SOURCE)) {
        m.addSource(FIELD_SOURCE, {
          type: "geojson",
          data: buildFieldData(frameReadingsRef.current),
          promoteId: "fid",
        });
      }
      if (!m.getLayer(FIELD_LAYER)) {
      m.addLayer({
        id: FIELD_LAYER,
        type: "circle",
        source: FIELD_SOURCE,
        layout: { "circle-sort-key": ["get", "sortKey"] as any },
        paint: {
          "circle-color": ["get", "fill"] as any,
          "circle-radius": FIELD_RADIUS as any,
          // The selected station's flat disc is hidden (opacity 0) — the DOM
          // marker stands in for it. Rest of the field: SIMA fuller than
          // citizen, no-data SIMA discs recede.
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 0,
            ["boolean", ["get", "nodata"], false], 0.5,
            ["boolean", ["get", "isSima"], false], 0.82,
            0.62,
          ] as any,
          "circle-stroke-width": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 0,
            1.5,
          ] as any,
          "circle-stroke-color": "#ffffff",
          "circle-stroke-opacity": [
            "case",
            ["boolean", ["get", "nodata"], false], 0.65,
            0.95,
          ] as any,
        },
      });
      }
      // Landmark badge on every SIMA station (grey no-data ones included) —
      // hidden only while it's the selected station, whose DOM marker carries
      // its own scaling badge. Fixed pixel offset: it sits on the disc's
      // upper-right edge at the opening zoom, drifts a little in/out at the
      // extremes, which is fine on ~15 spread stations.
      if (!m.hasImage(SIMA_BADGE_IMAGE)) {
        m.addImage(SIMA_BADGE_IMAGE, makeSimaBadge(), { pixelRatio: 2 });
      }
      if (!m.getLayer(SIMA_BADGE_LAYER)) {
        m.addLayer({
          id: SIMA_BADGE_LAYER,
          type: "symbol",
          source: FIELD_SOURCE,
          filter: ["==", ["get", "isSima"], true] as any,
          layout: {
            "icon-image": SIMA_BADGE_IMAGE,
            "icon-size": 0.9,
            "icon-offset": [8, -8],
            "icon-allow-overlap": true,
            "icon-ignore-placement": true,
            "symbol-sort-key": ["get", "sortKey"] as any,
          },
          paint: {
            "icon-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false], 0,
              1,
            ] as any,
          },
        });
      }
    } catch (err) {
      console.error("[map] failed to add the sensor field layer", err);
      return;
    }

    const canvas = m.getCanvas() as HTMLCanvasElement;
    const onMove = (e: any) => {
      canvas.style.cursor = "pointer";
      const f = e.features?.[0];
      const fid = f ? String(f.id ?? (f.properties as any)?.fid) : null;
      if (!fid || fid === hoveredFidRef.current) return;
      if (hoveredFidRef.current) {
        m.setFeatureState({ source: FIELD_SOURCE, id: hoveredFidRef.current }, { hover: false });
      }
      hoveredFidRef.current = fid;
      m.setFeatureState({ source: FIELD_SOURCE, id: fid }, { hover: true });
    };
    const onLeave = () => {
      canvas.style.cursor = "";
      if (hoveredFidRef.current) {
        m.setFeatureState({ source: FIELD_SOURCE, id: hoveredFidRef.current }, { hover: false });
      }
      hoveredFidRef.current = null;
    };
    // GL hands us the topmost rendered disc under the pointer, collision-aware
    // — no DOM hit-box guessing, so a click in a dense knot lands on the disc
    // you can see. On desktop, re-clicking the open station closes the card.
    const onClick = (e: any) => {
      const f = e.features?.[0];
      if (!f) return;
      const fid = String(f.id ?? (f.properties as any)?.fid);
      const sensor = sensorById.get(fid);
      if (!sensor) return;
      if (window.innerWidth >= 768 && selectedIdRef.current === sensor.sensor_id) {
        setSelectedSensor(null);
        return;
      }
      setSelectedSensor(buildSelection(sensor, dataRef.current));
    };
    m.on("mousemove", FIELD_LAYER, onMove);
    m.on("mouseleave", FIELD_LAYER, onLeave);
    m.on("click", FIELD_LAYER, onClick);

    updateField(frameReadingsRef.current);
    syncActive();

    return () => {
      m.off("mousemove", FIELD_LAYER, onMove);
      m.off("mouseleave", FIELD_LAYER, onLeave);
      m.off("click", FIELD_LAYER, onClick);
    };
  }, [mapLoaded, buildFieldData, updateField, syncActive, sensorById]);

  // Push a frame to the field: a filter change (visibleSensors) or a live-data
  // refresh (frameReadings). One setData, no marker churn — and not syncActive,
  // so the selected DOM marker's pulse doesn't restart (updateField repaints
  // its disc in place instead).
  useEffect(() => {
    if (!mapLoaded) return;
    updateField(frameReadings);
  }, [mapLoaded, visibleSensors, markerableIds, frameReadings, updateField]);

  // Drop the DOM selected marker when the component unmounts (the GL source and
  // layer go with map.remove() in the init effect's cleanup).
  useEffect(() => {
    return () => {
      (selectedMarkerRef.current as any)?.remove();
      selectedMarkerRef.current = null;
    };
  }, []);

  // Move the pulsing halo to whichever marker is now active — the explicitly
  // selected sensor, else the default one the card opens on — in that sensor's
  // own air-quality ink (yellow and green barely register as a ring on
  // a light map; the darker tone also keeps the ring off the circle it wraps).
  // syncActive owns the DOM writes; the field-build effect calls it too, this
  // re-runs it when only the pick changes (including desktop dropping to no
  // pick, which clears the pulse). No resize, no dimming of the rest.
  useEffect(() => {
    if (!mapLoaded) return;
    syncActive();
  }, [mapLoaded, activeSensorId, syncActive]);

  // Filters can hide whatever is open: drop the selection rather than leave the
  // card describing a sensor that is no longer on the map.
  useEffect(() => {
    if (!selectedSensor) return;
    if (!visibleSensors.some((sensor) => sensor.sensor_id === selectedSensor.sensor.sensor_id)) {
      setSelectedSensor(null);
    }
  }, [visibleSensors, selectedSensor]);

  // ?sensor= is consume-once: it seeds the initial selection (a shared "look at
  // this station" link), then it's stripped from the URL so a reload or a nav
  // click lands clean — no featured sensor by default. Selecting a marker
  // afterward does NOT put it back in the URL.
  useEffect(() => {
    writeSensorParam(null);
  }, []);

  // Mirror the Capas filters into ?src= / ?hide= so a filtered view travels.
  // Also runs on mount, which cleans an unknown municipio key or a redundant
  // src= out of the URL.
  useEffect(() => {
    writeFilterParams({ showOccamm, showOtros, showSima, hiddenMunicipios });
  }, [showOccamm, showOtros, showSima, hiddenMunicipios]);

  // Close the estación card. **Desktop only** — the right column goes empty and
  // the map stands alone. On mobile there is no "close": the sheet always rests
  // on a station (a pick, else the default Obispado); the most a mobile gesture
  // does is collapse it back to `peek`.
  const closeCard = useCallback(() => {
    setSelectedSensor(null);
    setSheetState('peek');
  }, []);

  // Clicking empty map: on desktop it dismisses the pick (back to a bare map);
  // on mobile it just collapses the sheet to peek, never dropping the card.
  // Mapbox fires `click` only on a genuine click, not a drag/pan; a hit on the
  // disc layer means the field handler already owns this click, so bail.
  useEffect(() => {
    if (!mapLoaded || !map.current) return;
    const m = map.current as any;
    const handler = (e: any) => {
      if (m.getLayer(FIELD_LAYER) && m.queryRenderedFeatures(e.point, { layers: [FIELD_LAYER] }).length) return;
      if (isDesktop) closeCard();
      else setSheetState('peek');
    };
    m.on("click", handler);
    return () => { m?.off("click", handler); };
  }, [mapLoaded, closeCard, isDesktop]);

  // Keyboard / screen-reader path into the field: the GL discs are canvas-drawn
  // and not tabbable, so every markerable station is also a visually-hidden
  // button that selects it (opens the card) and eases the camera to it. Labels
  // carry the reading for the frame on screen.
  const a11yStations = useMemo(
    () =>
      [...visibleSensors]
        .filter((s) => markerableIds.has(String(s.sensor_id)))
        .sort((a, b) =>
          (a.nombre_display || a.nombre).localeCompare(b.nombre_display || b.nombre, "es"),
        )
        .map((s) => ({
          sensor: s,
          label: markerLabel(s, frameReadings.get(String(s.sensor_id)) ?? null),
        })),
    [visibleSensors, markerableIds, frameReadings],
  );

  const selectFromList = useCallback(
    (s: Sensor) => {
      setSelectedSensor(buildSelection(s, dataRef.current));
      const m = map.current as any;
      if (!m) return;
      const focus = { center: [s.lon, s.lat] as [number, number], zoom: Math.max(m.getZoom(), 12) };
      if (prefersReducedMotion()) m.jumpTo(focus);
      else m.easeTo(focus);
    },
    [],
  );

  // Escape dismisses a picked sensor too — desktop only, matching the X (mobile
  // has no close), and only when a dialog isn't open (it owns Escape first).
  useEffect(() => {
    if (!selectedSensor || !isDesktop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) closeCard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSensor, isDesktop, closeCard]);

  // 5.5rem of peek showing above the nav: the grabber and the summary row (the
  // default sensor name + its reading). Freshness floats at the top of the map,
  // so it adds nothing here.
  const sheetTransform = sheetState === 'mid' ? 'translateY(0)' : 'translateY(calc(100% - 5.5rem))';

  const handleSheetTap = useCallback(() => {
    setSheetState((s) => s === 'peek' ? 'mid' : 'peek');
  }, []);

  // Copy a station's coordinates and flash the "Copiado" state for 1.5s. Shared
  // by the desktop card and the mobile sheet's copy button.
  const copyCoords = useCallback((lat: number, lon: number) => {
    navigator.clipboard.writeText(`${lat.toFixed(5)}, ${lon.toFixed(5)}`);
    setCopied(true);
    setTimeout(() => setCopied(false), 1500);
  }, []);

  return (
    <div className="relative h-below-header">
      {/* Map container */}
      <div
        ref={mapContainer}
        className="absolute left-0 top-0 h-full w-full"
      />

      {/* Keyboard / screen-reader equivalent for the GL marker field. */}
      <div className="sr-only">
        <h2>Estaciones de monitoreo de calidad del aire</h2>
        <ul>
          {a11yStations.map(({ sensor, label }) => (
            <li key={sensor.sensor_id}>
              <button type="button" onClick={() => selectFromList(sensor)}>{label}</button>
            </li>
          ))}
        </ul>
      </div>

      {/* Mobile map controls — a right-edge stack, hidden when the sheet is
          expanded. The air-quality legend sits on top of the Capas button as a
          matching icon button; each opens its own bottom sheet. Desktop carries
          the legend at the foot of the left rail instead. */}
      {sheetState === 'peek' && (
        <div
          className="fixed right-6 z-[45] flex flex-col items-end gap-3 md:hidden"
          style={{ bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 6.5rem)' }}
        >
          <button
            onClick={() => { setShowLegend((v) => !v); setShowFilters(false); }}
            className={`rounded-xl p-3 transition-colors duration-200 ${showLegend ? 'border border-gray-900/30 bg-white/90 shadow-sm backdrop-blur-md' : 'glass'}`}
            aria-label="Calidad del aire"
          >
            <Wind className={`h-5 w-5 ${showLegend ? 'text-gray-900' : 'text-gray-700'}`} />
          </button>
          <button
            onClick={() => { setShowFilters((v) => !v); setShowLegend(false); }}
            className={`rounded-xl p-3 transition-colors duration-200 ${showFilters ? 'border border-gray-900/30 bg-white/90 shadow-sm backdrop-blur-md' : 'glass'}`}
            aria-label="Capas"
          >
            <Layers className={`h-5 w-5 ${showFilters ? 'text-gray-900' : 'text-gray-700'}`} />
          </button>
        </div>
      )}

      {/* Data freshness — mobile: a compact glass pill at the top-left of the
          map, just under the top bar. It hides with the right-edge buttons once
          the sheet is expanded. Low-priority chrome, so it runs small and
          shadowless. Desktop pins the full badge to the foot of the left rail. */}
      {sheetState === 'peek' && freshness && (
        <div className="pointer-events-none absolute left-4 top-4 z-[45] md:hidden">
          <FreshnessBadge freshness={freshness} compact />
        </div>
      )}

      {/* Layers filter backdrop — mobile only */}
      <div
        className={`fixed inset-0 z-[46] bg-black/20 transition-opacity duration-300 md:hidden ${
          showFilters ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setShowFilters(false)}
      />

      {/* Layers filter panel — mobile: slides up from bottom. A flex column with
          a capped height so only the body scrolls (the header stays put), while
          the sheet still shrinks to fit a short list. */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[47] flex max-h-[85svh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden"
        style={{
          transform: showFilters ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div
          className="flex-shrink-0 cursor-grab select-none px-5 pb-4 pt-3"
          onClick={() => setShowFilters(false)}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300/60" />
          <p className="text-base font-medium text-gray-700">Capas</p>
        </div>
        <div
          /* A plain block, not a flex column: the one child is the filter card,
             which carries overflow-hidden to clip its own rounded corners. As a
             flex item it would resolve to min-height:0 and a flex parent would
             shrink the card to fit and clip its rows instead of letting them
             overflow and scroll here. The desktop panel body is a plain block
             for the same reason. */
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5"
          style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 2rem)' }}
        >
          <LayersFilterContent
            showOtros={showOtros}
            setShowOtros={setShowOtros}
            showOccamm={showOccamm}
            setShowOccamm={setShowOccamm}
            showSima={showSima}
            setShowSima={setShowSima}
            estados={estados}
            sourceCounts={sourceCounts}
            hiddenMunicipios={hiddenMunicipios}
            setHiddenMunicipios={setHiddenMunicipios}
            onShowOccammInfo={() => setShowOccammInfo(true)}
            onShowFuenteInfo={() => setShowFuenteInfo(true)}
          />
        </div>
      </div>

      {/* Air-quality legend backdrop — mobile only */}
      <div
        className={`fixed inset-0 z-[46] bg-black/20 transition-opacity duration-300 md:hidden ${
          showLegend ? "opacity-100" : "pointer-events-none opacity-0"
        }`}
        onClick={() => setShowLegend(false)}
      />

      {/* Air-quality legend panel — mobile: slides up from bottom, the same
          sheet as Capas: a capped flex column so only the body scrolls and the
          sheet still shrinks to fit. The scale bar and its threshold list; no
          toggle, since the sheet itself is the disclosure. */}
      <div
        className="fixed left-0 right-0 bottom-0 z-[47] flex max-h-[85svh] flex-col overflow-hidden rounded-t-3xl bg-white shadow-[0_-4px_20px_rgba(0,0,0,0.08)] md:hidden"
        style={{
          transform: showLegend ? 'translateY(0)' : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
      >
        <div
          className="flex-shrink-0 cursor-grab select-none px-5 pb-4 pt-3"
          onClick={() => setShowLegend(false)}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300/60" />
          <p className="text-base font-medium text-gray-700">Calidad del aire</p>
        </div>
        <div
          /* Plain block, not a flex column — see the Capas sheet body above. */
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5"
          style={{ paddingBottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px) + 2rem)' }}
        >
          <ScaleBar />
          <LegendDetail className="mt-4 border-t border-gray-100 pt-4" />
        </div>
      </div>

      {/* Desktop right column. Opens with the default station (Obispado) picked;
          the X / Escape / a click on empty map close it, and then the column is
          empty and the map stands alone until another marker is picked. */}
      <div className="pointer-events-none absolute bottom-10 right-6 top-6 z-10 hidden flex-col items-end gap-2 md:flex">

        {/* flex-1 so the wrapper takes the full column height; that bounds the
            card, so its own overflow-y-auto body scrolls instead of the card
            overrunning the column when the recommendations are expanded. */}
        <div className="flex min-h-0 w-panel-lg flex-1 flex-col">
        {selectedSensor && (() => {
          const { sensor } = selectedSensor;
          const pm25 = selectedSensor.pm25;
          const sensorQuality = getQualityInfo(pm25);
          return (
            <div className="glass pointer-events-auto flex min-h-0 flex-col overflow-hidden rounded-2xl">
              <div className="flex w-full flex-shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-3">
                <span className="min-w-0 flex-1 truncate text-base font-medium text-gray-700">{displayName(sensor)}</span>
                <button
                  type="button"
                  onClick={closeCard}
                  aria-label="Cerrar"
                  className="-my-1 -mr-1 flex-shrink-0 rounded-lg p-1 text-gray-400 transition-colors hover:text-gray-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-gray-900/15"
                >
                  <X aria-hidden="true" className="h-4 w-4" />
                </button>
              </div>
              <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
                <div className={`disclosure-in flex flex-col gap-5 px-5 pt-3 ${sensorQuality ? 'pb-0' : 'pb-6'}`}>
                  <StationReading
                    subject={selectedSensor}
                    pm25={pm25}
                    copied={copied}
                    onCopyCoords={() => copyCoords(sensor.lat, sensor.lon)}
                    copyInteractionClass="hover:text-gray-700"
                  />
                </div>

                {/* Recommendations — collapsed by default, not needed for a data-first platform */}
                {sensorQuality && (
                  <div className="disclosure-in relative z-[1] mt-5 border-t border-gray-100 px-5 pb-5 pt-5">
                    <HealthRecommendations info={sensorQuality} onShowInfo={() => setCuidarmeQuality(sensorQuality)} />
                  </div>
                )}
              </div>
              <span role="status" className="sr-only">{copied ? 'Coordenadas copiadas' : ''}</span>
            </div>
          );
        })()}
        </div>{/* end card width wrapper */}
      </div>

      {/* Left column (desktop): the Capas panel, the air-quality legend, and
          the data-freshness badge pinned at the foot of the rail. On mobile the
          panel and legend are bottom sheets and freshness is the top-left pill,
          so this column renders nothing there.

          The column runs the whole height; the legend + badge sit at the bottom
          (md:mt-auto) and the panel grows into whatever is left over. */}
      <div className="pointer-events-none absolute left-4 top-4 z-10 flex w-panel-md flex-col items-start gap-2 md:bottom-10 md:left-6 md:top-6 md:w-panel-filters">
        <div className="glass pointer-events-auto hidden min-h-0 w-full flex-col overflow-hidden rounded-2xl md:flex">
          {/* The header carries the filter state, in the same "label · summary"
              idiom the rows inside the panel already use. gray-500 rather than
              the rows' gray-300: at 13px on this material that is the first
              value that clears 4.5:1, and it still reads as subordinate to
              the label beside it. */}
          <button
            onClick={() => setShowFiltrosContent((v) => !v)}
            aria-expanded={showFiltrosContent}
            className="flex w-full flex-shrink-0 items-center gap-1.5 px-5 pt-4 pb-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-gray-900/15"
          >
            <span className="flex-shrink-0 text-base font-medium text-gray-700">Capas</span>
            {capasSummary && (
              <span className="min-w-0 flex-1 truncate text-[13px] text-gray-500">· {capasSummary}</span>
            )}
            <ChevronRight className={`ml-auto h-4 w-4 flex-shrink-0 text-gray-400 transition-transform duration-200 ${showFiltrosContent ? 'rotate-90' : ''}`} />
          </button>
          {showFiltrosContent && (
            /* Only the body scrolls, so the "Capas" header stays in place, and
               overscroll-contain stops a scroll that reaches the end from
               panning the map underneath. flex-1 min-h-0 takes whatever the
               column has left after the legend + badge. */
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pb-6 pt-3">
              <LayersFilterContent
                showOtros={showOtros}
                setShowOtros={setShowOtros}
                showOccamm={showOccamm}
                setShowOccamm={setShowOccamm}
                showSima={showSima}
                setShowSima={setShowSima}
                estados={estados}
                sourceCounts={sourceCounts}
                hiddenMunicipios={hiddenMunicipios}
                setHiddenMunicipios={setHiddenMunicipios}
                onShowOccammInfo={() => setShowOccammInfo(true)}
                onShowFuenteInfo={() => setShowFuenteInfo(true)}
              />
            </div>
          )}
        </div>

        {/* The air-quality scale sits at the foot of this rail on desktop, with
            the data-freshness line folded in as its footer row — "how to read
            the field" and "how current the field is" are one object. Same
            w-panel-filters width as the Capas panel; md:mt-auto pins it to the
            bottom whether the legend is open or shut. Desktop only: on mobile
            the legend floats bottom-left of the map and freshness is the
            top-left pill. */}
        <div className="glass pointer-events-auto hidden w-full flex-shrink-0 rounded-2xl md:mt-auto md:block">
          <div className="px-5 py-4">
            <AirQualityLegend collapsible />
          </div>
          {freshness && (
            <div className="flex items-center gap-2 border-t border-gray-100 px-5 py-3">
              <FreshnessDot status={freshness.status} />
              <FreshnessText freshness={freshness} />
            </div>
          )}
        </div>
      </div>

      {/* Bottom sheet backdrop — mobile only, only when the sheet is open past
          peek. Tapping it collapses the sheet back to peek; it does NOT close
          the card (there is no close on mobile). */}
      <div
        className={`fixed inset-0 z-[35] bg-black/20 transition-opacity duration-300 md:hidden ${
          cardSubject && sheetState !== 'peek' ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={() => setSheetState('peek')}
      />

      {/* Bottom sheet — mobile twin of the desktop card. At rest it peeks the
          default station (Obispado); tapping a marker swaps the subject and the
          grabber toggles peek/mid. There is no close on mobile — the sheet
          always rests on a station (that's a desktop-only affordance). */}
      {(() => {
        const subj = cardSubject;
        const s = subj?.sensor;
        const name = s ? displayName(s) : "";
        const pm25 = subj ? subj.pm25 : null;
        const quality = getQualityInfo(pm25);

        return (
      <div
        className={`fixed left-0 right-0 z-[40] rounded-t-3xl flex flex-col md:hidden overflow-hidden shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-colors duration-300 ${sheetState === 'peek' ? 'bg-white/80 backdrop-blur-md border-t border-white/60' : 'bg-white'}`}
        style={{
          bottom: 'calc(3.5rem + env(safe-area-inset-bottom, 0px))',
          height: '62dvh',
          transform: subj ? sheetTransform : 'translateY(100%)',
          transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
        }}
        aria-hidden={!subj}
      >
        {subj && (
          <>
        <div
          className="flex-shrink-0 cursor-pointer select-none px-5 pt-3 pb-3"
          onClick={handleSheetTap}
        >
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-gray-300/60" />
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-base font-medium text-gray-700">
              {name}
            </span>
            <div className="flex flex-shrink-0 items-baseline gap-2">
              {sheetState === 'peek' && quality && (
                <span className="text-2xl font-bold" style={{ color: quality.textColor }}>
                  {quality.label}
                </span>
              )}
            </div>
          </div>
        </div>

        {/* Scrollable content — visible when expanded to mid. Mirrors the
            desktop card: a source line closed off by a rule, the reading, then
            the recommendations behind a rule. */}
        <div
          className={`relative z-[1] min-h-0 flex-1 overflow-y-auto overscroll-contain px-5 pt-2 pb-8 ${sheetState === 'peek' ? 'invisible' : ''}`}
        >
            <div className="flex flex-col gap-5">
              <StationReading
                subject={subj}
                pm25={pm25}
                copied={copied}
                onCopyCoords={() => copyCoords(s!.lat, s!.lon)}
                copyInteractionClass="active:opacity-70"
              />

              {quality && (
                <div className="relative z-[1] border-t border-gray-100 pt-5">
                  <HealthRecommendations info={quality} onShowInfo={() => setCuidarmeQuality(quality)} defaultOpen />
                </div>
              )}
            </div>
        </div>
        <span role="status" className="sr-only">{copied ? 'Coordenadas copiadas' : ''}</span>
          </>
        )}
      </div>
        );
      })()}


      {/* Recomendaciones de salud popup — the same dialog as the rest, rather
          than a bare div: it was the one popup with no name for assistive
          tech, no focus handling and no Escape. */}
      {cuidarmeQuality && (
        <InfoDialog title="Recomendaciones de salud" onClose={() => setCuidarmeQuality(null)}>
          <p className="text-sm leading-relaxed text-gray-600">
            Recomendaciones oficiales según el Índice de Aire y Salud Mexicano{" "}
            <DialogLink href="https://dof.gob.mx/nota_detalle.php?codigo=5715154&fecha=25/01/2024#gsc.tab=0">
              NOM-172-SEMARNAT-2023
            </DialogLink>
            , para la población general y grupos sensibles.
          </p>
        </InfoDialog>
      )}

      {/* OCCAMM info popup */}
      {showOccammInfo && (
        <InfoDialog title="Red OCCAMM" onClose={() => setShowOccammInfo(false)}>
          <p className="text-sm leading-relaxed text-gray-600">
            Red de sensores del{" "}
            <DialogLink href="https://observatoriodelaire.com">
              Observatorio Ciudadano de la Calidad del Aire
            </DialogLink>
            , una organización de la sociedad civil dedicada a mejorar la
            calidad del aire en la Zona Metropolitana de Monterrey.
          </p>
        </InfoDialog>
      )}

      {/* Fuente info popup — covers both sources in one place instead of a separate icon per row */}
      {showFuenteInfo && (
        <AccordionDialog
          title="Fuente"
          onClose={() => setShowFuenteInfo(false)}
          sections={[
            {
              title: "Sensores Ciudadanos",
              body: (
                <>
                  <p>
                    Sensores de bajo costo que forman parte de{" "}
                    <DialogLink href="https://www.purpleair.com/">PurpleAir</DialogLink>
                    , una red global de monitoreo comunitario instalada por
                    ciudadanos, escuelas y organizaciones independientes.
                  </p>
                  <p className="mt-2">
                    Al ser de bajo costo, no están calibrados como las estaciones
                    oficiales y pueden sobreestimar las PM2.5 cuando hay mucha
                    humedad.
                  </p>
                </>
              ),
            },
            {
              title: "Estaciones de Gobierno",
              body: (
                <>
                  Estaciones de monitoreo que forman parte del{" "}
                  <DialogLink href="https://aire.nl.gob.mx/">
                    Sistema Integral de Monitoreo Ambiental (SIMA)
                  </DialogLink>
                  , operado por el Gobierno de Nuevo León.
                </>
              ),
            },
          ]}
        />
      )}

    </div>
  );
}
