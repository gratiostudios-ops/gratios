import React from 'react';
import { Text, type TextProps } from 'react-native';
import { parseInline } from '../../../shared/response';
import { fonts } from '../theme';
import { AppText } from './UI';

export function RichText({ text, highlights, visibleCharacters = Infinity, ...props }: TextProps & {
  text: string; highlights?: string[]; visibleCharacters?: number;
}) {
  let remaining = visibleCharacters;
  return <AppText {...props}>{parseInline(text, highlights).map((span, index) => {
    const characters = Array.from(span.text);
    const visible = characters.slice(0, Math.max(0, remaining)).join('');
    remaining -= characters.length;
    return <Text key={index} style={span.bold ? { fontFamily: fonts.bold, color: '#ffffff' } : undefined}>{visible}</Text>;
  })}</AppText>;
}
