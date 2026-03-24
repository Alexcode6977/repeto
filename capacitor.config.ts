import { CapacitorConfig } from '@capacitor/cli';
import { KeyboardResize, KeyboardStyle } from '@capacitor/keyboard';

const config: CapacitorConfig = {
  appId: 'com.souffleur.app',
  appName: 'Repeto',
  webDir: 'public',
  server: {
    url: 'https://repeto-seven.vercel.app/',
    cleartext: true
  },
  plugins: {
    StatusBar: {
      style: 'LIGHT',
      overlaysWebView: true,
    },
    Keyboard: {
      resize: KeyboardResize.None,
      style: KeyboardStyle.Dark,
      resizeOnFullScreen: true,
    },
    SplashScreen: {
      launchShowDuration: 2000,
      launchAutoHide: true,
      backgroundColor: "#050508",
      androidScaleType: "CENTER_CROP",
      showSpinner: false,
    }
  }
};

export default config;
