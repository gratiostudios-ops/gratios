import { Platform } from 'react-native';
import Constants from 'expo-constants';
import * as Device from 'expo-device';
import { gateway } from './auth/Auth';

// https://docs.expo.dev/versions/v58.0.0/sdk/notifications/
// Remote notifications require a native development/production build and platform credentials.
const registrations = new Set<AbortController>();
export function cancelPhonePushRegistrations() { for (const controller of registrations) controller.abort(); }
export async function registerPhonePush(signal?: AbortSignal, requestPermission = true): Promise<string | undefined> {
  const controller = new AbortController();
  const abort = () => controller.abort();
  signal?.addEventListener('abort', abort, { once: true });
  if (signal?.aborted) controller.abort();
  registrations.add(controller);
  try { return await register(controller.signal, requestPermission); }
  finally { registrations.delete(controller); signal?.removeEventListener('abort', abort); }
}
async function register(signal: AbortSignal, requestPermission: boolean): Promise<string | undefined> {
  if (Platform.OS === 'web') return 'Phone notifications are available in the native app.';
  if (!Device.isDevice) return 'Phone notifications require a physical device.';
  if (Constants.appOwnership === 'expo') return 'Use an Avocado development build to enable phone notifications.';
  const projectId = Constants.expoConfig?.extra?.eas?.projectId ?? Constants.easConfig?.projectId ?? process.env.EXPO_PUBLIC_EAS_PROJECT_ID;
  if (!projectId) return 'Phone notifications need an Expo project ID configured.';
  const Notifications = await import('expo-notifications');
  if (signal?.aborted) return;
  Notifications.setNotificationHandler({
    handleNotification: async () => ({ shouldShowBanner: true, shouldShowList: true, shouldPlaySound: false, shouldSetBadge: false }),
  });
  if (Platform.OS === 'android') await Notifications.setNotificationChannelAsync('default', { name: 'Agent notifications', importance: Notifications.AndroidImportance.DEFAULT });
  let permissions = await Notifications.getPermissionsAsync();
  if (!permissions.granted && requestPermission && permissions.canAskAgain) permissions = await Notifications.requestPermissionsAsync();
  if (!permissions.granted) return 'Phone notifications are disabled. Enable permission in your phone settings.';
  const token = (await Notifications.getExpoPushTokenAsync({ projectId })).data;
  if (signal?.aborted) return;
  await gateway.request('/gateway/device', { method: 'PUT', body: JSON.stringify({ token }), signal });
}
