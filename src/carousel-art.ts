import type { ImageSourcePropType } from 'react-native';
import type { CarouselTheme } from './data/carousel-theme';

export const carouselArt: Record<CarouselTheme, ImageSourcePropType> = {
  airplane: require('../assets/marketplace-carousel/airplane.png'),
  calendar: require('../assets/marketplace-carousel/calendar.png'),
  document: require('../assets/marketplace-carousel/document.png'),
  video: require('../assets/marketplace-carousel/video.png'),
};
