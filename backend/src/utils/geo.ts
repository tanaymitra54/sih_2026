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

function distKm(a: Coords, b: Coords): number {
  const dLat = ((b.lat - a.lat) * Math.PI) / 180;
  const dLng = ((b.lng - a.lng) * Math.PI) / 180;
  const s =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((a.lat * Math.PI) / 180) * Math.cos((b.lat * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * 6371 * Math.asin(Math.sqrt(s));
}

/**
 * Nearest known metro for raw GPS coords — coarse regional attribution used to
 * feed the fraud heatmap from consumer scans (which carry coords, not names).
 * ponytail: attributes to nearest known city at any distance; swap for a real
 * reverse geocoder if precision ever matters.
 */
export function nearestCity(coords: Coords): string | null {
  let bestName: string | null = null;
  let bestD = Infinity;
  for (const [name, c] of Object.entries(CITY_COORDS)) {
    const d = distKm(coords, c);
    if (d < bestD) {
      bestD = d;
      bestName = name;
    }
  }
  return bestName ? bestName[0].toUpperCase() + bestName.slice(1) : null;
}
