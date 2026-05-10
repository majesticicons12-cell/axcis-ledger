import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.axcis.ledger',
  appName: 'AXCIS Ledger',
  webDir: 'dist',
  android: {
    backgroundColor: '#0a0e1a',
  },
  ios: {
    backgroundColor: '#0a0e1a',
  },
};

export default config;
