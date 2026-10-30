# Marketplace frontend integration

The frontend follows the completed marketplace backend in master (`9ff41d7`). This integration changes only frontend files; backend code, migrations, and the VM are not modified.

## API contracts

All requests use the existing authenticated `/gateway/marketplace` APIs: catalog, featured and top ordering, creator listings, drafts, publishing/unpublishing, installations, activation, explicit version updates, and removal. Draft creation uses an existing private specialist. Published instructions remain read-only for installations; private preferences stay editable.

Artwork selection is shown only in the publishing editor. The backend supports exactly six asset keys: `brief`, `calendar`, `flight`, `video`, `mail`, and `gym`. The frontend presents these supported choices and validates payloads before submitting. There is no pending backend patch or migration.

The duplicate-install response can omit `enabled`; the refreshed installation list remains authoritative. A successful mutation followed by a reload failure is reported as saved with a refresh issue, rather than a failed mutation.

## Carousel artwork

Four supplied images from `ref/agent_marketplace_icons` match the backend's persisted artwork categories and are bundled unchanged:

| Backend asset | Supplied image |
| --- | --- |
| `brief` | `document.png` |
| `calendar` | `calendar.png` |
| `flight` | `airplane.png` |
| `video` | `video.png` |

The remaining twelve reference covers are not bundled because the backend has no corresponding distinct artwork selection. The originals in `ref` are untouched. Email and Fitness use their matching transparent sticker over the card background; they do not borrow an unrelated cover.

The carousel renders the saved artwork choice. It does not infer or replace the choice from the agent name or description, and users are not asked to choose artwork during installation or use. Both the front card and the cards behind it use the corresponding saved choice.

Dragging tilts and advances featured cards; short drags spring back. Reduced-motion and an accessible Next control are supported. Browsing never installs or removes agents. Public and Private sections in Profile scroll horizontally with both scrollbar indicators hidden.

## Original sticker assets

The original supplied sheet remains available as 35 named transparent PNGs in `frontend/assets/agent-icons/`. Marketplace icons use the six matching backend-supported choices; the other stickers remain available for future features without sending unsupported keys to the backend.

To regenerate the original crops (Pillow, NumPy and SciPy required):

```bash
python3 frontend/scripts/crop-agent-icons.py '/path/to/Colourful Cartoon Sticker Icon Collection.png'
```
