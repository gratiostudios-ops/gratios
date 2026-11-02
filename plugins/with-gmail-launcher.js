const { withMainApplication, withDangerousMod } = require('@expo/config-plugins');
const { mkdirSync, readFileSync, writeFileSync } = require('node:fs');
const { join } = require('node:path');
function writeGmailLauncher(root, packageName) {
  const directory = join(root, 'android/app/src/main/java', ...packageName.split('.'));
  mkdirSync(directory, { recursive: true });
  for (const file of ['GmailLinkModule.kt', 'GmailLinkPackage.kt']) {
    writeFileSync(join(directory, file), readFileSync(join(__dirname, 'gmail-launcher', file), 'utf8').replace('__PACKAGE__', packageName));
  }
}
module.exports = function withGmailLauncher(config) {
  config = withMainApplication(config, mod => {
    if (!mod.modResults.contents.includes('add(GmailLinkPackage())')) {
      const anchor = 'PackageList(this).packages.apply {';
      if (!mod.modResults.contents.includes(anchor)) throw new Error('Cannot register GmailLauncher in MainApplication');
      mod.modResults.contents = mod.modResults.contents.replace(anchor, anchor + '\n          add(GmailLinkPackage())');
    }
    return mod;
  });
  return withDangerousMod(config, ['android', async mod => {
    writeGmailLauncher(mod.modRequest.projectRoot, mod.android.package);
    return mod;
  }]);
};
module.exports.writeGmailLauncher = writeGmailLauncher;
