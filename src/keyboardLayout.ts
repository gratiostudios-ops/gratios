// Convert the keyboard's window position to the Home view's local coordinates.
export function keyboardComposerTop({ keyboardTop, hostTop, hostHeight, composerHeight, gap }: {
  keyboardTop: number;
  hostTop: number;
  hostHeight: number;
  composerHeight: number;
  gap: number;
}) {
  return Math.max(0, Math.min(hostHeight - composerHeight, keyboardTop - hostTop - composerHeight - gap));
}
