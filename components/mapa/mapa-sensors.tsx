"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { CircleGauge, Layers, type LucideIcon } from "lucide-react";
import { Map, Marker } from "maplibre-gl";
import type { Feature, FeatureCollection } from "geojson";
import { track } from "@vercel/analytics";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMarkerFill, getMarkerFillHex, getLevel, getMarkerNumberInk, createMarker, getQualityInfo } from "@/lib/air-quality";
import { readSensorParam, writeSensorParam, readFilterParams, writeFilterParams } from "@/lib/map-url-state";
import type { Sensor, Data, SelectedSensor } from "./types";
import {
  PULSE_FALLBACK_COLOR,
  municipioKey,
  estadoKey,
  pickDefaultSensor,
  toFreshness,
  prefersReducedMotion,
  buildSelection,
  displayName,
  markerLabel,
  isOccammSensor,
} from "./lib";
import {
  OPENING_CENTER,
  OPENING_ZOOM,
  FIELD_SOURCE,
  FIELD_LAYER,
  FIELD_LAYERS,
  GOB_SUFFIX,
  FIELD_EDGE_LAYER,
  FIELD_EDGE_RADIUS,
  FIELD_LABEL_LAYER,
  FIELD_LABEL_BOX_IMAGE,
  FIELD_LABEL_BOX_SIZE,
  makeLabelBox,
  SIMA_BADGE_LAYER,
  SIMA_BADGE_IMAGE,
  makeSimaBadge,
  OCCAMM_BADGE_LAYER,
  OCCAMM_BADGE_IMAGE,
  FIELD_RADIUS,
  FIELD_LABEL_SIZE,
  FIELD_LABEL_OPACITY,
  FIELD_BADGE_SIZE,
  FIELD_BADGE_OFFSET,
  fieldRadiusAt,
} from "./field-layer";
import { MapToolbar, type Panel } from "./map-toolbar";
import { FreshnessBadge } from "@/components/data/freshness";
import { AirNowPanel, StationPanel } from "./station-card";
import { BASEMAP_BOUNDS, LABEL_FONT, basemapStyle } from "./basemap";
import { BASEMAP_GROUND } from "./ground";


// Analytics: a station the visitor picked (map tap or the station list). The
// default card and ?sensor= links aren't picks, so they aren't counted.
function trackStationOpen(sensor: Sensor) {
  track("estacion_abierta", {
    estacion: sensor.nombre_display || sensor.nombre,
    fuente: sensor.source,
  });
}

// What the desktop sidebar covers of the map's left edge: its 24px inset
// (left-6) + its width (tailwind.config's panel-lg). The map is padded by it.
const SIDEBAR_WIDTH = 24 + 460;

// The view a normal load opens on: the metro field, nothing picked (the
// sidebar, or the mobile sheet, carries the air right now). Mobile centred on
// its sheet's station at zoom 10.5 until 2026-11-17, when the sheet stopped
// pulsing it; it now opens further out than desktop (9.5), a step
// east and a bit north of the desktop centre ([-100.378, 25.700] →
// [-100.32, 25.725]), since nothing covers its
// left edge.
const MOBILE_CENTER: [number, number] = [-100.32, 25.725];
const MOBILE_ZOOM = 9.5;
function restingFocus() {
  const desktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  return desktop ? { center: OPENING_CENTER, zoom: OPENING_ZOOM } : { center: MOBILE_CENTER, zoom: MOBILE_ZOOM };
}

