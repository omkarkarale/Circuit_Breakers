import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.medlink.app',
  appName: 'MedLink',
  webDir: 'dist',
  android: {
    allowMixedContent: true
  }
};

export default config;
