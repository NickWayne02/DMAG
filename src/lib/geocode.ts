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
import { toast } from 'sonner';

export async function getCurrentPosition(
  options?: PositionOptions,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    const permissions = await Geolocation.checkPermissions();
    if (permissions.location !== 'granted') {
      const request = await Geolocation.requestPermissions();
      if (request.location !== 'granted') {
        toast.error("GPS Permission Denied. Please enable location permissions for this app in Settings.", { duration: 5000 });
        return null;
      }
    }
    
    try {
      // Fast 5-second timeout for high accuracy
      const pos = await Geolocation.getCurrentPosition({ enableHighAccuracy: true, timeout: 5000, maximumAge: 60000, ...options });
      return pos.coords;
    } catch (e: any) {
      // If high accuracy times out, try low accuracy allowing up to a 1-hour old cached location
      try {
        const fallbackPos = await Geolocation.getCurrentPosition({ enableHighAccuracy: false, timeout: 15000, maximumAge: 3600000, ...options });
        return fallbackPos.coords;
      } catch (fallbackErr: any) {
        // Last resort: just ask for ANY location, no constraints
        try {
           const anyPos = await Geolocation.getCurrentPosition();
           return anyPos.coords;
        } catch(finalErr: any) {
           // ULTIMATE FALLBACK: IP-based Geolocation
           try {
             const ipRes = await fetch("https://get.geojs.io/v1/ip/geo.json");
             if (ipRes.ok) {
               const ipData = await ipRes.json();
               if (ipData.latitude && ipData.longitude) {
                 return {
                   latitude: parseFloat(ipData.latitude),
                   longitude: parseFloat(ipData.longitude)
                 };
               }
             }
           } catch (ipErr) {
             // Ignore IP fallback error
           }

           const msg = finalErr?.message || String(finalErr);
           if (!msg.toLowerCase().includes("timeout") && !msg.toLowerCase().includes("in time")) {
             toast.error("GPS Error: " + msg, { duration: 5000 });
           }
           return null;
        }
      }
    }
  } catch (globalErr: any) {
    const msg = globalErr?.message || String(globalErr);
    if (!msg.toLowerCase().includes("timeout") && !msg.toLowerCase().includes("in time")) {
      toast.error("GPS Error: " + msg, { duration: 5000 });
    }
    return null;
  }
}
