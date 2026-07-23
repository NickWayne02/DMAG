import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.dmag.app',
  appName: 'DMAG',
  webDir: 'dist',
  server: {
    url: 'http://192.168.1.2:5174',
    cleartext: true
  }
};

export default config;
