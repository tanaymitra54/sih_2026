export interface Coords {
  lat: number;
  lng: number;
}

const CITY_COORDS: Record<string, Coords> = {
  mumbai: { lat: 19.076, lng: 72.8777 },
  pune: { lat: 18.5204, lng: 73.8567 },
  delhi: { lat: 28.7041, lng: 77.1025 },
  bengaluru: { lat: 12.9716, lng: 77.5946 },
  bangalore: { lat: 12.9716, lng: 77.5946 },
  hyderabad: { lat: 17.385, lng: 78.4867 },
  chennai: { lat: 13.0827, lng: 80.2707 },
  kolkata: { lat: 22.5726, lng: 88.3639 },
};

/** Resolve a free-text location (e.g. user/batch route) to coordinates, or null. */
export function resolveCoords(name?: string | null): Coords | null {
  if (!name) return null;
  const key = name.toLowerCase().trim().replace(/\s+/g, "");
  return CITY_COORDS[key] ?? null;
}
