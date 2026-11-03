"use client";

import { useEffect, useMemo, useRef, useState, useCallback } from "react";
import { ChevronRight, Layers, Wind, X } from "lucide-react";
import { Map, Marker } from "maplibre-gl";
import type { Feature, FeatureCollection } from "geojson";
import { track } from "@vercel/analytics";
import "maplibre-gl/dist/maplibre-gl.css";
import { getMarkerFill, getMarkerFillHex, getLevel, getMarkerNumberInk, createMarker, getQualityInfo, type QualityInfo } from "@/lib/air-quality";
import { FreshnessBadge, type Freshness } from "@/components/data/freshness";
import { readSensorParam, writeSensorParam, readFilterParams, writeFilterParams } from "@/lib/map-url-state";
import type { Sensor, Data, SelectedSensor } from "./types";
import {
  PULSE_FALLBACK_COLOR,
  municipioKey,
  estadoKey,
  readingTimeLabel,
  prefersReducedMotion,
  buildSelection,
  displayName,
  markerLabel,
} from "./lib";
import {
  OPENING_CENTER,
  OPENING_ZOOM,
  FIELD_SOURCE,
  FIELD_LAYER,
  FIELD_LABEL_LAYER,
  SIMA_BADGE_LAYER,
  SIMA_BADGE_IMAGE,
  makeSimaBadge,
  FIELD_RADIUS,
  FIELD_LABEL_SIZE,
  FIELD_LABEL_OPACITY,
  FIELD_BADGE_SIZE,
  FIELD_BADGE_OFFSET,
  fieldRadiusAt,
} from "./field-layer";
import { LayersFilterContent } from "./layers-filter";
import { ScaleBar, LegendDetail, AirQualityLegend } from "./air-quality-legend";
import { AirNowPanel, GroupRecommendations, StationReading } from "./station-card";
import { AccordionDialog, DialogLink, InfoDialog } from "./info-dialog";
import { BASEMAP_BOUNDS, LABEL_FONT, basemapStyle } from "./basemap";
import { BASEMAP_GROUND } from "./ground";

// The station the estación card shows at rest, before any marker is picked
// (the mobile sheet and the desktop left-column card): the official station with
// the highest live PM2.5 right now, FIN excluded (it's Saltillo). Rule decided
// 2026-10-31: people open this page to learn how the air is, and the worst
// official reading is the one to act on. Ties go to the first name
// alphabetically, so the pick doesn't flicker. When no official station has a
// live reading (lib/live-readings.ts), the default is the PurpleAir sensor
// nearest to Obispado ("CE", the central reference station) that has one, so
// the map never opens on an empty or stale card (fallback since a SINAICA
// outage, 2026-10-06). Filtered out (Capas) → the card is simply empty.
const DEFAULT_SENSOR_ID = "CE";

// Analytics: a station the visitor picked (map tap or the station list). The
// default card and ?sensor= links aren't picks, so they aren't counted.
function trackStationOpen(sensor: Sensor) {
  track("estacion_abierta", {
    estacion: sensor.nombre_display || sensor.nombre,
    fuente: sensor.source,
  });
}

// The desktop sidebar's width (tailwind.config's panel-lg); the map is padded
// by it since the sidebar sits over the map (0 while it is hidden).
const SIDEBAR_WIDTH = 460;
const SIDEBAR_STORAGE_KEY = "calidad-del-aire:sidebar";

// The view a normal load opens on. Desktop: the metro field, centred on the
// city, nothing picked (the sidebar carries the air right now). Mobile: centred
// on the default station so the pulse of the station its sheet rests on is in
// frame.
function restingFocus(defaultSelection: SelectedSensor | null) {
  const desktop = typeof window !== "undefined" && window.matchMedia("(min-width: 768px)").matches;
  return defaultSelection && !desktop
    ? { center: [defaultSelection.sensor.lon, defaultSelection.sensor.lat] as [number, number], zoom: 10.5 }
    : { center: OPENING_CENTER, zoom: OPENING_ZOOM };
}

