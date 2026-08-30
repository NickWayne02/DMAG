import type { CapacitorConfig } from "@capacitor/cli";

const config: CapacitorConfig = {
  appId: "com.dmag.app",
  appName: "DMAG",
  webDir: "dist",
  server: {
    url: "https://dmag.vercel.app", // ЗАМЕНИТЕ НА ВАШ РЕАЛЬНЫЙ ДОМЕН VERCEL, ЕСЛИ ОН ДРУГОЙ
    cleartext: true,
    allowNavigation: ["dmag.vercel.app", "*.vercel.app"],
  },
};

export default config;
