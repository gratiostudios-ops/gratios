import assert from 'node:assert/strict';
import test from 'node:test';
import { sharedConfiguration } from '../scripts/shared-apk.mjs';

test('shared APK disables fixtures and dotenv overrides while preserving the HTTPS origin', () => {
  const result = sharedConfiguration({ EXPO_PUBLIC_GATEWAY_URL: 'https://test-api.avocado.dev/', EXPO_PUBLIC_DEMO_MODE: 'true', DATABASE_URL: 'server-only' });
  assert.equal(result.EXPO_PUBLIC_GATEWAY_URL, 'https://test-api.avocado.dev');
  assert.equal(result.EXPO_PUBLIC_DEMO_MODE, 'false');
  assert.equal(result.EXPO_NO_DOTENV, '1');
  assert.equal(result.DATABASE_URL, undefined);
});

test('shared builds reject device-local addresses and unchanged examples', () => {
  for (const value of [undefined, 'http://192.168.1.2:4104', 'https://localhost', 'https://127.0.0.1', 'https://[::1]', 'https://api.your-domain.com']) {
    assert.throws(() => sharedConfiguration({ EXPO_PUBLIC_GATEWAY_URL: value }));
  }
});

test('shared builds reject URL credentials and API paths rather than embedding them', () => {
  for (const value of ['https://user:secret@api.avocado.dev', 'https://api.avocado.dev/api', 'https://api.avocado.dev/?secret=value', 'https://api.avocado.dev/#token']) {
    assert.throws(() => sharedConfiguration({ EXPO_PUBLIC_GATEWAY_URL: value }), error => {
      assert.doesNotMatch(error.message, /secret=value|user:secret|#token/);
      return true;
    });
  }
});
