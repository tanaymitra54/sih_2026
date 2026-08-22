export interface Coords {
  lat: number;
  lng: number;
}

/** Browser geolocation prompt → coords, or null on deny/timeout/unavailable. */
export function getPosition(): Promise<Coords | null> {
  return new Promise((resolve) => {
    if (!navigator.geolocation) return resolve(null);
    navigator.geolocation.getCurrentPosition(
      (pos) => resolve({ lat: pos.coords.latitude, lng: pos.coords.longitude }),
      () => resolve(null),
      { timeout: 4000, maximumAge: 30000 },
    );
  });
}
