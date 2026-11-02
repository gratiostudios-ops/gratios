const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const { mkdirSync, writeFileSync, copyFileSync, readFileSync } = require('node:fs');
const { join } = require('node:path');

// Android small icons use an alpha silhouette; the large icon keeps the original logo.
function writeNotificationBrand(projectRoot) {
  const res = join(projectRoot, 'android/app/src/main/res');
  mkdirSync(join(res, 'drawable'), { recursive: true });
  mkdirSync(join(res, 'drawable-nodpi'), { recursive: true });
  writeFileSync(join(res, 'drawable/avocado_notification.xml'), readFileSync(join(projectRoot, 'assets/brand/gratios-notification-wordmark.xml')));
  copyFileSync(join(projectRoot, 'assets/brand/gratios-logo-white.png'), join(res, 'drawable-nodpi/avocado_notification_large.png'));
}

module.exports = function withNotificationBrand(config) {
  config = withAndroidManifest(config, mod => {
    const app = mod.modResults.manifest.application[0];
    const values = {
      'expo.modules.notifications.default_notification_icon': '@drawable/avocado_notification',
      'com.google.firebase.messaging.default_notification_icon': '@drawable/avocado_notification',
      'expo.modules.notifications.large_notification_icon': '@drawable/avocado_notification_large',
    };
    const metadata = app['meta-data'] ??= [];
    for (const [name, resource] of Object.entries(values)) {
      const existing = metadata.find(item => item.$['android:name'] === name);
      if (existing) existing.$['android:resource'] = resource;
      else metadata.push({ $: { 'android:name': name, 'android:resource': resource } });
    }
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => { writeNotificationBrand(mod.modRequest.projectRoot); return mod; }]);
};
module.exports.writeNotificationBrand = writeNotificationBrand;
