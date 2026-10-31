export type SquareCrop = { originX: number; originY: number; width: number; height: number };
export const MAX_UPLOAD_BYTES = 512 * 1024;
/** Map a dragged/zoomed square viewport back into source-image pixels. */
export function squareCrop(width: number, height: number, viewport: number, zoom: number, x: number, y: number): SquareCrop {
  const scale = Math.max(viewport / width, viewport / height) * Math.max(1, zoom);
  const side = Math.max(1, Math.floor(viewport / scale));
  return { originX: Math.max(0, Math.min(width - side, Math.round((width - side) / 2 - x / scale))), originY: Math.max(0, Math.min(height - side, Math.round((height - side) / 2 - y / scale))), width: side, height: side };
}
export function clampCropOffset(width: number, height: number, viewport: number, zoom: number, x: number, y: number) {
  const scale = Math.max(viewport / width, viewport / height) * zoom;
  const limitX = Math.max(0, (width * scale - viewport) / 2), limitY = Math.max(0, (height * scale - viewport) / 2);
  return { x: Math.max(-limitX, Math.min(limitX, x)), y: Math.max(-limitY, Math.min(limitY, y)) };
}
export function resizedSquare(side: number, kind: 'icon' | 'cover') { return Math.min(Math.floor(side), kind === 'icon' ? 256 : 800); }