// The round icon buttons over the mobile map (back 2026-11-17, same look as
// before): Calidad del aire's legend and the Fuente filters, each opening the
// toolbar's own panel as a bottom sheet. The scale's icon is the closed
// gauge (circle-gauge, user pick 2026-11-17): the open one read too light
// beside the layers glyph.
function MapIconButton({ active, onClick, label, icon: Icon }: { active: boolean; onClick: () => void; label: string; icon: LucideIcon }) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label={label}
      aria-expanded={active}
      className="glass pointer-events-auto rounded-xl p-3 transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
    >
      <Icon aria-hidden="true" className="h-5 w-5 text-neutral-700" />
    </button>
  );
}

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
    ? sensors.find((s) => String(s.sensor_id) === initialSensorId)
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

  // The style is parsed, so the marker field can be added and drawn; the
  // stations don't wait on a single basemap tile.
  const [styleReady, setStyleReady] = useState(false);
  const [showOtros, setShowOtros] = useState(() => seedSource("otros"));
  const [showSima, setShowSima] = useState(() => seedSource("gob"));
  const [hiddenMunicipios, setHiddenMunicipios] = useState<string[]>(seedHidden);
  const [showOccamm, setShowOccamm] = useState(() => seedSource("occamm"));

  const [selectedSensor, setSelectedSensor] = useState<SelectedSensor | null>(() =>
    linkedSensor ? buildSelection(linkedSensor, data) : null,
  );
  const [copied, setCopied] = useState(false);
  const [sheetState, setSheetState] = useState<'peek' | 'mid'>('peek');
  // Mobile: the toolbar panel open from the round buttons or the sheet's bar.
  const [mobilePanel, setMobilePanel] = useState<Panel>(null);

  // Desktop: an empty-map click or Escape closes the picked card; on mobile
  // an empty-map click only collapses the sheet (its X closes the pick). Tracked in state (not just a CSS `md:` toggle) because the
  // empty-map click and Escape behave differently. Starts false so SSR and the
  // first client render agree; the effect promotes it on a wide viewport.
  const [isDesktop, setIsDesktop] = useState(false);
  useEffect(() => {
    const mq = window.matchMedia("(min-width: 768px)");
    const sync = () => setIsDesktop(mq.matches);
    sync();
    mq.addEventListener("change", sync);
    return () => mq.removeEventListener("change", sync);
  }, []);

  // The picked station's card holds a copy of its reading (buildSelection), so
  // when fresh readings arrive (LiveRefresh) the copy is rebuilt from them.
  const firstDataRef = useRef(data);
  useEffect(() => {
    if (data === firstDataRef.current) return;
    setSelectedSensor((s) => (s ? buildSelection(s.sensor, data) : s));
  }, [data]);

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
  // Read through a ref by the map callbacks below: every live refresh brings
  // a new `sensors` array, and rebuilding those callbacks on it re-ran the
  // field setup, which rebuilt the selected marker and restarted its pulse.
  const sensorByIdRef = useRef(sensorById);
  sensorByIdRef.current = sensorById;

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
    for (const d of data) ids.add(String(d.sensor_id));
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

  // The air right now (desktop sidebar, mobile sheet at rest): the worst
  // official station, or the PurpleAir sensor nearest Obispado when none has
  // a recent reading (pickDefaultSensor), over every sensor, ignoring
  // the Sensores filters. The filters choose what the map draws; the air right
  // now is the air right now (user call 2026-11-02). The mobile sheet rests
  // on it too since 2026-11-17.
  const summarySelection = useMemo<SelectedSensor | null>(() => {
    const def = pickDefaultSensor(sensors, data);
    return def ? buildSelection(def, data) : null;
  }, [sensors, data]);
  // The station the map itself points at (pulse, freshness readout): only an
  // explicit pick, at every width (2026-11-17; mobile pulsed its resting
  // station before), since the summary is the air right now, not a
  // selection on the map.
  const activeSubject = selectedSensor;
  // The mobile sheet: the pick, else the air right now.
  const sheetSubject = selectedSensor ?? summarySelection;

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
  // (picked, else the default), else the newest anywhere in the live set; a
  // card station without a reading says it has none live. Sensors
  // publish on their own schedules, so a dataset-wide "newest" would sit ahead
  // of one station and make a current reading look late.
  //
  // 90 minutes is the same cutoff as the feeds (lib/live-readings.ts), which
  // never hand the map anything older, so past it there is no reading at all
  // ("nodata"). "delayed" only covers the few minutes between a reading
  // aging out here and the next refresh dropping it. Past today the label picks up the day, so "11:00 AM" can never be
  // yesterday's 11:00 AM wearing a green dot.
  const freshness = useMemo(() => toFreshness(activeSubject, latestReading, now), [activeSubject, latestReading, now]);
  // The desktop sidebar's own time line: its station's reading, by the same rule.
  const summaryFreshness = useMemo(() => toFreshness(summarySelection, latestReading, now), [summarySelection, latestReading, now]);
  // The mobile time pill: the reading the sheet shows.
  const sheetFreshness = selectedSensor ? freshness : summaryFreshness;


  // The marker that wears the pulse: activeSubject (mobile: the pick, else the
  // default the sheet rests on; desktop: only a pick). The desktop sidebar's
  // station is no longer marked selected on the map (2026-11-11, it was
  // since 2026-11-09). Mirrored into refs so the map event handlers read the
  // current value without being rebuilt on each pick.
  const activeSensorId = activeSubject?.sensor.sensor_id ?? null;
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
    (readings: globalThis.Map<string, number | null>): FeatureCollection => {
      const features: Feature[] = [];
      for (const sensor of visibleSensorsRef.current) {
        const fid = String(sensor.sensor_id);
        if (!markerableIdsRef.current.has(fid)) continue;
        const isSima = sensor.source === "sima";
        const pm25 = readings.get(fid) ?? null;
        const hasReading = pm25 != null;
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
            fill: hasReading ? getMarkerFillHex(pm25)! : "#a6a09b",
            label: hasReading ? Math.round(pm25 as number).toString() : "",
            labelInk: hasReading ? getMarkerNumberInk(pm25 as number) : "#171717",
            isSima,
            isOccamm: isOccammSensor(sensor),
            nodata: !hasReading,
            // Higher wins circle draw order (SIMA always on top). Symbol
            // placement is the opposite convention -- with text-allow-overlap
            // false, MapLibre gives *lower* symbol-sort-key priority in
            // collision resolution. Reusing sortKey as-is for both meant a
            // SIMA disc could draw on top of an overlapping citizen sensor
            // (e.g. SIMA "SE" and a PurpleAir sensor both sit at Cerro de la
            // Silla) while its label still lost the collision to the hidden
            // sensor underneath -- the visible disc's own color, wearing a
            // stranger's number. labelSortKey inverts it so the same feature
            // that wins the disc also wins the label.
            sortKey: (isSima ? 1_000_000 : 0) - lat,
            labelSortKey: -((isSima ? 1_000_000 : 0) - lat),
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
      const sensor = sensorByIdRef.current.get(id);
      if (!sensor) return;
      const pm25 = readings.get(id) ?? null;
      const has = pm25 != null;
      const showNumber = has;
      const dot = el.querySelector<HTMLElement>(".sensor-marker__dot");
      el.classList.toggle("sensor-marker--nodata", !has);
      if (dot) {
        dot.style.setProperty("--marker-fill", has ? getMarkerFill(pm25)! : "#a6a09b");
        dot.style.setProperty("--marker-edge", has ? getLevel(pm25 as number).ink : "#79716b");
        // dot's own .textContent, not this: dot also holds the SIMA badge as
        // a sibling element, and .textContent replaces every child node —
        // this was silently deleting the badge on the first repaint after
        // creation (see createMarker's comment, lib/air-quality.ts).
        const number = dot.querySelector<HTMLElement>(".sensor-marker__number");
        if (number) number.textContent = showNumber ? Math.round(pm25 as number).toString() : "";
        if (showNumber) {
          const numberInk = getMarkerNumberInk(pm25 as number);
          dot.style.setProperty("--marker-number", numberInk);
          dot.style.setProperty(
            "--marker-number-shadow",
            numberInk === "#ffffff" ? "0 1px 2px rgba(0, 0, 0, 0.3)" : "0 1px 1px rgba(255, 255, 255, 0.4)",
          );
        }
      }
      el.setAttribute("aria-label", markerLabel(sensor, pm25));
    },
    [],
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

  // The selected DOM marker's own size, read off the same FIELD_RADIUS stops
  // the GL field uses (fieldRadiusAt) so it always leads the field by
  // MARKER_LEAD_FACTOR — at *every* zoom, not just the zoom it happened to be
  // created at. Before this it was a flat 27/24px in CSS while the field kept
  // growing with zoom, so by the map's own resting zoom (11) an ordinary
  // field disc had already grown past it — "selected leads by size" silently
  // broke as the field was sized up.
  // Mutates the existing element's inline size (no rebuild, so the pulse
  // animation doesn't restart) — called on selection change and on every
  // zoom tick.
  const MARKER_LEAD_FACTOR = 1.3;
  const resizeSelectedMarker = useCallback(() => {
    const m = map.current as any;
    const el = (selectedMarkerRef.current as any)?.getElement() as HTMLElement | undefined;
    const id = activeFidRef.current;
    if (!m || !el || !id) return;
    const sensor = sensorByIdRef.current.get(id);
    if (!sensor) return;
    const diameter = fieldRadiusAt(m.getZoom()) * 2 * MARKER_LEAD_FACTOR;
    el.style.width = `${diameter}px`;
    el.style.height = `${diameter}px`;
    // On __dot itself, not el: a fixed font-size on the selected-disc CSS
    // rule would otherwise win over an inherited value (see globals.css).
    const dot = el.querySelector<HTMLElement>(".sensor-marker__dot");
    if (dot) dot.style.fontSize = `${diameter / 2.4}px`;
  }, []);

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

    const sensor = sensorByIdRef.current.get(String(activeId));
    if (!sensor) return;
    const isSima = sensor.source === "sima";
    const pm25 = frameReadingsRef.current.get(String(activeId)) ?? null;
    const has = pm25 != null;
    const el = createMarker(
      has ? (pm25 as number) : 1,
      markerLabel(sensor, pm25),
      isSima,
      has,
      isOccammSensor(sensor),
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
    resizeSelectedMarker();
    paintSelectedMarker(frameReadingsRef.current);
  }, [paintSelectedMarker, resizeSelectedMarker]);

  // Initialize the map once, already on its resting view: a shared ?sensor=
  // link opens close (zoom 13) on the station it's about; a normal load opens
  // on the metro field (restingFocus). No fly-in: it used to open at zoom 8 and fly in for 4.5 s, which
  // fetched tiles for every zoom on the way and kept the numbers hidden until
  // it landed (removed 2026-10-09 for load speed).
  useEffect(() => {
    if (map.current) return;

    const focus = linkedSensor
      ? { center: [linkedSensor.lon, linkedSensor.lat] as [number, number], zoom: 13 }
      : restingFocus();

    const m = new Map({
      container: mapContainer.current!,
      // Self-hosted OpenStreetMap basemap, see basemap.ts. Panning is held to
      // the extract's bounds, so the map never shows unmapped ground.
      style: basemapStyle(),
      center: focus.center,
      zoom: focus.zoom,
      maxBounds: BASEMAP_BOUNDS,
    });
    map.current = m;

    // Bottom sheet on mobile. Desktop: the glass sidebar covers the map's
    // left SIDEBAR_WIDTH px (the map runs under it), plus card clearance on the
    // right; the jump re-centres the focus inside the padded viewport, so the
    // opening view and every ease-to land in the visible part.
    const initialIsMobile = window.innerWidth < 768;
    m.setPadding(
      initialIsMobile ? { top: 0, bottom: 200, left: 0, right: 0 } : { top: 0, bottom: 0, left: SIDEBAR_WIDTH, right: 280 }
    );
    m.jumpTo(focus);

    m.on("style.load", () => setStyleReady(true));

    return () => {
      m.remove();
      map.current = null;
      setStyleReady(false);
    };
  }, []);

  // Stand up the GL marker field once the style is ready: one geojson source
  // and one circle layer, plus the hover/click handlers. No clustering — every
  // markerable sensor is always in the source; the GPU sizes each disc per
  // zoom and resolves overlap by `circle-sort-key`. The disc has a flat 1.5px
  // white stroke and no drop shadow — flat reads far better in the basin knot
  // than the old ink hairline + white ring + double shadow, and the selected
  // DOM marker keeps the lift + pulse.
  useEffect(() => {
    if (!styleReady || !map.current) return;
    const m = map.current as any;

    try {
      if (!m.getSource(FIELD_SOURCE)) {
        m.addSource(FIELD_SOURCE, {
          type: "geojson",
          data: buildFieldData(frameReadingsRef.current),
          promoteId: "fid",
        });
      }
      if (!m.hasImage(FIELD_LABEL_BOX_IMAGE)) {
        m.addImage(FIELD_LABEL_BOX_IMAGE, makeLabelBox());
      }
      // The field draws in two stacks, citizen sensors first and government
      // stations over them (2026-11-11): edge, disc, number per stack, so no
      // citizen disc, edge or number can ever sit on a government station.
      // Within a stack, sortKey still decides overlaps by latitude only.
      for (const [suffix, isSima] of [["", false], [GOB_SUFFIX, true]] as const) {
      const network = ["==", ["get", "isSima"], isSima] as any;
      // Under the discs, same source and sort key, so each edge sits with its
      // own disc in an overlap. Hidden for the selected station (its DOM
      // marker stands in).
      if (!m.getLayer(FIELD_EDGE_LAYER + suffix)) {
        m.addLayer({
          id: FIELD_EDGE_LAYER + suffix,
          type: "circle",
          source: FIELD_SOURCE,
          filter: network,
          layout: { "circle-sort-key": ["get", "sortKey"] as any },
          paint: {
            "circle-color": "#1c1917",
            "circle-radius": FIELD_EDGE_RADIUS as any,
            "circle-opacity": [
              "case",
              ["boolean", ["feature-state", "selected"], false], 0,
              0.22,
            ] as any,
          },
        });
      }
      if (!m.getLayer(FIELD_LAYER + suffix)) {
      m.addLayer({
        id: FIELD_LAYER + suffix,
        type: "circle",
        source: FIELD_SOURCE,
          filter: network,
        layout: { "circle-sort-key": ["get", "sortKey"] as any },
        paint: {
          "circle-color": ["get", "fill"] as any,
          "circle-radius": FIELD_RADIUS as any,
          // The selected station's flat disc is hidden (opacity 0) — the DOM
          // marker stands in for it. SIMA and citizen now rest at the same
          // opacity (the badge is the only network differentiator); no-data
          // SIMA discs still recede, since that's a data-state signal, not a
          // network one.
          //
          // A resting disc is nearly opaque, not the old 0.7: circle-sort-key
          // already decides which disc wins an overlap (SIMA over citizen,
          // then the southern one), and at 0.7 a translucent top disc let the
          // ones underneath bleed through and mix into a colour that matched
          // no station's actual reading (a SIMA station sitting meters from a
          // PurpleAir sensor happens more than once in this basin). 0.92 puts
          // a little openness back — basemap roads still show a hint through
          // an isolated disc — while two stacked discs at overlap still read
          // as ~99% opaque (1 - 0.08²), so the muddy-mix problem stays fixed.
          "circle-opacity": [
            "case",
            ["boolean", ["feature-state", "selected"], false], 0,
            ["boolean", ["get", "nodata"], false], 0.5,
            0.92,
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
      // Every disc's own PM2.5 reading, straight on its fill. No zoom-driven
      // opacity fade (that part of an earlier attempt read as the numbers
      // "loading in" and stayed removed for good). Label VISIBILITY is
      // collision-detected (allow-overlap/ignore-placement both false) —
      // where circles genuinely overlap on screen, so would their centered
      // numbers; there's no rendering trick around that, so a disc with no
      // room for its label goes unlabelled (still coloured, still in the
      // card and aria-label) rather than smearing digits over its neighbour's.
      // This is the standard technique every point-label map layer uses
      // (map/Google POI labels). symbol-sort-key reuses the same
      // provenance+latitude key the circle draw order uses, so which label
      // wins a collision is still never a function of the reading.
      if (!m.getLayer(FIELD_LABEL_LAYER + suffix)) {
        m.addLayer({
          id: FIELD_LABEL_LAYER + suffix,
          type: "symbol",
          source: FIELD_SOURCE,
          filter: network,
          layout: {
            "text-field": ["get", "label"] as any,
            "text-size": FIELD_LABEL_SIZE as any,
            "text-font": [LABEL_FONT],
            "text-allow-overlap": false,
            "text-ignore-placement": false,
            // The disc-sized collision box (FIELD_LABEL_BOX_IMAGE): no number
            // on a disc another disc overlaps.
            "icon-image": FIELD_LABEL_BOX_IMAGE,
            "icon-size": FIELD_LABEL_BOX_SIZE as any,
            "icon-allow-overlap": false,
            "icon-ignore-placement": false,
            "icon-optional": false,
            "symbol-sort-key": ["get", "labelSortKey"] as any,
          },
          paint: {
            "text-color": ["get", "labelInk"] as any,
            "text-opacity": FIELD_LABEL_OPACITY as any,
          },
        });
      }
      }
      // Landmark badge on every SIMA station (grey no-data ones included) —
      // hidden only while it's the selected station, whose DOM marker carries
      // its own scaling badge. icon-size/icon-offset are zoom-interpolated
      // (FIELD_BADGE_SIZE/FIELD_BADGE_OFFSET, field-layer.ts), tracking the
      // same SIMA radius curve the circles themselves grow on — a flat value
      // here was tuned once for a much smaller disc and never kept pace with
      // FIELD_RADIUS growing since, ending up undersized and sitting nearer
      // the centre than the edge.
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
            "icon-size": FIELD_BADGE_SIZE as any,
            "icon-offset": FIELD_BADGE_OFFSET as any,
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
      // OCCAMM emblem on OCCAMM's citizen sensors (2026-11-12): same size,
      // offset and selected rule as the SIMA badge, slotted under the
      // government stack. The image loads async; the layer waits for it.
      const addOccammBadge = () => {
        if (m.getLayer(OCCAMM_BADGE_LAYER) || !m.hasImage(OCCAMM_BADGE_IMAGE)) return;
        m.addLayer({
          id: OCCAMM_BADGE_LAYER,
          type: "symbol",
          source: FIELD_SOURCE,
          filter: ["==", ["get", "isOccamm"], true] as any,
          layout: {
            "icon-image": OCCAMM_BADGE_IMAGE,
            "icon-size": FIELD_BADGE_SIZE as any,
            "icon-offset": FIELD_BADGE_OFFSET as any,
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
        }, m.getLayer(FIELD_EDGE_LAYER + GOB_SUFFIX) ? FIELD_EDGE_LAYER + GOB_SUFFIX : undefined);
      };
      if (m.hasImage(OCCAMM_BADGE_IMAGE)) {
        addOccammBadge();
      } else {
        m.loadImage("/mapa/occamm-badge.png")
          .then(({ data }: { data: HTMLImageElement | ImageBitmap }) => {
            // The map may have been torn down or restyled while it loaded.
            try {
              if (!m.hasImage(OCCAMM_BADGE_IMAGE)) m.addImage(OCCAMM_BADGE_IMAGE, data, { pixelRatio: 2 });
              addOccammBadge();
            } catch {}
          })
          .catch((err: unknown) => console.error("[map] failed to load the OCCAMM badge", err));
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
      const sensor = sensorByIdRef.current.get(fid);
      if (!sensor) return;
      if (window.innerWidth >= 768 && selectedIdRef.current === sensor.sensor_id) {
        setSelectedSensor(null);
        return;
      }
      if (selectedIdRef.current !== sensor.sensor_id) trackStationOpen(sensor);
      setSelectedSensor(buildSelection(sensor, dataRef.current));
    };
    m.on("mousemove", FIELD_LAYERS, onMove);
    m.on("mouseleave", FIELD_LAYERS, onLeave);
    m.on("click", FIELD_LAYERS, onClick);
    // Keeps the selected marker's own size tracking the field's zoom curve —
    // see resizeSelectedMarker's comment for why this has to be continuous,
    // not just re-run on selection change.
    m.on("zoom", resizeSelectedMarker);

    updateField(frameReadingsRef.current);
    syncActive();

    return () => {
      m.off("mousemove", FIELD_LAYERS, onMove);
      m.off("mouseleave", FIELD_LAYERS, onLeave);
      m.off("click", FIELD_LAYERS, onClick);
      m.off("zoom", resizeSelectedMarker);
    };
  }, [styleReady, buildFieldData, updateField, syncActive, resizeSelectedMarker]);

  // Push a frame to the field: a filter change (visibleSensors) or a live-data
  // refresh (frameReadings). One setData, no marker churn — and not syncActive,
  // so the selected DOM marker's pulse doesn't restart (updateField repaints
  // its disc in place instead).
  useEffect(() => {
    if (!styleReady) return;
    updateField(frameReadings);
  }, [styleReady, visibleSensors, markerableIds, frameReadings, updateField]);

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
  // re-runs it when only the pick changes (including a close, which hands
  // the pulse back to the default station). No resize, no dimming of the rest.
  useEffect(() => {
    if (!styleReady) return;
    syncActive();
  }, [styleReady, activeSensorId, syncActive]);

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

  // Choosing a municipality frames it (2026-11-10): the camera fits every
  // sensor in the shown municipalities, whatever the source toggles; "Todos"
  // goes back to the opening view. Only on a change, never on mount, so a
  // ?hide= or ?sensor= link still opens on its own view. The fit's padding
  // adds to the map's own (sidebar / sheet), plus room for the toolbar.
  const framedMunicipiosRef = useRef(hiddenMunicipios);
  useEffect(() => {
    if (framedMunicipiosRef.current === hiddenMunicipios) return;
    framedMunicipiosRef.current = hiddenMunicipios;
    const m = map.current;
    if (!m) return;
    // Only set when reduced motion asks for a jump: an explicit
    // `duration: undefined` overrides MapLibre's default and the camera
    // never moves (Saltillo did not frame, 2026-11-10).
    const motion = prefersReducedMotion() ? { duration: 0 } : {};
    if (hiddenMunicipios.length === 0) {
      m.easeTo({ ...restingFocus(), ...motion });
      return;
    }
    const shown = sensors.filter((s) => !hiddenMunicipios.includes(municipioKey(s.municipio) ?? ""));
    if (shown.length === 0) return;
    const lons = shown.map((s) => s.lon);
    const lats = shown.map((s) => s.lat);
    m.fitBounds(
      [[Math.min(...lons), Math.min(...lats)], [Math.max(...lons), Math.max(...lats)]],
      { padding: { top: 64, right: 64, bottom: 120, left: 64 }, maxZoom: 13, ...motion },
    );
  }, [hiddenMunicipios, sensors]);

  // Drop the pick (empty-map click, Escape, the desktop card's X): the
  // picked station's card closes and the summary is back.
  const closeCard = useCallback(() => {
    setSelectedSensor(null);
    setSheetState('peek');
  }, []);

  // Clicking empty map drops the pick, back to the summary, at every width
  // (mobile since 2026-11-17, when its card lost the X).
  // MapLibre fires `click` only on a genuine click, not a drag/pan; a hit on the
  // disc layer means the field handler already owns this click, so bail.
  useEffect(() => {
    if (!styleReady || !map.current) return;
    const m = map.current as any;
    const handler = (e: any) => {
      if (m.getLayer(FIELD_LAYER) && m.queryRenderedFeatures(e.point, { layers: FIELD_LAYERS }).length) return;
      closeCard();
    };
    m.on("click", handler);
    return () => { m?.off("click", handler); };
  }, [styleReady, closeCard, isDesktop]);

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
      if (selectedIdRef.current !== s.sensor_id) trackStationOpen(s);
      setSelectedSensor(buildSelection(s, dataRef.current));
      const m = map.current as any;
      if (!m) return;
      const focus = { center: [s.lon, s.lat] as [number, number], zoom: Math.max(m.getZoom(), 12) };
      if (prefersReducedMotion()) m.jumpTo(focus);
      else m.easeTo(focus);
    },
    [],
  );

  // Escape dismisses a picked sensor too — desktop only, like the empty-map
  // click, and only when a dialog isn't open (it owns Escape first).
  useEffect(() => {
    if (!selectedSensor || !isDesktop) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape" && !document.querySelector("dialog[open]")) closeCard();
    };
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
  }, [selectedSensor, isDesktop, closeCard]);

  // What peeks is the grabber and the level card (plus the station card's
  // header row when a station is picked), measured, since the card's
  // height follows the level word and the screen width.
  const sheetRef = useRef<HTMLDivElement>(null);
  const [peekHeight, setPeekHeight] = useState(200);
  useEffect(() => {
    const sheet = sheetRef.current;
    const header = sheet?.querySelector("header");
    if (!sheet || !header) return;
    // The card's bottom 12px run past the screen's edge (2026-11-17, user
    // asked for it lower three times: 16px under it, then 4, then this):
    // only its rounded foot and part of its 24px bottom padding are cut, the
    // level and number stay whole.
    const measure = () => setPeekHeight(Math.ceil(header.offsetTop + header.offsetHeight - 12));
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(header);
    return () => ro.disconnect();
  }, [sheetSubject?.sensor.sensor_id, sheetSubject?.sensor.source, !!selectedSensor]);
  const sheetTransform = sheetState === 'mid' ? 'translateY(0)' : `translateY(calc(100% - ${peekHeight}px))`;

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
    // overflow-hidden: the map page never scrolls; nothing positioned inside
    // may push <main> taller than the screen (it showed as a stone strip
    // under the map, 2026-11-02).
    <div className="relative h-below-header overflow-hidden">
      {/* Desktop left column: a floating glass panel over the map, inset like
          every other map panel (top-6, left-6, bottom-6: the same gap top and
          bottom, 2026-11-03). Floating, not flush:
          flush to the top, the glass ran into the stone navbar with no edge
          (2026-11-02). The map runs under it; the map's padding keeps the
          view centred in the visible part. Solid header block and white cards inside keep the
          text's contrast. It always shows the air right
          now and what to do about it (AirNowPanel, from the default station:
          the worst official one, pickDefaultSensor). No station header or
          source note: it is the page's summary, and a pick on the map never changes it (the
          picked station gets its own card over the map). Mobile carries this
          as the bottom sheet's resting station. */}
      {/* The left column (2026-11-10): the sidebar, then the map toolbar as
          its own glass card 16px under it, the same width. */}
      <div className="absolute bottom-6 left-6 top-6 z-20 hidden w-panel-lg flex-col gap-4 md:flex">
      <aside aria-label="Calidad del aire" className="glass flex min-h-0 flex-1 flex-col overflow-hidden rounded-2xl">
        {summarySelection && (
          <AirNowPanel
            subject={summarySelection}
            freshness={summaryFreshness}
          />
        )}
      </aside>
        <MapToolbar
          showSima={showSima}
          setShowSima={setShowSima}
          showOccamm={showOccamm}
          setShowOccamm={setShowOccamm}
          showOtros={showOtros}
          setShowOtros={setShowOtros}
          sourceCounts={sourceCounts}
          estados={estados}
          hiddenMunicipios={hiddenMunicipios}
          setHiddenMunicipios={setHiddenMunicipios}
          currentPm25={summarySelection?.pm25 ?? null}
        />
      </div>

      {/* Map area: the whole screen at every width (on desktop it runs under
          the glass sidebar). */}
      <div className="absolute inset-0">
        {/* h-full w-full, not inset-0: MapLibre's own CSS puts
            position: relative on its container, which drops the insets and
            collapses the map to zero height. */}
        <div
          ref={mapContainer}
          className="h-full w-full"
          style={{ backgroundColor: BASEMAP_GROUND }}
        />
      </div>

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

      {/* Desktop right column: a picked station's card at the top (the
          toolbar moved to the bottom-left, 2026-11-09). No freshness pill on desktop (removed 2026-11-03): the
          sidebar's header carries the time. On mobile the panel and legend
          are bottom sheets and freshness rides the Capas button's row. */}
      <div className="pointer-events-none absolute bottom-14 right-6 top-6 z-10 hidden w-panel-lg flex-col items-end gap-2 md:flex">
        {/* A picked station's card, at the top. Opened by a marker or a
            ?sensor= link; Escape, a click on empty map or on the same marker
            close it (no header or X since 2026-11-11). The sidebar never
            changes with it. */}
        {selectedSensor && (
          <div
            role="region"
            aria-label={`Estación ${displayName(selectedSensor.sensor)}`}
            className="glass pointer-events-auto flex min-h-0 w-full flex-shrink flex-col overflow-hidden rounded-2xl"
            // Sized by its content (2026-11-12; it matched the left column's
            // height from 2026-11-11), up to the screen, then it scrolls.
          >
            <StationPanel
              subject={selectedSensor}
              freshness={freshness}
              copied={copied}
              onCopyCoords={() => copyCoords(selectedSensor.sensor.lat, selectedSensor.sensor.lon)}
              onClose={closeCard}
            />
            <span role="status" className="sr-only">{copied ? 'Coordenadas copiadas' : ''}</span>
          </div>
        )}


      </div>

      {/* Mobile: one row just above the resting sheet, hidden while it is
          open: the time pill (the reading the sheet shows) at the left edge,
          the legend and filter buttons side by side at the right. */}
      {sheetSubject && sheetState === 'peek' && (
        <div
          className="pointer-events-none fixed left-4 right-4 z-[38] flex items-end justify-between md:hidden"
          style={{ bottom: `${peekHeight + 12}px` }}
        >
          {sheetFreshness ? <FreshnessBadge freshness={sheetFreshness} color={getQualityInfo(sheetSubject.pm25)?.color} /> : <span />}
          <div className="flex gap-3">
            <MapIconButton active={mobilePanel === "aire"} onClick={() => setMobilePanel("aire")} label="Calidad del aire" icon={CircleGauge} />
            <MapIconButton active={mobilePanel === "sensores"} onClick={() => setMobilePanel("sensores")} label="Filtros" icon={Layers} />
          </div>
        </div>
      )}
      {/* The panel those buttons open: the toolbar's own panels as a bottom
          sheet, without its bar. */}
      {!isDesktop && (
        <MapToolbar
          sheet
          showBar={false}
          open={mobilePanel}
          onOpenChange={setMobilePanel}
          showSima={showSima}
          setShowSima={setShowSima}
          showOccamm={showOccamm}
          setShowOccamm={setShowOccamm}
          showOtros={showOtros}
          setShowOtros={setShowOtros}
          sourceCounts={sourceCounts}
          estados={estados}
          hiddenMunicipios={hiddenMunicipios}
          setHiddenMunicipios={setHiddenMunicipios}
          currentPm25={summarySelection?.pm25 ?? null}
        />
      )}

      {/* Bottom sheet backdrop — mobile only, only when the sheet is open past
          peek. A tap on it is a tap off any sensor: the sheet collapses and
          a picked station gives way to the summary. */}
      <div
        className={`fixed inset-0 z-[35] bg-black/20 transition-opacity duration-300 md:hidden ${
          sheetState !== 'peek' ? 'opacity-100' : 'pointer-events-none opacity-0'
        }`}
        onClick={closeCard}
      />

      {/* Bottom sheet — mobile: the desktop left column at the bottom
          (2026-11-17, option 1B of the phone mockups). At rest it peeks the
          level card of the air right now (summarySelection, as the desktop
          sidebar); open, the advice and footnote. The legend and filters
          are the round buttons over the map, not part of the card
          (2026-11-17). A tapped marker
          swaps in the desktop station card (no X: any tap off a sensor goes
          back to the summary). A tap
          on the grabber or the level card toggles peek / open. */}
      {sheetSubject && (
        <div
          ref={sheetRef}
          className={`fixed left-0 right-0 z-[40] flex flex-col overflow-hidden rounded-t-3xl shadow-[0_-4px_20px_rgba(0,0,0,0.08)] transition-colors duration-300 md:hidden ${sheetState === 'peek' ? 'border-t border-white/60 bg-white/80 backdrop-blur-md' : 'bg-white'}`}
          // Down to the screen's very edge (2026-11-17): it stood on the
          // phone's safe-area inset before, so on phones with a home bar the
          // resting card floated ~34px up. The open sheet pads its own
          // bottom by the inset instead.
          style={{
            bottom: 0,
            height: '85dvh',
            paddingBottom: 'env(safe-area-inset-bottom, 0px)',
            transform: sheetTransform,
            transition: 'transform 0.35s cubic-bezier(0.32, 0.72, 0, 1)',
          }}
          onClick={(e) => {
            const t = e.target as Element;
            if (t.closest('button, a') || !t.closest('header, [data-grabber]')) return;
            handleSheetTap();
          }}
        >
          <div data-grabber className="flex-shrink-0 cursor-pointer pt-3">
            <div className="mx-auto h-1 w-10 rounded-full bg-stone-300/60" />
          </div>
          {/* Off-screen while peeking: no focus or reading in the hidden part. */}
          <div className={`flex min-h-0 flex-1 flex-col ${sheetState === 'peek' ? '[&>div>div:last-child]:invisible' : ''}`}>
            {selectedSensor ? (
              <StationPanel
                subject={selectedSensor}
                freshness={freshness}
                copied={copied}
                onCopyCoords={() => copyCoords(selectedSensor.sensor.lat, selectedSensor.sensor.lon)}
                hideFoot={sheetState === 'peek'}
              />
            ) : (
              <AirNowPanel
                subject={sheetSubject}
                freshness={summaryFreshness}
                hideFoot={sheetState === 'peek'}
                fit
              />
            )}
          </div>
          <span role="status" className="sr-only">{copied ? 'Coordenadas copiadas' : ''}</span>
        </div>
      )}

    </div>
  );
}
