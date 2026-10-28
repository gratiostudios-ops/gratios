// Native service credentials are supplied by the build environment, never committed.
const { withAndroidManifest } = require('@expo/config-plugins');

module.exports = ({ config }) => ({
  ...withAndroidManifest(config, (config) => {
    const application = config.modResults.manifest.application?.[0];
    if (application) application.$['android:usesCleartextTraffic'] = 'true';
    return config;
  }),
  android: {
    ...config.android,
    ...(process.env.GOOGLE_SERVICES_JSON ? { googleServicesFile: process.env.GOOGLE_SERVICES_JSON } : {}),
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
