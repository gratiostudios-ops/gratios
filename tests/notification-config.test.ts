import assert from 'node:assert/strict';
import test from 'node:test';
import { readFileSync } from 'node:fs';
import path from 'node:path';
import vm from 'node:vm';

function notificationConfig(env: Record<string, string>, localFileExists: boolean) {
  const module = { exports: undefined as unknown };
  vm.runInNewContext(readFileSync(new URL('../app.config.js', import.meta.url), 'utf8'), {
    module, __dirname: '/app', process: { env },
    require(name: string) {
      if (name === '@expo/config-plugins') return { withAndroidManifest: (config: unknown) => config };
      if (name === 'node:fs') return { existsSync: () => localFileExists };
      if (name === 'node:path') return path;
      throw new Error('Unexpected config dependency');
    },
  });
  return (module.exports as (input: { config: object }) => { android: { googleServicesFile?: string } })({ config: { android: { package: 'com.avocado.fuse' } } });
}

test('Android push builds prefer the supplied Firebase config, otherwise use the local file', () => {
  assert.equal(notificationConfig({ GOOGLE_SERVICES_JSON: '/secure/firebase.json' }, true).android.googleServicesFile, '/secure/firebase.json');
  assert.equal(notificationConfig({}, true).android.googleServicesFile, '/app/google-services.json');
  assert.equal(notificationConfig({}, false).android.googleServicesFile, undefined);
});
