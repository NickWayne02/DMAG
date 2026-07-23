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
    
    try {
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 15000, maximumAge: 10000, ...options });
      return pos.coords;
    } catch (e: any) {
      // If high accuracy times out, try low accuracy (cell towers/wifi) which is usually instant
      try {
        const fallbackPos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 10000, maximumAge: 60000, ...options });
        return fallbackPos.coords;
      } catch (fallbackErr: any) {
        alert("GPS Error: " + (fallbackErr?.message || JSON.stringify(fallbackErr)));
        return null;
      }
    }
  } catch (globalErr) {
    return null;
  }
}
