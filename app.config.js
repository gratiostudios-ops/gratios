// Native service credentials are supplied by the build environment, never committed.
const { withAndroidManifest } = require('@expo/config-plugins');
const { existsSync } = require('node:fs');
const path = require('node:path');
const localGoogleServices = path.join(__dirname, 'google-services.json');
const googleServicesFile = process.env.GOOGLE_SERVICES_JSON || (existsSync(localGoogleServices) ? localGoogleServices : undefined);

module.exports = ({ config }) => ({
  ...withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) application.$['android:usesCleartextTraffic'] = 'true';
    const queries = config.modResults.manifest.queries ??= [];
    if (!queries.some(query => query.package?.some(item => item.$['android:name'] === 'com.google.android.gm'))) {
      queries.push({ package: [{ $: { 'android:name': 'com.google.android.gm' } }] });
    }
    return config;
  }),
  android: {
    ...config.android,
    ...(googleServicesFile ? { googleServicesFile } : {}),
  },
  ios: {
    ...config.ios,
    ...(process.env.IOS_BUNDLE_IDENTIFIER ? { bundleIdentifier: process.env.IOS_BUNDLE_IDENTIFIER } : {}),
  },
  extra: {
    ...config.extra,
    ...(process.env.EXPO_PUBLIC_EAS_PROJECT_ID ? { eas: { ...config.extra?.eas, projectId: process.env.EXPO_PUBLIC_EAS_PROJECT_ID } } : {}),
  },
});
