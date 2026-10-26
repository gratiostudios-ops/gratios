# Fuse mobile demo

An Expo / React Native / TypeScript app based on the Fuse Figma file and the references in `ref/ui`. All data and interactions are local. No credentials or backend services are needed.

## Run

```sh
cd frontend
npm ci
npm start
```

Open the Expo QR code on a device with Expo Go for SDK 58, or use `npm run android` / `npm run ios` with a simulator. `npm run web` provides a browser preview that fills the available viewport. Use Node 22.13 or newer on the Node 22 line (`nvm use` reads the included `.nvmrc`).

## Replace the demo payload

`src/data/demo.ts` is the one place for demo tasks, published findings, prompt chips, replies, feed entries, profile details, and agent Markdown. Change `demoData.snapshot` to preview another payload. The initial example contains three published findings from two agents, while four agents are configured in Profile.

Home has no default agent. Configured agents do not appear on Home unless the current snapshot supplies findings for them. Findings are shown in their supplied order. An empty findings array displays a quiet empty canvas and keeps the input available. Checking a task draws the checkmark in 180ms, holds the completed state, then gently fades and lifts the row before removing it at one second. Repeated taps during completion are ignored. Removing the last task enlarges the illustration without moving the canvas title or input boundary.

Canvas navigation shows each icon once, even when several finding pages share it. Findings can supply a distinct `navigationIcon` and `navigationLabel`; Today at a glance uses the news icon. Swiping still reaches every finding. Selecting an icon opens its first supplied finding, and tapping the already selected icon keeps the current page. The example payload orders Flights first, Today at a glance second, and Mail third.

Optional development scenarios (no extra controls in the product UI):

```sh
EXPO_PUBLIC_DEMO_SCENARIO=empty npm start
EXPO_PUBLIC_DEMO_SCENARIO=single npm start
EXPO_PUBLIC_DEMO_SCENARIO=calendar npm start
```

Restart Metro when changing a scenario. The default is `multiple`.

## Connect a backend later

Implement `DataSource` in `src/data/types.ts` and pass it as `dataSource` to `AppDataProvider`. It loads a snapshot, optionally subscribes to pushed snapshots, completes tasks, and sends messages. The mock source also exposes `publishSnapshot` for integration exercises. Published snapshots replace tasks/findings; UI components do not read directly from the mock payload.

Content blocks support headings, plain paragraphs, numbered lists, tables, and action buttons. Table columns and rows come from data; tables with more than two columns scroll horizontally. `previewRows` enables local Show More / Show Less. Images can reference a bundled asset key or a remote URI. Stable finding/task/block IDs preserve UI identity across updates.

The registry, profile, feed, canned replies, and Markdown seed documents also live in the same demo data object. Their future transport can be added to the provider without changing the presentation components. Agent and preference edits are session state and reset after a full restart. Chat replies are canned; action buttons do not send email, book flights, or modify external services.

## Layout and assets

Shared styles use the Figma values in `src/theme.ts`, including Figtree, Crimson Pro, Poppins, and Inter with the individual weights bundled through Expo font packages. Numbered points and regular canvas paragraphs use 16px text. Normal content has no inline highlight styling. Highlights are supported only in table cells, using bold Figtree and green (#32F579). The screen waits for font loading before rendering. Figma assets are local under `assets/figma`; SVGs retain their original geometry, with color passed for active/inactive states. Mail uses the supplied envelope with a transparent background, and Today at a glance uses the supplied mailbox illustration.

Suggestion thumbnails use fixed 75×63px frames with cover cropping. Opened suggestions use consistent 200px-high image frames with contain sizing, shared text/header margins, richer sections and points, and external resource links. Their copy, sections, and links all live in the same demo data module.

Canvas pages swipe horizontally and scroll independently vertically. Task banners stay above the canvas. The 148px conversation/input region and bottom navigation stay outside canvas scrolling. Prompt chips wrap into two clipped rows. Native keyboard entry moves the same composer to 8px above the reported keyboard top, measured in window coordinates, while retaining the underlying screen geometry. The input stays mounted and focused; tab height and bottom safe-area padding are not added to the keyboard gap.

Prompt chips sit at the bottom of their reserved area, directly above the input. Tabs switch instantly through the bottom buttons; Suggestions and Profile do not switch tabs on swipe. Home reserves horizontal swipes for finding pages. Tab pages stay mounted to preserve scroll and editor state. The phone's system status bar remains visible, with light icons on dark screens and dark icons on Profile's light header. The app shell fills its parent's layout, and the navigation bar adds space for the device's bottom safe area without squeezing its controls. Figma gradients fade the Home background, feed edges, Profile hero, and agent section.

## Checks

```sh
npm run typecheck
npm test
npx expo export --platform android --output-dir /tmp/fuse-android-export
```

Check the mobile keyboard on a physical device or simulator before shipping. The browser preview cannot validate native IME behavior or iOS safe areas.
