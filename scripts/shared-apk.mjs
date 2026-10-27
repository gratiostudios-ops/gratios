import { existsSync } from 'node:fs';
import { spawn } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import { resolve } from 'node:path';

const frontend = fileURLToPath(new URL('../', import.meta.url));

export function sharedConfiguration(env) {
  let url;
  try { url = new URL(env.EXPO_PUBLIC_GATEWAY_URL); }
  catch { throw new Error('Set EXPO_PUBLIC_GATEWAY_URL in frontend/.env.shared to your shared HTTPS Gateway address.'); }
  if (url.protocol !== 'https:' || url.username || url.password || url.search || url.hash || url.pathname !== '/') {
    throw new Error('The shared Gateway must be an HTTPS origin without credentials, a path, query, or fragment.');
  }
  const host = url.hostname.toLowerCase();
  if (host === 'localhost' || host.endsWith('.localhost') || host === '[::1]' || host === '0.0.0.0' || /^127\./.test(host)
    || host === 'api.your-domain.com' || host === 'example.com' || host.endsWith('.example.com')) {
    throw new Error('Replace the example/loopback URL with an HTTPS address reachable by all test devices.');
  }
  return { EXPO_PUBLIC_GATEWAY_URL: url.origin, EXPO_PUBLIC_DEMO_MODE: 'false', EXPO_NO_DOTENV: '1', NODE_ENV: 'production' };
}

async function main() {
  if (Number(process.versions.node.split('.')[0]) < 22) throw new Error('Run nvm use in frontend/ first (Node 22+ required).');
  const file = resolve(frontend, '.env.shared');
  if (existsSync(file)) process.loadEnvFile(file);
  const configuration = sharedConfiguration(process.env);
  console.log(`Shared APK Gateway: ${configuration.EXPO_PUBLIC_GATEWAY_URL}`);
  console.log(`Google OAuth callback: ${configuration.EXPO_PUBLIC_GATEWAY_URL}/integrations/gmail/callback`);
  if (process.argv.includes('--check')) return;
  const architecture = process.env.APK_ARCHITECTURES ?? 'arm64-v8a,armeabi-v7a';
  if (!architecture.split(',').every(value => ['arm64-v8a', 'armeabi-v7a', 'x86', 'x86_64'].includes(value))) throw new Error('Invalid APK_ARCHITECTURES.');
  console.log('Building a bundled APK for private testing. Uses the existing debug signing key; no Metro or USB forwarding is needed.');
  const child = spawn(process.platform === 'win32' ? 'gradlew.bat' : './gradlew', [':app:assembleRelease', `-PreactNativeArchitectures=${architecture}`], {
    cwd: resolve(frontend, 'android'), env: { ...process.env, ...configuration }, stdio: 'inherit',
  });
  const stop = () => child.kill('SIGTERM');
  process.once('SIGINT', stop); process.once('SIGTERM', stop);
  try {
    await new Promise((done, reject) => {
      child.once('error', () => reject(new Error('Cannot start Gradle. Install the Android SDK/JDK and check frontend/android/gradlew.')));
      child.once('exit', (code, signal) => code === 0 ? done() : reject(new Error(`APK build stopped (${signal ?? code}).`)));
    });
    console.log(`APK ready: ${resolve(frontend, 'android/app/build/outputs/apk/release/app-release.apk')}`);
  } finally { process.removeListener('SIGINT', stop); process.removeListener('SIGTERM', stop); }
}

if (process.argv[1] && resolve(process.argv[1]) === fileURLToPath(import.meta.url)) {
  main().catch(error => { console.error(error.message); process.exitCode = 1; });
}
