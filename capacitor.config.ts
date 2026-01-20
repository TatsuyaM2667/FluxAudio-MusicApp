import type { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'com.esp32.musicweb',
  appName: 'FluxAudio',
  webDir: 'dist',
  // Android specific settings
  android: {
    allowMixedContent: true, // Allow HTTP content on HTTPS
    backgroundColor: '#000000',
  },
  // Server settings for development
  server: {
    androidScheme: 'https',
    cleartext: true, // Allow HTTP requests
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 3000,
      launchAutoHide: false,
      launchFadeOutDuration: 300,
      backgroundColor: "#000000",
      androidSplashResourceName: "splash",
      androidScaleType: "CENTER_CROP",
      showSpinner: false, // シンプルなロゴのみにするためスピナーは非表示
      splashFullScreen: true,
      splashImmersive: true,
    },
  }
};

export default config;
