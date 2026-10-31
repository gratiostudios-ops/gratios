import { Asset } from 'expo-asset';

// Permanent copies of ref/agent_marketplace_icons, bundled for offline use.
export const marketplaceCovers = {
  airplane: require('../assets/marketplace-covers/airplane.png'),
  calendar: require('../assets/marketplace-covers/calendar.png'),
  camera: require('../assets/marketplace-covers/camera.png'),
  chat: require('../assets/marketplace-covers/chat.png'),
  document: require('../assets/marketplace-covers/document.png'),
  game_controller: require('../assets/marketplace-covers/game_controller.png'),
  home: require('../assets/marketplace-covers/home.png'),
  lightbulb: require('../assets/marketplace-covers/lightbulb.png'),
  music: require('../assets/marketplace-covers/music.png'),
  parcel: require('../assets/marketplace-covers/parcel.png'),
  photo: require('../assets/marketplace-covers/photo.png'),
  search: require('../assets/marketplace-covers/search.png'),
  shopping_cart: require('../assets/marketplace-covers/shopping_cart.png'),
  target: require('../assets/marketplace-covers/target.png'),
  video: require('../assets/marketplace-covers/video.png'),
  wallet: require('../assets/marketplace-covers/wallet.png'),
} as const;

const cardCovers = {
  'deal-finder': marketplaceCovers.parcel,
  'price-checker': marketplaceCovers.wallet,
  'shopping-reminder': marketplaceCovers.shopping_cart,
  'discount-hunter': marketplaceCovers.target,
  'delivery-tracker': marketplaceCovers.airplane,
  'smart-shopping': marketplaceCovers.home,
};
export function marketplaceCover(id: string, artwork?: { asset?: string }) {
  const saved = { brief: marketplaceCovers.document, calendar: marketplaceCovers.calendar, flight: marketplaceCovers.airplane, video: marketplaceCovers.video, mail: marketplaceCovers.chat, gym: marketplaceCovers.target };
  return cardCovers[id as keyof typeof cardCovers] ?? saved[artwork?.asset as keyof typeof saved] ?? marketplaceCovers.parcel;
}

let preload: Promise<Asset[]> | undefined;
export function preloadMarketplaceCovers() {
  return preload ??= Asset.loadAsync(Object.values(marketplaceCovers)).catch(error => {
    preload = undefined;
    throw error;
  });
}
