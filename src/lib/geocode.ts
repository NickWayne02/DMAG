export async function reverseGeocodeCity(
  coords: { latitude: number; longitude: number } | null,
): Promise<string | null> {
  if (!coords) return null;
  try {
    const r = await fetch(
      `https://api.bigdatacloud.net/data/reverse-geocode-client?latitude=${coords.latitude}&longitude=${coords.longitude}&localityLanguage=ru`,
    );
    if (!r.ok) return null;
    const j = await r.json();
    return (
      j.city || j.locality || j.principalSubdivision || j.countryName || null
    );
  } catch {
    return null;
  }
}

import { Geolocation } from '@capacitor/geolocation';

export async function getCurrentPosition(
  options?: PositionOptions,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const permissions = await Geolocation.checkPermissions();
    if (permissions.location !== 'granted') {
      const request = await Geolocation.requestPermissions();
      if (request.location !== 'granted') {
        return null;
      }
    }
    const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 8000, ...options });
    return pos.coords;
  } catch (e) {
    // Web fallback just in case
    if (typeof navigator !== "undefined" && navigator.geolocation) {
      return new Promise((resolve) => {
        navigator.geolocation.getCurrentPosition(
          (pos) => resolve(pos.coords),
          () => resolve(null),
          { enableHighAccuracy: true, timeout: 8000, ...options },
        );
      });
    }
    return null;
  }
}
