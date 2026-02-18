/*
 * SPDX-License-Identifier: MIT
 */

const config = {
  appId: 'com.workpro.cmms',
  appName: 'WorkPro CMMS',
  webDir: 'dist',
  bundledWebRuntime: false,
  server: {
    androidScheme: 'https',
  },
  plugins: {
    SplashScreen: {
      launchShowDuration: 800,
      backgroundColor: '#061a3a',
      showSpinner: false,
    },
  },
} as const;

export default config;
