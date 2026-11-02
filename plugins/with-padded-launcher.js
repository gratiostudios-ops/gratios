const { withAndroidManifest, withDangerousMod } = require('@expo/config-plugins');
const { copyFileSync, mkdirSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');

// Use the supplied app icon at the full launcher canvas size.
function writeLauncher(projectRoot) {
  const res = join(projectRoot, 'android/app/src/main/res');
  const write = (folder, name, content) => { mkdirSync(join(res, folder), { recursive: true }); writeFileSync(join(res, folder, name), content); };
  mkdirSync(join(res, 'drawable-nodpi'), { recursive: true });
  copyFileSync(join(projectRoot, 'assets/brand/gratios-app-icon.png'), join(res, 'drawable-nodpi/launcher_mark.png'));
  write('drawable', 'avocado_launcher.xml', `<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item><shape android:shape="rectangle"><solid android:color="#000000"/></shape></item>
  <item><bitmap android:src="@drawable/launcher_mark" android:gravity="fill" android:filter="true"/></item>
</layer-list>\n`);
  write('drawable', 'avocado_launcher_foreground.xml', `<layer-list xmlns:android="http://schemas.android.com/apk/res/android">
  <item android:left="16dp" android:right="16dp" android:top="16dp" android:bottom="16dp"><bitmap android:src="@drawable/launcher_mark" android:gravity="fill" android:filter="true"/></item>
</layer-list>\n`);
  write('drawable-anydpi-v26', 'avocado_launcher.xml', `<adaptive-icon xmlns:android="http://schemas.android.com/apk/res/android">
  <background android:drawable="@android:color/black"/>
  <foreground android:drawable="@drawable/avocado_launcher_foreground"/>
</adaptive-icon>\n`);
}
module.exports = function withPaddedLauncher(config) {
  config = withAndroidManifest(config, mod => {
    const app = mod.modResults.manifest.application[0].$;
    app['android:icon'] = '@drawable/avocado_launcher';
    app['android:roundIcon'] = '@drawable/avocado_launcher';
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => { writeLauncher(mod.modRequest.projectRoot); return mod; }]);
};
module.exports.writeLauncher = writeLauncher;
