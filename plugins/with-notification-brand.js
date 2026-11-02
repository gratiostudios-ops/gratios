const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const { mkdirSync, writeFileSync, copyFileSync } = require('node:fs');
const { join } = require('node:path');

// Android small icons use an alpha silhouette; the large icon keeps the original logo.
function writeNotificationBrand(projectRoot) {
  const res = join(projectRoot, 'android/app/src/main/res');
  mkdirSync(join(res, 'drawable'), { recursive: true });
  mkdirSync(join(res, 'drawable-nodpi'), { recursive: true });
  writeFileSync(join(res, 'drawable/avocado_notification.xml'), `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="313" android:viewportHeight="73">
  <path android:fillColor="#FFFFFFFF" android:pathData="M0,0h313v73h-313z" android:alpha="0"/>
  <path android:fillColor="#FFFFFFFF" android:pathData="M24,10h17v6h-11v10h10v6h-10v15h-7z M47,16h7v5c2,-4 5,-6 10,-6v7c-6,-1 -10,2 -10,9v16h-7z M87,35h-22c1,6 5,9 11,9 4,0 7,-1 10,-3v6c-3,2 -7,3 -12,3 -10,0 -16,-6 -16,-17 0,-10 6,-17 15,-17 9,0 14,6 14,16z M65,30h15c0,-5 -3,-8 -7,-8 -4,0 -7,3 -8,8z M93,16h7v5c2,-4 6,-6 10,-6 5,0 8,2 10,6 2,-4 6,-6 11,-6 7,0 12,5 12,14v18h-7v-17c0,-6 -2,-9 -7,-9 -4,0 -7,3 -7,9v17h-7v-17c0,-6 -2,-9 -7,-9 -4,0 -7,3 -7,9v17h-7z M149,3h7v18c2,-4 6,-6 11,-6 8,0 14,7 14,17 0,10 -6,17 -14,17 -5,0 -9,-2 -11,-6v5h-7z M156,32v1c0,7 3,11 9,11 5,0 9,-4 9,-12 0,-7 -4,-11 -9,-11 -6,0 -9,4 -9,11z M185,35c0,-10 6,-17 16,-17 9,0 15,7 15,17 0,10 -6,17 -15,17 -10,0 -16,-7 -16,-17z M192,35c0,7 3,11 9,11 5,0 8,-4 8,-11 0,-8 -3,-12 -8,-12 -6,0 -9,4 -9,12z M221,19h7v5c2,-4 6,-6 11,-6 8,0 12,5 12,14v18h-7v-17c0,-6 -2,-9 -7,-9 -5,0 -9,4 -9,10v16h-7z M263,20l2,-9h7l-2,9h7v6h-8v16c0,3 1,4 4,4h4v6h-5c-7,0 -10,-3 -10,-10v-16h-5v-6z M286,35h-6c0,-11 5,-17 16,-17 10,0 15,5 15,15v17h-7v-5c-2,4 -6,6 -11,6 -7,0 -12,-4 -12,-10 0,-7 5,-11 15,-11h8v-1c0,-4 -3,-6 -8,-6 -6,0 -9,3 -10,8z M304,36h-8c-5,0 -8,1 -8,5 0,3 2,5 6,5 6,0 10,-4 10,-10z"/>
</vector>\n`);
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
