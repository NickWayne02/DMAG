export async function reverseGeocodeCity(
  coords: { latitude: number; longitude: number } | null,
): Promise<string | null> {
  if (!coords || (coords.latitude === 0 && coords.longitude === 0)) return null;
  try {
    const r = await fetch(
      `https://nominatim.openstreetmap.org/reverse?format=json&lat=${coords.latitude}&lon=${coords.longitude}&accept-language=ru`,
    );
    if (!r.ok) return null;
    const j = await r.json();
    return (
      j.address?.city ||
      j.address?.town ||
      j.address?.village ||
      j.address?.hamlet ||
      j.name ||
      null
    );
  } catch {
    return null;
  }
}

import { toast } from "sonner";
import { Capacitor } from "@capacitor/core";

export async function getCurrentPosition(
  options?: PositionOptions,
): Promise<{ latitude: number; longitude: number } | null> {
  try {
    if (typeof window === "undefined") return null;
    const { Geolocation } = await import("@capacitor/geolocation");

    if (Capacitor.isNativePlatform()) {
      try {
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
      } catch (err: any) {
        // Fallback if permission check fails on some Android devices
        console.warn("Permission check failed:", err);
      }
    }

    try {
      // 10-second timeout for high accuracy. GPS lock can take a few seconds on cold start.
      const pos = await Geolocation.getCurrentPosition({
        enableHighAccuracy: true,
        timeout: 30000,
        maximumAge: 60000,
        ...options,
      });
      return pos.coords;
    } catch (e: any) {
      // 5-second timeout for low accuracy (network/wifi), allowing cached locations
      try {
        const fallbackPos = await Geolocation.getCurrentPosition({
          enableHighAccuracy: false,
          timeout: 15000,
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
          // ULTIMATE FALLBACK: No accurate coordinates found.
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
