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
    return j.city || j.locality || j.principalSubdivision || j.countryName || null;
  } catch {
    return null;
  }
}

import { toast } from "sonner";

export async function getCurrentPosition(
  options?: PositionOptions,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (typeof window === "undefined") return null;
    const { Geolocation } = await import("@capacitor/geolocation");
    const permissions = await Geolocation.checkPermissions();
    if (permissions.location !== "granted") {
      const request = await Geolocation.requestPermissions();
      if (request.location !== "granted") {
        toast.error(
          "GPS Permission Denied. Please enable location permissions for this app in Settings.",
          { duration: 5000 },
        );
        return null;
      }
    }

    try {
      // Extremely fast 2-second timeout for high accuracy. If the GPS satellite lock is ready, it returns instantly.
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 2000,
        maximumAge: 60000,
        ...options,
      });
      return pos.coords;
    } catch (e: any) {
      // Fast 3-second timeout for low accuracy (network/wifi), allowing cached locations
      try {
        const fallbackPos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 3000,
          maximumAge: 3600000,
          ...options,
        });
        return fallbackPos.coords;
      } catch (fallbackErr: any) {
        // Last resort: just ask for ANY native location (2 seconds)
        try {
          const anyPos = await Geolocation.getCurrentPosition({ timeout: 2000 });
          return anyPos.coords;
        } catch (finalErr: any) {
          // ULTIMATE FALLBACK: IP-based Geolocation (instant)
          try {
            const ipRes = await fetch("https://get.geojs.io/v1/ip/geo.json");
            if (ipRes.ok) {
              const ipData = await ipRes.json();
              if (ipData.latitude && ipData.longitude) {
                return {
                  latitude: parseFloat(ipData.latitude),
                  longitude: parseFloat(ipData.longitude),
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
