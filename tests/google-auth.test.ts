import assert from 'node:assert/strict';
import test from 'node:test';
import { createHash } from 'node:crypto';
import { googleRedirect, runGoogleSignIn } from '../src/auth/google-flow';

const config = { supabaseUrl: 'https://project.supabase.co', supabaseKey: 'public-test-key' };
const jwt = [Buffer.from(JSON.stringify({ alg: 'HS256', typ: 'JWT' })).toString('base64url'), Buffer.from(JSON.stringify({ sub: 'user-id', exp: Math.floor(Date.now() / 1000) + 3600 })).toString('base64url'), Buffer.alloc(32).toString('base64url')].join('.');
test('Google callback exchanges its code with the matching PKCE verifier, verifies the Gateway, and strips provider tokens', async () => {
  let challenge = ''; let verified = false;
  const result = await runGoogleSignIn(config, async (address, redirect) => {
    const url = new URL(address);
    assert.equal(redirect, googleRedirect); assert.equal(url.searchParams.get('provider'), 'google');
    assert.equal(url.searchParams.get('redirect_to'), googleRedirect);
    assert.equal(url.searchParams.get('code_challenge_method'), 's256');
    challenge = url.searchParams.get('code_challenge')!;
    return { type: 'success', url: googleRedirect + '?code=one-use-code' };
  }, async token => { assert.equal(token, jwt); verified = true; }, (async (input, init) => {
    assert.equal(new URL(String(input)).searchParams.get('grant_type'), 'pkce');
    const body = JSON.parse(init!.body as string);
    assert.equal(body.auth_code, 'one-use-code');
    assert.equal(createHash('sha256').update(body.code_verifier).digest('base64url'), challenge);
    return new Response(JSON.stringify({ access_token: jwt, refresh_token: 'refresh', expires_in: 3600, token_type: 'bearer', provider_token: 'private-google-token', user: { id: 'user-id', app_metadata: { provider: 'google' } } }), { status: 200, headers: { 'Content-Type': 'application/json' } });
  }) as typeof fetch);
  assert.equal(verified, true); assert.equal(result?.refresh_token, 'refresh');
  assert.equal('provider_token' in result!, false);
});

test('cancelling Google consent creates no app session or token exchange', async () => {
  const result = await runGoogleSignIn(config, async () => ({ type: 'cancel' }), async () => { assert.fail('must not verify a cancelled flow'); }, (async () => { assert.fail('must not exchange after cancel'); }) as typeof fetch);
  assert.equal(result, null);
});

test('unexpected redirects and token fragments are rejected before exchange', async () => {
  for (const url of ['https://attacker.test/?code=stolen', 'avocado://wrong/callback?code=stolen', 'avocado://auth/wrong?code=stolen', googleRedirect + '#access_token=untrusted', googleRedirect + '?error=access_denied']) {
    await assert.rejects(runGoogleSignIn(config, async () => ({ type: 'success', url }), async () => { assert.fail(); }, (async () => { assert.fail(); }) as typeof fetch));
  }
});
