import type { MarketListing } from './marketplace';

export const marketIcons = {
  store: require('../../assets/marketplace-local/store.png'),
  search: require('../../assets/marketplace-local/search.png'),
  bag: require('../../assets/marketplace-local/bag.png'),
  package: require('../../assets/marketplace-local/package.png'),
  wallet: require('../../assets/marketplace-local/wallet.png'),
  cart: require('../../assets/marketplace-local/cart.png'),
  discount: require('../../assets/marketplace-local/discount.png'),
  delivery: require('../../assets/marketplace-local/delivery.png'),
  basket: require('../../assets/marketplace-local/basket.png'),
};
export const localMarketplace: MarketListing[] = [
  ['deal-finder', 'Deal Finder', 'Scans for best deals and good discounts tailored to your wishlist'],
  ['price-checker', 'Price Checker', 'Checks and compare prices of similar items in various places to shop and uncover savings.'],
  ['shopping-reminder', 'Shopping reminder', 'Remember your shopping list and get a reminder when it is time to shop.'],
  ['discount-hunter', 'Discount Hunter', 'Discover offers and discounts on your favorite products.'],
  ['delivery-tracker', 'Delivery Tracker', 'Keep all your deliveries together and follow your packages.'],
  ['smart-shopping', 'Smart Shopping', 'Build a smarter basket with picks tailored to your personal taste.'],
].map(([id, name, description]) => ({ id, name, description, artwork: { asset: 'mail' }, creator_user_id: null, latest_published_version_id: null }));
export function localMarketIcon(id: string) {
  return ({ 'deal-finder': marketIcons.package, 'price-checker': marketIcons.wallet, 'shopping-reminder': marketIcons.cart, 'discount-hunter': marketIcons.discount, 'delivery-tracker': marketIcons.delivery, 'smart-shopping': marketIcons.basket } as Record<string, number>)[id];
}
