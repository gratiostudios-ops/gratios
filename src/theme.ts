// Measured from the Fuse Figma file. Values are React Native logical pixels.
export const colors = {
  background: '#0d0d0d',
  feedBackground: '#080808',
  surface: '#1b1b1b',
  text: '#f2f2f2',
  body: '#c9c9c9',
  secondary: '#a6a6a6',
  muted: '#777777',
  faint: '#575757',
  divider: '#272727',
  tableDivider: '#393939',
  blue: '#4a78e8',
  chip: '#4a78e8',
  onBlue: '#071b2b',
  task: '#e54865',
  calendar: '#487ee5', // Same saturation/lightness as the Figma task red.
  highlight: '#32f579',
};

export const fonts = {
  regular: 'Figtree_400Regular',
  medium: 'Figtree_500Medium',
  semibold: 'Figtree_600SemiBold',
  bold: 'Figtree_700Bold',
  serif: 'CrimsonPro_600SemiBold',
  serifBold: 'CrimsonPro_700Bold',
  feed: 'Poppins_400Regular',
  feedBold: 'Poppins_600SemiBold',
  interface: 'Inter_400Regular',
  date: 'Inter_900Black',
  mono: 'monospace',
};

export const layout = {
  referenceWidth: 402,
  gutter: 22,
  profileGutter: 27,
  inputHeight: 52,
  keyboardGap: 8,
  conversationHeight: 148,
  findingNavigationHeight: 40,
  tabHeight: 88,
};

// The reference includes 7px below the contact line. Replace that with the real
// bottom inset, rather than taking it out of the tab controls' available height.
export function bottomTabHeight(bottomInset: number) {
  return layout.tabHeight - 7 + Math.max(7, bottomInset);
}
