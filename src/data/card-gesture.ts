export function cardRelease(dx: number, dy: number, velocityX: number, width: number) {
  const dismiss = Math.abs(dx) > width * 0.24 || (Math.abs(velocityX) > 0.7 && Math.abs(dx) > 16);
  const direction = dx < 0 ? -1 : 1;
  return { dismiss, x: direction * (width + 160), y: Math.max(-100, Math.min(100, dy)) };
}
