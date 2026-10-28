import type { ImageSourcePropType } from 'react-native';
import type { AgentIcon, AssetKey, ImageReference } from './data/types';

const assets: Record<AssetKey, ImageSourcePropType> = {
  calendar: require('../assets/cards/calendar.png'),
  mail: require('../assets/cards/mail.png'),
  brief: require('../assets/daily-brief.png'),
  flight: require('../assets/cards/flight.png'),
  gym: require('../assets/cards/gym.png'),
  video: require('../assets/cards/video.png'),
  avatar: require('../assets/figma/d4915.png'),
  phone: require('../assets/figma/99039.png'),
  car: require('../assets/figma/ef5c9.jpg'),
  skoda: require('../assets/figma/66642.jpg'),
  watch: require('../assets/figma/f6d05.png'),
};

export function imageSource(image: ImageReference | null | undefined, fallback: AssetKey = 'flight'): ImageSourcePropType {
  if (image?.uri && /^https?:\/\//i.test(image.uri)) return { uri: image.uri };
  return (image?.asset && assets[image.asset]) || assets[fallback];
}


/** Replace legacy generic artwork with the configured agent category's illustration. */
export function cardImage(image: ImageReference | undefined, icon?: AgentIcon): ImageReference {
  const category: Partial<Record<AgentIcon, AssetKey>> = { mail: 'mail', flight: 'flight', gym: 'gym', video: 'video', calendar: 'calendar', date: 'calendar', brief: 'brief', news: 'brief' };
  const fallback = category[icon ?? 'flight'] ?? 'flight';
  if (!image || image.asset === 'avatar' || image.asset === 'calendar' && fallback !== 'calendar') return { asset: fallback };
  return image;
}
