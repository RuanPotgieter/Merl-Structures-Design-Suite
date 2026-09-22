import type { CapacitorConfig } from '@capacitor/cli';

// When NETLIFY_URL or CAPACITOR_SERVER_URL is provided, Capacitor natively streams
// the latest web bundle directly over-the-air from Netlify, bypassing App Store reviews.
const serverUrl = process.env.CAPACITOR_SERVER_URL || process.env.VITE_NETLIFY_URL;

const config: CapacitorConfig = {
  appId: 'com.merlmagic.app',
  appName: 'MerlMagic',
  webDir: 'dist',
  server: {
    androidScheme: 'https',
    cleartext: false,
    ...(serverUrl ? { url: serverUrl } : {})
  }
};

export default config;

