import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.vocalledger.app',
  appName: 'Vocal Ledger',
  webDir: 'dist',
  android: {
    allowMixedContent: false,
    webContentsDebuggingEnabled: false,
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 0,
      launchAutoHide: true,
      backgroundColor: '#f8f9ff',
    },
    SystemBars: {
      // Injects --safe-area-inset-* CSS variables so headers/nav clear the system bars.
      insetsHandling: 'css',
      initialViewportFitValueHint: 'cover',
      style: 'LIGHT',
    },
    CapacitorSQLite: {
      androidIsEncryption: false,
    },
  },
};

export default config;
