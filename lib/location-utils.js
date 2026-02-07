export function createLocationSlug(city, state) {
  if (!city || !state) return '';
  return `${city}-${state}`.toLowerCase().replace(/\s+/g, '-');
}
