import { CapacitorConfig } from '@capacitor/cli';

const config: CapacitorConfig = {
  appId: 'app.lovable.beingwell',
  appName: 'beingwell',
  webDir: 'dist',
  // Remove server config for native app deployment
  // server: {
  //   url: 'https://19c2bff5-5cc9-411b-b7e2-36bbe14692c6.lovableproject.com?forceHideBadge=true',
  //   cleartext: true,
  // },
};

export default config;