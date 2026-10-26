declare module '*.svg' {
  import type { ComponentType } from 'react';
  import type { SvgProps } from 'react-native-svg';
  const Svg: ComponentType<SvgProps>;
  export default Svg;
}
