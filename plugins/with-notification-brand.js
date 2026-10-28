const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const { mkdirSync, writeFileSync, copyFileSync } = require('node:fs');
const { join } = require('node:path');

// Android small icons use an alpha silhouette; the large icon keeps the original logo.
function writeNotificationBrand(projectRoot) {
  const res = join(projectRoot, 'android/app/src/main/res');
  mkdirSync(join(res, 'drawable'), { recursive: true });
  mkdirSync(join(res, 'drawable-nodpi'), { recursive: true });
  writeFileSync(join(res, 'drawable/avocado_notification.xml'), `<vector xmlns:android="http://schemas.android.com/apk/res/android" android:width="24dp" android:height="24dp" android:viewportWidth="1280" android:viewportHeight="1280">
  <path android:fillColor="#FFFFFFFF" android:pathData="M339,440 C450,325 587,270 690,302 C820,335 829,465 803,593 C780,713 777,806 810,807 C832,810 878,747 925,683 C959,636 1007,639 1032,677 C1076,739 995,844 926,903 C859,962 748,949 706,884 C690,859 684,828 679,797 C607,908 523,967 414,951 C320,939 269,873 282,782 C296,673 404,586 668,493 C679,421 630,411 581,434 C521,455 469,488 425,526 C387,558 339,545 323,513 C312,491 319,462 339,440 Z M640,621 C537,656 453,707 427,765 C404,813 429,851 472,845 C547,837 613,732 640,621 Z" android:fillType="evenOdd"/>
</vector>\n`);
  copyFileSync(join(projectRoot, 'assets/brand/logo.png'), join(res, 'drawable-nodpi/avocado_notification_large.png'));
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
