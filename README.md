# Avocado mobile app

Expo / React Native / TypeScript client for the dynamic-agent backend. Use Node 22.13 or newer and configure `.env` from `.env.example`. Normal startup uses Supabase Google authentication through the gateway. See [Google setup](../ref/general/google-signin-setup.md).

```sh
npm ci
npm start
```

The gateway defaults to `http://127.0.0.1:4104`. For Android USB development, run `adb reverse tcp:4104 tcp:4104`. `npm run web` provides browser preview. Explicit `EXPO_PUBLIC_DEMO_MODE=true` uses local development fixtures; these are not agent definitions or live backend routing.

## Dynamic agents and documents

Agents, names, descriptions, artwork, cards, conversations, and editable documents come from the gateway. No email or flight agent is selected implicitly. Profile lists assigned agents and their tool grants; backend provisioning controls which agents exist. Each agent's private `AGENT.md` and `PREFERENCE.md` can be edited in Profile. Shared `SOUL.md` and `POLICY.md` are controlled by the backend.

Chat requests include an optional agent ID. Conversation state is keyed by user-agent identity, not card identity, so multiple cards from an agent use its conversation. A completed run may contain cards or notifications without a chat reply; no synthetic assistant message is inserted.

## Cards

Home renders published cards supplied by `/gateway/mobile`. Actual list viewability on the active Home tab reports `POST /gateway/cards/:id/seen`; background fetching and off-screen pre-rendering do not mark cards seen. The backend returns the first-seen timestamp and expiry. Local timers remove expired cards even while Home remains open, and foreground refresh reconciles with server filtering. Reopening a card does not reset expiry.

## Phone push

Push uses `expo-notifications`, `expo-device`, and `expo-constants`, installed for SDK 58. Configure `EXPO_PUBLIC_EAS_PROJECT_ID`. Android native builds also need FCM credentials and `GOOGLE_SERVICES_JSON` pointing to an externally supplied file; iOS builds need `IOS_BUNDLE_IDENTIFIER` and APNs credentials configured through EAS. Never commit credentials.

Use a physical phone and a development/production build (`npm run android` or a configured EAS build). Android remote push is unavailable in Expo Go. The app requests notification permission, obtains an Expo token, and saves it through `PUT /gateway/device`. The latest registered phone replaces the previous one. Logout calls `DELETE /gateway/device` before clearing local credentials. Local logout still completes if the server is unreachable, with a warning that the phone registration could not be removed. Foreground pushes display a banner/list notification. No in-app notification inbox is created.

Official references: [SDK 58 notification API](https://docs.expo.dev/versions/v58.0.0/sdk/notifications/) and [Expo push setup](https://docs.expo.dev/push-notifications/push-notifications-setup/).

## Validation

```sh
npm run typecheck
npm test
```

Actual push delivery requires platform credentials and a physical device. Typechecking and mocked tests cannot prove device delivery.
