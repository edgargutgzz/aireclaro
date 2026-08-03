export async function fetchWithFallback<T>(
  fetchFn: () => Promise<T>,
  fallbackValue: T,
  retries = 2,
): Promise<T> {
  for (let i = 0; i <= retries; i++) {
    try {
      return await fetchFn();
    } catch (error) {
      if (i === retries) {
        console.warn(`Failed after ${retries + 1} attempts:`, error);
        return fallbackValue;
      }
      await new Promise((resolve) => setTimeout(resolve, 1000 * (i + 1)));
    }
  }
  return fallbackValue;
}
