import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.souffleur.app',
  appName: 'Souffleur',
  webDir: 'public',
  server: {
    url: 'https://repeto-seven.vercel.app/',
    cleartext: true
  }
};

export default config;
