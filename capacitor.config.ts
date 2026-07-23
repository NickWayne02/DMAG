import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'org.dmag.app',
  appName: 'DMAG',
  webDir: 'dist',
  // Для тестирования в эмуляторе Android используйте локальный сервер:
  // server: {
  //   url: 'http://10.0.2.2:3000',
  //   cleartext: true
  // }
  // 
  // Когда загрузите сайт на Vercel/Netlify, укажите ваш рабочий URL:
  // server: {
  //   url: 'https://ваш-домен.com',
  //   cleartext: true
  // }
};

export default config;
