import type { ImageSourcePropType } from 'react-native';
import type { AssetKey, ImageReference } from './data/types';

const assets: Record<AssetKey, ImageSourcePropType> = {
  mail: require('../assets/mail.png'),
  brief: require('../assets/daily-brief.png'),
  flight: require('../assets/figma/22337.png'),
  gym: require('../assets/figma/28039.png'),
  video: require('../assets/figma/4b35d.png'),
  avatar: require('../assets/figma/d4915.png'),
  phone: require('../assets/figma/99039.png'),
  car: require('../assets/figma/ef5c9.jpg'),
  skoda: require('../assets/figma/66642.jpg'),
  watch: require('../assets/figma/f6d05.png'),
};

export function imageSource(image: ImageReference): ImageSourcePropType {
  return image.uri ? { uri: image.uri } : assets[image.asset!];
}
