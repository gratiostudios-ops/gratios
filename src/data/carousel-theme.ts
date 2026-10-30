import type { MarketListing } from './marketplace';

export type CarouselTheme = 'airplane' | 'calendar' | 'document' | 'video';
/** These are the supplied covers with matching backend artwork identifiers. */
const themes = { flight: 'airplane', calendar: 'calendar', brief: 'document', video: 'video' } as const;
export function carouselTheme(item: Pick<MarketListing, 'artwork'>): CarouselTheme | undefined {
  return themes[item.artwork.asset as keyof typeof themes];
}
