import { unstable_cache } from "next/cache";

// The map's readings refresh every few minutes, so every visitor doesn't need
// their own database round-trip: each map fetcher is cached across requests
// for this long (then refetched in the background on the next visit). A fetch
// that throws is not cached, so fetchWithFallback's retries still apply.
export const MAP_DATA_REVALIDATE_SECONDS = 120;

export function cachedMapData<T>(fetcher: () => Promise<T>, key: string) {
  return unstable_cache(fetcher, ["map-data", key], {
    revalidate: MAP_DATA_REVALIDATE_SECONDS,
  });
}