function pickDefaultSensor(candidates: Sensor[], data: Data[]): Sensor | undefined {
  // `data` holds only live, valid readings (lib/live-readings.ts).
  const pm25 = new globalThis.Map(data.map((d) => [String(d.sensor_id), d.pm25]));
  const name = (s: Sensor) => s.nombre_display || s.nombre;
  const worst = candidates
    .filter((s) => s.source === "sima" && String(s.sensor_id) !== "FIN" && Number.isFinite(pm25.get(String(s.sensor_id))))
    .sort((a, b) => pm25.get(String(b.sensor_id))! - pm25.get(String(a.sensor_id))! || name(a).localeCompare(name(b), "es"))[0];
  if (worst) return worst;

  const obispado = candidates.find((s) => String(s.sensor_id) === DEFAULT_SENSOR_ID);
  if (!obispado) return undefined;

  // Nearest by a flat-earth distance (fine at city scale), longitude scaled
  // by the latitude so east-west and north-south count alike.
  const k = Math.cos((obispado.lat * Math.PI) / 180);
  const dist = (s: Sensor) => Math.hypot((s.lon - obispado.lon) * k, s.lat - obispado.lat);
  const nearest = candidates
    .filter((s) => s.source === "purpleAir" && pm25.has(String(s.sensor_id)))
    .sort((a, b) => dist(a) - dist(b))[0];
  return nearest ?? obispado;
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

  const [showFilters, setShowFilters] = useState(false);
  const [showLegend, setShowLegend] = useState(false); // mobile only — the air-quality legend as a bottom sheet
  const [showFiltrosContent, setShowFiltrosContent] = useState(false); // desktop only — Filtros body starts collapsed
  // The style is parsed, so the marker field can be added and drawn; the
  // stations don't wait on a single basemap tile.
  const [styleReady, setStyleReady] = useState(false);
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

  // Desktop: the pick is its own card over the map (an empty-map click or
  // Escape closes it) and the pulse / camera ignore the default station;
  // mobile's sheet rests on the default and a click only collapses it. Tracked in state (not just a CSS `md:` toggle) because the
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

  // Desktop sidebar open / hidden. Open by default; someone who hides it to
  // explore the map keeps it hidden on their next visit (a per-browser
  // convenience in localStorage, nothing breaks without it). Starts open so
  // SSR and the first render agree; the effect applies a stored choice.
  const [sidebarOpen, setSidebarOpen] = useState(true);
  useEffect(() => {
    try {
      if (localStorage.getItem(SIDEBAR_STORAGE_KEY) === "closed") setSidebarOpen(false);
    } catch {}
  }, []);
  const toggleSidebar = useCallback((open: boolean) => {
    setSidebarOpen(open);
    try {
      if (open) localStorage.removeItem(SIDEBAR_STORAGE_KEY);
      else localStorage.setItem(SIDEBAR_STORAGE_KEY, "closed");
    } catch {}
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

  // What the panel says about itself in its own header, so the collapsed card
  // answers "is the map filtered?" rather than holding 380px of empty glass
  // around one word. Counted over sensors that actually have a reading, since
  // those are the only ones drawn: a total that included silent sensors would
  // never match the dots you can see.
  const capasSummary = useMemo(() => {
    const reporting = new Set(data.map((d) => d.sensor_id));
    const mapped = sensors.filter((sensor) => reporting.has(sensor.sensor_id)).length;
    if (!mapped) return null;
    const shown = visibleSensors.filter((sensor) => reporting.has(sensor.sensor_id)).length;
    return shown === mapped ? "Todos" : `${shown} de ${mapped}`;
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

  // The station the card falls back to when nothing is picked: the worst
  // official station, or the PurpleAir sensor nearest Obispado when none has a
  // recent reading (see pickDefaultSensor), built the same way a click builds
  // a selection. Null only if no official station is live and Obispado is
  // filtered out or absent from the feed. `cardSubject` is what every card
  // consumer reads — the explicit pick, else this.
  const defaultSelection = useMemo<SelectedSensor | null>(() => {
    const def = pickDefaultSensor(visibleSensors, data);
    return def ? buildSelection(def, data) : null;
  }, [visibleSensors, data]);
  const defaultQuality = getQualityInfo(defaultSelection?.pm25 ?? null);
  const cardSubject = selectedSensor ?? defaultSelection;
  // The station the map itself points at (pulse, freshness readout). Mobile:
  // the sheet's station. Desktop: only an explicit pick, since the sidebar's
  // reading is the summary of the air right now, not a selection on the map.
  const activeSubject = isDesktop ? selectedSensor : cardSubject;

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
  const freshness = useMemo<Freshness | null>(() => {
    if (now === null) return null;
    // A station on screen with no reading (a gray disc) says so, rather than
    // borrowing the network's newest time and looking up to date.
    if (activeSubject && !activeSubject.readingAt) return { status: "nodata" };
    const reading = activeSubject?.readingAt ? new Date(activeSubject.readingAt) : latestReading;
    if (!reading || Number.isNaN(reading.getTime())) return null;

    const age = now - reading.getTime();
    return {
      dateTime: reading.toISOString(),
      when: readingTimeLabel(reading),
      status: age < 90 * 60 * 1000 ? "fresh" : "delayed",
    };
  }, [activeSubject, latestReading, now]);

  // The marker that wears the pulse: activeSubject (mobile: the pick, else the
  // default the sheet rests on; desktop: the pick only). Mirrored into refs
  // so the map event handlers read the current value without being rebuilt on
  // each pick.
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
      : restingFocus(defaultSelection);

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
      initialIsMobile ? { top: 0, bottom: 180, left: 0, right: 0 } : { top: 0, bottom: 0, left: SIDEBAR_WIDTH, right: 280 }
    );
    m.jumpTo(focus);

    m.on("style.load", () => setStyleReady(true));

    return () => {
      m.remove();
      map.current = null;
      setStyleReady(false);
    };
  }, []);

  // Hiding / showing the desktop sidebar re-pads the map, so the view
  // re-centres on the space the sidebar frees or takes.
  useEffect(() => {
    const m = map.current;
    if (!m || !isDesktop) return;
    m.easeTo({
      padding: { top: 0, bottom: 0, left: sidebarOpen ? SIDEBAR_WIDTH : 0, right: 280 },
      duration: prefersReducedMotion() ? 0 : 300,
    });
  }, [sidebarOpen, isDesktop]);

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
      if (!m.getLayer(FIELD_LABEL_LAYER)) {
        m.addLayer({
          id: FIELD_LABEL_LAYER,
          type: "symbol",
          source: FIELD_SOURCE,
          layout: {
            "text-field": ["get", "label"] as any,
            "text-size": FIELD_LABEL_SIZE as any,
            "text-font": [LABEL_FONT],
            "text-allow-overlap": false,
            "text-ignore-placement": false,
            "symbol-sort-key": ["get", "labelSortKey"] as any,
          },
          paint: {
            "text-color": ["get", "labelInk"] as any,
            "text-opacity": FIELD_LABEL_OPACITY as any,
          },
        });
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
    m.on("mousemove", FIELD_LAYER, onMove);
    m.on("mouseleave", FIELD_LAYER, onLeave);
    m.on("click", FIELD_LAYER, onClick);
    // Keeps the selected marker's own size tracking the field's zoom curve —
    // see resizeSelectedMarker's comment for why this has to be continuous,
    // not just re-run on selection change.
    m.on("zoom", resizeSelectedMarker);

    updateField(frameReadingsRef.current);
    syncActive();

    return () => {
      m.off("mousemove", FIELD_LAYER, onMove);
      m.off("mouseleave", FIELD_LAYER, onLeave);
      m.off("click", FIELD_LAYER, onClick);
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

  // Drop the pick. **Desktop only** (the X, empty-map click, Escape): the
  // picked station's card over the map closes; the sidebar is unaffected. On
  // mobile the most a gesture does is collapse the sheet back to `peek`.
  const closeCard = useCallback(() => {
    setSelectedSensor(null);
    setSheetState('peek');
  }, []);

  // Clicking empty map: on desktop it closes the picked station's card;
  // on mobile it just collapses the sheet to peek, never dropping the card.
  // MapLibre fires `click` only on a genuine click, not a drag/pan; a hit on the
  // disc layer means the field handler already owns this click, so bail.
  useEffect(() => {
    if (!styleReady || !map.current) return;
    const m = map.current as any;
    const handler = (e: any) => {
      if (m.getLayer(FIELD_LAYER) && m.queryRenderedFeatures(e.point, { layers: [FIELD_LAYER] }).length) return;
      if (isDesktop) closeCard();
      else setSheetState('peek');
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

  // 5.5rem of peek showing at the bottom of the screen: the grabber and the summary row (the
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
    // overflow-hidden: the map page never scrolls; nothing positioned inside
    // may push <main> taller than the screen (it showed as a stone strip
    // under the map, 2026-11-02).
    <div className="relative h-below-header overflow-hidden">
      {/* Desktop left column: a full-height glass sidebar over the map's left
          edge (the map runs under it, blurred, so the page reads as one map
          with panels on it; the map's padding keeps the view centred in the
          visible part). Solid header block and white cards inside keep the
          text's contrast. It always shows the air right
          now and what to do about it (AirNowPanel, from the default station:
          the worst official one, pickDefaultSensor). No station header or
          source note: it is the page's summary, and a pick on the map never changes it (the
          picked station gets its own card over the map). Mobile carries this
          as the bottom sheet's resting station. */}
      <aside
        id="calidad-sidebar"
        aria-label="Calidad del aire"
        inert={!sidebarOpen}
        className={`glass absolute inset-y-0 left-0 z-20 hidden w-panel-lg flex-col border-y-0 border-l-0 transition-transform duration-300 ease-out motion-reduce:transition-none md:flex ${sidebarOpen ? "" : "-translate-x-full"}`}
      >
        {defaultSelection && (
          <AirNowPanel subject={defaultSelection} onHide={() => toggleSidebar(false)} />
        )}
      </aside>

      {/* Hidden sidebar's way back, desktop: the Sensores header's shape
          ("label · summary" + chevron, min-h-14), top-left of the map, the
          level word in its ink so the reading is still one glance away. */}
      {!sidebarOpen && (
        <button
          type="button"
          onClick={() => toggleSidebar(true)}
          aria-controls="calidad-sidebar"
          aria-expanded={false}
          className="glass absolute left-6 top-6 z-20 hidden min-h-14 items-center gap-1.5 rounded-2xl px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15 md:flex"
        >
          <span className="text-xs font-medium uppercase leading-none tracking-wide text-neutral-400">Calidad del aire</span>
          {defaultQuality && (
            <span className="text-xs font-semibold leading-none" style={{ color: defaultQuality.textColor }}>· {defaultQuality.label}</span>
          )}
          <ChevronRight aria-hidden="true" className="ml-3 h-4 w-4 flex-shrink-0 text-neutral-400" />
        </button>
      )}

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

        {/* The air-quality scale, desktop: bottom-left of the visible map,
            just right of the sidebar (panel-lg 460px + the 24px margin; the
            plain 24px margin while the sidebar is hidden), feet
            level with the freshness pill. Mobile carries it as the Wind
            button's bottom sheet. */}
        <div className={`glass pointer-events-auto absolute bottom-14 z-10 hidden w-panel-filters rounded-2xl transition-[left] duration-300 ease-out motion-reduce:transition-none md:block ${sidebarOpen ? "left-[484px]" : "left-6"}`}>
          <div className="px-5 py-4">
            <AirQualityLegend collapsible />
          </div>
        </div>
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

      {/* Mobile map controls — a right-edge stack, hidden when the sheet is
          expanded. The air-quality legend sits on top of the Capas button as a
          matching icon button; each opens its own bottom sheet. Desktop carries
          the legend at the foot of the left rail instead. The data-freshness
          pill shares the Capas button's row, at the left edge, bottom edges
          level (items-end). Low-priority chrome, so it runs small and
          shadowless. Desktop puts it bottom-right. */}
      {sheetState === 'peek' && (
        <div
          className="pointer-events-none fixed left-4 right-6 z-[45] flex flex-col items-end gap-3 md:hidden"
          style={{ bottom: 'calc(env(safe-area-inset-bottom, 0px) + 6.5rem)' }}
        >
          <div className="pointer-events-auto flex flex-col items-end gap-3">
            <button
              onClick={() => { setShowLegend((v) => !v); setShowFilters(false); }}
              className={`rounded-xl p-3 transition-colors duration-200 ${showLegend ? 'border border-stone-900/30 bg-white/90 shadow-sm backdrop-blur-md' : 'glass'}`}
              aria-label="Calidad del aire"
            >
              <Wind className={`h-5 w-5 ${showLegend ? 'text-neutral-900' : 'text-neutral-700'}`} />
            </button>
          </div>
          <div className="flex w-full items-end justify-between">
            {freshness ? <FreshnessBadge freshness={freshness} compact /> : <span />}
            <button
              onClick={() => { setShowFilters((v) => !v); setShowLegend(false); }}
              className={`pointer-events-auto rounded-xl p-3 transition-colors duration-200 ${showFilters ? 'border border-stone-900/30 bg-white/90 shadow-sm backdrop-blur-md' : 'glass'}`}
              aria-label="Sensores"
            >
              <Layers className={`h-5 w-5 ${showFilters ? 'text-neutral-900' : 'text-neutral-700'}`} />
            </button>
          </div>
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
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300/60" />
          <p className="text-base font-medium text-neutral-700">Sensores</p>
        </div>
        <div
          /* A plain block, not a flex column: as a flex item the list would
             resolve to min-height:0 and shrink to fit instead of overflowing
             and scrolling here. The desktop panel body is a plain block for
             the same reason. No side padding: the list's rows run edge to
             edge and carry the 20px text rail themselves. */
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
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
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300/60" />
          <p className="text-base font-medium text-neutral-700">Calidad del aire</p>
        </div>
        <div
          /* Plain block, not a flex column — see the Capas sheet body above. */
          className="min-h-0 flex-1 overflow-y-auto overscroll-contain px-5"
          style={{ paddingBottom: 'calc(env(safe-area-inset-bottom, 0px) + 2rem)' }}
        >
          <ScaleBar />
          <LegendDetail className="mt-4 border-t border-stone-100 pt-4" />
        </div>
      </div>

      {/* Desktop right column: the Capas panel at the top, the
          data-freshness pill at the foot. An open panel grows
          down into whatever is left over. On mobile the panel and legend are
          bottom sheets and freshness rides the Capas button's row. */}
      <div className="pointer-events-none absolute bottom-14 right-6 top-6 z-10 hidden w-panel-filters flex-col items-end gap-2 md:flex">
        <div className="glass pointer-events-auto flex min-h-0 w-full flex-col overflow-hidden rounded-2xl">
          {/* The header carries the filter state, in the same "label · summary"
              idiom the rows inside the panel already use, and the legend
              card's uppercase label, so the two cards read as one set. The panel is "Sensores" on screen (it picks which
              sensors show); "Capas" stays its name in code. The two
              closed cards stand at the same 56px: min-h-14 here, the legend's
              min-h-6 row inside its py-4 (its bar + end labels run ~23px,
              this row's chevron only 16px). */}
          <button
            onClick={() => setShowFiltrosContent((v) => !v)}
            aria-expanded={showFiltrosContent}
            className="flex min-h-14 w-full flex-shrink-0 items-center gap-1.5 px-5 py-4 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-stone-900/15"
          >
            <span className="flex-shrink-0 text-xs font-medium uppercase leading-none tracking-wide text-neutral-400">Sensores</span>
            {capasSummary && (
              <span className="min-w-0 flex-1 truncate text-xs leading-none text-neutral-500">· {capasSummary}</span>
            )}
            <ChevronRight className={`ml-auto h-4 w-4 flex-shrink-0 text-neutral-400 transition-transform duration-200 ${showFiltrosContent ? 'rotate-90' : ''}`} />
          </button>
          {showFiltrosContent && (
            /* Only the body scrolls, so the "Capas" header stays in place, and
               overscroll-contain stops a scroll that reaches the end from
               panning the map underneath. flex-1 min-h-0 takes whatever the
               column has left after the badge. No padding: the
               list sits flush, like the estación card's sections. */
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
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

        {/* A picked station's card, under the Sensores panel. Opened by a
            marker or a ?sensor= link; the X, Escape or a click on empty map
            close it. The sidebar never changes with it. */}
        {selectedSensor && (
          <div className="glass pointer-events-auto flex min-h-0 w-full flex-shrink flex-col overflow-hidden rounded-2xl">
            <div className="flex w-full flex-shrink-0 items-center justify-between gap-3 px-5 pt-4 pb-3">
              <span className="min-w-0 flex-1 truncate text-base font-medium text-neutral-700">{displayName(selectedSensor.sensor)}</span>
              <button
                type="button"
                onClick={closeCard}
                aria-label="Cerrar"
                className="-my-1 -mr-1 flex-shrink-0 rounded-xl p-1 text-neutral-400 transition-colors hover:text-neutral-700 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-stone-900/15"
              >
                <X aria-hidden="true" className="h-4 w-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto overscroll-contain">
              <div className="disclosure-in flex flex-col gap-5 px-5 pb-5 pt-3">
                <StationReading
                  subject={selectedSensor}
                  pm25={selectedSensor.pm25}
                  copied={copied}
                  onCopyCoords={() => copyCoords(selectedSensor.sensor.lat, selectedSensor.sensor.lon)}
                  copyInteractionClass="hover:text-neutral-700"
                />
              </div>
            </div>
            <span role="status" className="sr-only">{copied ? 'Coordenadas copiadas' : ''}</span>
          </div>
        )}

        {/* Foot of the column, desktop: the data-freshness pill. */}
        {freshness && <div className="mt-auto flex-shrink-0"><FreshnessBadge freshness={freshness} /></div>}
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
          default station (the worst official one); tapping a marker swaps the subject and the
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
          bottom: 'env(safe-area-inset-bottom, 0px)',
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
          <div className="mx-auto mb-3 h-1 w-10 rounded-full bg-stone-300/60" />
          <div className="flex items-baseline justify-between gap-3">
            <span className="min-w-0 flex-1 truncate text-base font-medium text-neutral-700">
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
                <div className="relative z-[1] border-t border-stone-100 pt-5">
                  <GroupRecommendations info={quality} onShowInfo={() => setCuidarmeQuality(quality)} />
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
          <p className="text-sm leading-relaxed text-neutral-600">
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
          <p className="text-sm leading-relaxed text-neutral-600">
            Red de sensores del{" "}
            <DialogLink href="/quienes-somos">
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
                    Al ser de bajo costo, pueden sobreestimar las PM2.5 cuando hay
                    mucha humedad. Por eso, sus lecturas se ajustan con la fórmula
                    de corrección de la EPA de EE. UU.
                  </p>
                </>
              ),
            },
          ]}
        />
      )}

    </div>
  );
}
