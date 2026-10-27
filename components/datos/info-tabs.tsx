import type { LucideIcon } from "lucide-react";

// A "learn more" text behind a header button: a chart's Metodología
// (ChartCard's infoTab), the download's Diccionario, and the /datos header's
// shared tabs (datos-general-info.tsx).
export interface InfoTab {
  id: string;
  label: string;
  icon: LucideIcon;
  body: React.ReactNode;
}
