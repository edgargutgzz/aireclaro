"use client";

import { useEffect } from "react";
import { track } from "@vercel/analytics";
import { Analytics as VercelAnalytics } from "@vercel/analytics/react";
import { SpeedInsights } from "@vercel/speed-insights/next";

// Opening any page with ?notrack=1 marks this browser as the team's own, and
// nothing it does is sent to Vercel from then on (visits, custom events, speed
// data). ?notrack=0 undoes it. Done once per browser/device.
const KEY = "notrack";

function isOptedOut(): boolean {
  try {
    const param = new URLSearchParams(window.location.search).get(KEY);
    if (param === "1") localStorage.setItem(KEY, "1");
    if (param === "0") localStorage.removeItem(KEY);
    return localStorage.getItem(KEY) === "1";
  } catch {
    return false;
  }
}

function dropIfOptedOut<T>(event: T): T | null {
  return isOptedOut() ? null : event;
}

// proxy.ts tags every redirect from the old domain with ?utm_source=aireclaro.
// Page views don't keep the query string, so it's counted as an event, then
// dropped from the address bar so a copied link doesn't carry it on.
// `embebido` separates partner iframes of www.aireclaro.com from visits.
function useLegacyDomainVisit() {
  useEffect(() => {
    const url = new URL(window.location.href);
    if (url.searchParams.get("utm_source") !== "aireclaro") return;
    track("desde_aireclaro", {
      ruta: url.pathname,
      embebido: window.self !== window.top ? "si" : "no",
    });
    url.searchParams.delete("utm_source");
    window.history.replaceState(window.history.state, "", url);
  }, []);
}

export default function Analytics() {
  useLegacyDomainVisit();
  return (
    <>
      <VercelAnalytics beforeSend={dropIfOptedOut} />
      <SpeedInsights beforeSend={dropIfOptedOut} />
    </>
  );
}
