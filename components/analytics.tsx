"use client";

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

export default function Analytics() {
  return (
    <>
      <VercelAnalytics beforeSend={dropIfOptedOut} />
      <SpeedInsights beforeSend={dropIfOptedOut} />
    </>
  );
}
