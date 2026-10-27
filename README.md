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

Home has no default agent. Configured agents do not appear on Home unless the current snapshot supplies findings for them. Findings are shown in their supplied order. An empty findings array displays a quiet empty canvas and keeps the input available. Checking a task draws the checkmark in 180ms, holds the completed state, then gently fades and lifts the row before removing it at one second. A gray undo pill appears at the top for three seconds; repeated taps during completion are ignored. Removing the last task enlarges the illustration without moving the canvas title or input boundary.

Canvas navigation shows each icon once, even when several finding pages share it. Findings can supply a distinct `navigationIcon` and `navigationLabel`; Today at a glance uses the news icon. Swiping still reaches every finding. Selecting an icon opens its first supplied finding, and tapping the already selected icon keeps the current page. The example payload orders Flights first, Today at a glance second, and Mail third.

Optional development scenarios (no extra controls in the product UI):

```sh
EXPO_PUBLIC_DEMO_SCENARIO=empty npm start
EXPO_PUBLIC_DEMO_SCENARIO=single npm start
EXPO_PUBLIC_DEMO_SCENARIO=calendar npm start
```

Restart Metro when changing a scenario. The default is `multiple`.

## Connect a backend later

Implement `DataSource` in `src/data/types.ts` and pass it as `dataSource` to `AppDataProvider`. It loads a snapshot, optionally subscribes to pushed snapshots, completes and restores tasks, and sends messages. The mock source also exposes `publishSnapshot` for integration exercises. Published snapshots replace tasks/findings; UI components do not read directly from the mock payload.

Content blocks support headings, plain paragraphs, numbered lists, tables, and action buttons. Table columns and rows come from data; tables with more than two columns scroll horizontally. `previewRows` enables local Show More / Show Less. Images can reference a bundled asset key or a remote URI. Stable finding/task/block IDs preserve UI identity across updates.

The registry, profile, feed, canned replies, and Markdown seed documents also live in the same demo data object. Their future transport can be added to the provider without changing the presentation components. Agent and preference edits are session state and reset after a full restart. Chat replies are canned; action buttons do not send email, book flights, or modify external services.

## Layout and assets

Shared styles use the Figma values in `src/theme.ts`, including Figtree, Crimson Pro, Poppins, and Inter with the individual weights bundled through Expo font packages. Numbered points and regular canvas paragraphs use 16px text. Normal content has no inline highlight styling. Canvas highlights are supported only in table cells, using bold Figtree and green (#32F579). Conversation replies use 16px semibold gray text; optional `Reply.highlights` phrases render in white. New replies appear word by word, paced by word length and punctuation; action chips appear when typing finishes. A small character to the left uses five supplied mouth poses from `ref/emotes`, with one pose per short word and at most two per longer word, then lowering its hat, sinking 10px behind an invisible clipped edge, and sleeping with gently rising z letters. Sleep letters share a continuous rhythm with even spacing, plus an occasional larger letter that drifts higher. Tapping the sleeping character wakes it and replaces the last reply with “What do you need?” for three seconds, then restores that reply and returns to sleep. Reduce Motion uses a static sleeping pose. Returning to a finding resumes its progress without replaying completed replies. Reduce Motion shows replies immediately. The screen waits for font loading before rendering. Figma assets are local under `assets/figma`; SVGs retain their original geometry, with color passed for active/inactive states. Mail uses the supplied envelope with a transparent background, and Today at a glance uses the supplied mailbox illustration.

Suggestion thumbnails use fixed 75×63px frames with cover cropping. Opened suggestions use consistent 200px-high image frames with contain sizing, shared text/header margins, richer sections and points, and external resource links. Their copy, sections, and links all live in the same demo data module.

Canvas pages swipe horizontally and scroll independently vertically. The task region is measured independently of the canvas; only its illustration resizes when tasks change. Removing bottom navigation preserves the canvas's original absolute position and height: its former height, less the input's bottom safe-area padding, expands the messaging body. The original 148px conversation/input region gains that reclaimed height, while its 12px top padding, 10px body/input gap, 52px collapsed input, and 40px canvas navigation retain their existing sizes. The input stays above the device's bottom safe area. Prompt chips wrap into two clipped rows. Keyboard avoidance uses native resize plus explicit height avoidance on Android and padding avoidance on iOS. The hamburger and composer share a row anchored 8px above the keyboard; only the canvas/conversation background retains its resting height. The input stays mounted and focused; bottom safe-area padding is not added to the keyboard gap. Enter inserts a newline; the input grows upward to six lines, then scrolls internally. Sending uses the send button and clears the input back to its collapsed height. The background dims by 60% while the keyboard is visible; tapping it dismisses the keyboard. The hamburger and composer stay above the dim layer. The input and hamburger retain their original borderless surface color. When typing, the background behind them is blurred and dimmed for separation. Android 12+ uses native background blur; older Android versions retain the dimmed backdrop.

Prompt chips sit at the bottom of their reserved area, directly above the input. A small navigation button beside the Home message input opens a rounded bottom sheet containing Home, Suggestions, Profile, and Contact us. Suggestions and Profile place the same button in the bottom-left corner. The sheet overlays the screen without resizing it. Destinations switch instantly and stay mounted to preserve scroll and editor state. The sheet closes through its backdrop, close button, or Android Back, and opening it dismisses the keyboard. Home reserves horizontal swipes for finding pages; Suggestions and Profile have no navigation swipe. The phone's system status bar remains visible, with light icons on dark screens and dark icons on Profile's light header. Figma gradients fade the Home background, feed edges, Profile hero, and agent section.

The three-second undo pill stays below the task region, or near the top safe area when tasks are absent.

## Checks

```sh
npm run typecheck
npm test
npx expo export --platform android --output-dir /tmp/fuse-android-export
```

Check the mobile keyboard on a physical device or simulator before shipping. The browser preview cannot validate native IME behavior or iOS safe areas.
